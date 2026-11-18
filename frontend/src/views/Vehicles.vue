<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import vehicleServices from "../services/vehicleServices.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import { useRoles } from "../composables/useRoles.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";
import VehicleStatusChip from "../components/vehicles/VehicleStatusChip.vue";
import { VEHICLE_STATUS_OPTIONS, needsAttention, statusLines } from "../models/vehicles.js";

const ITEMS_PER_PAGE = 10;

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
const blankFilters = () => ({ status: null, type: null, make: null, model: null, color: null, year: null });
const filters = ref(blankFilters());
const attentionOnly = ref(false);
const showFilters = ref(false);

const typeName = (vehicle) => vehicle.vehicleType?.name ?? "";

const FIELDS = {
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

const filtered = computed(() =>
  visibleVehicles.value.filter(
    (vehicle) =>
      (!attentionOnly.value || needsAttention(vehicle)) &&
      (!filters.value.status || vehicle.condition?.status === filters.value.status) &&
      Object.entries(FIELDS).every(([key, pick]) => filters.value[key] == null || pick(vehicle) === filters.value[key]),
  ),
);

const clearFilters = () => {
  filters.value = blankFilters();
  attentionOnly.value = false;
};

// ui-style-system.mdc: changing filters returns to page 1.
watch([filters, attentionOnly], () => (page.value = 1), { deep: true });

const headers = [
  { title: "Make", key: "make", sortable: false },
  { title: "Model", key: "model", sortable: false },
  { title: "Year", key: "year", sortable: false },
  { title: "Color", key: "color", sortable: false },
  { title: "Type", key: "type", sortable: false, value: typeName },
  // Wide enough for the longest chip ("Service Due Soon") so it never crops.
  { title: "Status", key: "status", sortable: false, align: "center", minWidth: "190px", nowrap: true },
  { title: "Actions", key: "actions", sortable: false, align: "center", nowrap: true },
];

const confirmDelete = useConfirm();

const deleteVehicle = async (vehicle) => {
  const deleted = await confirmDelete({
    title: "Delete vehicle",
    message: `Delete ${vehicle.make} ${vehicle.model}? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => vehicleServices.removeVehicle(vehicle.id),
  });

  if (deleted) {
    await getVehicles();
  }
};

const editVehicle = (vehicle) => router.push({ name: "vehicleDetails", params: { id: vehicle.id } });

onMounted(getVehicles);
</script>

<template>
  <PageShell title="Vehicle Management">
    <template v-if="canCreate" #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'vehicleCreate' }">
        + New Vehicle
      </v-btn>
    </template>

    <!-- Same layout as the request list: quick filters in one row, the rest behind "Filters". -->
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
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
        title="Out of service, service overdue, plate expired, or service due soon"
        data-test="needs-attention"
        @click="attentionOnly = !attentionOnly"
      >
        Needs attention
        <v-badge v-if="attentionCount" :content="attentionCount" :color="attentionOnly ? 'surface' : 'primary'" inline />
      </v-btn>
    </div>

    <v-expand-transition>
      <div v-show="showFilters" data-test="vehicle-filters">
        <v-card border flat class="mb-4 pa-4">
          <v-row density="comfortable">
            <v-col
              v-for="(label, key) in { type: 'Type', make: 'Make', model: 'Model', color: 'Color', year: 'Year' }"
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
            <v-col cols="6" md="4" class="d-flex align-center justify-end">
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
      empty-title="No vehicles yet. Create your first vehicle."
      empty-icon="mdi-car-outline"
      no-results-title="No vehicles match these filters"
      no-results-text="Clear filters to see every vehicle."
    >
      <v-data-table
        v-model:page="page"
        class="vehicles-table"
        :headers="headers"
        :items="filtered"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
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
            <v-btn
              v-if="canEdit(item)"
              icon="mdi-pencil"
              size="small"
              variant="text"
              aria-label="Edit vehicle"
              @click="editVehicle(item)"
            />
            <v-btn
              v-else
              icon="mdi-eye"
              size="small"
              variant="text"
              aria-label="View vehicle"
              @click="editVehicle(item)"
            />
            <v-btn
              v-if="canEdit(item)"
              icon="mdi-delete"
              size="small"
              variant="text"
              aria-label="Delete vehicle"
              @click="deleteVehicle(item)"
            />
          </div>
        </template>
      </v-data-table>
    </ListState>
  </PageShell>
</template>

<style scoped>
.vehicle-status-filter {
  flex: 0 1 220px;
  min-width: 180px;
}

.vehicles-table :deep(th) {
  white-space: nowrap;
}
</style>
