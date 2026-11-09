<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import maintenanceNeedServices from "../services/maintenanceNeedServices.js";
import { useRoles } from "../composables/useRoles.js";
import PageShell from "../components/layout/PageShell.vue";

const route = useRoute();
const router = useRouter();
const { hasRole, areaAdminAreaIds, user } = useRoles();

const isCreate = computed(() => route.name === "maintenanceNeedCreate");
const needId = computed(() => route.params.id);

const loading = ref(true);
const loadError = ref("");
const formError = ref("");
const saving = ref(false);
const heading = ref("New maintenance need");
const vehicles = ref([]);
const assignees = ref([]);

const todayString = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const blank = () => ({
  title: "",
  assigneeId: null,
  outOfService: true,
  priority: "None",
  status: "Open",
  resolvedAt: null,
  vehicleId: null,
  description: "",
  issueReportId: null,
});

const form = ref(blank());

const priorities = ["High", "Medium", "Low", "None"];
const statuses = ["Open", "In Progress", "Completed", "Canceled"];
const outOfServiceItems = [
  { title: "Yes", value: true },
  { title: "No", value: false },
];

const vehicleLabel = (vehicle) => `${vehicle.color} ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate || ""})`;

const vehicleItems = computed(() => {
  const rows =
    hasRole("admin") || hasRole("maintenance")
      ? vehicles.value
      : vehicles.value.filter((vehicle) => areaAdminAreaIds.value.map(Number).includes(Number(vehicle.areaId)));

  return rows.map((vehicle) => ({ title: vehicleLabel(vehicle), value: vehicle.id }));
});

const assigneeItems = computed(() =>
  assignees.value.map((person) => ({ title: `${person.firstName} ${person.lastName}`, value: person.id })),
);

const resolveDateVisible = computed(() => form.value.status === "Completed" || form.value.status === "Canceled");

watch(
  () => form.value.status,
  (status) => {
    if ((status === "Completed" || status === "Canceled") && !form.value.resolvedAt) {
      form.value.resolvedAt = todayString();
    }
  },
);

const limitTitle = (value) => {
  form.value.title = String(value ?? "").slice(0, 50);
};

const backToDetails = () => {
  router.push({ name: "maintenanceNeedDetails", params: { id: needId.value }, query: { tab: route.query.tab } });
};

const cancel = () => {
  if (isCreate.value) {
    router.push({ name: "maintenance-needs" });
    return;
  }

  backToDetails();
};

const submit = async () => {
  if (!form.value.title.trim()) {
    formError.value = "Required field.";
    return;
  }

  formError.value = "";
  saving.value = true;

  const payload = {
    title: form.value.title.trim(),
    assigneeId: form.value.assigneeId || null,
    vehicleId: form.value.vehicleId,
    description: form.value.description.trim() || null,
    outOfService: form.value.outOfService,
    priority: form.value.priority,
    status: form.value.status,
    resolvedAt: resolveDateVisible.value ? form.value.resolvedAt : null,
    authorId: user.value?.userId ?? null,
    issueReportId: form.value.issueReportId,
  };

  try {
    if (isCreate.value) {
      const response = await maintenanceNeedServices.createMaintenanceNeed(payload);
      if (response.status !== 201 && response.status !== 200) {
        formError.value = "Failed to save maintenance need.";
        return;
      }
      await router.push({ name: "maintenance-needs" });
      return;
    }

    await maintenanceNeedServices.updateMaintenanceNeed(needId.value, payload);
    backToDetails();
  } catch (error) {
    if (error.response?.status === 403) {
      await router.push({ name: "home" });
      return;
    }
    formError.value = error.response?.data?.message || "Failed to save maintenance need.";
  } finally {
    saving.value = false;
  }
};

const load = async () => {
  loading.value = true;
  loadError.value = "";

  try {
    const { data } = await maintenanceNeedServices.getMaintenanceNeedOptions();
    vehicles.value = data.vehicles ?? [];
    assignees.value = data.assignees ?? [];

    if (isCreate.value && hasRole("maintenance")) {
      const current = user.value;
      if (current && !assignees.value.some((person) => person.id === current.userId)) {
        assignees.value = [
          { id: current.userId, firstName: current.firstName, lastName: current.lastName },
          ...assignees.value,
        ];
      }
      form.value.assigneeId = current?.userId ?? null;
    }

    if (!isCreate.value) {
      const { data: need } = await maintenanceNeedServices.getMaintenanceNeed(needId.value);
      heading.value = need.title;
      form.value = {
        title: need.title ?? "",
        assigneeId: need.assigneeId,
        outOfService: need.outOfService,
        priority: need.priority,
        status: need.status,
        resolvedAt: need.resolvedAt,
        vehicleId: need.vehicleId,
        description: need.description ?? "",
        issueReportId: need.issueReportId,
      };
    }
  } catch (error) {
    if (error.response?.status === 403) {
      await router.push({ name: "home" });
      return;
    }
    loadError.value = error.response?.data?.message || "Failed to fetch maintenance need.";
  } finally {
    loading.value = false;
  }
};

load();
</script>

<template>
  <PageShell :title="isCreate ? 'New maintenance need' : heading" :loading :error="loadError" :max-width="720">
    <v-form @submit.prevent="submit">
      <v-text-field :model-value="form.title" label="Title" maxlength="50" @update:model-value="limitTitle" />
      <v-select v-model="form.assigneeId" :items="assigneeItems" item-title="title" item-value="value" label="Assignee" clearable />
      <v-select
        v-model="form.outOfService"
        :items="outOfServiceItems"
        item-title="title"
        item-value="value"
        label="Out of Service"
      />
      <v-select v-model="form.priority" :items="priorities" label="Priority" />
      <v-select v-model="form.status" :items="statuses" label="Status" />
      <v-text-field v-if="resolveDateVisible" v-model="form.resolvedAt" label="Resolve Date" type="date" />
      <v-select v-model="form.vehicleId" :items="vehicleItems" item-title="title" item-value="value" label="Vehicle" />
      <v-textarea v-model="form.description" label="Description" />

      <v-alert v-if="formError" type="error" density="compact" class="mb-4">{{ formError }}</v-alert>

      <div class="d-flex ga-2">
        <v-btn color="primary" variant="elevated" class="oc-cta" :disabled="saving" @click="submit">
          {{ saving ? "Saving…" : isCreate ? "Create" : "Save" }}
        </v-btn>
        <v-btn variant="text" :disabled="saving" @click="cancel">Cancel</v-btn>
      </div>
    </v-form>
  </PageShell>
</template>
