<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import driverServices from "../services/driverServices.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";
import {
  DRIVER_STATUS_OPTIONS,
  driverHasStatus,
  driverMatchesQuery,
  driverStatusColor,
  driverStatusLabel,
  isLicenseExpired,
} from "../models/drivers.js";
import { fullName } from "../models/users.js";

const ITEMS_PER_PAGE = 10;

const router = useRouter();
const query = ref("");
const statusFilter = ref(null);
const page = ref(1);

const {
  data: drivers,
  loading,
  error,
  run: getDrivers,
} = useRequest(driverServices.getDrivers, { initial: [], fallback: "Failed to fetch drivers." });

const headers = [
  { title: "Name", key: "name", sortable: false },
  { title: "Status", key: "status", sortable: false },
  { title: "Phone Number", key: "phoneNumber", sortable: false, nowrap: true },
  { title: "License Expiration", key: "licenseExpirationDate", sortable: false, nowrap: true },
  { title: "Actions", key: "actions", sortable: false, align: "end", nowrap: true },
];

const filteredDrivers = computed(() =>
  drivers.value
    .filter((driver) => driverMatchesQuery(driver, query.value) && driverHasStatus(driver, statusFilter.value))
    .map((driver) => ({ ...driver, name: fullName(driver) })),
);

watch([query, statusFilter], () => {
  page.value = 1;
});

const editDriver = (driver) => router.push({ name: "driverDetails", params: { id: driver.id } });

const confirmDelete = useConfirm();

const deleteDriver = async (driver) => {
  const deleted = await confirmDelete({
    title: "Delete driver",
    message: `Delete "${fullName(driver)}"? This action is permanent.`,
    confirmText: "Delete Driver",
    confirmColor: "error",
    onConfirm: () => driverServices.removeDriver(driver.id),
  });

  if (deleted) {
    await getDrivers();
  }
};

onMounted(getDrivers);
</script>

<template>
  <PageShell title="Driver Management">
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'driverCreate' }">+ New Driver</v-btn>
    </template>

    <v-row>
      <v-col cols="12" md="8">
        <v-text-field
          v-model="query"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search drivers by name or phone number..."
          aria-label="Search drivers"
          clearable
          @click:clear="query = ''"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-select v-model="statusFilter" :items="DRIVER_STATUS_OPTIONS" label="Filter by status" clearable />
      </v-col>
    </v-row>

    <ListState
      :loading
      :error
      :empty="!drivers.length"
      :no-results="!filteredDrivers.length"
      empty-title="No drivers yet. Create your first driver."
      empty-icon="mdi-card-account-details-outline"
      no-results-title="No drivers match your search."
      no-results-text=""
    >
      <v-data-table
        v-model:page="page"
        :headers="headers"
        :items="filteredDrivers"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
        <template #[`item.name`]="{ item }">
          <router-link
            :to="{ name: 'driverDetails', params: { id: item.id } }"
            class="drivers-name d-block text-truncate text-primary font-weight-medium"
            :title="item.name"
          >
            {{ item.name }}
          </router-link>
        </template>

        <template #[`item.status`]="{ item }">
          <v-chip size="small" variant="tonal" :color="driverStatusColor(item.status)">
            {{ driverStatusLabel(item.status) }}
          </v-chip>
        </template>

        <template #[`item.licenseExpirationDate`]="{ item }">
          <v-chip
            v-if="isLicenseExpired(item)"
            class="license-expired"
            size="small"
            color="error"
            variant="flat"
            prepend-icon="mdi-alert-circle-outline"
            title="License expired"
          >
            {{ item.licenseExpirationDate }}
          </v-chip>
          <template v-else>{{ item.licenseExpirationDate }}</template>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-btn icon="mdi-pencil" size="small" variant="text" aria-label="Edit driver" @click="editDriver(item)" />
            <v-btn icon="mdi-delete" size="small" variant="text" aria-label="Delete driver" @click="deleteDriver(item)" />
          </div>
        </template>
      </v-data-table>
    </ListState>
  </PageShell>
</template>

<style scoped>
.drivers-name {
  max-width: 18rem;
}
</style>
