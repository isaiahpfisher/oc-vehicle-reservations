<script setup>
/**
 * Feature 14 (US-14.6): create, edit, or view one issue report with the shared IssueReportForm, then its notes.
 * Who may edit follows Feature 10, FR-014: admins, or area admins of the report's vehicle area. The author reads it.
 */
import MoreActionsMenu from "../components/common/MoreActionsMenu.vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useNoticeStore } from "../stores/notice.js";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";
import issueReportServices from "../services/issueReportServices.js";
import maintenanceNeedServices from "../services/maintenanceNeedServices.js";
import requestServices from "../services/requestServices.js";
import vehicleServices from "../services/vehicleServices.js";
import Utils from "../config/utils.js";
import { needStatusLabel } from "../models/maintenanceNeeds.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRoles } from "../composables/useRoles.js";
import {
  blankIssueReportForm,
  personName,
  statusDetails,
  statusLabel,
  toIssueReportForm,
  typeLabel,
  validateIssueReportForm,
  vehiclesOfTrips,
  withTrip,
} from "../models/issueReports.js";
import PageShell from "../components/layout/PageShell.vue";
import SectionCard from "../components/layout/SectionCard.vue";
import IssueReportForm from "../components/issueReports/IssueReportForm.vue";
import NotesThread from "../components/notes/NotesThread.vue";

const props = defineProps({
  issueReportId: { type: [String, Number], default: null },
});

const route = useRoute();
const router = useRouter();
// UI/UX backlog #48: the app-wide success toast.
const { notify } = useNoticeStore();
const confirm = useConfirm();
const { hasRole, hasAnyRole, areaAdminAreaIds } = useRoles();

const report = ref(null);
const form = ref(blankIssueReportForm());
const baseline = ref(JSON.stringify(blankIssueReportForm()));
const formRef = ref(null);
const loading = ref(false);
const loadError = ref("");
const saving = ref(false);
const saveError = ref("");
const vehicles = ref([]);
const trips = ref([]);
const assignees = ref([]);
const assigneesLoading = ref(false);
const assigneesError = ref("");
/** Set when changing the vehicle removed an assignee who can't take reports on the new one. */
const assigneeNotice = ref("");
/** Feature 14 (US-14.7): the maintenance need made from this report, if any. */
const linkedNeed = ref(null);
/** Set once a save or delete is done, so leaving the page doesn't ask about unsaved changes. */
const leaving = ref(false);

const isCreate = computed(() => props.issueReportId == null);
/** Feature 10, FR-014: admins, or area admins of the report's vehicle area. */
const canManage = computed(
  () => !!report.value && (hasRole("admin") || areaAdminAreaIds.value.includes(report.value.vehicle?.areaId)),
);
const canTriage = computed(() => (isCreate.value ? hasAnyRole(["area_admin"]) : canManage.value));
const mode = computed(() => (isCreate.value ? "create" : canManage.value ? "edit" : "view"));
const dirty = computed(() => mode.value !== "view" && JSON.stringify(form.value) !== baseline.value);

/** Came from a trip's "Report an issue": Cancel goes back to it. */
const fromTrip = computed(() => (isCreate.value && /^\d+$/.test(String(route.query.vehicleRequestId ?? "")) ? Number(route.query.vehicleRequestId) : null));
/** UI/UX backlog #18: came from a vehicle's "Report an issue": the vehicle is filled in, and Cancel goes back to it. */
const fromVehicle = computed(() => (isCreate.value && /^\d+$/.test(String(route.query.vehicleId ?? "")) ? Number(route.query.vehicleId) : null));

const title = computed(() => {
  if (isCreate.value) return "Report an issue";
  return report.value ? `${typeLabel(report.value.type)} · ${report.value.vehicle?.universityId}` : "";
});

const formatDay = (value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const subtitle = computed(() => {
  if (isCreate.value) return "Tell staff what's wrong with a vehicle. You can follow up in the notes after you submit.";
  return report.value ? `Reported by ${personName(report.value.author)} on ${formatDay(report.value.createdAt)}` : "";
});

const breadcrumbs = computed(() => [
  { title: "Issue Reports", to: { name: "issue-reports" } },
  { title: title.value || "Issue Report", disabled: true },
]);

const cancelTarget = computed(() => {
  if (fromTrip.value) return { name: "request", params: { requestId: fromTrip.value } };
  if (fromVehicle.value) return { name: "vehicleDetails", params: { id: fromVehicle.value } };
  return { name: "issue-reports" };
});

const listed = (result) => (result.status === "fulfilled" && Array.isArray(result.value?.data) ? result.value.data : []);
const skip = () => Promise.resolve(null);

/**
 * Trips: your own, plus the ones you manage. Vehicles: everything you may list (managers and maintenance),
 * otherwise the vehicles on your trips. Assignees load per vehicle (see loadAssignees).
 */
const loadOptions = async () => {
  const readsVehicles = hasAnyRole(["area_admin", "maintenance"]);
  const managesTrips = hasAnyRole(["area_admin"]);
  const [vehicleResult, mineResult, managedResult] = await Promise.allSettled([
    readsVehicles ? vehicleServices.getVehicles() : skip(),
    requestServices.getMyRequests(),
    managesTrips ? requestServices.getRequests() : skip(),
  ]);

  const byId = new Map();
  for (const trip of [...listed(mineResult), ...listed(managedResult)]) {
    if (!["cancelled", "denied"].includes(trip.status)) byId.set(trip.id, trip);
  }
  trips.value = [...byId.values()].sort((a, b) => new Date(b.startAt) - new Date(a.startAt));

  const allVehicles = readsVehicles ? listed(vehicleResult) : vehiclesOfTrips(trips.value);
  // An area admin editing a report may only move it to a vehicle in their areas (Feature 10, FR-014).
  vehicles.value =
    mode.value === "edit" && !hasRole("admin")
      ? allVehicles.filter((vehicle) => areaAdminAreaIds.value.includes(vehicle.areaId))
      : allVehicles;
};

/**
 * Admins, area admins for the chosen vehicle, and maintenance users (Feature 14, US-14.6).
 * When the user switches vehicles, an assignee who can't take reports on the new one is removed, with a note saying so.
 */
let assigneeRequest = 0;
const loadAssignees = async (vehicleId, previousVehicleId) => {
  assigneeNotice.value = "";
  assigneesError.value = "";
  if (!canTriage.value || !vehicleId) {
    assignees.value = [];
    return;
  }

  // Remember who was assigned before the list changes, to name them if they're removed.
  const before = [...assignees.value, report.value?.assignee].find((person) => person && person.id === form.value.assigneeId);
  const id = ++assigneeRequest;
  assigneesLoading.value = true;
  try {
    const { data } = await issueReportServices.getAssignees(vehicleId);
    if (id !== assigneeRequest) return;
    assignees.value = Array.isArray(data) ? data : [];
  } catch (err) {
    if (id !== assigneeRequest) return;
    assignees.value = [];
    // Say so instead of showing an empty list; leave the current assignee alone.
    assigneesError.value = `Couldn't load who can be assigned. ${Utils.errorMessage(err, "Try again later.")}`;
    return;
  } finally {
    if (id === assigneeRequest) assigneesLoading.value = false;
  }

  const current = form.value.assigneeId;
  const changedVehicle = previousVehicleId != null && previousVehicleId !== vehicleId;
  if (changedVehicle && current && !assignees.value.some((person) => person.id === current)) {
    const name = (before && personName(before)) || "The assignee";
    form.value = { ...form.value, assigneeId: null };
    assigneeNotice.value = `${name} can't take reports on this vehicle, so they were removed as assignee.`;
  }
};

watch(() => form.value.vehicleId, loadAssignees);

const loadLinkedNeed = async (reportId) => {
  try {
    const { data } = await maintenanceNeedServices.getMaintenanceNeeds();
    linkedNeed.value = (Array.isArray(data) ? data : []).find((need) => need.issueReportId === reportId) ?? null;
  } catch {
    linkedNeed.value = null;
  }
};

/** Managers turn maintenance reports into maintenance needs; a linked need is always shown. */
const showMaintenance = computed(() => canManage.value && (!!linkedNeed.value || report.value?.type === "maintenance"));

const resetForm = (next) => {
  form.value = next;
  baseline.value = JSON.stringify(next);
  saveError.value = "";
};

const load = async () => {
  loading.value = true;
  loadError.value = "";
  leaving.value = false;
  report.value = null;
  linkedNeed.value = null;

  try {
    if (isCreate.value) {
      await loadOptions();
      const trip = trips.value.find(({ id }) => id === fromTrip.value);
      resetForm(blankIssueReportForm());
      if (trip) {
        // Arriving from a trip fills it in; that counts as the starting point, not an unsaved change.
        resetForm(withTrip({ ...form.value, vehicleRequestId: trip.id }, trip));
      } else if (vehicles.value.some(({ id }) => id === fromVehicle.value)) {
        resetForm({ ...form.value, vehicleId: fromVehicle.value });
      }
    } else {
      const { data } = await issueReportServices.getIssueReport(props.issueReportId);
      report.value = data;
      resetForm(toIssueReportForm(data));
      if (canManage.value) {
        await Promise.all([loadOptions(), loadLinkedNeed(data.id)]);
      }
    }
  } catch (err) {
    loadError.value = Utils.errorMessage(err, "Failed to load issue report.");
  } finally {
    loading.value = false;
  }
};

watch(() => props.issueReportId, load, { immediate: true });

/** Bring the first invalid field into view and focus it. */
const showFirstError = async () => {
  await nextTick();
  const field = document.querySelector(".v-input--error");
  field?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  field?.querySelector("input, textarea, button")?.focus({ preventScroll: true });
};

const payload = () => {
  const { value } = validateIssueReportForm(form.value);
  // Only managers set triage fields; a requester's report always starts pending and unassigned.
  return canTriage.value ? value : { ...value, status: "pending", assigneeId: null, resolvedAt: null };
};

const submit = async () => {
  if (saving.value) return;
  const { valid } = await formRef.value.validate();
  if (!valid) {
    await showFirstError();
    return;
  }

  saving.value = true;
  saveError.value = "";

  try {
    if (isCreate.value) {
      const { data } = await issueReportServices.createIssueReport(payload());
      leaving.value = true;
      notify("Issue report submitted.");
      await router.replace({ name: "issueReport", params: { issueReportId: data.id } });
    } else {
      const { data } = await issueReportServices.updateIssueReport(report.value.id, payload());
      report.value = data;
      resetForm(toIssueReportForm(data));
      notify("Changes saved.");
    }
  } catch (err) {
    saveError.value = Utils.errorMessage(err, isCreate.value ? "Failed to submit issue report." : "Failed to save changes.");
  } finally {
    saving.value = false;
  }
};

const discard = () => {
  resetForm(JSON.parse(baseline.value));
  formRef.value?.resetValidation();
};

const remove = async () => {
  const deleted = await confirm({
    title: "Delete issue report",
    message: `Delete "${report.value.description}"? This action is permanent.`,
    confirmText: "Delete Issue Report",
    confirmColor: "error",
    onConfirm: () => issueReportServices.removeIssueReport(report.value.id),
  });

  if (deleted) {
    notify("Issue report deleted.");
    leaving.value = true;
    await router.push({ name: "issue-reports" });
  }
};

// Don't lose a half-written report: ask before leaving the page, and let the browser warn on reload or close.
const confirmLeave = () => {
  if (leaving.value || !dirty.value) return true;
  return confirm({
    title: "Discard changes?",
    message: isCreate.value
      ? "Your issue report hasn't been submitted. Leave and discard it?"
      : "You have unsaved changes to this issue report. Leave and discard them?",
    confirmText: "Discard Changes",
    cancelText: "Keep Editing",
    confirmColor: "error",
  });
};
onBeforeRouteLeave(confirmLeave);
// Moving straight to another issue report reuses this page.
onBeforeRouteUpdate((to, from) => (to.params.issueReportId !== from.params.issueReportId ? confirmLeave() : true));

const warnOnUnload = (event) => {
  if (dirty.value && !leaving.value) {
    event.preventDefault();
    event.returnValue = "";
  }
};
onMounted(() => window.addEventListener("beforeunload", warnOnUnload));
onBeforeUnmount(() => window.removeEventListener("beforeunload", warnOnUnload));
</script>

<template>
  <PageShell :title :subtitle :breadcrumbs :loading :error="loadError" :max-width="800" centered>
    <template v-if="report" #actions>
      <div class="d-flex align-center ga-2">
        <v-chip
          :color="statusDetails(report.status).color"
          :prepend-icon="statusDetails(report.status).icon"
          variant="tonal"
          label
          data-test="status-chip"
        >
          {{ statusLabel(report.status) }}
        </v-chip>
        <MoreActionsMenu v-if="canManage">
          <v-list-item
            prepend-icon="mdi-delete-outline"
            title="Delete issue report"
            base-color="error"
            data-test="delete-report"
            @click="remove"
          />
        </MoreActionsMenu>
      </div>
    </template>

    <v-form ref="formRef" class="d-flex flex-column ga-6" data-test="issue-report-form" @submit.prevent="submit">
      <IssueReportForm
        v-model="form"
        :mode
        :can-triage="canTriage"
        :report
        :vehicles
        :trips
        :assignees
        :assignees-loading="assigneesLoading"
        :assignee-notice="assigneeNotice"
        :assignees-error="assigneesError"
      />

      <!-- Create: always offer Submit. Edit: the bar appears once something changes. -->
      <div v-if="mode === 'create' || dirty" class="action-bar" data-test="action-bar">
        <v-alert v-if="saveError" type="error" density="compact" class="mb-3" data-test="save-error">{{ saveError }}</v-alert>
        <div class="d-flex align-center flex-wrap ga-2">
          <span v-if="mode === 'edit'" class="text-body-medium text-medium-emphasis d-flex align-center ga-1">
            <v-icon icon="mdi-pencil-outline" size="18" /> Unsaved changes
          </span>
          <v-spacer />
          <v-btn v-if="mode === 'create'" color="secondary" variant="text" class="oc-cta" :to="cancelTarget" :disabled="saving">
            Cancel
          </v-btn>
          <v-btn v-else color="secondary" variant="text" class="oc-cta" :disabled="saving" data-test="discard" @click="discard">
            Discard
          </v-btn>
          <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :loading="saving" data-test="submit">
            {{ mode === "create" ? "Submit report" : "Save changes" }}
          </v-btn>
        </div>
      </div>
    </v-form>

    <!-- Feature 14 (US-14.7): plan the repair from here; the need form opens filled in from this report. -->
    <SectionCard
      v-if="showMaintenance"
      title="Maintenance"
      :subtitle="linkedNeed ? 'This report is tracked as a maintenance need.' : 'Schedule the repair as a maintenance need. The form opens filled in from this report.'"
      class="mt-6"
      data-test="maintenance"
    >
      <div v-if="linkedNeed" class="d-flex align-center flex-wrap ga-3">
        <v-icon icon="mdi-tools" color="primary" />
        <div class="flex-grow-1">
          <div class="text-title-small font-weight-bold" data-test="linked-need-title">{{ linkedNeed.title }}</div>
          <div class="text-body-small text-medium-emphasis">{{ needStatusLabel(linkedNeed.status) }} · {{ linkedNeed.priority }} priority</div>
        </div>
        <v-btn
          color="primary"
          variant="tonal"
          class="oc-cta"
          append-icon="mdi-arrow-right"
          :to="{ name: 'maintenanceNeedEdit', params: { id: linkedNeed.id } }"
          data-test="view-maintenance-need"
        >
          View maintenance need
        </v-btn>
      </div>
      <v-btn
        v-else
        color="primary"
        variant="tonal"
        class="oc-cta"
        prepend-icon="mdi-plus"
        :to="{ name: 'maintenanceNeedCreate', query: { issueReportId: report.id } }"
        data-test="create-maintenance-need"
      >
        Create maintenance need
      </v-btn>
    </SectionCard>

    <SectionCard
      v-if="report"
      title="Notes"
      subtitle="Questions and updates about this report."
      class="mt-6"
      data-test="issue-report-notes"
    >
      <NotesThread parent-key="issueReportId" :parent-id="report.id" />
    </SectionCard>
  </PageShell>
</template>

<style scoped>
/* Stays in reach on long forms and small screens, like the new-request page. */
.action-bar {
  position: sticky;
  bottom: 0;
  z-index: 2;
  padding: 16px 0;
  background: rgb(var(--v-theme-background));
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
