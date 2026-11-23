<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { PAGE_SIZES } from "../utils/lists.js";
import { useRouter } from "vue-router";
import driverServices from "../services/driverServices.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import { formatDay } from "../models/vehicles.js";
import PageShell from "../components/layout/PageShell.vue";
import {
  DRIVER_STATUS_OPTIONS,
  driverHasStatus,
  driverMatchesQuery,
  driverStatusColor,
  driverStatusLabel,
  isLicenseExpired,
  isLicenseExpiringSoon,
  licenseExpiresInText,
  licenseNeedsRenewal,
} from "../models/drivers.js";
import { fullName } from "../models/users.js";

const router = useRouter();
const query = ref("");
const statusFilter = ref(null);
/** Only drivers whose license has run out or runs out within 30 days (approved or pending). */
const renewalsOnly = ref(false);
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
  { title: "Contact", key: "contact", sortable: false },
  { title: "License Expiration", key: "licenseExpirationDate", sortable: false, nowrap: true },
  { title: "Actions", key: "actions", sortable: false, align: "end", nowrap: true },
];

const filteredDrivers = computed(() =>
  drivers.value
    .filter(
      (driver) =>
        driverMatchesQuery(driver, query.value) &&
        driverHasStatus(driver, statusFilter.value) &&
        (!renewalsOnly.value || licenseNeedsRenewal(driver)),
    )
    .map((driver) => ({ ...driver, name: fullName(driver) })),
);
const renewalCount = computed(() => drivers.value.filter(licenseNeedsRenewal).length);

watch([query, statusFilter, renewalsOnly], () => {
  page.value = 1;
});

const editDriver = (driver) => router.push({ name: "driverDetails", params: { id: driver.id } });

onMounted(getDrivers);
</script>

<template>
  <!-- UI/UX backlog #42: the page title matches its menu label. -->
  <PageShell title="Drivers">
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'driverCreate' }">+ New Driver</v-btn>
    </template>

    <!-- Same layout as the vehicle list: search, status, and one quick filter in a row. -->
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <v-text-field
        v-model="query"
        prepend-inner-icon="mdi-magnify"
        placeholder="Search by name, phone, or email"
        aria-label="Search drivers"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="drivers-search"
        @click:clear="query = ''"
      />
      <v-select
        v-model="statusFilter"
        :items="DRIVER_STATUS_OPTIONS"
        label="Status"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="drivers-status-filter"
      />
      <!-- Like the vehicle list's "Needs attention": the licenses someone has to chase before trips are affected. -->
      <v-btn
        :variant="renewalsOnly ? 'flat' : 'outlined'"
        color="primary"
        :prepend-icon="renewalsOnly ? 'mdi-check' : 'mdi-card-account-details-outline'"
        height="40"
        class="oc-cta"
        :aria-pressed="renewalsOnly"
        title="Approved and pending drivers whose license has expired or expires within 30 days"
        data-test="license-renewals"
        @click="renewalsOnly = !renewalsOnly"
      >
        Licenses to renew
        <v-badge v-if="renewalCount" :content="renewalCount" :color="renewalsOnly ? 'surface' : 'error'" inline />
      </v-btn>
    </div>

    <ListState
      :loading
      :error
      :empty="!drivers.length"
      :no-results="!filteredDrivers.length"
      empty-title="No drivers yet"
      empty-text="Approved drivers with a current license can be chosen on trip requests."
      empty-art="people"
      :no-results-title="renewalsOnly && !query && !statusFilter ? 'Every license is current.' : 'No drivers match your search.'"
      no-results-text=""
    >
      <template #empty-actions>
        <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'driverCreate' }">+ New Driver</v-btn>
      </template>
      <v-data-table
        v-model:page="page"
        :headers="headers"
        :items="filteredDrivers"
        :items-per-page-options="PAGE_SIZES"
        item-value="id"
      >
        <template #[`item.name`]="{ item }">
          <router-link
            :to="{ name: 'driverDetails', params: { id: item.id } }"
            class="drivers-name oc-link d-block text-truncate font-weight-medium"
            :title="item.name"
          >
            {{ item.name }}
          </router-link>
        </template>

        <!-- Phone, then email: one column, two lines. -->
        <template #[`item.contact`]="{ item }">
          <div class="text-no-wrap">{{ item.phoneNumber }}</div>
          <div v-if="item.email" class="drivers-email text-body-small text-medium-emphasis text-truncate" :title="item.email" data-test="driver-email">
            {{ item.email }}
          </div>
        </template>

        <template #[`item.status`]="{ item }">
          <v-chip size="small" variant="tonal" :color="driverStatusColor(item.status)">
            {{ driverStatusLabel(item.status) }}
          </v-chip>
        </template>

        <!--
          Said in words, not just color: "Expired Oct 20, 2026", "Expires in 12 days". Only for drivers who drive (or are
          about to); a former or denied driver's old license doesn't need anyone's attention.
        -->
        <template #[`item.licenseExpirationDate`]="{ item }">
          <v-chip
            v-if="licenseNeedsRenewal(item) && isLicenseExpired(item)"
            class="license-expired"
            size="small"
            color="error"
            variant="flat"
            label
            prepend-icon="mdi-alert-circle"
            :title="`Can't be chosen for trips until the license is renewed`"
          >
            Expired {{ formatDay(item.licenseExpirationDate) }}
          </v-chip>
          <!-- UI/UX backlog #51: warn ahead of time, so the renewal can be asked for. -->
          <v-chip
            v-else-if="licenseNeedsRenewal(item) && isLicenseExpiringSoon(item)"
            class="license-expiring"
            size="small"
            color="warning"
            variant="tonal"
            label
            prepend-icon="mdi-clock-alert-outline"
            :title="`Expires ${formatDay(item.licenseExpirationDate)}`"
          >
            {{ licenseExpiresInText(item) }}
          </v-chip>
          <!-- UI/UX backlog #40: dates read like the rest of the app. -->
          <span v-else :class="{ 'text-medium-emphasis': isLicenseExpired(item) }">{{ formatDay(item.licenseExpirationDate) }}</span>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-tooltip text="Edit driver" location="top">
              <template #activator="{ props: tooltip }">
                <v-btn v-bind="tooltip" icon="mdi-pencil" size="small" variant="text" aria-label="Edit driver" @click="editDriver(item)" />
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table>
    </ListState>
  </PageShell>
</template>

<style scoped>
.drivers-search {
  flex: 1 1 260px;
  max-width: 380px;
}

.drivers-status-filter {
  flex: 0 1 200px;
}

.drivers-email {
  max-width: 260px;
}

.drivers-name {
  max-width: 18rem;
}
</style>
