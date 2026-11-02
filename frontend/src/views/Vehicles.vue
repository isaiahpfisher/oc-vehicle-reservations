<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import vehicleServices from "../services/vehicleServices.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import { useRoles } from "../composables/useRoles.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";

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

const today = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const visibleVehicles = computed(() => {
  if (hasRole("admin")) {
    return vehicles.value;
  }

  const ids = new Set(areaAdminAreaIds.value.map(Number));
  return vehicles.value.filter((vehicle) => ids.has(Number(vehicle.areaId)));
});

const tone = (vehicle) => {
  if (vehicle.status === "retired") {
    return "red";
  }

  if (
    vehicle.status === "active" &&
    vehicle.licensePlateExpirationDate &&
    vehicle.licensePlateExpirationDate >= today()
  ) {
    return "green";
  }

  return "yellow";
};

const toneColor = { red: "error", green: "success" };

const headers = [
  { title: "Make", key: "make", sortable: false, width: "20%" },
  { title: "Model", key: "model", sortable: false, width: "20%" },
  { title: "Color", key: "color", sortable: false, width: "20%" },
  { title: "Status", key: "status", sortable: false, width: "20%", align: "center" },
  { title: "Actions", key: "actions", sortable: false, width: "20%", align: "center" },
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
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'vehicleCreate' }">
        + New Vehicle
      </v-btn>
    </template>

    <ListState
      :loading
      :error
      :empty="!vehicles.length"
      empty-title="No vehicles yet. Create your first vehicle."
      empty-icon="mdi-car-outline"
    >
      <v-data-table
        v-model:page="page"
        class="vehicles-table"
        :headers="headers"
        :items="visibleVehicles"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
        <template #[`item.status`]="{ item }">
          <v-chip
            :color="tone(item) === 'yellow' ? '#FFE500' : toneColor[tone(item)]"
            :class="`vehicle-chip-${tone(item)}`"
            size="small"
            variant="flat"
          >
            {{ item.status }}
          </v-chip>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-btn icon="mdi-pencil" size="small" variant="text" aria-label="Edit vehicle" @click="editVehicle(item)" />
            <v-btn icon="mdi-delete" size="small" variant="text" aria-label="Delete vehicle" @click="deleteVehicle(item)" />
          </div>
        </template>
      </v-data-table>
    </ListState>
  </PageShell>
</template>

<style scoped>
.vehicles-table :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.vehicles-table :deep(th),
.vehicles-table :deep(td) {
  width: 20%;
}

.vehicles-table :deep(.vehicle-chip-yellow) {
  background-color: #ffe500 !important;
  color: #1a1a1a !important;
}
</style>
