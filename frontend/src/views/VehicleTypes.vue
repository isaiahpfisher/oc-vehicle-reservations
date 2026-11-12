<script setup>
import { onMounted, ref } from "vue";
import vehicleTypeServices from "../services/vehicleTypeServices.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";
import VehicleTypeFormModal from "../components/vehicleTypes/VehicleTypeFormModal.vue";

const ITEMS_PER_PAGE = 10;
const IDENTIFIERS = [
  { title: "VIN", value: "VIN" },
  { title: "Serial", value: "Serial" },
];

const formOpen = ref(false);
const page = ref(1);
const editingId = ref(null);
const editForm = ref({ name: "", identifier: "" });
const editError = ref("");
const saving = ref(false);

const {
  data: vehicleTypes,
  loading,
  error,
  run: getVehicleTypes,
} = useRequest(vehicleTypeServices.getVehicleTypes, { initial: [], fallback: "Failed to fetch vehicle types." });

const headers = [
  { title: "Name", key: "name", sortable: false, nowrap: true },
  { title: "Identifier", key: "identifier", sortable: false, nowrap: true },
  { title: "Actions", key: "actions", sortable: false, align: "end", nowrap: true },
];

const openCreate = () => {
  editingId.value = null;
  editError.value = "";
  formOpen.value = true;
};

const startEdit = (vehicleType) => {
  editingId.value = vehicleType.id;
  editForm.value = { name: vehicleType.name, identifier: vehicleType.identifier };
  editError.value = "";
};

const cancelEdit = () => {
  if (saving.value) {
    return;
  }

  editingId.value = null;
  editError.value = "";
};

const saveEdit = async () => {
  if (saving.value || editingId.value == null) {
    return;
  }

  const name = editForm.value.name.trim();
  const identifier = editForm.value.identifier;
  editError.value = "";

  if (!name || !identifier) {
    editError.value = "Required field.";
    return;
  }

  if (name.length > 255) {
    editError.value = "Name too long.";
    return;
  }

  const taken = vehicleTypes.value.some(
    (type) => type.name.toLowerCase() === name.toLowerCase() && type.id !== editingId.value,
  );
  if (taken) {
    editError.value = "Name already taken.";
    return;
  }

  saving.value = true;

  try {
    await vehicleTypeServices.updateVehicleType(editingId.value, { name, identifier });
    editingId.value = null;
    await getVehicleTypes();
  } catch (saveError) {
    editError.value = saveError.response?.data?.message || "Failed to save vehicle type.";
  } finally {
    saving.value = false;
  }
};

const createVehicleType = async (payload) => {
  await vehicleTypeServices.createVehicleType(payload);
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
    if (editingId.value === vehicleType.id) {
      editingId.value = null;
    }
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
      <v-alert v-if="editError" type="error" density="compact" class="mb-4">{{ editError }}</v-alert>

      <v-data-table
        v-model:page="page"
        :headers="headers"
        :items="vehicleTypes"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
        <template #[`item.name`]="{ item }">
          <v-text-field v-if="editingId === item.id" v-model="editForm.name" label="Name" density="compact" hide-details />
          <span v-else>{{ item.name }}</span>
        </template>

        <template #[`item.identifier`]="{ item }">
          <v-select
            v-if="editingId === item.id"
            v-model="editForm.identifier"
            label="Identifier"
            :items="IDENTIFIERS"
            clearable
            density="compact"
            hide-details
          />
          <span v-else>{{ item.identifier }}</span>
        </template>

        <template #[`item.actions`]="{ item }">
          <div v-if="editingId === item.id" class="d-flex justify-end ga-1">
            <v-btn size="small" variant="text" :loading="saving" @click="saveEdit">Save</v-btn>
            <v-btn size="small" variant="text" :disabled="saving" @click="cancelEdit">Cancel</v-btn>
          </div>
          <div v-else class="d-flex justify-end ga-1">
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              aria-label="Edit vehicle type"
              @click="startEdit(item)"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              aria-label="Delete vehicle type"
              @click="deleteVehicleType(item)"
            />
          </div>
        </template>
      </v-data-table>
    </ListState>

    <VehicleTypeFormModal v-model="formOpen" :vehicle-types="vehicleTypes" :save="createVehicleType" />
  </PageShell>
</template>
