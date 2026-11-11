<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import serviceLogServices from "../services/serviceLogServices.js";
import serviceTypeServices from "../services/serviceTypeServices.js";
import userServices from "../services/userServices.js";
import vehicleServices from "../services/vehicleServices.js";
import { fullName } from "../models/users.js";
import { mileageReading, serviceTypeName, userName, validateServiceLogForm, vehicleLabel } from "../models/serviceLogs.js";
import { useAuthStore } from "../stores/auth.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";
import ServiceLogFormModal from "../components/serviceLogs/ServiceLogFormModal.vue";

const ITEMS_PER_PAGE = 10;

const route = useRoute();
const auth = useAuthStore();
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
const editingId = ref(null);
const draft = ref({
  userId: null,
  serviceTypeId: null,
  miles: "",
  maintenanceNeedId: "",
  servicedAt: "",
});
const formError = ref("");
const saving = ref(false);
const users = ref([]);
const vehicles = ref([]);
const serviceTypes = ref([]);

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

const userOptions = computed(() => {
  const byId = new Map(users.value.map((user) => [user.id, user]));
  for (const log of serviceLogs.value) {
    if (log.user && !byId.has(log.user.id)) {
      byId.set(log.user.id, withLabel(log.user));
    }
  }

  return [...byId.values()];
});

const serviceTypeOptions = computed(() => {
  const byId = new Map(serviceTypes.value.map((serviceType) => [serviceType.id, serviceType]));
  for (const log of serviceLogs.value) {
    if (log.serviceType && !byId.has(log.serviceType.id)) {
      byId.set(log.serviceType.id, log.serviceType);
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
  const [vehicleResult, userResult, typeResult] = await Promise.allSettled([
    vehicleServices.getVehicles(),
    userServices.getUsers(),
    serviceTypeServices.getServiceTypes(),
  ]);

  vehicles.value = vehicleResult.status === "fulfilled" ? vehicleResult.value.data : [];
  serviceTypes.value = typeResult.status === "fulfilled" ? typeResult.value.data : [];
  if (userResult.status === "fulfilled") {
    users.value = userResult.value.data.map(withLabel);
  } else if (auth.user) {
    users.value = [
      withLabel({
        id: auth.user.userId,
        firstName: auth.user.firstName,
        lastName: auth.user.lastName,
      }),
    ];
  }
};

const openCreate = () => {
  formOpen.value = true;
};

const startEdit = (log) => {
  if (saving.value) {
    return;
  }

  editingId.value = log.id;
  draft.value = {
    userId: log.userId,
    serviceTypeId: log.serviceTypeId,
    miles: log.mileageLog?.odometerReading ?? "",
    maintenanceNeedId: log.maintenanceNeedId ?? "",
    servicedAt: log.servicedAt ?? "",
  };
  formError.value = "";
};

const cancelEdit = () => {
  if (saving.value) {
    return;
  }

  editingId.value = null;
  formError.value = "";
};

const saveEdit = async () => {
  if (saving.value || editingId.value === null) {
    return;
  }

  const result = validateServiceLogForm(draft.value);
  formError.value = result.message || "";
  if (result.message) {
    return;
  }

  saving.value = true;

  try {
    await serviceLogServices.updateServiceLog(editingId.value, {
      ...result.value,
      vehicleId: Number(vehicleId.value),
    });
    editingId.value = null;
    await getServiceLogs(vehicleId.value);
  } catch (saveError) {
    formError.value = saveError.response?.data?.message || "Failed to save service log.";
  } finally {
    saving.value = false;
  }
};

const createServiceLog = async (payload) => {
  await serviceLogServices.createServiceLog({ ...payload, vehicleId: Number(vehicleId.value) });
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
    if (editingId.value === log.id) {
      editingId.value = null;
      formError.value = "";
    }

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
      <v-alert v-if="formError" type="error" density="compact" class="mb-4">{{ formError }}</v-alert>

      <v-data-table
        :headers="headers"
        :items="serviceLogs"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
        <template #[`item.user`]="{ item }">
          <v-select
            v-if="editingId === item.id"
            v-model="draft.userId"
            :items="userOptions"
            item-title="label"
            item-value="id"
            label="User"
            density="compact"
            hide-details
            variant="outlined"
          />
          <span v-else>{{ userName(item) }}</span>
        </template>

        <template #[`item.vehicle`]="{ item }">
          <span>{{ vehicleLabel(item) }}</span>
        </template>

        <template #[`item.serviceType`]="{ item }">
          <v-select
            v-if="editingId === item.id"
            v-model="draft.serviceTypeId"
            :items="serviceTypeOptions"
            item-title="name"
            item-value="id"
            label="Service Type"
            density="compact"
            hide-details
            variant="outlined"
          />
          <span v-else>{{ serviceTypeName(item) }}</span>
        </template>

        <template #[`item.mileage`]="{ item }">
          <v-text-field
            v-if="editingId === item.id"
            v-model="draft.miles"
            label="Mileage"
            type="number"
            step="1"
            density="compact"
            hide-details
            variant="outlined"
          />
          <span v-else>{{ mileageReading(item) }}</span>
        </template>

        <template #[`item.maintenanceNeed`]="{ item }">
          <!-- INTERIM: a number until Feature 11 supplies maintenance needs. -->
          <v-text-field
            v-if="editingId === item.id"
            v-model="draft.maintenanceNeedId"
            label="Maintenance Need"
            type="number"
            min="1"
            step="1"
            density="compact"
            hide-details
            variant="outlined"
          />
          <span v-else>{{ item.maintenanceNeedId ?? "" }}</span>
        </template>

        <template #[`item.servicedAt`]="{ item }">
          <v-text-field
            v-if="editingId === item.id"
            v-model="draft.servicedAt"
            label="Serviced At"
            type="date"
            density="compact"
            hide-details
            variant="outlined"
          />
          <span v-else>{{ item.servicedAt }}</span>
        </template>

        <template #[`item.actions`]="{ item }">
          <div v-if="editingId === item.id" class="d-flex justify-end ga-1">
            <v-btn size="small" variant="text" color="primary" :loading="saving" @click="saveEdit">Save</v-btn>
            <v-btn size="small" variant="text" :disabled="saving" @click="cancelEdit">Cancel</v-btn>
          </div>
          <div v-else class="d-flex justify-end ga-1">
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
      :users="userOptions"
      :service-types="serviceTypeOptions"
      :save="createServiceLog"
    />
  </PageShell>
</template>
