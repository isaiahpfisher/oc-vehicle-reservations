<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import maintenanceNeedServices from "../services/maintenanceNeedServices.js";
import serviceLogServices from "../services/serviceLogServices.js";
import serviceTypeServices from "../services/serviceTypeServices.js";
import vehicleServices from "../services/vehicleServices.js";
import { fullName } from "../models/users.js";
import {
  maintenanceNeedTitle,
  mileageReading,
  serviceTypeName,
  userName,
  vehicleLabel,
} from "../models/serviceLogs.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";
import ServiceLogFormModal from "../components/serviceLogs/ServiceLogFormModal.vue";

const ITEMS_PER_PAGE = 10;

const route = useRoute();
const vehicleId = computed(() => route.params.vehicleId);

const headers = [
  { title: "User", key: "user" },
  { title: "Vehicle", key: "vehicle" },
  { title: "Service Type", key: "serviceType" },
  { title: "Mileage", key: "mileage" },
  { title: "Maintenance Need", key: "maintenanceNeed" },
  { title: "Serviced At", key: "servicedAt" },
  { title: "Actions", key: "actions", sortable: false, align: "end", nowrap: true },
];

const formOpen = ref(false);
const editingLog = ref(null);
const users = ref([]);
const vehicles = ref([]);
const serviceTypes = ref([]);
const maintenanceNeeds = ref([]);

const {
  data: serviceLogs,
  loading,
  error,
  run: getServiceLogs,
} = useRequest(serviceLogServices.getServiceLogsByVehicle, {
  initial: [],
  fallback: "Failed to fetch service logs.",
});

const withLabel = (user) => ({ ...user, label: fullName(user) });

const serviceTypeOptions = computed(() => {
  const byId = new Map(serviceTypes.value.map((serviceType) => [serviceType.id, serviceType]));
  for (const log of serviceLogs.value) {
    if (log.serviceType && !byId.has(log.serviceType.id)) {
      byId.set(log.serviceType.id, log.serviceType);
    }
  }

  return [...byId.values()];
});

const maintenanceNeedOptions = computed(() => {
  const byId = new Map(
    maintenanceNeeds.value
      .filter((need) => String(need.vehicleId) === String(vehicleId.value))
      .map((need) => [need.id, need]),
  );
  for (const log of serviceLogs.value) {
    if (log.maintenanceNeed && !byId.has(log.maintenanceNeed.id)) {
      byId.set(log.maintenanceNeed.id, log.maintenanceNeed);
    }
  }

  return [...byId.values()];
});

const universityId = computed(() => {
  const fromLog = serviceLogs.value.find((log) => log.vehicle)?.vehicle?.universityId;
  if (fromLog) {
    return fromLog;
  }

  const match = vehicles.value.find((vehicle) => String(vehicle.id) === String(vehicleId.value));
  return match?.universityId ?? "";
});

const breadcrumbs = computed(() => [
  { title: "Vehicles", to: { name: "vehicles" } },
  { title: universityId.value || "Vehicle", to: { name: "vehicleDetails", params: { id: vehicleId.value } } },
  { title: "Service Log", disabled: true },
]);

const loadOptions = async () => {
  const [vehicleResult, userResult, typeResult, needResult] = await Promise.allSettled([
    vehicleServices.getVehicles(),
    maintenanceNeedServices.getMaintenanceNeedOptions(),
    serviceTypeServices.getServiceTypes(),
    maintenanceNeedServices.getMaintenanceNeeds(),
  ]);

  vehicles.value = vehicleResult.status === "fulfilled" ? vehicleResult.value.data : [];
  serviceTypes.value = typeResult.status === "fulfilled" ? typeResult.value.data : [];
  maintenanceNeeds.value = needResult.status === "fulfilled" ? needResult.value.data : [];
  users.value = userResult.status === "fulfilled" ? userResult.value.data.assignees.map(withLabel) : [];
};

const formInitial = computed(() => {
  const log = editingLog.value;
  if (!log) {
    return null;
  }

  return {
    userId: log.userId,
    serviceTypeId: log.serviceTypeId,
    miles: log.mileageLog?.odometerReading ?? "",
    maintenanceNeedId: log.maintenanceNeedId ?? null,
    servicedAt: log.servicedAt ?? "",
  };
});

const openCreate = () => {
  editingLog.value = null;
  formOpen.value = true;
};

const startEdit = (log) => {
  editingLog.value = log;
  formOpen.value = true;
};

const saveServiceLog = async (payload) => {
  const body = { ...payload, vehicleId: Number(vehicleId.value) };
  if (editingLog.value) {
    await serviceLogServices.updateServiceLog(editingLog.value.id, body);
  } else {
    await serviceLogServices.createServiceLog(body);
  }

  await getServiceLogs(vehicleId.value);
};

const confirmDelete = useConfirm();

const deleteServiceLog = async (log) => {
  const deleted = await confirmDelete({
    title: "Delete service log",
    message: `Delete the ${serviceTypeName(log) || "service"} on ${log.servicedAt}? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => serviceLogServices.removeServiceLog(log.id),
  });

  if (deleted) {
    await getServiceLogs(vehicleId.value);
  }
};

onMounted(() => {
  loadOptions();
  getServiceLogs(vehicleId.value);
});
</script>

<template>
  <PageShell title="Service Log Management" :subtitle="universityId" :breadcrumbs>
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Service Log</v-btn>
    </template>

    <ListState
      :loading
      :error
      :empty="!serviceLogs.length"
      empty-title="No service logs yet. Create your first service log."
      empty-icon="mdi-wrench-clock"
    >
      <v-data-table
        :headers="headers"
        :items="serviceLogs"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
        <template #[`item.user`]="{ item }">
          <span>{{ userName(item) }}</span>
        </template>

        <template #[`item.vehicle`]="{ item }">
          <span>{{ vehicleLabel(item) }}</span>
        </template>

        <template #[`item.serviceType`]="{ item }">
          <span>{{ serviceTypeName(item) }}</span>
        </template>

        <template #[`item.mileage`]="{ item }">
          <span>{{ mileageReading(item) }}</span>
        </template>

        <template #[`item.maintenanceNeed`]="{ item }">
          <span>{{ maintenanceNeedTitle(item) }}</span>
        </template>

        <template #[`item.servicedAt`]="{ item }">
          <span>{{ item.servicedAt }}</span>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              aria-label="Edit service log"
              @click="startEdit(item)"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              aria-label="Delete service log"
              @click="deleteServiceLog(item)"
            />
          </div>
        </template>
      </v-data-table>
    </ListState>

    <ServiceLogFormModal
      v-model="formOpen"
      :title="editingLog ? 'Edit service log' : 'New service log'"
      :submit-label="editingLog ? 'Save' : 'Create'"
      :users="users"
      :service-types="serviceTypeOptions"
      :maintenance-needs="maintenanceNeedOptions"
      :initial="formInitial"
      :save="saveServiceLog"
    />
  </PageShell>
</template>
