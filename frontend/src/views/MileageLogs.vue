<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import mileageLogServices from "../services/mileageLogServices.js";
import { addedByName } from "../models/mileageLogs.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";
import MileageLogFormModal from "../components/mileageLogs/MileageLogFormModal.vue";

const ITEMS_PER_PAGE = 10;

const route = useRoute();
const vehicleId = computed(() => route.params.vehicleId);

const headers = [
  { title: "Odometer reading", key: "odometerReading" },
  { title: "Recorded date", key: "recordedAt" },
  { title: "Added by", key: "addedBy" },
  { title: "Actions", key: "actions", sortable: false, align: "end", nowrap: true },
];

const formOpen = ref(false);
const editing = ref(null);

const {
  data: mileageLogs,
  loading,
  error,
  run: getMileageLogs,
} = useRequest(mileageLogServices.getMileageLogs, {
  initial: [],
  fallback: "Failed to fetch mileage logs.",
});

const universityId = computed(() => mileageLogs.value[0]?.vehicle?.universityId ?? "");

const breadcrumbs = computed(() => [
  { title: "Vehicles", to: { name: "vehicles" } },
  { title: universityId.value || "Vehicle", to: { name: "vehicleDetails", params: { id: vehicleId.value } } },
  { title: "Mileage Log", disabled: true },
]);

const openCreate = () => {
  editing.value = null;
  formOpen.value = true;
};

const openEdit = (log) => {
  editing.value = log;
  formOpen.value = true;
};

const saveMileageLog = async (payload) => {
  const body = { vehicleId: Number(vehicleId.value), ...payload };
  if (editing.value) {
    await mileageLogServices.updateMileageLog(editing.value.id, body);
  } else {
    await mileageLogServices.createMileageLog(body);
  }

  await getMileageLogs(vehicleId.value);
};

const confirmDelete = useConfirm();

const deleteMileageLog = async (log) => {
  const deleted = await confirmDelete({
    title: "Delete mileage log",
    message: `Delete the reading ${log.odometerReading}? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => mileageLogServices.removeMileageLog(log.id),
  });

  if (deleted) {
    await getMileageLogs(vehicleId.value);
  }
};

onMounted(() => getMileageLogs(vehicleId.value));
</script>

<template>
  <PageShell title="Mileage Log" :subtitle="universityId" :breadcrumbs>
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Mileage Log</v-btn>
    </template>

    <ListState
      :loading
      :error
      :empty="!mileageLogs.length"
      empty-title="No mileage logs yet for this vehicle."
      empty-icon="mdi-counter"
    >
      <v-data-table
        :headers="headers"
        :items="mileageLogs"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
        <template #[`item.addedBy`]="{ item }">
          {{ addedByName(item) }}
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-btn icon="mdi-pencil" size="small" variant="text" aria-label="Edit mileage log" @click="openEdit(item)" />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              aria-label="Delete mileage log"
              @click="deleteMileageLog(item)"
            />
          </div>
        </template>
      </v-data-table>
    </ListState>

    <MileageLogFormModal v-model="formOpen" :log="editing" :save="saveMileageLog" />
  </PageShell>
</template>
