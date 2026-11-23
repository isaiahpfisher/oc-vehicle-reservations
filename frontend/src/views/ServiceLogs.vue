<script setup>
import { computed, onMounted, ref } from "vue";
import { useNoticeStore } from "../stores/notice.js";
import { PAGE_SIZES } from "../utils/lists.js";
import { useRoute } from "vue-router";
import maintenanceNeedServices from "../services/maintenanceNeedServices.js";
import serviceLogServices from "../services/serviceLogServices.js";
import serviceTypeServices from "../services/serviceTypeServices.js";
import vehicleServices from "../services/vehicleServices.js";
import { fullName } from "../models/users.js";
import { formatDay, formatMiles, vehicleName } from "../models/vehicles.js";
import { SERVICE_CALENDAR_LEGEND, dueEvents, groupVisits, visitEvents } from "../models/serviceLogs.js";
import { useRememberedView } from "../composables/useRememberedView.js";
import EventCalendar from "../components/common/EventCalendar.vue";
import ViewToggle from "../components/common/ViewToggle.vue";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import { matchesWords } from "../utils/search.js";
import PageShell from "../components/layout/PageShell.vue";
import ServiceLogFormModal from "../components/serviceLogs/ServiceLogFormModal.vue";

// UI/UX backlog #48: the app-wide success toast.
const { notify } = useNoticeStore();
const route = useRoute();
const vehicleId = computed(() => route.params.vehicleId);

// UI/UX backlog #54: one row per visit (the services sharing one odometer reading); date first; no Vehicle column
// (it's this page's vehicle); every column sorts on a real value (#49).
const headers = [
  { title: "Serviced", key: "servicedAt", nowrap: true },
  { title: "Services", key: "services", value: (visit) => visit.services.join(", "), nowrap: true },
  { title: "Odometer", key: "miles", value: (visit) => Number(visit.miles) || 0, nowrap: true },
  { title: "Serviced by", key: "people", value: (visit) => visit.people.join(", ") },
  { title: "Maintenance need", key: "needs", value: (visit) => visit.needs.map(({ title }) => title).join(", ") },
  { title: "Actions", key: "actions", sortable: false, align: "end", nowrap: true },
];

const formOpen = ref(false);
const editingLog = ref(null);
/** The service a new log starts with, when it was started from that service's due date on the calendar. */
const presetServiceTypeId = ref(null);
const users = ref([]);
const vehicles = ref([]);
const serviceTypes = ref([]);
const maintenanceNeeds = ref([]);

const {
  data: serviceLogs,
  loading,
  error,
  run: getServiceLogs,
} = useRequest(serviceLogServices.getServiceLogsByVehicle, {
  initial: [],
  fallback: "Failed to fetch service logs.",
});

const withLabel = (user) => ({ ...user, label: fullName(user) });

const serviceTypeOptions = computed(() => {
  const byId = new Map(serviceTypes.value.map((serviceType) => [serviceType.id, serviceType]));
  for (const log of serviceLogs.value) {
    if (log.serviceType && !byId.has(log.serviceType.id)) {
      byId.set(log.serviceType.id, log.serviceType);
    }
  }

  return [...byId.values()];
});

const maintenanceNeedOptions = computed(() => {
  const byId = new Map(
    maintenanceNeeds.value
      // UI/UX backlog #57: only needs still open can take new work; a log already linked to a closed one keeps it
      // (added below).
      .filter((need) => String(need.vehicleId) === String(vehicleId.value) && ["Open", "In Progress"].includes(need.status))
      .map((need) => [need.id, need]),
  );
  for (const log of serviceLogs.value) {
    if (log.maintenanceNeed && !byId.has(log.maintenanceNeed.id)) {
      byId.set(log.maintenanceNeed.id, log.maintenanceNeed);
    }
  }

  return [...byId.values()];
});

const universityId = computed(() => {
  const fromLog = serviceLogs.value.find((log) => log.vehicle)?.vehicle?.universityId;
  if (fromLog) {
    return fromLog;
  }

  const match = vehicles.value.find((vehicle) => String(vehicle.id) === String(vehicleId.value));
  return match?.universityId ?? "";
});

/** The vehicle as people know it: "V-100 · 2022 Ford Transit". */
const vehicleSubtitle = computed(() => {
  const match = vehicles.value.find((vehicle) => String(vehicle.id) === String(vehicleId.value));
  return [universityId.value, match ? vehicleName(match) : ""].filter(Boolean).join(" · ");
});

const breadcrumbs = computed(() => [
  { title: "Vehicles", to: { name: "vehicles" } },
  { title: universityId.value || "Vehicle", to: { name: "vehicleDetails", params: { id: vehicleId.value } } },
  { title: "Service Log", disabled: true },
]);

const loadOptions = async () => {
  const [vehicleResult, userResult, typeResult, needResult] = await Promise.allSettled([
    vehicleServices.getVehicles(),
    maintenanceNeedServices.getMaintenanceNeedOptions(),
    serviceTypeServices.getServiceTypes(),
    maintenanceNeedServices.getMaintenanceNeeds(),
  ]);

  vehicles.value = vehicleResult.status === "fulfilled" ? vehicleResult.value.data : [];
  serviceTypes.value = typeResult.status === "fulfilled" ? typeResult.value.data : [];
  maintenanceNeeds.value = needResult.status === "fulfilled" ? needResult.value.data : [];
  users.value = userResult.status === "fulfilled" ? userResult.value.data.assignees.map(withLabel) : [];
};

const visits = computed(() => groupVisits(serviceLogs.value));

/** UI/UX backlog #54: editing a visit changes all of its services at once, so it starts with every one of them. */
/**
 * A visit changes when services are due, so after saving or deleting one, reload this vehicle (its service states)
 * along with the logs; otherwise the calendar keeps showing the old due date until the page is reloaded.
 */
const refreshVehicle = async () => {
  try {
    const { data } = await vehicleServices.getVehicle(vehicleId.value);
    vehicles.value = vehicles.value.some((vehicle) => String(vehicle.id) === String(data.id))
      ? vehicles.value.map((vehicle) => (String(vehicle.id) === String(data.id) ? { ...vehicle, ...data } : vehicle))
      : [...vehicles.value, data];
  } catch {
    // The logs still reload; the due dates catch up on the next visit to the page.
  }
};
const reload = () => Promise.all([getServiceLogs(vehicleId.value), refreshVehicle()]);

const formInitial = computed(() => {
  const visit = editingLog.value;
  if (!visit) {
    return null;
  }

  return {
    userId: visit.userId,
    serviceTypeIds: visit.serviceTypeIds,
    miles: visit.miles,
    maintenanceNeedId: visit.maintenanceNeedId,
    servicedAt: visit.servicedAt ?? "",
  };
});

const openCreate = (serviceTypeId = null) => {
  editingLog.value = null;
  presetServiceTypeId.value = serviceTypeId;
  formOpen.value = true;
};

const startEdit = (visit) => {
  editingLog.value = visit;
  formOpen.value = true;
};

const saveServiceLog = async (payload) => {
  const body = { ...payload, vehicleId: Number(vehicleId.value) };
  const visit = editingLog.value;
  if (visit?.mileageLogId) {
    await serviceLogServices.updateServiceVisit(visit.mileageLogId, body);
  } else if (visit) {
    // A log with no reading (older data) is still one row on its own.
    const { serviceTypeIds, ...single } = body;
    await serviceLogServices.updateServiceLog(visit.logs[0].id, { ...single, serviceTypeId: serviceTypeIds[0] });
  } else {
    await serviceLogServices.createServiceLog(body);
  }
  notify(editingLog.value ? "Service log saved." : "Service log created.");

  await reload();
};

const confirmDelete = useConfirm();

/** "Oil Change", "Oil Change and Tire Rotation", "Oil Change, Tire Rotation and 2 more". */
const servicesText = (services) => {
  if (services.length <= 2) return services.join(" and ") || "service";
  return `${services.slice(0, 2).join(", ")} and ${services.length - 2} more`;
};

const deleteServiceLog = async (visit) => {
  const deleted = await confirmDelete({
    title: "Delete service log",
    // UI/UX backlog #54 / #56: the whole visit goes; say what happens to its reading (Feature 13 keeps it).
    message: `Delete the ${servicesText(visit.services)} on ${formatDay(visit.servicedAt)}? This action is permanent.${
      visit.miles !== "" ? ` The odometer reading of ${formatMiles(visit.miles)} stays on the mileage log.` : ""
    }`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () =>
      visit.mileageLogId
        ? serviceLogServices.removeServiceVisit(visit.mileageLogId)
        : serviceLogServices.removeServiceLog(visit.logs[0].id),
  });

  if (deleted) {
    notify("Service log deleted.");
    await reload();
  }
};


onMounted(() => {
  loadOptions();
  getServiceLogs(vehicleId.value);
});

// Table or month: this vehicle's visits and the services due by date. Whole days, so no week view.
const view = useRememberedView("service-log", "table", ["table", "month"]);
const thisVehicle = computed(() => vehicles.value.filter((vehicle) => String(vehicle.id) === String(vehicleId.value)));
const calendarEvents = computed(() => [
  ...visitEvents(searched.value),
  ...dueEvents(thisVehicle.value, { withVehicle: false }),
]);
/** A visit opens to edit; a due date starts logging that service, with it already picked. */
const openEvent = (event) => (event.kind === "visit" ? startEdit(event.visit) : openCreate(event.serviceType?.id ?? null));

// UI/UX backlog #32: search the list.
const search = ref("");
const searched = computed(() =>
  visits.value.filter((visit) =>
    matchesWords(search.value, [...visit.services, ...visit.people, ...visit.needs.map(({ title }) => title), visit.servicedAt, visit.miles]),
  ),
);
</script>

<template>
  <!-- UI/UX backlog #53: named like the vehicle page's "Service log" card. -->
  <PageShell title="Service log" :subtitle="vehicleSubtitle" :breadcrumbs>
    <template #actions>
      <ViewToggle v-model="view" :views="['table', 'month']" />
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate()">+ New Service Log</v-btn>
    </template>

    <v-text-field
      v-model="search"
      prepend-inner-icon="mdi-magnify"
      placeholder="Search by service, person, or date"
      aria-label="Search service logs"
      variant="outlined"
      density="compact"
      clearable
      hide-details
      class="oc-list-search mb-4"
      data-test="list-search"
    />

    <v-skeleton-loader v-if="view === 'month' && loading" type="heading, image" />
    <v-alert v-else-if="view === 'month' && error" type="error" density="compact">{{ error }}</v-alert>
    <EventCalendar
      v-else-if="view === 'month'"
      view="month"
      :events="calendarEvents"
      :legend="SERVICE_CALENDAR_LEGEND"
      @open="openEvent"
    >
      <template #note>Click a visit to edit it, or a due date to log that service. Services due only by miles aren't on the calendar.</template>
    </EventCalendar>

    <ListState
      v-else
      :loading
      :error
      :empty="!serviceLogs.length"
      :no-results="!searched.length"
      no-results-title="Nothing matches your search."
      no-results-text=""
      empty-title="No service logged yet"
      empty-text="Each visit you log keeps this vehicle's service schedule accurate."
      empty-art="maintenance"
    >
      <template #empty-actions>
        <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate()">+ New Service Log</v-btn>
      </template>
      <v-data-table
        :headers="headers"
        :items="searched"
        :items-per-page-options="PAGE_SIZES"
        item-value="id"
      >
        <!-- A row never wraps past two lines: two service chips, then "+N" with the rest in a tooltip (ui-style-system.mdc). -->
        <template #[`item.services`]="{ item }">
          <div class="d-flex flex-nowrap align-center ga-1 py-2" data-test="visit-services">
            <v-chip v-for="name in item.services.slice(0, 2)" :key="name" size="small" variant="tonal" label>{{ name }}</v-chip>
            <v-tooltip v-if="item.services.length > 2" location="top">
              <template #activator="{ props: tooltip }">
                <v-chip
                  v-bind="tooltip"
                  size="small"
                  variant="outlined"
                  label
                  tabindex="0"
                  :aria-label="`${item.services.length - 2} more: ${item.services.slice(2).join(', ')}`"
                  data-test="visit-services-more"
                >
                  +{{ item.services.length - 2 }}
                </v-chip>
              </template>
              <div v-for="name in item.services.slice(2)" :key="name">{{ name }}</div>
            </v-tooltip>
          </div>
        </template>

        <template #[`item.miles`]="{ item }">
          <span>{{ item.miles === "" ? "" : formatMiles(item.miles) }}</span>
        </template>

        <template #[`item.people`]="{ item }">
          <span class="clamp-2" :title="item.people.join(', ')">{{ item.people.join(", ") }}</span>
        </template>

        <!-- UI/UX backlog #54: open the need the work was for. -->
        <template #[`item.needs`]="{ item }">
          <div class="clamp-2" :title="item.needs.map(({ title }) => title).join(', ')">
            <template v-for="(need, index) in item.needs" :key="need.id">
              <router-link :to="{ name: 'maintenanceNeedEdit', params: { id: need.id } }" class="log-link">{{ need.title }}</router-link
              ><span v-if="index < item.needs.length - 1">, </span>
            </template>
          </div>
        </template>

        <!-- UI/UX backlog #40: dates read like the rest of the app. -->
        <template #[`item.servicedAt`]="{ item }">
          <span>{{ formatDay(item.servicedAt) }}</span>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-tooltip text="Edit service log" location="top">
              <template #activator="{ props: tooltip }">
                <v-btn v-bind="tooltip"
              icon="mdi-pencil"
              size="small"
              variant="text"
              aria-label="Edit service log"
              @click="startEdit(item)"
            />
              </template>
            </v-tooltip>
            <v-tooltip text="Delete service log" location="top">
              <template #activator="{ props: tooltip }">
                <v-btn v-bind="tooltip"
              icon="mdi-delete"
              size="small"
              variant="text"
              aria-label="Delete service log"
              @click="deleteServiceLog(item)"
            />
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table>
    </ListState>

    <ServiceLogFormModal
      v-model="formOpen"
      :title="editingLog ? 'Edit service log' : 'New service log'"
      :submit-label="editingLog ? 'Save' : 'Create'"
      :users="users"
      :service-types="serviceTypeOptions"
      :maintenance-needs="maintenanceNeedOptions"
      :initial="formInitial"
      :preset-service-type-id="presetServiceTypeId"
      :save="saveServiceLog"
    />
  </PageShell>
</template>

<style scoped>
/* A cell stops at two lines; the full text is in its title. */
.clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  max-width: 16rem;
}

.log-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.log-link:hover,
.log-link:focus-visible {
  text-decoration: underline;
}
</style>
