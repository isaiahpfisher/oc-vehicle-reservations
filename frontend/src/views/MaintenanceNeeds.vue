<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import maintenanceNeedServices from "../services/maintenanceNeedServices.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import { useRoles } from "../composables/useRoles.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";

const ITEMS_PER_PAGE = 10;
const TABS = ["assigned", "open", "resolved", "all"];

const route = useRoute();
const router = useRouter();
const { hasRole, areaAdminAreaIds, user } = useRoles();
const isMaintenance = computed(() => hasRole("maintenance"));

const headers = [
  { title: "Title", key: "title" },
  { title: "Priority", key: "priority" },
  { title: "Assignee", key: "assignee" },
  { title: "Status", key: "status" },
  { title: "Actions", key: "actions", sortable: false, align: "end" },
];

const {
  data: maintenanceNeeds,
  loading,
  error,
  run: loadNeeds,
} = useRequest(() => maintenanceNeedServices.getMaintenanceNeeds(), {
  initial: [],
  fallback: "Failed to fetch maintenance needs.",
});

const defaultTab = () => (isMaintenance.value ? "assigned" : "open");
const initialTab = TABS.includes(route.query.tab) ? route.query.tab : defaultTab();
const tab = ref(isMaintenance.value || initialTab !== "assigned" ? initialTab : defaultTab());

watch(tab, (value) => {
  if (route.name === "maintenance-needs" && route.query.tab !== value) {
    router.replace({ name: "maintenance-needs", query: { tab: value } });
  }
});

const personName = (person) => (person ? `${person.firstName} ${person.lastName}` : "");

const visibleNeeds = computed(() => {
  const rows = [...maintenanceNeeds.value].sort(
    (left, right) => String(right.createdAt).localeCompare(String(left.createdAt)) || right.id - left.id,
  );

  if (hasRole("admin") || hasRole("maintenance")) {
    return rows;
  }

  const areaIds = new Set(areaAdminAreaIds.value.map(Number));
  return rows.filter((need) => areaIds.has(Number(need.vehicle?.areaId)));
});

const filteredNeeds = computed(() => {
  if (tab.value === "assigned") {
    return visibleNeeds.value.filter((need) => need.assigneeId === user.value?.userId && need.status === "Open");
  }

  if (tab.value === "open") {
    return visibleNeeds.value.filter((need) => need.status === "Open" || need.status === "In Progress");
  }

  if (tab.value === "resolved") {
    return visibleNeeds.value.filter((need) => need.status === "Completed" || need.status === "Canceled");
  }

  return visibleNeeds.value;
});

const assignedEmpty = computed(() => tab.value === "assigned" && !filteredNeeds.value.length);
const listEmpty = computed(() => !visibleNeeds.value.length);

const confirmDelete = useConfirm();

const openNeed = (need) => {
  router.push({ name: "maintenanceNeedDetails", params: { id: need.id }, query: { tab: tab.value } });
};

const deleteNeed = async (need) => {
  const deleted = await confirmDelete({
    title: "Delete maintenance need",
    message: `Delete "${need.title}"? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => maintenanceNeedServices.removeMaintenanceNeed(need.id),
  });

  if (deleted) {
    await loadNeeds();
  }
};

loadNeeds();
</script>

<template>
  <PageShell title="Maintenance Needs">
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="router.push({ name: 'maintenanceNeedCreate' })">+ New Maintenance Need</v-btn>
    </template>

    <v-tabs v-model="tab" class="mb-4">
      <v-tab v-if="isMaintenance" value="assigned">Assigned to Me</v-tab>
      <v-tab value="open">Open</v-tab>
      <v-tab value="resolved">Resolved</v-tab>
      <v-tab value="all">All</v-tab>
    </v-tabs>

    <p v-if="assignedEmpty && !loading">Nothing to do. Enjoy your day!</p>

    <ListState
      v-else
      :loading
      :error
      :empty="listEmpty"
      empty-title="No maintenance needs yet. Create a maintenance need."
      empty-icon="mdi-wrench-outline"
    >
      <v-data-table
        :headers="headers"
        :items="filteredNeeds"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
        <template #[`item.assignee`]="{ item }">{{ personName(item.assignee) }}</template>
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-btn icon="mdi-eye-outline" size="small" variant="text" aria-label="View maintenance need" @click="openNeed(item)" />
            <v-btn icon="mdi-delete" size="small" variant="text" aria-label="Delete maintenance need" @click="deleteNeed(item)" />
          </div>
        </template>
      </v-data-table>
    </ListState>
  </PageShell>
</template>
