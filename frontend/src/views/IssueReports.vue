<script setup>
import { computed, onMounted, ref } from "vue";
import issueReportServices from "../services/issueReportServices.js";
import userServices from "../services/userServices.js";
import vehicleServices from "../services/vehicleServices.js";
import vehicleRequestServices from "../services/vehicleRequestServices.js";
import { personName, statusLabel, typeLabel } from "../models/issueReports.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import { useRoles } from "../composables/useRoles.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";
import IssueReportFormModal from "../components/issueReports/IssueReportFormModal.vue";

const ITEMS_PER_PAGE = 10;

const { hasAnyRole, user } = useRoles();
const canManage = computed(() => hasAnyRole(["admin", "area_admin"]));

const headers = [
  { title: "Vehicle", key: "vehicle.universityId" },
  { title: "Type", key: "type" },
  { title: "Status", key: "status" },
  { title: "Description", key: "description" },
  { title: "Vehicle request", key: "vehicleRequest" },
  { title: "Author", key: "author" },
  { title: "Assignee", key: "assignee" },
  { title: "Resolved date", key: "resolvedAt" },
  { title: "Actions", key: "actions", sortable: false, align: "end", nowrap: true },
];

const formOpen = ref(false);
const editing = ref(null);
const vehicles = ref([]);
const vehicleRequests = ref([]);
const users = ref([]);

const {
  data: issueReports,
  loading,
  error,
  run: getIssueReports,
} = useRequest(
  (params) => issueReportServices.getIssueReports(params),
  { initial: [], fallback: "Failed to fetch issue reports." },
);

const loadReports = () => {
  if (canManage.value) {
    return getIssueReports();
  }

  return getIssueReports({ userId: user.value?.userId });
};

const loadOptions = async () => {
  const [vehicleResult, requestResult, userResult] = await Promise.allSettled([
    vehicleServices.getVehicles(),
    vehicleRequestServices.getVehicleRequests(),
    userServices.getUsers(),
  ]);

  vehicles.value = vehicleResult.status === "fulfilled" ? vehicleResult.value.data : [];
  vehicleRequests.value =
    requestResult.status === "fulfilled"
      ? requestResult.value.data.map((item) => ({ ...item, label: `${item.id} ${item.purpose}` }))
      : [];
  users.value =
    userResult.status === "fulfilled"
      ? userResult.value.data.map((item) => ({ ...item, label: personName(item) }))
      : [];
};

const openCreate = () => {
  editing.value = null;
  formOpen.value = true;
};

const openEdit = (report) => {
  editing.value = report;
  formOpen.value = true;
};

const saveIssueReport = async (payload) => {
  if (editing.value) {
    await issueReportServices.updateIssueReport(editing.value.id, payload);
  } else {
    await issueReportServices.createIssueReport(payload);
  }

  await loadReports();
};

const confirmDelete = useConfirm();

const deleteIssueReport = async (report) => {
  const deleted = await confirmDelete({
    title: "Delete issue report",
    message: `Delete "${report.description}"? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => issueReportServices.removeIssueReport(report.id),
  });

  if (deleted) {
    await loadReports();
  }
};

onMounted(async () => {
  await Promise.all([loadReports(), loadOptions()]);
});
</script>

<template>
  <PageShell title="Issue Reports">
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Issue Report</v-btn>
    </template>

    <ListState
      :loading
      :error
      :empty="!issueReports.length"
      empty-title="No issue reports yet. Create your first issue report."
      empty-icon="mdi-alert-circle-outline"
    >
      <v-data-table
        :headers="headers"
        :items="issueReports"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
        <template #[`item.vehicle.universityId`]="{ item }">{{ item.vehicle?.universityId }}</template>
        <template #[`item.type`]="{ item }">{{ typeLabel(item.type) }}</template>
        <template #[`item.status`]="{ item }">{{ statusLabel(item.status) }}</template>
        <template #[`item.description`]="{ item }">
          <span class="d-block text-truncate" style="max-width: 240px" :title="item.description">{{ item.description }}</span>
        </template>
        <template #[`item.vehicleRequest`]="{ item }">{{ item.vehicleRequest?.purpose }}</template>
        <template #[`item.author`]="{ item }">{{ personName(item.author) }}</template>
        <template #[`item.assignee`]="{ item }">{{ personName(item.assignee) }}</template>
        <template #[`item.actions`]="{ item }">
          <div v-if="canManage" class="d-flex justify-end ga-1">
            <v-btn icon="mdi-pencil" size="small" variant="text" aria-label="Edit issue report" @click="openEdit(item)" />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              aria-label="Delete issue report"
              @click="deleteIssueReport(item)"
            />
          </div>
        </template>
      </v-data-table>
    </ListState>

    <IssueReportFormModal
      v-model="formOpen"
      :report="editing"
      :vehicles
      :vehicle-requests="vehicleRequests"
      :users
      :save="saveIssueReport"
    />
  </PageShell>
</template>
