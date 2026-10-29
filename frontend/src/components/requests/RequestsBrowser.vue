<script setup>
import { computed, ref, watch } from "vue";
import ListState from "../common/ListState.vue";
import RequestStatusChip from "./RequestStatusChip.vue";
import {
  NEEDS_ACTION_STATUSES,
  STATUS_OPTIONS,
  calendarEvent,
  calendarTitle,
  formatTripDates,
  overlapsDays,
  personName,
  routeSummary,
  searchText,
  toDateInput,
  tripBounds,
  vehicleLabel,
} from "../../models/requests.js";

/** "table", "week", or "month" — owned by the page so RequestViewToggle can sit in the PageShell header. */
const view = defineModel("view", { type: String, default: "table" });

const props = defineProps({
  requests: { type: Array, default: () => [] },
  loading: Boolean,
  error: { type: String, default: "" },
  /** Admin lists show the requester column and the "Needs my action" filter. */
  admin: Boolean,
  emptyTitle: { type: String, required: true },
  emptyText: { type: String, default: "" },
});

const emit = defineEmits(["open"]);

const blankFilters = () => ({ area: null, destination: null, driver: null, vehicle: null, from: "", to: "" });

const search = ref("");
const statuses = ref([]);
const needsAction = ref(false);
const showFilters = ref(false);
const filters = ref(blankFilters());

/** Distinct `{ value, title }` options from every request's `pick(request)` list. */
const optionsFrom = (pick, title) => {
  const seen = new Map();
  props.requests.flatMap(pick).forEach((item) => seen.set(item.id, { value: item.id, title: title(item) }));
  return [...seen.values()].sort((a, b) => a.title.localeCompare(b.title));
};

const areaOptions = computed(() => optionsFrom((request) => (request.area ? [request.area] : []), (area) => area.name));
const destinationOptions = computed(() => optionsFrom((request) => request.destinations, (destination) => destination.name));
const driverOptions = computed(() => optionsFrom((request) => request.drivers, personName));
const vehicleOptions = computed(() =>
  optionsFrom((request) => request.vehicles, (vehicle) => `${vehicleLabel(vehicle)} · ${vehicle.universityId}`),
);

const activeFilterCount = computed(() => Object.values(filters.value).filter(Boolean).length);
const needsActionCount = computed(() => props.requests.filter(({ status }) => NEEDS_ACTION_STATUSES.includes(status)).length);

const clearFilters = () => {
  filters.value = blankFilters();
};

const clearAll = () => {
  search.value = "";
  statuses.value = [];
  needsAction.value = false;
  clearFilters();
};

const visible = computed(() => {
  const term = search.value?.trim().toLowerCase() ?? "";
  const { area, destination, driver, vehicle, from, to } = filters.value;

  return props.requests.filter(
    (request) =>
      (!term || searchText(request).includes(term)) &&
      (!statuses.value.length || statuses.value.includes(request.status)) &&
      (!needsAction.value || NEEDS_ACTION_STATUSES.includes(request.status)) &&
      (!area || request.areaId === area) &&
      (!destination || request.destinations.some(({ id }) => id === destination)) &&
      (!driver || request.drivers.some(({ id }) => id === driver)) &&
      (!vehicle || request.vehicles.some(({ id }) => id === vehicle)) &&
      overlapsDays(request, from, to),
  );
});

// Admins see who asked (with the area underneath); requesters see the area. Vehicles sit under the head count.
const headers = computed(() => [
  { title: "Trip", key: "purpose", minWidth: "220px" },
  { title: "Dates", key: "dates", value: (request) => tripBounds(request)[0].getTime() },
  props.admin
    ? { title: "Requester", key: "requester", value: (request) => personName(request.user) }
    : { title: "Area", key: "area", value: (request) => request.area?.name ?? "" },
  { title: "People", key: "numberOfPeople" },
  { title: "Status", key: "status" },
]);

const sortBy = ref([{ key: "dates", order: "desc" }]);
const page = ref(1);

// ui-style-system.mdc: changing search or filters returns to page 1.
watch([search, statuses, needsAction, filters], () => (page.value = 1), { deep: true });

const focus = ref(toDateInput(new Date()));
const events = computed(() => visible.value.map(calendarEvent));
const title = computed(() => calendarTitle(focus.value, view.value));

const moveCalendar = (direction) => {
  const date = new Date(`${focus.value}T00:00:00`);
  if (view.value === "month") {
    date.setMonth(date.getMonth() + direction, 1);
  } else {
    date.setDate(date.getDate() + 7 * direction);
  }
  focus.value = toDateInput(date);
};
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        placeholder="Search trips, people, places…"
        aria-label="Search requests"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="browser-search"
      />
      <v-select
        v-model="statuses"
        :items="STATUS_OPTIONS"
        label="Status"
        variant="outlined"
        density="compact"
        multiple
        hide-details
        clearable
        class="browser-status"
      >
        <template #selection="{ item, index }">
          <span v-if="index === 0" class="text-truncate">{{ item.title }}</span>
          <span v-else-if="index === 1" class="text-medium-emphasis ml-1">+{{ statuses.length - 1 }}</span>
        </template>
      </v-select>
      <v-btn
        :variant="showFilters || activeFilterCount ? 'tonal' : 'outlined'"
        :color="activeFilterCount ? 'primary' : 'secondary'"
        prepend-icon="mdi-tune-variant"
        height="40"
        class="oc-cta"
        :aria-expanded="showFilters"
        data-test="toggle-filters"
        @click="showFilters = !showFilters"
      >
        Filters
        <v-badge v-if="activeFilterCount" :content="activeFilterCount" color="primary" inline />
      </v-btn>
      <v-btn
        v-if="admin"
        :variant="needsAction ? 'flat' : 'outlined'"
        color="primary"
        :prepend-icon="needsAction ? 'mdi-check' : 'mdi-bell-outline'"
        height="40"
        class="oc-cta"
        :aria-pressed="needsAction"
        data-test="needs-action"
        @click="needsAction = !needsAction"
      >
        Needs my action
        <v-badge
          v-if="needsActionCount"
          :content="needsActionCount"
          :color="needsAction ? 'surface' : 'primary'"
          inline
        />
      </v-btn>
    </div>

    <v-expand-transition>
      <div v-show="showFilters" data-test="filters">
        <v-card border flat class="mb-4 pa-4">
          <v-row dense>
            <v-col cols="12" sm="6" md="3">
              <v-autocomplete
                v-model="filters.area"
                :items="areaOptions"
                label="Area"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-autocomplete
                v-model="filters.destination"
                :items="destinationOptions"
                label="Destination"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-autocomplete
                v-model="filters.driver"
                :items="driverOptions"
                label="Driver"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-autocomplete
                v-model="filters.vehicle"
                :items="vehicleOptions"
                label="Vehicle"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field v-model="filters.from" type="date" label="From" variant="outlined" density="compact" hide-details />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field v-model="filters.to" type="date" label="To" variant="outlined" density="compact" hide-details />
            </v-col>
            <v-col cols="12" md="6" class="d-flex align-center justify-end">
              <v-btn variant="text" color="secondary" class="oc-cta" :disabled="!activeFilterCount" @click="clearFilters">
                Clear filters
              </v-btn>
            </v-col>
          </v-row>
        </v-card>
      </div>
    </v-expand-transition>

    <ListState
      :loading
      :error
      :empty="!requests.length"
      :empty-title="emptyTitle"
      :empty-text="emptyText"
      empty-icon="mdi-car-outline"
    >
      <template #empty-actions><slot name="empty-actions" /></template>

      <template v-if="view === 'table'">
        <v-empty-state
          v-if="!visible.length"
          icon="mdi-magnify"
          title="No matching requests"
          text="Try a different search, or clear your filters to see everything."
        >
          <template #actions>
            <v-btn variant="outlined" color="primary" class="oc-cta" @click="clearAll">Clear search and filters</v-btn>
          </template>
        </v-empty-state>

        <v-card v-else border flat class="browser-card">
          <v-data-table
            v-model:sort-by="sortBy"
            v-model:page="page"
            :items-per-page="10"
            :headers
            :items="visible"
            item-value="id"
            mobile-breakpoint="sm"
            hover
            class="browser-table"
            @click:row="(_event, { item }) => emit('open', item)"
          >
            <template #item.purpose="{ item }">
              <div class="py-3">
                <router-link
                  :to="{ name: 'request', params: { requestId: item.id } }"
                  class="trip-link d-block text-truncate font-weight-bold"
                  :title="item.purpose"
                  @click.stop
                >
                  {{ item.purpose }}
                </router-link>
                <div class="trip-route d-block text-truncate text-body-medium text-medium-emphasis" :title="routeSummary(item)">
                  {{ routeSummary(item) }}
                </div>
              </div>
            </template>
            <template #item.dates="{ item }">
              <span class="text-no-wrap">{{ formatTripDates(item) }}</span>
            </template>
            <template #item.requester="{ item }">
              <div class="text-no-wrap">{{ personName(item.user) }}</div>
              <div class="text-no-wrap text-body-medium text-medium-emphasis">{{ item.area?.name }}</div>
            </template>
            <template #item.numberOfPeople="{ item }">
              <div class="text-no-wrap">{{ item.numberOfPeople }}</div>
              <div class="text-no-wrap text-body-medium" :class="item.vehicles.length ? 'text-medium-emphasis' : 'text-disabled'">
                {{ item.vehicles.length ? item.vehicles.map((vehicle) => vehicle.universityId).join(", ") : "No vehicle" }}
              </div>
            </template>
            <template #item.status="{ item }">
              <RequestStatusChip :status="item.status" class="text-no-wrap" />
            </template>
          </v-data-table>
        </v-card>
      </template>

      <v-card v-else border flat class="browser-card">
        <div class="d-flex align-center ga-1 px-4 py-3">
          <h2 class="text-title-large font-weight-bold my-0 mr-auto">{{ title }}</h2>
          <v-btn variant="outlined" color="secondary" size="small" class="oc-cta mr-2" @click="focus = toDateInput(new Date())">
            Today
          </v-btn>
          <v-btn
            icon="mdi-chevron-left"
            variant="text"
            density="comfortable"
            :aria-label="view === 'month' ? 'Previous month' : 'Previous week'"
            @click="moveCalendar(-1)"
          />
          <v-btn
            icon="mdi-chevron-right"
            variant="text"
            density="comfortable"
            :aria-label="view === 'month' ? 'Next month' : 'Next week'"
            @click="moveCalendar(1)"
          />
        </div>
        <v-divider />
        <v-calendar
          v-model="focus"
          :type="view"
          :events
          color="primary"
          :day-format="(day) => String(day.day)"
          :show-month-on-first="false"
          :first-interval="6"
          :interval-count="16"
          event-overlap-mode="stack"
          class="browser-calendar"
          @click:event="(_event, { event }) => emit('open', event.request)"
        />
      </v-card>
    </ListState>
  </div>
</template>

<style scoped>
.browser-search {
  flex: 1 1 280px;
  max-width: 420px;
}

.browser-status {
  flex: 0 1 200px;
  min-width: 160px;
}

.browser-card {
  overflow: hidden;
}

.browser-table :deep(tbody tr) {
  cursor: pointer;
}

.trip-link,
.trip-route {
  max-width: 280px;
}

.trip-link {
  color: inherit;
  text-decoration: none;
}

.trip-link:hover {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}

.browser-table :deep(th) {
  white-space: nowrap;
}

.browser-calendar {
  min-height: 600px;
}

.browser-calendar :deep(.v-event) {
  cursor: pointer;
}
</style>
