<script setup>
/**
 * UI/UX backlog #13: what a person has done — their trips, the issue reports they filed or were assigned, and
 * (for maintenance users) the maintenance needs they created or are working. Replaces the "Coming soon" tabs on the
 * user page and fills the profile page.
 *
 * `self` loads through the endpoints a person may use for themselves; otherwise the viewer is an admin and the lists
 * come from the admin endpoints, filtered to `person`.
 */
import { computed, ref, watch } from "vue";
import { needStatusLabel } from "../../models/maintenanceNeeds.js";
import requestServices from "../../services/requestServices.js";
import issueReportServices from "../../services/issueReportServices.js";
import maintenanceNeedServices from "../../services/maintenanceNeedServices.js";
import Utils from "../../config/utils.js";
import RequestStatusChip from "../requests/RequestStatusChip.vue";
import { formatTripDates, tripBounds, tripTitle } from "../../models/requests.js";
import { statusDetails, statusLabel, typeLabel } from "../../models/issueReports.js";

const props = defineProps({
  /** `{ id, roles }` — the person whose activity is shown. */
  person: { type: Object, required: true },
  self: Boolean,
});

const SHOWN = 10;

const holds = (role) => props.person.roles.some((held) => held.role === role);
// UI/UX backlog #28: someone whose only role is maintenance doesn't use issue reports.
const maintenanceOnly = computed(() => props.person.roles.length > 0 && props.person.roles.every(({ role }) => role === "maintenance"));
const showsMaintenance = computed(() => holds("maintenance"));

const tab = ref("requests");
const lists = ref({ requests: [], issues: [], maintenance: [] });
const errors = ref({ requests: "", issues: "", maintenance: "" });
const loading = ref(false);

const newestFirst = (rows, date) => [...rows].sort((a, b) => new Date(date(b)) - new Date(date(a)));

const loaders = {
  requests: async () => {
    const { data } = props.self ? await requestServices.getMyRequests() : await requestServices.getRequests();
    const mine = props.self ? data : data.filter((request) => request.userId === props.person.id);
    return newestFirst(mine, (request) => tripBounds(request)[0]);
  },
  issues: async () => {
    const { data } = await issueReportServices.getIssueReports(props.self ? { userId: props.person.id } : undefined);
    const mine = data.filter((report) => report.authorId === props.person.id || report.assigneeId === props.person.id);
    return newestFirst(mine, (report) => report.createdAt);
  },
  maintenance: async () => {
    const { data } = await maintenanceNeedServices.getMaintenanceNeeds();
    const mine = data.filter((need) => need.assigneeId === props.person.id || need.authorId === props.person.id);
    return newestFirst(mine, (need) => need.createdAt);
  },
};

const tabs = computed(() => [
  { value: "requests", title: "Requests" },
  ...(maintenanceOnly.value ? [] : [{ value: "issues", title: "Issue reports" }]),
  ...(showsMaintenance.value ? [{ value: "maintenance", title: "Maintenance" }] : []),
]);

const load = async () => {
  loading.value = true;
  await Promise.all(
    tabs.value.map(async ({ value }) => {
      errors.value[value] = "";
      try {
        // Await first: spreading `lists.value` before the await would let the lists overwrite each other.
        const rows = await loaders[value]();
        lists.value = { ...lists.value, [value]: rows };
      } catch (error) {
        errors.value[value] = Utils.errorMessage(error, "Couldn't load this list.");
      }
    }),
  );
  loading.value = false;
};

watch(() => props.person.id, load, { immediate: true });

// Keep the selected tab valid when a tab disappears.
watch(tabs, (list) => {
  if (!list.some((item) => item.value === tab.value)) tab.value = list[0].value;
});

const EMPTY = {
  requests: (self) => (self ? "You haven't requested any trips yet." : "No trips requested yet."),
  issues: (self) => (self ? "You haven't reported or been assigned any issues." : "No issue reports filed or assigned."),
  maintenance: (self) => (self ? "No maintenance needs assigned to you or created by you." : "No maintenance needs assigned or created."),
};

const formatDay = (value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const relation = (row) => (row.assigneeId === props.person.id ? "Assigned" : props.self ? "You reported" : "Reported");
const needRelation = (need) => (need.assigneeId === props.person.id ? "Assigned" : "Created");
</script>

<template>
  <v-card>
    <v-tabs v-model="tab" color="primary" class="px-2">
      <v-tab v-for="item in tabs" :key="item.value" :value="item.value" :data-test="`activity-tab-${item.value}`">
        {{ item.title }}
        <span v-if="!loading && lists[item.value].length" class="text-medium-emphasis ml-1">{{ lists[item.value].length }}</span>
      </v-tab>
    </v-tabs>
    <v-divider />

    <v-tabs-window v-model="tab">
      <v-tabs-window-item v-for="item in tabs" :key="item.value" :value="item.value">
        <div class="pa-4" :data-test="`activity-${item.value}`">
          <v-skeleton-loader v-if="loading" type="list-item-two-line@3" />
          <v-alert v-else-if="errors[item.value]" type="error" density="compact">{{ errors[item.value] }}</v-alert>
          <!-- Text only (no stock icon), per the empty-state rule in docs/ui-ux-backlog.md. -->
          <p v-else-if="!lists[item.value].length" class="text-body-medium text-medium-emphasis text-center py-6 mb-0">
            {{ EMPTY[item.value](self) }}
          </p>

          <v-list v-else-if="item.value === 'requests'" density="compact" class="py-0 bg-transparent">
            <v-list-item
              v-for="request in lists.requests.slice(0, SHOWN)"
              :key="request.id"
              :to="{ name: 'request', params: { requestId: request.id } }"
              :title="tripTitle(request)"
              :subtitle="`${formatTripDates(request)} · ${request.area?.name ?? ''}`"
              class="activity-row px-2"
            >
              <template #append><RequestStatusChip :status="request.status" /></template>
            </v-list-item>
          </v-list>

          <v-list v-else-if="item.value === 'issues'" density="compact" class="py-0 bg-transparent">
            <v-list-item
              v-for="report in lists.issues.slice(0, SHOWN)"
              :key="report.id"
              :to="{ name: 'issueReport', params: { issueReportId: report.id } }"
              :subtitle="`${typeLabel(report.type)} · ${report.vehicle?.universityId ?? ''} · ${relation(report)} ${formatDay(report.createdAt)}`"
              class="activity-row px-2"
            >
              <v-list-item-title class="text-truncate" :title="report.description">{{ report.description }}</v-list-item-title>
              <template #append>
                <v-chip :color="statusDetails(report.status).color" size="small" variant="tonal" label>
                  {{ statusLabel(report.status) }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>

          <v-list v-else density="compact" class="py-0 bg-transparent">
            <v-list-item
              v-for="need in lists.maintenance.slice(0, SHOWN)"
              :key="need.id"
              :to="{ name: 'maintenanceNeedEdit', params: { id: need.id } }"
              :title="need.title"
              :subtitle="`${need.vehicle?.universityId ?? ''} · ${need.priority} priority · ${needRelation(need)}`"
              class="activity-row px-2"
            >
              <template #append>
                <v-chip size="small" variant="tonal" label>{{ needStatusLabel(need.status) }}</v-chip>
              </template>
            </v-list-item>
          </v-list>

          <div
            v-if="!loading && lists[item.value].length > SHOWN"
            class="text-body-small text-medium-emphasis mt-2 px-2"
          >
            Showing the latest {{ SHOWN }} of {{ lists[item.value].length }}.
          </div>
        </div>
      </v-tabs-window-item>
    </v-tabs-window>
  </v-card>
</template>

<style scoped>
.activity-row + .activity-row {
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
