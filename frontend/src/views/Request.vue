<script setup>
import { computed, nextTick, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import areaServices from "../services/areaServices.js";
import requestServices from "../services/requestServices.js";
import Utils from "../config/utils.js";
import { useRoles } from "../composables/useRoles.js";
import { useConfirm } from "../composables/useConfirm.js";
import PageShell from "../components/layout/PageShell.vue";
import DetailLayout from "../components/layout/DetailLayout.vue";
import DetailHeader from "../components/layout/DetailHeader.vue";
import SectionCard from "../components/layout/SectionCard.vue";
import RequestStatusChip from "../components/requests/RequestStatusChip.vue";
import TripDetailsFields from "../components/requests/TripDetailsFields.vue";
import DestinationStops from "../components/requests/DestinationStops.vue";
import DriversField from "../components/requests/DriversField.vue";
import AssignVehiclesDialog from "../components/requests/AssignVehiclesDialog.vue";
import {
  OPEN_STATUSES,
  STATUS_OPTIONS,
  capacityCheck,
  formatTripDates,
  personName,
  repeatsInARow,
  statusMeta,
  toDateInput,
  toTimeInput,
  tripBounds,
  vehicleLabel,
} from "../models/requests.js";

const props = defineProps({
  requestId: { type: [String, Number], default: null },
});

const router = useRouter();
const confirm = useConfirm();
const { user, hasRole, areaAdminAreaIds } = useRoles();

const blankTrip = () => ({
  purpose: "",
  areaId: null,
  numberOfPeople: null,
  allDay: true,
  startDate: "",
  startTime: "09:00",
  endDate: "",
  endTime: "17:00",
});

const toTrip = (request) => {
  const [start, end] = tripBounds(request);

  return {
    purpose: request.purpose,
    areaId: request.areaId,
    numberOfPeople: request.numberOfPeople,
    allDay: request.allDay,
    startDate: toDateInput(start),
    startTime: request.allDay ? "09:00" : toTimeInput(start),
    endDate: toDateInput(end),
    endTime: request.allDay ? "17:00" : toTimeInput(end),
  };
};

const tripPayload = (trip) => {
  const at = (date, time) => (trip.allDay ? date : new Date(`${date}T${time}`).toISOString());

  return {
    purpose: trip.purpose.trim(),
    areaId: trip.areaId,
    numberOfPeople: Number(trip.numberOfPeople),
    allDay: trip.allDay,
    startAt: at(trip.startDate, trip.startTime),
    endAt: at(trip.endDate, trip.endTime),
  };
};

const toStops = (request) => request.destinations.map((destination, i) => ({ ...destination, key: `saved-${i}` }));
const stopsPayload = (stops) => stops.map(({ key, ...stop }) => (stop.id ? { id: stop.id } : stop));

const request = ref(null);
const loading = ref(false);
const loadError = ref("");
const areas = ref([]);
const drivers = ref([]);
const savedDestinations = ref([]);

// Each card edits one part of the request and saves on its own (ui-style-system.mdc → Detail page conventions).
const trip = ref(blankTrip());
const stops = ref([]);
const driverIds = ref([]);
const saved = reactive({ trip: "", stops: "", drivers: "" });
const current = {
  trip: () => JSON.stringify(trip.value),
  stops: () => JSON.stringify(stopsPayload(stops.value)),
  drivers: () => JSON.stringify(driverIds.value),
};
const dirty = reactive({
  trip: computed(() => current.trip() !== saved.trip),
  stops: computed(() => current.stops() !== saved.stops),
  drivers: computed(() => current.drivers() !== saved.drivers),
});
const sectionError = reactive({ trip: "", stops: "", drivers: "" });
const savingSection = ref("");
const stopsChecked = ref(false);

const createFormRef = ref(null);
const tripFormRef = ref(null);
const driversFormRef = ref(null);
const creating = ref(false);
const createError = ref("");
const statusSaving = ref(false);
const actionError = ref("");
const assignOpen = ref(false);
const notice = ref("");

const isCreate = computed(() => props.requestId == null);
const isOwner = computed(() => request.value?.userId === user.value?.userId);
const canManage = computed(
  () => !!request.value && (hasRole("admin") || areaAdminAreaIds.value.includes(request.value.areaId)),
);
const canEdit = computed(() => isCreate.value || canManage.value || (isOwner.value && request.value?.status === "pending"));
const canCancel = computed(() => isOwner.value && !canManage.value && OPEN_STATUSES.includes(request.value?.status));
const approved = computed(() => canManage.value && !!request.value?.approvedAt);
const capacity = computed(() =>
  request.value ? capacityCheck(request.value.vehicles, request.value.numberOfPeople) : { seats: 0, short: false },
);

const breadcrumbs = computed(() => [
  canManage.value && !isOwner.value
    ? { title: "Requests", to: { name: "adminRequests" } }
    : { title: "My Requests", to: { name: "home" } },
  { title: isCreate.value ? "New Request" : `Request #${props.requestId}`, disabled: true },
]);

const formatDay = (value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const headerMeta = computed(() => {
  const parts = [`Request #${request.value.id}`, `Submitted by ${personName(request.value.user)} on ${formatDay(request.value.createdAt)}`];
  if (request.value.approver) {
    parts.push(`Approved by ${personName(request.value.approver)}`);
  }
  return parts.join(" · ");
});

// Drivers already on the request stay selectable even if they've since dropped off the approved list.
const driverOptions = computed(() => {
  const listed = new Set(drivers.value.map(({ id }) => id));
  return [...drivers.value, ...(request.value?.drivers ?? []).filter(({ id }) => !listed.has(id))];
});

const destinationsError = computed(() => (stopsChecked.value && !stops.value.length ? "Add at least one destination." : ""));

// Editable fields are outlined and only reserve space for a message when there is one.
const field = { variant: "outlined", density: "comfortable", hideDetails: "auto" };
const fieldDefaults = { VTextField: field, VTextarea: field, VSelect: field, VAutocomplete: field };

/** The next step an admin is expected to take, by status. */
const reviewStep = computed(() => {
  switch (request.value?.status) {
    case "pending":
      return "Approve to send this request on for a vehicle, or deny it.";
    case "awaiting_vehicle":
      return "Approved. Assign a vehicle to reserve it.";
    case "reserved":
      return "Mark the trip returned once the vehicle is back.";
    default:
      return "No action needed.";
  }
});

const resetSection = {
  trip: (data) => {
    trip.value = toTrip(data);
    saved.trip = current.trip();
  },
  stops: (data) => {
    stops.value = toStops(data);
    saved.stops = current.stops();
    stopsChecked.value = false;
  },
  drivers: (data) => {
    driverIds.value = data.drivers.map(({ id }) => id);
    saved.drivers = current.drivers();
  },
};

/** Show a saved request and reset the listed cards to it; other cards keep their unsaved edits. */
const applyRequest = (data, sections = ["trip", "stops", "drivers"]) => {
  request.value = data;
  sections.forEach((section) => {
    resetSection[section](data);
    sectionError[section] = "";
  });
};

const load = async () => {
  loading.value = true;
  loadError.value = "";
  notice.value = window.history.state?.notice ?? "";
  if (notice.value) {
    window.history.replaceState({ ...window.history.state, notice: null }, "");
  }

  try {
    const [areaRes, driverRes, destinationRes, requestRes] = await Promise.all([
      areaServices.getAreas(),
      requestServices.getDrivers(),
      requestServices.getDestinations(),
      isCreate.value ? null : requestServices.getRequest(props.requestId),
    ]);
    areas.value = areaRes.data;
    drivers.value = driverRes.data;
    savedDestinations.value = destinationRes.data;

    if (requestRes) {
      applyRequest(requestRes.data);
    } else {
      request.value = null;
      trip.value = blankTrip();
      stops.value = [];
      driverIds.value = [];
      stopsChecked.value = false;
    }
  } catch (err) {
    loadError.value = Utils.errorMessage(err, "Failed to load request.");
  } finally {
    loading.value = false;
  }
};

watch(() => props.requestId, load, { immediate: true });

const stopsValid = () => {
  stopsChecked.value = true;
  return stops.value.length > 0 && !repeatsInARow(stops.value);
};

const scrollToFirstError = async () => {
  await nextTick();
  document
    .querySelector(".v-input--error, [data-test='destinations-error']")
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
};

const create = async () => {
  const { valid } = await createFormRef.value.validate();
  if (!stopsValid() || !valid) {
    await scrollToFirstError();
    return;
  }

  creating.value = true;
  createError.value = "";

  try {
    const { data } = await requestServices.createRequest({
      ...tripPayload(trip.value),
      destinations: stopsPayload(stops.value),
      drivers: driverIds.value,
    });
    await router.replace({ name: "request", params: { requestId: data.id }, state: { notice: "Request submitted." } });
  } catch (err) {
    createError.value = Utils.errorMessage(err, "Failed to submit request.");
  } finally {
    creating.value = false;
  }
};

const payloads = {
  trip: () => tripPayload(trip.value),
  stops: () => ({ destinations: stopsPayload(stops.value) }),
  drivers: () => ({ drivers: driverIds.value }),
};

const sectionValid = {
  trip: async () => (await tripFormRef.value.validate()).valid,
  stops: async () => stopsValid(),
  drivers: async () => (await driversFormRef.value.validate()).valid,
};

const saveSection = async (section) => {
  if (!(await sectionValid[section]())) {
    return;
  }

  savingSection.value = section;
  sectionError[section] = "";

  try {
    const { data } = await requestServices.updateRequest(request.value.id, payloads[section]());
    applyRequest(data, [section]);
    notice.value = "Changes saved.";
  } catch (err) {
    sectionError[section] = Utils.errorMessage(err, "Failed to save changes.");
  } finally {
    savingSection.value = "";
  }
};

const cancelSection = (section) => {
  resetSection[section](request.value);
  sectionError[section] = "";
};

const setStatus = async (status) => {
  statusSaving.value = true;
  actionError.value = "";

  try {
    const { data } = await requestServices.updateRequest(request.value.id, { status });
    applyRequest(data, []);
    notice.value = `Status set to ${statusMeta(status).label.toLowerCase()}.`;
  } catch (err) {
    actionError.value = Utils.errorMessage(err, "Failed to update status.");
  } finally {
    statusSaving.value = false;
  }
};

const cancelRequest = async () => {
  let updated = null;
  const cancelled = await confirm({
    title: "Cancel request",
    message: `Cancel "${request.value.purpose}"? An admin will no longer act on it.`,
    confirmText: "Cancel Request",
    cancelText: "Keep Request",
    confirmColor: "error",
    onConfirm: async () => {
      updated = (await requestServices.updateRequest(request.value.id, { status: "cancelled" })).data;
    },
  });

  if (cancelled) {
    applyRequest(updated, []);
    notice.value = "Request cancelled.";
  }
};

const saveVehicles = async (vehicleIds) => {
  const { data } = await requestServices.updateRequest(request.value.id, { vehicles: vehicleIds });
  applyRequest(data, []);
  notice.value = "Vehicle assignment saved.";
};
</script>

<template>
  <!-- New request: one form, one submit -->
  <PageShell
    v-if="isCreate"
    title="New Request"
    subtitle="Tell us about your trip. An area admin will review it and assign a vehicle."
    :breadcrumbs
    :loading
    :error="loadError"
    :max-width="880"
  >
    <v-defaults-provider :defaults="fieldDefaults">
      <v-form ref="createFormRef" class="d-flex flex-column ga-6" @submit.prevent="create">
        <SectionCard title="Trip details">
          <TripDetailsFields v-model="trip" :areas />
        </SectionCard>

        <SectionCard title="Destinations" subtitle="In the order you'll visit them. Every trip starts and ends on campus.">
          <DestinationStops v-model="stops" :saved="savedDestinations" :error="destinationsError" />
        </SectionCard>

        <SectionCard title="Drivers" subtitle="Only approved drivers with a current license are listed.">
          <DriversField v-model="driverIds" :options="driverOptions" />
        </SectionCard>

        <div class="create-actions">
          <v-alert v-if="createError" type="error" density="compact" class="mb-3">{{ createError }}</v-alert>
          <div class="d-flex justify-end ga-2">
            <v-btn color="secondary" variant="text" class="oc-cta" :to="{ name: 'home' }">Cancel</v-btn>
            <v-btn color="primary" variant="elevated" class="oc-cta" :loading="creating" data-test="save-request" @click="create">
              Submit request
            </v-btn>
          </div>
        </div>
      </v-form>
    </v-defaults-provider>
  </PageShell>

  <!-- Existing request: a detail page whose cards each edit one part -->
  <PageShell v-else :breadcrumbs :loading="loading && !request" :error="loadError">
    <template #loading>
      <DetailLayout>
        <template #header>
          <v-card><v-skeleton-loader type="list-item-avatar-three-line" /></v-card>
        </template>
        <template #aside>
          <v-card><v-skeleton-loader type="article, actions" /></v-card>
        </template>
        <v-card><v-skeleton-loader type="heading, paragraph" /></v-card>
      </DetailLayout>
    </template>

    <v-defaults-provider v-if="request" :defaults="fieldDefaults">
      <DetailLayout>
        <template #header>
          <DetailHeader
            :title="request.purpose"
            :subtitle="`${formatTripDates(request)} · ${request.area?.name}`"
            :meta="headerMeta"
            icon="mdi-van-passenger"
          >
            <template #append>
              <RequestStatusChip :status="request.status" size="default" />
            </template>
          </DetailHeader>
        </template>

        <template #aside>
          <v-form ref="tripFormRef" @submit.prevent="saveSection('trip')">
            <SectionCard title="Trip details">
              <TripDetailsFields v-model="trip" :areas :readonly="!canEdit" :request />
              <div v-if="approved && dirty.trip" class="approval-note mt-4">
                Saving will send this request back to pending for re-approval.
              </div>
              <v-alert v-if="sectionError.trip" type="error" density="compact" class="mt-4">{{ sectionError.trip }}</v-alert>
              <template v-if="canEdit" #actions>
                <v-btn color="secondary" variant="text" class="oc-cta" :disabled="!dirty.trip" @click="cancelSection('trip')">
                  Cancel
                </v-btn>
                <v-btn
                  color="primary"
                  variant="elevated"
                  class="oc-cta"
                  :disabled="!dirty.trip"
                  :loading="savingSection === 'trip'"
                  data-test="save-trip"
                  @click="saveSection('trip')"
                >
                  Save
                </v-btn>
              </template>
            </SectionCard>
          </v-form>

          <SectionCard v-if="canManage" title="Review" :subtitle="reviewStep" data-test="review">
            <v-alert v-if="actionError" type="error" density="compact" class="mb-4">{{ actionError }}</v-alert>
            <div v-if="request.status === 'pending'" class="d-flex ga-2 mb-4">
              <v-btn
                color="primary"
                variant="elevated"
                class="oc-cta flex-1-1"
                :loading="statusSaving"
                data-test="approve"
                @click="setStatus('awaiting_vehicle')"
              >
                Approve
              </v-btn>
              <v-btn color="error" variant="outlined" class="oc-cta flex-1-1" :disabled="statusSaving" @click="setStatus('denied')">
                Deny
              </v-btn>
            </div>
            <v-btn
              v-else-if="request.status === 'awaiting_vehicle'"
              color="primary"
              variant="elevated"
              class="oc-cta mb-4"
              prepend-icon="mdi-van-passenger"
              block
              @click="assignOpen = true"
            >
              Assign vehicles
            </v-btn>
            <v-btn
              v-else-if="request.status === 'reserved'"
              color="primary"
              variant="outlined"
              class="oc-cta mb-4"
              prepend-icon="mdi-keyboard-return"
              :loading="statusSaving"
              block
              @click="setStatus('returned')"
            >
              Mark returned
            </v-btn>
            <v-select
              :model-value="request.status"
              :items="STATUS_OPTIONS"
              label="Status"
              density="compact"
              hide-details
              :loading="statusSaving"
              data-test="status"
              @update:model-value="setStatus"
            />
          </SectionCard>

          <SectionCard v-if="canCancel" title="Cancel request" subtitle="An admin will stop working on it. This can't be undone.">
            <v-alert v-if="actionError" type="error" density="compact" class="mb-4">{{ actionError }}</v-alert>
            <v-btn color="error" variant="outlined" prepend-icon="mdi-cancel" class="oc-cta" data-test="cancel-request" @click="cancelRequest">
              Cancel request
            </v-btn>
          </SectionCard>
        </template>

        <v-alert v-if="!canEdit" type="info" variant="tonal" density="compact" icon="mdi-lock-outline" data-test="locked">
          This request is {{ statusMeta(request.status).label.toLowerCase() }}, so it can no longer be edited.
        </v-alert>

        <SectionCard title="Destinations" :subtitle="canEdit ? 'In the order you\'ll visit them. Every trip starts and ends on campus.' : ''">
          <template #append>
            <div class="text-right">
              <div class="text-title-large font-weight-bold text-primary text-no-wrap" data-test="estimated-miles">
                {{ request.estimatedMiles.toLocaleString() }} mi
              </div>
              <div class="text-body-small text-medium-emphasis text-no-wrap">estimated round trip</div>
            </div>
          </template>
          <DestinationStops v-model="stops" :saved="savedDestinations" :readonly="!canEdit" :error="destinationsError" />
          <div v-if="approved && dirty.stops" class="approval-note mt-4">
            Saving will send this request back to pending for re-approval.
          </div>
          <v-alert v-if="sectionError.stops" type="error" density="compact" class="mt-4">{{ sectionError.stops }}</v-alert>
          <template v-if="canEdit" #actions>
            <v-btn color="secondary" variant="text" class="oc-cta" :disabled="!dirty.stops" @click="cancelSection('stops')">
              Cancel
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              class="oc-cta"
              :disabled="!dirty.stops"
              :loading="savingSection === 'stops'"
              data-test="save-stops"
              @click="saveSection('stops')"
            >
              Save
            </v-btn>
          </template>
        </SectionCard>

        <v-form ref="driversFormRef" @submit.prevent="saveSection('drivers')">
          <SectionCard title="Drivers" :subtitle="canEdit ? 'Only approved drivers with a current license are listed.' : ''">
            <DriversField v-model="driverIds" :options="driverOptions" :readonly="!canEdit" :drivers="request.drivers" />
            <div v-if="approved && dirty.drivers" class="approval-note mt-4">
              Saving will send this request back to pending for re-approval.
            </div>
            <v-alert v-if="sectionError.drivers" type="error" density="compact" class="mt-4">{{ sectionError.drivers }}</v-alert>
            <template v-if="canEdit" #actions>
              <v-btn color="secondary" variant="text" class="oc-cta" :disabled="!dirty.drivers" @click="cancelSection('drivers')">
                Cancel
              </v-btn>
              <v-btn
                color="primary"
                variant="elevated"
                class="oc-cta"
                :disabled="!dirty.drivers"
                :loading="savingSection === 'drivers'"
                data-test="save-drivers"
                @click="saveSection('drivers')"
              >
                Save
              </v-btn>
            </template>
          </SectionCard>
        </v-form>

        <SectionCard v-if="canManage || request.vehicles.length" title="Vehicles" data-test="vehicles">
          <template v-if="canManage" #append>
            <v-btn variant="text" color="primary" class="oc-cta" data-test="assign-vehicles" @click="assignOpen = true">
              {{ request.vehicles.length ? "Change" : "Assign" }}
            </v-btn>
          </template>
          <template v-if="request.vehicles.length">
            <v-list density="compact" class="py-0 bg-transparent">
              <v-list-item
                v-for="vehicle in request.vehicles"
                :key="vehicle.id"
                :title="vehicleLabel(vehicle)"
                :subtitle="`${vehicle.universityId} · ${vehicle.passengerCapacity} seats`"
                prepend-icon="mdi-car-side"
                class="px-0"
              />
            </v-list>
            <v-alert v-if="capacity.short" type="warning" variant="tonal" density="compact" class="mt-2" data-test="capacity-warning">
              {{ capacity.seats }} seats for {{ request.numberOfPeople }} people.
            </v-alert>
            <div v-else class="text-body-medium text-medium-emphasis d-flex align-center ga-1 mt-2">
              <v-icon icon="mdi-check-circle-outline" color="success" size="16" />
              {{ capacity.seats }} seats for {{ request.numberOfPeople }} people
            </div>
          </template>
          <div v-else class="text-body-medium text-medium-emphasis">No vehicles assigned yet.</div>
        </SectionCard>
      </DetailLayout>
    </v-defaults-provider>

    <AssignVehiclesDialog v-if="canManage" v-model="assignOpen" :request :save="saveVehicles" />
  </PageShell>

  <v-snackbar :model-value="!!notice" color="success" timeout="3000" @update:model-value="notice = ''">
    {{ notice }}
  </v-snackbar>
</template>

<style scoped>
.approval-note {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-warning));
}

.create-actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  padding: 16px 0;
  background: rgb(var(--v-theme-background));
}
</style>
