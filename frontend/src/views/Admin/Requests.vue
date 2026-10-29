<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import requestServices from "../../services/requestServices.js";
import { useRequest } from "../../composables/useRequest.js";
import PageShell from "../../components/layout/PageShell.vue";
import RequestsBrowser from "../../components/requests/RequestsBrowser.vue";
import RequestViewToggle from "../../components/requests/RequestViewToggle.vue";

const router = useRouter();
const view = ref("table");

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
      empty-title="No one has any submitted requests."
      @open="openRequest"
    />
  </PageShell>
</template>
