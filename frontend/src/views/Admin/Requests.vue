<script setup>
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import requestServices from "../../services/requestServices.js";
import { useRequest } from "../../composables/useRequest.js";
import { useRememberedView } from "../../composables/useRememberedView.js";
import PageShell from "../../components/layout/PageShell.vue";
import RequestsBrowser from "../../components/requests/RequestsBrowser.vue";
import RequestViewToggle from "../../components/requests/RequestViewToggle.vue";

const router = useRouter();
const route = useRoute();
// UI/UX backlog #50: the table to start with (a list reads better than a calendar), remembered once changed.
const view = useRememberedView("adminRequests", "table", ["table", "week", "month"]);

const {
  data: requests,
  loading,
  error,
  run: getRequests,
} = useRequest(requestServices.getRequests, { initial: [], fallback: "Failed to fetch requests." });

const openRequest = (request) => router.push({ name: "request", params: { requestId: request.id } });

onMounted(getRequests);
</script>

<template>
  <PageShell title="Requests">
    <template #actions>
      <RequestViewToggle v-model="view" />
    </template>

    <RequestsBrowser
      v-model:view="view"
      :requests
      :loading
      :error
      admin
      :needs-action-first="route.query.needsAction === '1'"
      :start-area="typeof route.query.area === 'string' ? route.query.area : null"
      :start-statuses="typeof route.query.status === 'string' ? route.query.status.split(',') : []"
      empty-title="No requests yet"
      empty-text="Trip requests in your areas show up here."
      @open="openRequest"
    />
  </PageShell>
</template>
