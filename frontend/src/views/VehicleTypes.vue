<script setup>
import { onMounted, ref } from "vue";
import vehicleTypeServices from "../services/vehicleTypeServices.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";
import VehicleTypeFormModal from "../components/vehicleTypes/VehicleTypeFormModal.vue";

const formOpen = ref(false);
const editing = ref(null);

const {
  data: vehicleTypes,
  loading,
  error,
  run: getVehicleTypes,
} = useRequest(vehicleTypeServices.getVehicleTypes, { initial: [], fallback: "Failed to fetch vehicle types." });

const openCreate = () => {
  editing.value = null;
  formOpen.value = true;
};

const openEdit = (vehicleType) => {
  editing.value = vehicleType;
  formOpen.value = true;
};

const saveVehicleType = async (payload) => {
  if (editing.value) {
    await vehicleTypeServices.updateVehicleType(editing.value.id, payload);
  } else {
    await vehicleTypeServices.createVehicleType(payload);
  }

  await getVehicleTypes();
};

const confirmDelete = useConfirm();

const deleteVehicleType = async (vehicleType) => {
  const deleted = await confirmDelete({
    title: "Delete vehicle type",
    message: `Delete "${vehicleType.name}"? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => vehicleTypeServices.removeVehicleType(vehicleType.id),
  });

  if (deleted) {
    await getVehicleTypes();
  }
};

onMounted(getVehicleTypes);
</script>

<template>
  <PageShell title="Vehicle Type Management">
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Vehicle Type</v-btn>
    </template>

    <ListState
      :loading
      :error
      :empty="!vehicleTypes.length"
      empty-title="No vehicle types yet. Create your first vehicle type."
      empty-icon="mdi-car-outline"
    >
      <div class="d-flex flex-column ga-4">
        <v-card v-for="vehicleType in vehicleTypes" :key="vehicleType.id" rounded="lg">
          <v-card-item>
            <v-card-title>{{ vehicleType.name }}</v-card-title>
            <template #append>
              <v-btn size="small" icon="mdi-pencil" aria-label="Edit vehicle type" @click="openEdit(vehicleType)" />
              <v-btn size="small" icon="mdi-delete" aria-label="Delete vehicle type" @click="deleteVehicleType(vehicleType)" />
            </template>
          </v-card-item>
        </v-card>
      </div>
    </ListState>

    <VehicleTypeFormModal v-model="formOpen" :vehicle-type="editing" :vehicle-types="vehicleTypes" :save="saveVehicleType" />
  </PageShell>
</template>
