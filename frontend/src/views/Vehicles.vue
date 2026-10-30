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

  if (vehicle.status === "active" && vehicle.licensePlateExpirationDate && vehicle.licensePlateExpirationDate < today()) {
    return "yellow";
  }

  return "green";
};

const toneColor = { red: "error", yellow: "warning", green: "success" };

const headers = [
  { title: "Make", key: "make", sortable: false },
  { title: "Model", key: "model", sortable: false },
  { title: "Color", key: "color", sortable: false },
  { title: "Status", key: "status", sortable: false },
  { title: "Actions", key: "actions", sortable: false, align: "end" },
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

const viewVehicle = (vehicle) => router.push({ name: "vehicleDetails", params: { id: vehicle.id } });

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
        :headers="headers"
        :items="visibleVehicles"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
        <template #[`item.make`]="{ item }">
          <router-link :to="{ name: 'vehicleDetails', params: { id: item.id } }" class="text-primary font-weight-medium">
            {{ item.make }}
          </router-link>
        </template>

        <template #[`item.status`]="{ item }">
          <v-chip :color="toneColor[tone(item)]" :class="`vehicle-chip-${tone(item)}`" size="small" variant="flat">
            {{ item.status }}
          </v-chip>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-btn icon="mdi-eye-outline" size="small" variant="text" aria-label="View vehicle" @click="viewVehicle(item)" />
            <v-btn icon="mdi-delete" size="small" variant="text" aria-label="Delete vehicle" @click="deleteVehicle(item)" />
          </div>
        </template>
      </v-data-table>
    </ListState>
  </PageShell>
</template>
