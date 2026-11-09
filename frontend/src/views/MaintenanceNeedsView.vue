<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import maintenanceNeedServices from "../services/maintenanceNeedServices.js";
import PageShell from "../components/layout/PageShell.vue";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const loadError = ref("");
const need = ref(null);

const personName = (person) => (person ? `${person.firstName} ${person.lastName}` : "None");

const vehicleLabel = computed(() => {
  const vehicle = need.value?.vehicle;
  if (!vehicle) {
    return "";
  }

  return `${vehicle.color} ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate || ""})`;
});

const edit = () => {
  router.push({ name: "maintenanceNeedEdit", params: { id: route.params.id }, query: { tab: route.query.tab } });
};

const back = () => {
  router.push({ name: "maintenance-needs", query: { tab: route.query.tab } });
};

const viewReport = () => {
  if (!need.value?.issueReportId) {
    return;
  }

  router.push(`/issue-reports/${need.value.issueReportId}`);
};

const load = async () => {
  loading.value = true;
  loadError.value = "";

  try {
    const { data } = await maintenanceNeedServices.getMaintenanceNeed(route.params.id);
    need.value = data;
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
  <PageShell :title="need?.title || ''" :loading :error="loadError">
    <template v-if="need" #actions>
      <v-btn variant="text" @click="edit">Edit</v-btn>
      <v-btn variant="text" @click="back">Back to list</v-btn>
      <v-btn variant="text" :disabled="!need.issueReportId" @click="viewReport">View issue report</v-btn>
    </template>

    <section v-if="need">
      <p>Author: {{ personName(need.author) }}</p>
      <p>Assignee: {{ personName(need.assignee) }}</p>
      <p>Out of Service: {{ need.outOfService ? "Yes" : "No" }}</p>
      <p>Priority: {{ need.priority }}</p>
      <p>Status: {{ need.status }}</p>
      <p>Resolve Date: {{ need.resolvedAt || "None" }}</p>
    </section>

    <section v-if="need">
      <h3>Vehicle Information:</h3>
      <p>{{ vehicleLabel }}</p>
    </section>

    <section v-if="need">
      <h3>Description:</h3>
      <p>{{ need.description }}</p>
    </section>
  </PageShell>
</template>
