<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { PAGE_SIZES } from "../utils/lists.js";
import { useRoute, useRouter } from "vue-router";
import vehicleServices from "../services/vehicleServices.js";
import areaServices from "../services/areaServices.js";
import { useRequest } from "../composables/useRequest.js";
import { useRoles } from "../composables/useRoles.js";
import ListState from "../components/common/ListState.vue";
import { matchesWords } from "../utils/search.js";
import PageShell from "../components/layout/PageShell.vue";
import VehicleStatusChip from "../components/vehicles/VehicleStatusChip.vue";
import { VEHICLE_STATUS_OPTIONS, needsAttention, statusLines, vehicleName } from "../models/vehicles.js";

const router = useRouter();
const { hasRole, areaAdminAreaIds } = useRoles();
const page = ref(1);

const {
  data: vehicles,
  loading,
  error,
  run: getVehicles,
} = useRequest(vehicleServices.getVehicles, { initial: [], fallback: "Failed to fetch vehicles." });

const managesArea = (areaId) => areaAdminAreaIds.value.map(Number).includes(Number(areaId));

const canCreate = computed(() => hasRole("admin") || hasRole("area_admin"));

const canEdit = (vehicle) => hasRole("admin") || managesArea(vehicle.areaId);

const visibleVehicles = computed(() => {
  if (hasRole("admin") || hasRole("maintenance")) {
    return vehicles.value;
  }

  const ids = new Set(areaAdminAreaIds.value.map(Number));
  return vehicles.value.filter((vehicle) => ids.has(Number(vehicle.areaId)));
});

// US-18.2: filter by status, type, make, model, color, and year; US-18.13: or just what needs attention.
const blankFilters = () => ({ status: null, area: null, type: null, make: null, model: null, color: null, year: null });
const filters = ref(blankFilters());
const attentionOnly = ref(false);
const showFilters = ref(false);
// An area's card links here with `?area=<name>`, which starts the list filtered to that area. The Filters panel
// stays closed; its button's count shows a filter is on.
const route = useRoute();
if (typeof route.query.area === "string" && route.query.area) {
  filters.value.area = route.query.area;
}

/**
 * Service Types links its "overdue" and "due soon" counts here as `?service=<name>&due=overdue|due_soon`: the
 * vehicles due for that one service. Shown as a removable chip above the list.
 */
const serviceDue = ref(
  typeof route.query.service === "string" && route.query.service
    ? { service: route.query.service, due: ["overdue", "due_soon"].includes(route.query.due) ? route.query.due : null }
    : null,
);
// Retired vehicles aren't serviced any more, so they're never "due".
const dueFor = (vehicle) =>
  vehicle.status !== "retired" &&
  (vehicle.condition?.services ?? []).some(
    ({ serviceType, state }) =>
      serviceType?.name === serviceDue.value.service &&
      (serviceDue.value.due ? state === serviceDue.value.due : state === "overdue" || state === "due_soon"),
  );
const serviceDueLabel = computed(() => {
  if (!serviceDue.value) return "";
  const when = { overdue: "Overdue", due_soon: "Due soon" }[serviceDue.value.due] ?? "Due";
  return `${when}: ${serviceDue.value.service}`;
});
const clearServiceDue = () => {
  serviceDue.value = null;
  router.replace({ query: { ...route.query, service: undefined, due: undefined } });
};

const typeName = (vehicle) => vehicle.vehicleType?.name ?? "";

const FIELDS = {
  area: (vehicle) => areaName(vehicle),
  type: typeName,
  make: (vehicle) => vehicle.make,
  model: (vehicle) => vehicle.model,
  color: (vehicle) => vehicle.color,
  year: (vehicle) => vehicle.year,
};

const choices = (pick) =>
  [...new Set(visibleVehicles.value.map(pick).filter((value) => value !== "" && value != null))].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { numeric: true }),
  );

const fieldOptions = computed(() => Object.fromEntries(Object.entries(FIELDS).map(([key, pick]) => [key, choices(pick)])));

/** Filters inside the "Filters" panel, for its badge. */
const detailFilterCount = computed(() => Object.keys(FIELDS).filter((key) => filters.value[key] != null).length);
const attentionCount = computed(() => visibleVehicles.value.filter(needsAttention).length);
const activeFilterCount = computed(() => Object.values(filters.value).filter((value) => value != null).length + (attentionOnly.value ? 1 : 0));

// Your request: search by anything that identifies a vehicle.
const search = ref("");
const searchParts = (vehicle) => [
  vehicle.universityId,
  vehicleName(vehicle),
  vehicle.color,
  vehicle.licensePlate,
  vehicle.identifier,
  typeName(vehicle),
  areaName(vehicle),
];

const filtered = computed(() =>
  visibleVehicles.value.filter(
    (vehicle) =>
      matchesWords(search.value, searchParts(vehicle)) &&
      (!attentionOnly.value || needsAttention(vehicle)) &&
      (!serviceDue.value || dueFor(vehicle)) &&
      (!filters.value.status || vehicle.condition?.status === filters.value.status) &&
      Object.entries(FIELDS).every(([key, pick]) => filters.value[key] == null || pick(vehicle) === filters.value[key]),
  ),
);

const clearFilters = () => {
  filters.value = blankFilters();
  attentionOnly.value = false;
  if (serviceDue.value) clearServiceDue();
};

// ui-style-system.mdc: changing filters returns to page 1.
watch([filters, attentionOnly, search, serviceDue], () => (page.value = 1), { deep: true });

// UI/UX backlog #37: lead with what people call the vehicle (University ID) and link it; then where it lives.
const { data: areas, run: getAreas } = useRequest(areaServices.getAreas, { initial: [] });
const areaName = (vehicle) => areas.value.find((area) => area.id === vehicle.areaId)?.name ?? "";
const areaLogo = (vehicle) => areas.value.find((area) => area.id === vehicle.areaId)?.logo || "";

const headers = [
  { title: "Vehicle", key: "universityId" },
  { title: "Type", key: "type", value: typeName },
  { title: "Area", key: "area", value: areaName },
  { title: "Plate", key: "licensePlate", nowrap: true },
  // Wide enough for the longest chip ("Service Due Soon") so it never crops.
  { title: "Status", key: "status", sortable: false, align: "center", minWidth: "190px", nowrap: true },
  { title: "Actions", key: "actions", sortable: false, align: "center", nowrap: true },
];

const editVehicle = (vehicle) => router.push({ name: "vehicleDetails", params: { id: vehicle.id } });

onMounted(() => {
  getVehicles();
  getAreas();
});
</script>

<template>
  <!-- UI/UX backlog #42: the page title matches its menu label. -->
  <PageShell title="Vehicles">
    <template v-if="canCreate" #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'vehicleCreate' }">
        + New Vehicle
      </v-btn>
    </template>

    <!-- Same layout as the request list: quick filters in one row, the rest behind "Filters". -->
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        placeholder="Search by ID, make, model, plate, VIN…"
        aria-label="Search vehicles"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="vehicle-search"
        data-test="vehicle-search"
      />
      <v-select
        v-model="filters.status"
        :items="VEHICLE_STATUS_OPTIONS"
        label="Status"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="vehicle-status-filter"
        data-test="filter-status"
      />
      <v-btn
        :variant="showFilters || detailFilterCount ? 'tonal' : 'outlined'"
        :color="detailFilterCount ? 'primary' : 'secondary'"
        prepend-icon="mdi-tune-variant"
        height="40"
        class="oc-cta"
        :aria-expanded="showFilters"
        data-test="toggle-filters"
        @click="showFilters = !showFilters"
      >
        Filters
        <v-badge v-if="detailFilterCount" :content="detailFilterCount" color="primary" inline />
      </v-btn>
      <v-btn
        :variant="attentionOnly ? 'flat' : 'outlined'"
        color="primary"
        :prepend-icon="attentionOnly ? 'mdi-check' : 'mdi-alert-outline'"
        height="40"
        class="oc-cta"
        :aria-pressed="attentionOnly"
        title="Out of service, service overdue, plate expired, service due soon, or plate expiring within 30 days"
        data-test="needs-attention"
        @click="attentionOnly = !attentionOnly"
      >
        Needs attention
        <v-badge v-if="attentionCount" :content="attentionCount" :color="attentionOnly ? 'surface' : 'primary'" inline />
      </v-btn>
    </div>

    <div v-if="serviceDue" class="mb-4">
      <v-chip closable color="primary" variant="tonal" label data-test="service-due-filter" @click:close="clearServiceDue">
        {{ serviceDueLabel }}
      </v-chip>
    </div>

    <v-expand-transition>
      <div v-show="showFilters" data-test="vehicle-filters">
        <v-card border flat class="mb-4 pa-4">
          <v-row density="comfortable">
            <v-col
              v-for="(label, key) in { area: 'Area', type: 'Type', make: 'Make', model: 'Model', color: 'Color', year: 'Year' }"
              :key="key"
              cols="6"
              md="4"
            >
              <v-select
                v-model="filters[key]"
                :items="fieldOptions[key]"
                :label="label"
                variant="outlined"
                density="compact"
                hide-details
                clearable
                :data-test="`filter-${key}`"
              />
            </v-col>
            <!-- The six fields fill two rows, so this gets its own row, at the right edge like the request list's. -->
            <v-col cols="12" class="d-flex justify-end pt-0">
              <v-btn
                variant="text"
                color="secondary"
                class="oc-cta"
                :disabled="!activeFilterCount"
                data-test="clear-filters"
                @click="clearFilters"
              >
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
      :empty="!vehicles.length"
      :no-results="!filtered.length"
      empty-title="No vehicles yet"
      :empty-text="canCreate ? 'Add a vehicle and it\'s ready to assign to trips.' : 'Vehicles in your areas will show here.'"
      empty-art="vehicles"
      no-results-title="No vehicles match these filters"
      no-results-text="Clear filters to see every vehicle."
    >
      <template #empty-actions>
        <v-btn color="primary" variant="elevated" class="oc-cta" v-if="canCreate" :to="{ name: 'vehicleCreate' }">+ New Vehicle</v-btn>
      </template>
      <v-data-table
        v-model:page="page"
        class="vehicles-table"
        :headers="headers"
        :items="filtered"
        :items-per-page-options="PAGE_SIZES"
        item-value="id"
      >
        <template #[`item.universityId`]="{ item }">
          <div class="py-2">
            <router-link :to="{ name: 'vehicleDetails', params: { id: item.id } }" class="vehicle-link font-weight-medium">
              {{ item.universityId }}
            </router-link>
            <div class="text-body-small text-medium-emphasis">{{ vehicleName(item) }}<template v-if="item.color"> · {{ item.color }}</template></div>
          </div>
        </template>
        <!-- UI/UX backlog #66: the area's logo next to its name. -->
        <template #[`item.area`]="{ item }">
          <span class="d-inline-flex align-center ga-2">
            <img v-if="areaLogo(item)" :src="areaLogo(item)" alt="" class="area-logo-sm" />
            {{ areaName(item) }}
          </span>
        </template>
        <template #[`item.licensePlate`]="{ item }">{{ item.licensePlate || "—" }}</template>

        <template #[`item.status`]="{ item }">
          <!-- Hover the chip for why (US-18.1), without opening the vehicle. -->
          <v-tooltip v-if="item.condition && statusLines(item.condition).length" location="top" max-width="320">
            <template #activator="{ props: tip }">
              <VehicleStatusChip v-bind="tip" :status="item.condition.status" />
            </template>
            <div v-for="line in statusLines(item.condition)" :key="line.text">{{ line.text }}</div>
          </v-tooltip>
          <VehicleStatusChip v-else :status="item.condition?.status" />
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-tooltip v-if="canEdit(item)" text="Edit vehicle" location="top">
              <template #activator="{ props: tooltip }">
                <v-btn v-bind="tooltip"
             
              icon="mdi-pencil"
              size="small"
              variant="text"
              aria-label="Edit vehicle"
              @click="editVehicle(item)"
            />
              </template>
            </v-tooltip>
            <v-tooltip v-else text="View vehicle" location="top">
              <template #activator="{ props: tooltip }">
                <v-btn v-bind="tooltip"
             
              icon="mdi-eye"
              size="small"
              variant="text"
              aria-label="View vehicle"
              @click="editVehicle(item)"
            />
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table>
    </ListState>
  </PageShell>
</template>

<style scoped>
.vehicle-search {
  flex: 1 1 260px;
  max-width: 380px;
}

.vehicle-status-filter {
  flex: 0 1 220px;
  min-width: 180px;
}

.area-logo-sm {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.vehicle-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.vehicle-link:hover,
.vehicle-link:focus-visible {
  text-decoration: underline;
}

.vehicles-table :deep(th) {
  white-space: nowrap;
}
</style>
