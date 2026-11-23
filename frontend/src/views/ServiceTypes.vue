<script setup>
import { computed, onMounted, ref } from "vue";
import { useNoticeStore } from "../stores/notice.js";
import serviceTypeServices from "../services/serviceTypeServices.js";
import vehicleServices from "../services/vehicleServices.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import { matchesWords } from "../utils/search.js";
import PageShell from "../components/layout/PageShell.vue";
import ServiceTypeFormModal from "../components/serviceTypes/ServiceTypeFormModal.vue";

// UI/UX backlog #48: the app-wide success toast.
const { notify } = useNoticeStore();

const formOpen = ref(false);
// UI/UX backlog #34: create and edit both use the dialog.
const editing = ref(null);

const {
  data: serviceTypes,
  loading,
  error,
  run: getServiceTypes,
} = useRequest(serviceTypeServices.getServiceTypes, {
  initial: [],
  fallback: "Failed to fetch service types.",
});

/**
 * UI/UX backlog #74: one schedule in words instead of two mostly-empty columns: "Every 5,000 mi or 180 days, whichever
 * comes first", "Every 365 days".
 */
const schedule = (serviceType) => {
  const miles = serviceType.service_frequency_miles ? `${serviceType.service_frequency_miles.toLocaleString()} mi` : "";
  const days = serviceType.service_frequency_days ? `${serviceType.service_frequency_days.toLocaleString()} days` : "";
  if (miles && days) return `Every ${miles} or ${days}, whichever comes first`;
  return miles || days ? `Every ${miles || days}` : "No schedule";
};

/**
 * How many vehicles are overdue or due soon for each service (Feature 18's per-vehicle service states), so the page
 * says where work is waiting. Retired vehicles don't count.
 */
const { data: fleet, run: getFleet } = useRequest(vehicleServices.getVehicles, { initial: [] });
const dueCounts = computed(() => {
  const counts = new Map();
  for (const vehicle of fleet.value) {
    if (vehicle.status === "retired") continue;
    for (const { serviceType, state } of vehicle.condition?.services ?? []) {
      if (state !== "overdue" && state !== "due_soon") continue;
      const count = counts.get(serviceType.id) ?? { overdue: 0, due_soon: 0 };
      count[state] += 1;
      counts.set(serviceType.id, count);
    }
  }
  return counts;
});
const due = (serviceType) => dueCounts.value.get(serviceType.id) ?? { overdue: 0, due_soon: 0 };
const vehiclesLink = (serviceType, state) => ({ name: "vehicles", query: { service: serviceType.name, due: state } });

const openCreate = () => {
  editing.value = null;
  formOpen.value = true;
};

const openEdit = (serviceType) => {
  editing.value = serviceType;
  formOpen.value = true;
};

const saveServiceType = async (payload) => {
  if (editing.value) {
    await serviceTypeServices.updateServiceType(editing.value.id, payload);
    notify("Service type saved.");
  } else {
    await serviceTypeServices.createServiceType(payload);
    notify("Service type created.");
  }
  await Promise.all([getServiceTypes(), getFleet()]);
};

const confirmDelete = useConfirm();

const deleteServiceType = async (serviceType) => {
  const deleted = await confirmDelete({
    title: "Delete service type",
    message: `Delete "${serviceType.name}"? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => serviceTypeServices.removeServiceType(serviceType.id),
  });

  if (deleted) {
    notify("Service type deleted.");
    await Promise.all([getServiceTypes(), getFleet()]);
  }
};

onMounted(() => {
  getServiceTypes();
  getFleet();
});

// UI/UX backlog #32: search the list. Alphabetical, all on one page: about a dozen never needs paging.
const search = ref("");
const searched = computed(() =>
  serviceTypes.value
    .filter((type) => matchesWords(search.value, [type.name, schedule(type)]))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name)),
);
</script>

<template>
  <!-- UI/UX backlog #42: the page title matches its menu label. -->
  <PageShell
    title="Service Types"
    subtitle="The maintenance every vehicle gets, how often, and which vehicles are due."
  >
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Service Type</v-btn>
    </template>

    <v-text-field
      v-model="search"
      prepend-inner-icon="mdi-magnify"
      placeholder="Search service types"
      aria-label="Search service types"
      variant="outlined"
      density="compact"
      clearable
      hide-details
      class="oc-list-search mb-4"
      data-test="list-search"
    />

    <ListState
      :loading
      :error
      :empty="!serviceTypes.length"
      :no-results="!searched.length"
      no-results-title="Nothing matches your search."
      no-results-text=""
      empty-title="No service types yet"
      empty-text="Service types set what gets serviced and how often, so each vehicle shows when it's due."
      empty-art="maintenance"
    >
      <template #empty-actions>
        <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Service Type</v-btn>
      </template>

      <!-- UI/UX backlog #74: one line per service (its schedule in words, where it's due), not a four-column table. -->
      <v-card>
        <ul class="service-list" data-test="service-list">
          <li v-for="serviceType in searched" :key="serviceType.id" class="service-row" data-test="service-row">
            <div class="service-row__main">
              <div class="text-body-large font-weight-medium text-truncate" :title="serviceType.name">{{ serviceType.name }}</div>
              <div class="text-body-medium text-medium-emphasis" data-test="service-schedule">{{ schedule(serviceType) }}</div>
            </div>

            <div class="service-row__due" data-test="service-due">
              <v-chip
                v-if="due(serviceType).overdue"
                :to="vehiclesLink(serviceType, 'overdue')"
                color="error"
                variant="tonal"
                size="small"
                label
                prepend-icon="mdi-alert-circle-outline"
                data-test="service-overdue"
              >
                {{ due(serviceType).overdue }} overdue
              </v-chip>
              <v-chip
                v-if="due(serviceType).due_soon"
                :to="vehiclesLink(serviceType, 'due_soon')"
                color="warning"
                variant="tonal"
                size="small"
                label
                prepend-icon="mdi-clock-outline"
                data-test="service-due-soon"
              >
                {{ due(serviceType).due_soon }} due soon
              </v-chip>
              <span v-if="!due(serviceType).overdue && !due(serviceType).due_soon" class="text-body-small text-medium-emphasis">
                Nothing due
              </span>
            </div>

            <!-- UI/UX backlog #36: one quiet menu instead of a pencil and a trash can on every row. -->
            <v-menu location="bottom end">
              <template #activator="{ props: menu }">
                <v-btn
                  v-bind="menu"
                  icon="mdi-dots-vertical"
                  size="small"
                  variant="text"
                  class="text-medium-emphasis"
                  :aria-label="`Actions for ${serviceType.name}`"
                  data-test="service-actions"
                />
              </template>
              <v-list density="compact" min-width="200">
                <v-list-item prepend-icon="mdi-pencil-outline" title="Edit service type" data-test="edit-service-type" @click="openEdit(serviceType)" />
                <v-list-item
                  prepend-icon="mdi-delete-outline"
                  title="Delete service type"
                  base-color="error"
                  data-test="delete-service-type"
                  @click="deleteServiceType(serviceType)"
                />
              </v-list>
            </v-menu>
          </li>
        </ul>
      </v-card>
    </ListState>

    <ServiceTypeFormModal v-model="formOpen" :service-types="serviceTypes" :service-type="editing" :save="saveServiceType" />
  </PageShell>
</template>

<style scoped>
.service-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.service-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  column-gap: 16px;
  padding: 12px 8px 12px 20px;
}

.service-row + .service-row {
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.service-row__main {
  min-width: 0;
}

.service-row__due {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

/* Phones: the due chips go under the name instead of squeezing it. */
@media (max-width: 600px) {
  .service-row {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: 8px;
  }

  .service-row__due {
    grid-column: 1;
    grid-row: 2;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
