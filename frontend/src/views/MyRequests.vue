<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import requestServices from "../services/requestServices.js";
import { useRequest } from "../composables/useRequest.js";
import RequestsBrowser from "../components/requests/RequestsBrowser.vue";

const router = useRouter();

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
  <v-container class="oc-page py-8">
    <RequestsBrowser
      title="My Requests"
      :requests
      :loading
      :error
      empty-title="You have not submitted any requests."
      empty-text="Reserve a vehicle for an upcoming trip and it will show up here."
      @open="openRequest"
    >
      <template #actions>
        <v-btn color="primary" variant="elevated" class="oc-cta" height="40" :to="{ name: 'createRequest' }">
          + New Request
        </v-btn>
      </template>
      <template #empty-actions>
        <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'createRequest' }">+ New Request</v-btn>
      </template>
    </RequestsBrowser>
  </v-container>
</template>
