<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import requestServices from "../../services/requestServices.js";
import { useRequest } from "../../composables/useRequest.js";
import RequestsBrowser from "../../components/requests/RequestsBrowser.vue";

const router = useRouter();

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
  <v-container class="oc-page py-8">
    <RequestsBrowser
      title="Requests"
      :requests
      :loading
      :error
      admin
      empty-title="No one has any submitted requests."
      @open="openRequest"
    />
  </v-container>
</template>
