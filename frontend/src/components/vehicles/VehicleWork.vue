<script setup>
/**
 * UI/UX backlog #20: what's happening with a vehicle beyond its status, in tabs: its service visits and odometer
 * readings, every maintenance need (open first), its open issue reports, and the trips it has been on. The status card
 * above covers what's due, the mileage estimate, out-of-service needs, and upcoming trips.
 *
 * It opens on the tab last picked on a vehicle page; before one has been, on Maintenance needs when any are open, and on
 * Service visits when none are.
 */
import { computed, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import RecentMileageLogs from "./RecentMileageLogs.vue";
import RecentServiceVisits from "./RecentServiceVisits.vue";
import { needStatusLabel } from "../../models/maintenanceNeeds.js";
import maintenanceNeedServices from "../../services/maintenanceNeedServices.js";
import issueReportServices from "../../services/issueReportServices.js";
import Utils from "../../config/utils.js";
import SectionCard from "../layout/SectionCard.vue";
import RequestStatusChip from "../requests/RequestStatusChip.vue";
import { formatTripDates } from "../../models/requests.js";
import { statusDetails, statusLabel, typeLabel } from "../../models/issueReports.js";

const props = defineProps({
  vehicleId: { type: [String, Number], required: true },
  /** `recentTrips` from `GET /vehicles/:id`. */
  recentTrips: { type: Array, default: () => [] },
  /** Maintenance-only users can't open issue reports (UI/UX backlog #28). */
  showIssues: Boolean,
  /** Whether the signed-in user may open a trip's request page. */
  canOpenTrip: { type: Function, default: () => false },
  /** The vehicle's mileage and service logs, newest first (the page loads them; adding one reloads them). */
  mileageLogs: { type: Array, default: () => [] },
  mileageLogsError: { type: String, default: "" },
  serviceLogs: { type: Array, default: () => [] },
  serviceLogsError: { type: String, default: "" },
});
defineEmits(["add-mileage-log", "add-service-log"]);

const SHOWN = 5;
const OPEN_NEED = ["Open", "In Progress"];

/* The tab last picked on a vehicle page, kept in this browser only (a per-viewer convenience). */
const TAB_KEY = "view:vehicle-work-tab";
const TABS = ["service", "mileage", "needs", "issues", "trips"];
const rememberedTab = () => {
  try {
    const saved = localStorage.getItem(TAB_KEY);
    return TABS.includes(saved) ? saved : null;
  } catch {
    return null;
  }
};
const tab = ref(rememberedTab());
/** Only a click is remembered, not the starting choice. */
const pickTab = (value) => {
  tab.value = value;
  try {
    localStorage.setItem(TAB_KEY, value);
  } catch {
    // Storage unavailable: the choice lasts until the page closes.
  }
};
const needs = ref([]);
const issues = ref([]);
const error = ref("");
const loading = ref(false);

const load = async () => {
  loading.value = true;
  error.value = "";
  try {
    const [needResult, issueResult] = await Promise.all([
      maintenanceNeedServices.getMaintenanceNeeds(),
      props.showIssues ? issueReportServices.getIssueReports({ vehicleId: props.vehicleId }) : null,
    ]);
    const mine = needResult.data.filter((need) => String(need.vehicleId) === String(props.vehicleId));
    // Open work first, then newest.
    needs.value = mine.sort(
      (a, b) => Number(OPEN_NEED.includes(b.status)) - Number(OPEN_NEED.includes(a.status)) || new Date(b.createdAt) - new Date(a.createdAt),
    );
    issues.value = (issueResult?.data ?? []).filter((report) => report.status === "pending");
    if (!tab.value || (tab.value === "issues" && !props.showIssues)) {
      tab.value = needs.value.some((need) => OPEN_NEED.includes(need.status)) ? "needs" : "service";
    }
  } catch (err) {
    error.value = Utils.errorMessage(err, "Couldn't load this vehicle's work.");
    tab.value ??= "service";
  } finally {
    loading.value = false;
  }
};

watch(() => props.vehicleId, load, { immediate: true });

/* Phones get short labels so all five fit, or nearly (the tabs scroll if not). */
const { xs } = useDisplay();
const tabs = computed(() => [
  { value: "service", title: xs.value ? "Service" : "Service visits", count: 0 },
  { value: "mileage", title: "Mileage", count: 0 },
  { value: "needs", title: xs.value ? "Needs" : "Maintenance needs", count: needs.value.filter((need) => OPEN_NEED.includes(need.status)).length },
  ...(props.showIssues ? [{ value: "issues", title: xs.value ? "Issues" : "Issue reports", count: issues.value.length }] : []),
  { value: "trips", title: xs.value ? "Trips" : "Recent trips", count: 0 },
]);

const formatDay = (value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
</script>

<template>
  <SectionCard title="Work and history" data-test="vehicle-work">
    <!--
      Not until the starting tab is known: an empty v-tabs picks its first tab itself, which would be remembered.
      Phones get chips that wrap instead, so all five stay in sight without scrolling.
    -->
    <v-chip-group
      v-if="tab && xs"
      :model-value="tab"
      mandatory
      selected-class="text-primary"
      column
      class="mb-2"
      @update:model-value="pickTab"
    >
      <v-chip v-for="item in tabs" :key="item.value" :value="item.value" size="small" variant="outlined" filter :data-test="`vehicle-work-tab-${item.value}`">
        {{ item.title }}
        <v-badge v-if="item.count" :content="item.count" color="primary" inline class="ml-1" />
      </v-chip>
    </v-chip-group>
    <v-tabs v-else-if="tab" :model-value="tab" color="primary" density="compact" show-arrows class="mb-2" @update:model-value="pickTab">
      <v-tab v-for="item in tabs" :key="item.value" :value="item.value" :data-test="`vehicle-work-tab-${item.value}`">
        {{ item.title }}
        <!-- Open work only: how many needs or reports are waiting. -->
        <v-badge v-if="item.count" :content="item.count" color="primary" inline class="ml-1" />
      </v-tab>
    </v-tabs>

    <v-skeleton-loader v-if="!tab" type="list-item-two-line@2" />
    <v-tabs-window v-else v-model="tab">
      <v-tabs-window-item value="service">
        <RecentServiceVisits :logs="serviceLogs" :error="serviceLogsError" :vehicle-id="vehicleId" @add="$emit('add-service-log')" />
      </v-tabs-window-item>

      <v-tabs-window-item value="mileage">
        <RecentMileageLogs :logs="mileageLogs" :error="mileageLogsError" :vehicle-id="vehicleId" @add="$emit('add-mileage-log')" />
      </v-tabs-window-item>

      <!-- Text-only empty states (no stock icons; see docs/ui-ux-backlog.md #46). -->
      <v-tabs-window-item value="needs">
        <v-skeleton-loader v-if="loading" type="list-item-two-line@2" />
        <v-alert v-else-if="error" type="error" density="compact">{{ error }}</v-alert>
        <p v-else-if="!needs.length" class="text-body-medium text-medium-emphasis py-4 mb-0">No maintenance needs for this vehicle.</p>
        <v-list v-else density="compact" class="py-0 bg-transparent">
          <v-list-item
            v-for="need in needs.slice(0, SHOWN)"
            :key="need.id"
            :to="{ name: 'maintenanceNeedEdit', params: { id: need.id } }"
            :title="need.title"
            :subtitle="`${need.priority} priority · created ${formatDay(need.createdAt)}`"
            class="work-row px-0"
          >
            <template #append><v-chip size="small" variant="tonal" label>{{ needStatusLabel(need.status) }}</v-chip></template>
          </v-list-item>
        </v-list>
        <div v-if="needs.length > SHOWN" class="text-body-small text-medium-emphasis mt-2">
          Showing {{ SHOWN }} of {{ needs.length }}.
        </div>
      </v-tabs-window-item>

      <v-tabs-window-item v-if="showIssues" value="issues">
        <v-skeleton-loader v-if="loading" type="list-item-two-line@2" />
        <v-alert v-else-if="error" type="error" density="compact">{{ error }}</v-alert>
        <p v-else-if="!issues.length" class="text-body-medium text-medium-emphasis py-4 mb-0">No open issue reports for this vehicle.</p>
        <v-list v-else density="compact" class="py-0 bg-transparent">
          <v-list-item
            v-for="report in issues.slice(0, SHOWN)"
            :key="report.id"
            :to="{ name: 'issueReport', params: { issueReportId: report.id } }"
            :subtitle="`${typeLabel(report.type)} · reported ${formatDay(report.createdAt)}`"
            class="work-row px-0"
          >
            <v-list-item-title class="text-truncate" :title="report.description">{{ report.description }}</v-list-item-title>
            <template #append>
              <v-chip :color="statusDetails(report.status).color" size="small" variant="tonal" label>{{ statusLabel(report.status) }}</v-chip>
            </template>
          </v-list-item>
        </v-list>
      </v-tabs-window-item>

      <v-tabs-window-item value="trips">
        <p v-if="!recentTrips.length" class="text-body-medium text-medium-emphasis py-4 mb-0">This vehicle hasn't been on a trip yet.</p>
        <v-list v-else density="compact" class="py-0 bg-transparent">
          <v-list-item
            v-for="trip in recentTrips"
            :key="trip.id"
            :to="canOpenTrip(trip) ? { name: 'request', params: { requestId: trip.id } } : undefined"
            :subtitle="`${formatTripDates(trip)} · ${trip.area?.name ?? ''}`"
            class="work-row px-0"
          >
            <v-list-item-title class="text-truncate" :title="trip.purpose">{{ trip.purpose }}</v-list-item-title>
            <template #append><RequestStatusChip :status="trip.status" /></template>
          </v-list-item>
        </v-list>
      </v-tabs-window-item>
    </v-tabs-window>
  </SectionCard>
</template>

<style scoped>
.work-row + .work-row {
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
