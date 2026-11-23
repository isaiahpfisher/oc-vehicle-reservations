<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import requestServices from "../services/requestServices.js";
import { useRequest } from "../composables/useRequest.js";
import { useRememberedView } from "../composables/useRememberedView.js";
import PageShell from "../components/layout/PageShell.vue";
import RequestsBrowser from "../components/requests/RequestsBrowser.vue";
import RequestViewToggle from "../components/requests/RequestViewToggle.vue";

const router = useRouter();
// UI/UX backlog #50: the table to start with (a list reads better than a calendar), remembered once changed.
const view = useRememberedView("myRequests", "table", ["table", "week", "month"]);

const {
  data: requests,
  loading,
  error,
  run: getRequests,
} = useRequest(requestServices.getMyRequests, { initial: [], fallback: "Failed to fetch your requests." });

const openRequest = (request) => router.push({ name: "request", params: { requestId: request.id } });

onMounted(getRequests);
</script>

<template>
  <PageShell title="My Requests">
    <template #actions>
      <RequestViewToggle v-model="view" />
      <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'createRequest' }">+ New Request</v-btn>
    </template>

    <RequestsBrowser
      v-model:view="view"
      :requests
      :loading
      :error
      empty-title="You have not submitted any requests."
      empty-text="Reserve a vehicle for an upcoming trip and it will show up here."
      @open="openRequest"
    >
      <template #empty-actions>
        <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'createRequest' }">+ New Request</v-btn>
      </template>
    </RequestsBrowser>
  </PageShell>
</template>
