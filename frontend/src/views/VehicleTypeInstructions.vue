<script setup>
import { computed, onMounted, ref } from "vue";
import vehicleTypeInstructionServices from "../services/vehicleTypeInstructionServices.js";
import vehicleTypeServices from "../services/vehicleTypeServices.js";
import areaServices from "../services/areaServices.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import { useRoles } from "../composables/useRoles.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";
import VehicleTypeInstructionFormModal from "../components/vehicleTypeInstructions/VehicleTypeInstructionFormModal.vue";

const ITEMS_PER_PAGE = 10;

const { hasRole, areaAdminAreaIds } = useRoles();
const adminUser = computed(() => hasRole("admin"));

const formOpen = ref(false);
const editing = ref(null);
const vehicleTypes = ref([]);
const areas = ref([]);

const {
  data: instructions,
  loading,
  error,
  run: getInstructions,
} = useRequest(vehicleTypeInstructionServices.getVehicleTypeInstructions, {
  initial: [],
  fallback: "Failed to fetch vehicle type instructions.",
});

const headers = [
  { title: "Vehicle type", key: "vehicleType", sortable: false },
  { title: "Area", key: "area", sortable: false },
  { title: "Instruction message", key: "content", sortable: false },
  { title: "Actions", key: "actions", sortable: false, align: "end", nowrap: true },
];

const areaName = (instruction) => (instruction.areaId == null ? "Default" : instruction.area?.name);

const loadOptions = async () => {
  const [typeResponse, areaResponse] = await Promise.all([
    vehicleTypeServices.getVehicleTypes(),
    areaServices.getAreas(),
  ]);
  vehicleTypes.value = typeResponse.data;
  const allowed = new Set(areaAdminAreaIds.value);
  areas.value = adminUser.value
    ? areaResponse.data
    : areaResponse.data.filter((area) => allowed.has(area.id));
};

const openCreate = () => {
  editing.value = null;
  formOpen.value = true;
};

const startEdit = (instruction) => {
  editing.value = instruction;
  formOpen.value = true;
};

const saveInstruction = async (payload) => {
  if (editing.value) {
    await vehicleTypeInstructionServices.updateVehicleTypeInstruction(editing.value.id, payload);
  } else {
    await vehicleTypeInstructionServices.createVehicleTypeInstruction(payload);
  }
  await getInstructions();
};

const confirmDelete = useConfirm();

const deleteInstruction = async (instruction) => {
  const deleted = await confirmDelete({
    title: "Delete vehicle type instruction",
    message: "Delete this vehicle type instruction? This action is permanent.",
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => vehicleTypeInstructionServices.removeVehicleTypeInstruction(instruction.id),
  });

  if (deleted) {
    await getInstructions();
  }
};

onMounted(async () => {
  await Promise.all([getInstructions(), loadOptions()]);
});
</script>

<template>
  <PageShell title="Vehicle Type Instructions">
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Instruction</v-btn>
    </template>

    <ListState
      :loading
      :error
      :empty="!instructions.length"
      empty-title="No vehicle type instructions yet. Create your first vehicle type instruction."
      empty-icon="mdi-text-box-outline"
    >
      <v-data-table
        :headers="headers"
        :items="instructions"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
        <template #[`item.vehicleType`]="{ item }">
          {{ item.vehicleType?.name }}
        </template>
        <template #[`item.area`]="{ item }">
          {{ areaName(item) }}
        </template>
        <template #[`item.content`]="{ item }">
          {{ item.content }}
        </template>
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              aria-label="Edit vehicle type instruction"
              @click="startEdit(item)"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              aria-label="Delete vehicle type instruction"
              @click="deleteInstruction(item)"
            />
          </div>
        </template>
      </v-data-table>
    </ListState>

    <VehicleTypeInstructionFormModal
      v-model="formOpen"
      :instruction="editing"
      :vehicle-types="vehicleTypes"
      :areas="areas"
      :area-required="!adminUser"
      :save="saveInstruction"
    />
  </PageShell>
</template>
