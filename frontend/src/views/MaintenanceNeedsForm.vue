<script setup>
import { computed, ref, watch } from "vue";
import { useNoticeStore } from "../stores/notice.js";
import { NEED_PRIORITY_COLORS, NEED_STATUS_COLORS, needStatusLabel } from "../models/maintenanceNeeds.js";
import { useRoute, useRouter } from "vue-router";
import maintenanceNeedServices from "../services/maintenanceNeedServices.js";
import vehicleServices from "../services/vehicleServices.js";
import { useRequest } from "../composables/useRequest.js";
import { useRoles } from "../composables/useRoles.js";
import { useUnsavedChanges } from "../composables/useUnsavedChanges.js";
import { canOpen } from "../router.js";
import PageShell from "../components/layout/PageShell.vue";
import MaintenanceNeedFields from "../components/maintenanceNeeds/MaintenanceNeedFields.vue";
import issueReportServices from "../services/issueReportServices.js";
import { needTitleFrom, typeLabel } from "../models/issueReports.js";
import { formatTripDates } from "../models/requests.js";
import SectionCard from "../components/layout/SectionCard.vue";
import NotesThread from "../components/notes/NotesThread.vue";
import ServiceLogFormModal from "../components/serviceLogs/ServiceLogFormModal.vue";
import serviceLogServices from "../services/serviceLogServices.js";
import serviceTypeServices from "../services/serviceTypeServices.js";
import { fullName } from "../models/users.js";
import { formatDay, formatMiles, vehicleLabel } from "../models/vehicles.js";
import { groupVisits } from "../models/serviceLogs.js";
import { useConfirm } from "../composables/useConfirm.js";
import MoreActionsMenu from "../components/common/MoreActionsMenu.vue";

const route = useRoute();
const router = useRouter();
// UI/UX backlog #48: the app-wide success toast.
const { notify } = useNoticeStore();
const { hasRole, areaAdminAreaIds, user } = useRoles();

const isCreate = computed(() => route.name === "maintenanceNeedCreate");
/** Feature 14 (US-14.7): `?issueReportId=` pre-fills a new need from that issue report and returns to it afterwards. */
const fromReportId = computed(() =>
  isCreate.value && /^\d+$/.test(String(route.query.issueReportId ?? "")) ? Number(route.query.issueReportId) : null,
);
const sourceReport = ref(null);
/** UI/UX backlog #18: `?vehicleId=` (the vehicle page's "New maintenance need") fills in the vehicle and returns to it. */
const fromVehicleId = computed(() =>
  isCreate.value && !fromReportId.value && /^\d+$/.test(String(route.query.vehicleId ?? "")) ? Number(route.query.vehicleId) : null,
);
const doneRoute = () => {
  if (fromReportId.value) return { name: "issueReport", params: { issueReportId: fromReportId.value } };
  if (fromVehicleId.value) return { name: "vehicleDetails", params: { id: fromVehicleId.value } };
  return { name: "maintenance-needs" };
};
const needId = computed(() => route.params.id);

const loading = ref(true);
const loadError = ref("");
const formError = ref("");
const saving = ref(false);
/** The saved need (an existing need's page): what the details card shows and what "Edit details" starts from. */
const loadedNeed = ref(null);
const formRef = ref(null);
const heading = computed(() => (isCreate.value ? "New Maintenance Need" : loadedNeed.value?.title || "Maintenance Need"));

/** UI/UX backlog #37: the page had no breadcrumbs. From an issue report, the trail goes back to it. */
const breadcrumbs = computed(() => [
  fromReportId.value
    ? { title: "Issue report", to: { name: "issueReport", params: { issueReportId: fromReportId.value } } }
    : { title: "Maintenance Needs", to: { name: "maintenance-needs" } },
  { title: heading.value, disabled: true },
]);

/** UI/UX backlog #21: who created the need, so maintenance knows who to ask. */
const createdBy = computed(() => {
  const need = loadedNeed.value;
  if (!need) return "";
  const who = need.author ? fullName(need.author) : "Unknown";
  return `Created by ${who} on ${formatDay(String(need.createdAt).slice(0, 10))}`;
});
const vehicles = ref([]);
const assignees = ref([]);

const todayString = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const blank = () => ({
  title: "",
  assigneeId: null,
  outOfService: true,
  priority: "None",
  status: "Open",
  resolvedAt: null,
  vehicleId: null,
  description: "",
  issueReportId: null,
});

const fromNeed = (need) => ({
  title: need.title ?? "",
  assigneeId: need.assigneeId,
  outOfService: need.outOfService,
  priority: need.priority,
  status: need.status,
  resolvedAt: need.resolvedAt,
  vehicleId: need.vehicleId,
  description: need.description ?? "",
  issueReportId: need.issueReportId,
});

const form = ref(blank());

// UI/UX backlog #31: ask before leaving with unsaved changes. `baseline` is the form as loaded or last saved.
const baseline = ref("");
const snapshot = () => {
  baseline.value = JSON.stringify(form.value);
};
const dirty = computed(() => baseline.value !== "" && JSON.stringify(form.value) !== baseline.value);
/** Like a vehicle's page: an existing need reads as text, and "Edit details" opens the fields in a dialog. */
const editOpen = ref(false);
const { allowLeave } = useUnsavedChanges(computed(() => (isCreate.value || editOpen.value) && dirty.value));

// UI/UX backlog #37: the same vehicle label as everywhere else ("V-100 · 2015 Toyota Sienna").
const vehicleItems = computed(() => {
  const rows =
    hasRole("admin") || hasRole("maintenance")
      ? vehicles.value
      : vehicles.value.filter((vehicle) => areaAdminAreaIds.value.map(Number).includes(Number(vehicle.areaId)));

  return rows.map((vehicle) => ({ title: vehicleLabel(vehicle), value: vehicle.id, status: vehicle.condition?.status }));
});

/** Admins and the trip's area admins can open its request; maintenance users can't (Feature 8). */
const canOpenTrip = (trip) => hasRole("admin") || areaAdminAreaIds.value.map(Number).includes(Number(trip.area?.id));

const vehicleStatus = (id) => vehicles.value.find((vehicle) => vehicle.id === id)?.condition?.status;

/**
 * Feature 18, US-18.11: taking a vehicle out of service warns about the trips it's booked for,
 * so whoever manages them can be told.
 */
const { data: upcomingTrips, loading: tripsLoading, run: getUpcomingTrips } = useRequest(vehicleServices.getVehicle, {
  initial: [],
  select: (res) => res?.data?.upcomingTrips ?? [],
});

const takesOutOfService = computed(
  () => !!form.value.vehicleId && form.value.outOfService === true && ["Open", "In Progress"].includes(form.value.status),
);
const affectedTrips = computed(() => (takesOutOfService.value ? upcomingTrips.value : []));

watch(
  () => form.value.vehicleId,
  (vehicleId) => {
    upcomingTrips.value = [];
    if (vehicleId) getUpcomingTrips(vehicleId);
  },
);

const assigneeItems = computed(() =>
  assignees.value.map((person) => ({ title: `${person.firstName} ${person.lastName}`, value: person.id })),
);

const isClosed = (status) => status === "Completed" || status === "Canceled";

watch(
  () => form.value.status,
  (status) => {
    if (isClosed(status) && !form.value.resolvedAt) {
      form.value.resolvedAt = todayString();
    }
    // UI/UX backlog #62: reopening clears the date, so closing again records the new day.
    if (status === "Open" || status === "In Progress") {
      form.value.resolvedAt = null;
    }
  },
);

const cancel = () => {
  allowLeave();
  router.push(doneRoute());
};

/** UI/UX backlog #28: maintenance-only users can't open issue reports, so they don't get a link to one. */
const canOpenReports = computed(() => canOpen(router.resolve({ name: "issue-reports" })));

/* ---------- The details card: the saved need, read as text ---------- */
const savedVehicle = computed(() => {
  const need = loadedNeed.value;
  return vehicles.value.find(({ id }) => id === need?.vehicleId) ?? need?.vehicle ?? null;
});
const savedAssignee = computed(() => {
  const need = loadedNeed.value;
  const person = assignees.value.find(({ id }) => id === need?.assigneeId) ?? need?.assignee;
  return person ? fullName(person) : "";
});

/**
 * The vehicle's next trip (or the one it's on now), soonest first from `GET /api/vehicles/:id`. Only while the trips
 * loaded are this need's vehicle's: the edit dialog can point the form at another vehicle before saving.
 */
const nextTrip = computed(() =>
  String(form.value.vehicleId) === String(loadedNeed.value?.vehicleId) ? (upcomingTrips.value[0] ?? null) : null,
);

const statusActionLabel = computed(() => (loadedNeed.value?.status === "Open" ? "Mark in progress" : "Mark completed"));
const statusActionDisabled = computed(() => !["Open", "In Progress"].includes(loadedNeed.value?.status));

const payloadOf = (values) => ({
  title: values.title.trim(),
  assigneeId: values.assigneeId || null,
  vehicleId: values.vehicleId,
  description: values.description.trim() || null,
  outOfService: values.outOfService,
  priority: values.priority,
  status: values.status,
  resolvedAt: isClosed(values.status) ? values.resolvedAt : null,
  authorId: user.value?.userId ?? null,
  issueReportId: values.issueReportId,
});

/** Saves `values` over the need and shows what was saved. Returns whether it worked. */
const update = async (values, successMessage) => {
  formError.value = "";
  saving.value = true;
  try {
    const { data: saved } = await maintenanceNeedServices.updateMaintenanceNeed(needId.value, payloadOf(values));
    loadedNeed.value = saved ? { ...loadedNeed.value, ...saved } : { ...loadedNeed.value, ...payloadOf(values) };
    notify(successMessage);
    return true;
  } catch (error) {
    if (error.response?.status === 403) {
      await router.push({ name: "home" });
      return false;
    }
    formError.value = error.response?.data?.message || "Failed to save maintenance need.";
    if (!editOpen.value) notify(formError.value, { tone: "error" });
    return false;
  } finally {
    saving.value = false;
  }
};

/** "Mark in progress" / "Mark completed": one step forward, saved right away (UI/UX backlog #22). */
const setStatus = (status) =>
  update(
    { ...fromNeed(loadedNeed.value), status, resolvedAt: isClosed(status) ? todayString() : null },
    `Marked ${status.toLowerCase()}.`,
  );

const markStatus = () => {
  const status = loadedNeed.value?.status;
  if (status === "Open") return setStatus("In Progress");
  if (status === "In Progress") return setStatus("Completed");
  return undefined;
};

/* ---------- "Edit details" ---------- */
const openEdit = () => {
  form.value = fromNeed(loadedNeed.value);
  snapshot();
  formError.value = "";
  editOpen.value = true;
};

const closeEdit = () => {
  if (saving.value) return;
  editOpen.value = false;
  form.value = fromNeed(loadedNeed.value);
  snapshot();
};

/* ---------- UI/UX backlog #23: log the service from the need itself, then go to it ---------- */
const serviceLogOpen = ref(false);
const serviceUsers = ref([]);
const serviceTypes = ref([]);

const openServiceLog = async () => {
  const [typeResult, optionResult] = await Promise.allSettled([
    serviceTypeServices.getServiceTypes(),
    maintenanceNeedServices.getMaintenanceNeedOptions(),
  ]);
  serviceTypes.value = typeResult.status === "fulfilled" ? typeResult.value.data : [];
  serviceUsers.value =
    optionResult.status === "fulfilled" ? optionResult.value.data.assignees.map((person) => ({ ...person, label: fullName(person) })) : [];
  serviceLogOpen.value = true;
};

/**
 * The work logged against this need: its vehicle's service logs that name it, one entry per visit (services sharing
 * one odometer reading), newest first. Each links to the vehicle's service log.
 */
const { data: needLogs, loading: needLogsLoading, error: needLogsError, run: getNeedLogs } = useRequest(
  serviceLogServices.getServiceLogsByVehicle,
  {
    initial: [],
    fallback: "Couldn't load this need's service logs.",
    select: (res) => (res?.data ?? []).filter((log) => String(log.maintenanceNeedId) === String(needId.value)),
  },
);
const needVisits = computed(() => groupVisits(needLogs.value));

const createServiceLog = async (payload, { completeNeed = false } = {}) => {
  const vehicleId = loadedNeed.value.vehicleId;
  await serviceLogServices.createServiceLog({ ...payload, vehicleId: Number(vehicleId), maintenanceNeedId: Number(needId.value) });
  // UI/UX backlog #25: logging the work can close the need in the same step.
  if (completeNeed && ["Open", "In Progress"].includes(loadedNeed.value.status)) {
    await setStatus("Completed");
  }
  notify(completeNeed ? "Service log created and the maintenance need marked completed." : "Service log created.");
  // Your call: stay on the need; its Service logs card shows the new visit.
  await getNeedLogs(vehicleId);
};

/** New Maintenance Need's Create, or the "Edit details" dialog's Save. */
const submit = async () => {
  // Field-level errors (UI/UX backlog #29); the form's own submit also fires on Enter (#30).
  const { valid } = (await formRef.value?.validate()) ?? { valid: true };
  if (!valid || !form.value.title.trim()) {
    formError.value = "";
    return;
  }

  if (!isCreate.value) {
    if (await update(form.value, "Changes saved.")) {
      editOpen.value = false;
      form.value = fromNeed(loadedNeed.value);
      snapshot();
    }
    return;
  }

  formError.value = "";
  saving.value = true;
  try {
    const response = await maintenanceNeedServices.createMaintenanceNeed(payloadOf(form.value));
    if (response.status !== 201 && response.status !== 200) {
      formError.value = "Failed to save maintenance need.";
      return;
    }
    allowLeave();
    notify(fromReportId.value ? "Maintenance need created. This report is now Moved to maintenance." : "Maintenance need created.");
    await router.push(doneRoute());
  } catch (error) {
    if (error.response?.status === 403) {
      await router.push({ name: "home" });
      return;
    }
    formError.value = error.response?.data?.message || "Failed to save maintenance need.";
  } finally {
    saving.value = false;
  }
};

const load = async () => {
  loading.value = true;
  loadError.value = "";

  try {
    const { data } = await maintenanceNeedServices.getMaintenanceNeedOptions();
    vehicles.value = data.vehicles ?? [];
    assignees.value = data.assignees ?? [];

    if (isCreate.value && hasRole("maintenance")) {
      const current = user.value;
      if (current && !assignees.value.some((person) => person.id === current.userId)) {
        assignees.value = [
          { id: current.userId, firstName: current.firstName, lastName: current.lastName },
          ...assignees.value,
        ];
      }
      form.value.assigneeId = current?.userId ?? null;
    }

    if (fromVehicleId.value && vehicles.value.some(({ id }) => id === fromVehicleId.value)) {
      form.value = { ...form.value, vehicleId: fromVehicleId.value };
    }

    if (fromReportId.value) {
      const { data: report } = await issueReportServices.getIssueReport(fromReportId.value);
      sourceReport.value = report;
      // A need's assignee must be maintenance staff; keep the report's assignee only if they are.
      const assigneeId = assignees.value.some((person) => person.id === report.assigneeId) ? report.assigneeId : form.value.assigneeId;
      form.value = {
        ...form.value,
        title: needTitleFrom(report.description),
        vehicleId: report.vehicleId,
        description: report.description ?? "",
        assigneeId,
        outOfService: true,
        priority: "None",
        status: "Open",
        resolvedAt: null,
        issueReportId: report.id,
      };
    }

    if (!isCreate.value) {
      const { data: need } = await maintenanceNeedServices.getMaintenanceNeed(needId.value);
      loadedNeed.value = need;
      getNeedLogs(need.vehicleId);
      form.value = fromNeed(need);
    }
  } catch (error) {
    if (error.response?.status === 403) {
      await router.push({ name: "home" });
      return;
    }
    loadError.value = error.response?.data?.message || "Failed to fetch maintenance need.";
  } finally {
    loading.value = false;
    snapshot();
  }
};

/** UI/UX backlog #36: delete lives in the page's ⋮ menu, not on every list row. */
const confirmDelete = useConfirm();
const deleteNeed = async () => {
  const deleted = await confirmDelete({
    title: "Delete maintenance need",
    message: `Delete "${loadedNeed.value?.title ?? heading.value}"? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => maintenanceNeedServices.removeMaintenanceNeed(route.params.id),
  });

  if (deleted) {
    notify("Maintenance need deleted.");
    allowLeave();
    await router.push(doneRoute());
  }
};

load();
</script>

<template>
  <PageShell :title="heading" :subtitle="createdBy" :breadcrumbs :loading :error="loadError" :max-width="1040" centered>
    <template v-if="!isCreate" #actions>
      <v-btn color="primary" variant="outlined" class="oc-cta" data-test="need-new-service-log" @click="openServiceLog">
        + New Service Log
      </v-btn>
      <v-btn color="primary" variant="elevated" class="oc-cta" :disabled="statusActionDisabled || saving" @click="markStatus">
        {{ statusActionLabel }}
      </v-btn>
      <MoreActionsMenu>
        <v-list-item
          prepend-icon="mdi-delete-outline"
          title="Delete maintenance need"
          base-color="error"
          data-test="delete-need"
          @click="deleteNeed"
        />
      </MoreActionsMenu>
    </template>

    <!-- New Maintenance Need: the whole page is the form. -->
    <template v-if="isCreate">
      <v-alert
        v-if="sourceReport"
        type="info"
        variant="tonal"
        density="compact"
        icon="mdi-link-variant"
        class="mb-6"
        data-test="from-issue-report"
      >
        Filled in from the issue report <strong>{{ typeLabel(sourceReport.type) }} · {{ sourceReport.vehicle?.universityId }}</strong>.
        Check the details, then create it. The new need stays linked to that report, and the report is closed as
        <strong>Moved to maintenance</strong>.
      </v-alert>

      <!-- UI/UX backlog #50: the standard form sections, like the driver and destination forms. -->
      <v-form ref="formRef" @submit.prevent="submit">
        <MaintenanceNeedFields
          v-model="form"
          :vehicle-items="vehicleItems"
          :assignee-items="assigneeItems"
          :vehicle-status="vehicleStatus"
          :affected-trips="affectedTrips"
          :can-open-trip="canOpenTrip"
        />

        <v-divider />
        <v-alert v-if="formError" type="error" density="compact" class="mt-6">{{ formError }}</v-alert>
        <div class="d-flex justify-end ga-2 pt-6">
          <v-btn color="secondary" variant="text" :disabled="saving" @click="cancel">Cancel</v-btn>
          <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :disabled="saving">
            {{ saving ? "Saving…" : "Create" }}
          </v-btn>
        </div>
      </v-form>
    </template>

    <div v-else-if="loadedNeed" class="d-flex flex-column ga-6">
      <!-- An existing need reads as text; "Edit details" changes it in a dialog, like a vehicle's page. -->
      <SectionCard title="Details" data-test="need-details">
        <template #append>
          <v-btn variant="tonal" color="primary" class="oc-cta" prepend-icon="mdi-pencil-outline" data-test="edit-need" @click="openEdit">
            Edit details
          </v-btn>
        </template>
        <dl class="need-facts">
          <dt>Status</dt>
          <dd>
            <v-chip size="small" :color="NEED_STATUS_COLORS[loadedNeed.status]" variant="tonal" label data-test="need-status">
              {{ needStatusLabel(loadedNeed.status) }}
            </v-chip>
            <span v-if="isClosed(loadedNeed.status) && loadedNeed.resolvedAt" class="text-medium-emphasis ml-2" data-test="need-resolved">
              {{ loadedNeed.status === "Canceled" ? "Cancelled" : "Resolved" }} {{ formatDay(String(loadedNeed.resolvedAt).slice(0, 10)) }}
            </span>
          </dd>
          <dt>Priority</dt>
          <dd>
            <v-chip v-if="loadedNeed.priority !== 'None'" size="small" :color="NEED_PRIORITY_COLORS[loadedNeed.priority]" variant="tonal" label>
              {{ loadedNeed.priority }}
            </v-chip>
            <span v-else class="text-medium-emphasis">None</span>
          </dd>
          <dt>Vehicle</dt>
          <dd>
            <router-link v-if="savedVehicle" :to="{ name: 'vehicleDetails', params: { id: savedVehicle.id } }" class="need-link">
              {{ vehicleLabel(savedVehicle) }}
            </router-link>
            <span v-else>—</span>
          </dd>
          <dt>Next trip</dt>
          <dd data-test="need-next-trip">
            <template v-if="nextTrip">
              <router-link v-if="canOpenTrip(nextTrip)" :to="{ name: 'request', params: { requestId: nextTrip.id } }" class="need-link">
                {{ formatTripDates(nextTrip) }}
              </router-link>
              <template v-else>{{ formatTripDates(nextTrip) }}</template>
            </template>
            <span v-else-if="!tripsLoading" class="text-medium-emphasis">No upcoming trips</span>
          </dd>
          <dt>Out of service</dt>
          <dd :class="{ 'text-error font-weight-medium': loadedNeed.outOfService && !isClosed(loadedNeed.status) }" data-test="need-out-of-service">
            {{ loadedNeed.outOfService ? (isClosed(loadedNeed.status) ? "Was, until the need closed" : "Yes, until the need closes") : "No" }}
          </dd>
          <dt>Assignee</dt>
          <dd>
            <template v-if="savedAssignee">{{ savedAssignee }}</template>
            <span v-else class="text-medium-emphasis">Unassigned</span>
          </dd>
          <template v-if="canOpenReports && loadedNeed.issueReportId">
            <dt>From</dt>
            <dd>
              <router-link :to="{ name: 'issueReport', params: { issueReportId: loadedNeed.issueReportId } }" class="need-link" data-test="view-issue-report">
                View issue report
              </router-link>
            </dd>
          </template>
        </dl>
        <template v-if="loadedNeed.description">
          <v-divider class="my-4" />
          <p class="need-description mb-0" data-test="need-description">{{ loadedNeed.description }}</p>
        </template>
      </SectionCard>

      <SectionCard
        title="Service logs"
        :subtitle="needVisits.length ? `${needVisits.length} ${needVisits.length === 1 ? 'visit' : 'visits'} logged for this need` : ''"
        data-test="need-service-logs"
      >
        <template #append>
          <v-btn variant="text" color="primary" class="oc-cta" @click="openServiceLog">+ New Service Log</v-btn>
        </template>
        <v-skeleton-loader v-if="needLogsLoading" type="list-item-two-line@2" />
        <v-alert v-else-if="needLogsError" type="error" density="compact">{{ needLogsError }}</v-alert>
        <p v-else-if="!needVisits.length" class="text-body-medium text-medium-emphasis mb-0" data-test="need-service-logs-empty">
          No service logged for this need yet.
        </p>
        <ul v-else class="need-visits">
          <li v-for="visit in needVisits" :key="visit.id" class="need-visit" data-test="need-visit">
            <router-link :to="{ name: 'service-logs', params: { vehicleId: loadedNeed.vehicleId } }" class="need-visit__link">
              <div class="need-visit__main">
                <div class="text-body-large font-weight-medium">{{ formatDay(visit.servicedAt) }}</div>
                <div class="text-body-small text-medium-emphasis">{{ visit.people.length ? `by ${visit.people.join(", ")}` : "" }}</div>
                <div class="d-flex flex-wrap ga-1 mt-1">
                  <v-chip v-for="name in visit.services.slice(0, 2)" :key="name" size="small" variant="tonal" label>{{ name }}</v-chip>
                  <v-chip v-if="visit.services.length > 2" size="small" variant="outlined" label :title="visit.services.slice(2).join(', ')">
                    +{{ visit.services.length - 2 }}
                  </v-chip>
                </div>
              </div>
              <div v-if="visit.miles !== ''" class="text-body-medium text-medium-emphasis">{{ formatMiles(visit.miles) }}</div>
            </router-link>
          </li>
        </ul>
      </SectionCard>

      <SectionCard title="Notes" data-test="maintenance-need-notes">
        <NotesThread parent-key="maintenanceNeedId" :parent-id="needId" />
      </SectionCard>
    </div>

    <!-- Edit details: the same fields as New Maintenance Need, in a dialog that keeps the page behind it. -->
    <v-dialog
      v-if="!isCreate"
      v-model="editOpen"
      max-width="880"
      scrollable
      :fullscreen="$vuetify.display.xs"
      :persistent="saving || dirty"
    >
      <v-form ref="formRef" class="h-100" @submit.prevent="submit">
        <v-card rounded="lg" data-test="edit-need-dialog">
          <v-card-item>
            <v-card-title>Edit details</v-card-title>
            <v-card-subtitle>{{ heading }}</v-card-subtitle>
          </v-card-item>
          <v-divider />
          <v-card-text class="px-6">
            <MaintenanceNeedFields
              v-model="form"
              :vehicle-items="vehicleItems"
              :assignee-items="assigneeItems"
              :vehicle-status="vehicleStatus"
              :affected-trips="affectedTrips"
              :can-open-trip="canOpenTrip"
            />
            <v-alert v-if="formError" type="error" density="compact" class="mt-4">{{ formError }}</v-alert>
          </v-card-text>
          <v-divider />
          <v-card-actions class="px-6 py-4">
            <v-spacer />
            <v-btn color="secondary" variant="text" :disabled="saving" data-test="edit-need-cancel" @click="closeEdit">Cancel</v-btn>
            <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :disabled="saving" :aria-busy="saving">
              {{ saving ? "Saving…" : "Save" }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>

    <ServiceLogFormModal
      v-if="!isCreate"
      v-model="serviceLogOpen"
      :users="serviceUsers"
      :service-types="serviceTypes"
      :maintenance-needs="loadedNeed ? [loadedNeed] : []"
      :preset-need-id="loadedNeed?.id ?? null"
      lock-need
      offer-complete-need
      :save="createServiceLog"
    />
  </PageShell>
</template>

<style scoped>
.need-facts {
  display: grid;
  grid-template-columns: minmax(120px, auto) 1fr;
  align-items: center;
  gap: 10px 24px;
  margin: 0;
}

@media (min-width: 960px) {
  .need-facts {
    grid-template-columns: minmax(120px, auto) 1fr minmax(120px, auto) 1fr;
  }
}

.need-facts dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.need-facts dd {
  margin: 0;
}

.need-description {
  white-space: pre-line;
}

.need-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.need-link:hover,
.need-link:focus-visible {
  text-decoration: underline;
}

.v-btn.oc-cta:disabled {
  opacity: 1;
  background-color: rgba(var(--v-theme-on-surface), 0.12) !important;
  color: rgba(var(--v-theme-on-surface), 0.38) !important;
  box-shadow: none !important;
}

.need-visits {
  list-style: none;
  margin: 0;
  padding: 0;
}

.need-visit + .need-visit {
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.need-visit__link {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  color: inherit;
  text-decoration: none;
}

.need-visit__link:hover .text-body-large,
.need-visit__link:focus-visible .text-body-large {
  text-decoration: underline;
}
</style>
