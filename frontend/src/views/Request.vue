<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";
import areaServices from "../services/areaServices.js";
import requestServices from "../services/requestServices.js";
import Utils from "../config/utils.js";
import { useRoles } from "../composables/useRoles.js";
import { useConfirm } from "../composables/useConfirm.js";
import RequestStatusChip from "../components/requests/RequestStatusChip.vue";
import DestinationStops from "../components/requests/DestinationStops.vue";
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
} from "../utils/requests.js";

const props = defineProps({
  requestId: { type: [String, Number], default: null },
});

const router = useRouter();
const confirm = useConfirm();
const { user, hasRole, areaAdminAreaIds } = useRoles();

const blankForm = () => ({
  area_id: null,
  purpose: "",
  number_of_people: null,
  all_day: true,
  start_date: "",
  start_time: "09:00",
  end_date: "",
  end_time: "17:00",
  drivers: [],
  destinations: [],
});

const toForm = (request) => {
  const [start, end] = tripBounds(request);

  return {
    area_id: request.area_id,
    purpose: request.purpose,
    number_of_people: request.number_of_people,
    all_day: request.all_day,
    start_date: toDateInput(start),
    start_time: request.all_day ? "09:00" : toTimeInput(start),
    end_date: toDateInput(end),
    end_time: request.all_day ? "17:00" : toTimeInput(end),
    drivers: request.drivers.map(({ id }) => id),
    destinations: request.destinations.map((destination, i) => ({ ...destination, key: `saved-${i}` })),
  };
};

const toPayload = (form) => {
  const at = (date, time) => (form.all_day ? date : new Date(`${date}T${time}`).toISOString());

  return {
    area_id: form.area_id,
    purpose: form.purpose.trim(),
    number_of_people: Number(form.number_of_people),
    all_day: form.all_day,
    start_at: at(form.start_date, form.start_time),
    end_at: at(form.end_date, form.end_time),
    drivers: form.drivers,
    destinations: form.destinations.map(({ key, ...stop }) => (stop.id ? { id: stop.id } : stop)),
  };
};

const request = ref(null);
const form = ref(blankForm());
const snapshot = ref(JSON.stringify(form.value));
const formRef = ref(null);
const submitted = ref(false);
const loading = ref(false);
const loadError = ref("");
const saving = ref(false);
const saveError = ref("");
const statusSaving = ref(false);
const actionError = ref("");
const assignOpen = ref(false);
const notice = ref("");

const areas = ref([]);
const drivers = ref([]);
const savedDestinations = ref([]);

const isCreate = computed(() => props.requestId == null);
const isOwner = computed(() => request.value?.user_id === user.value?.userId);
const canManage = computed(
  () => !!request.value && (hasRole("admin") || areaAdminAreaIds.value.includes(request.value.area_id)),
);
const canEdit = computed(() => isCreate.value || canManage.value || (isOwner.value && request.value.status === "pending"));
const canCancel = computed(() => isOwner.value && !canManage.value && OPEN_STATUSES.includes(request.value?.status));
const dirty = computed(() => JSON.stringify(form.value) !== snapshot.value);
const resetsApproval = computed(() => canManage.value && !!request.value?.approved_at && dirty.value);
const capacity = computed(() =>
  request.value ? capacityCheck(request.value.vehicles, request.value.number_of_people) : { seats: 0, short: false },
);

const crumbs = computed(() => [
  canManage.value && !isOwner.value
    ? { title: "Requests", to: { name: "adminRequests" } }
    : { title: "My Requests", to: { name: "home" } },
  { title: isCreate.value ? "New Request" : `Request #${props.requestId}`, disabled: true },
]);

// Drivers already on the request stay selectable even if they've since dropped off the approved list.
const driverOptions = computed(() => {
  const listed = new Set(drivers.value.map(({ id }) => id));
  return [...drivers.value, ...(request.value?.drivers ?? []).filter(({ id }) => !listed.has(id))];
});

const required = [(value) => (value !== null && value !== undefined && String(value).trim() !== "") || "Required field."];
const peopleRules = [...required, (value) => /^\d+$/.test(String(value)) || "Enter a whole number, 0 or more."];
const driverRules = [(value) => value.length > 0 || "Add at least one driver."];
const endRules = computed(() => [
  ...required,
  () => {
    const { all_day, start_date, start_time, end_date, end_time } = form.value;
    const start = all_day ? start_date : `${start_date}T${start_time}`;
    const end = all_day ? end_date : `${end_date}T${end_time}`;
    return !start_date || end >= start || "End can't be before the start.";
  },
]);
const destinationsError = computed(() =>
  submitted.value && !form.value.destinations.length ? "Add at least one destination." : "",
);

// Editable fields are outlined and only reserve space for a message when there is one.
// Read-only requests render their fields as plain text instead of empty-looking inputs.
const editableField = { variant: "outlined", density: "comfortable", hideDetails: "auto" };
const readonlyField = { variant: "plain", density: "comfortable", menuIcon: "", hideDetails: "auto" };
const formDefaults = computed(() => {
  const field = canEdit.value ? editableField : readonlyField;
  return { VTextField: field, VSelect: field, VAutocomplete: field };
});

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

const formatDay = (value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/** Show a saved request. Unsaved edits are kept when `keepEdits` is set (e.g. after a status change). */
const applyRequest = (data, keepEdits = false) => {
  request.value = data;
  if (!keepEdits) {
    form.value = toForm(data);
  }
  snapshot.value = JSON.stringify(toForm(data));
};

const load = async () => {
  loading.value = true;
  loadError.value = "";
  submitted.value = false;
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
      form.value = blankForm();
      snapshot.value = JSON.stringify(form.value);
    }
  } catch (err) {
    loadError.value = Utils.errorMessage(err, "Failed to load request.");
  } finally {
    loading.value = false;
  }

  await nextTick();
  formRef.value?.resetValidation();
};

watch(() => props.requestId, load, { immediate: true });

const submit = async () => {
  submitted.value = true;
  const { valid } = await formRef.value.validate();
  if (!valid || !form.value.destinations.length || repeatsInARow(form.value.destinations)) {
    await nextTick();
    document
      .querySelector(".v-input--error, [data-test='destinations-error']")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  saving.value = true;
  saveError.value = "";

  try {
    if (isCreate.value) {
      const { data } = await requestServices.createRequest(toPayload(form.value));
      await router.replace({ name: "request", params: { requestId: data.id }, state: { notice: "Request submitted." } });
    } else {
      const { data } = await requestServices.updateRequest(request.value.id, toPayload(form.value));
      applyRequest(data);
      notice.value = "Changes saved.";
    }
  } catch (err) {
    saveError.value = Utils.errorMessage(err, "Failed to save request.");
  } finally {
    saving.value = false;
  }
};

const discard = () => {
  form.value = JSON.parse(snapshot.value);
  saveError.value = "";
};

const setStatus = async (status) => {
  statusSaving.value = true;
  actionError.value = "";

  try {
    const { data } = await requestServices.updateRequest(request.value.id, { status });
    applyRequest(data, dirty.value);
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
    message: "Cancel this vehicle request? An admin will no longer act on it.",
    confirmText: "Cancel request",
    cancelText: "Keep request",
    confirmColor: "error",
    onConfirm: async () => {
      updated = (await requestServices.updateRequest(request.value.id, { status: "cancelled" })).data;
    },
  });

  if (cancelled) {
    applyRequest(updated);
    notice.value = "Request cancelled.";
  }
};

const saveVehicles = async (vehicleIds) => {
  const { data } = await requestServices.updateRequest(request.value.id, { vehicles: vehicleIds });
  applyRequest(data, dirty.value);
  notice.value = "Vehicle assignment saved.";
};
</script>

<template>
  <v-container class="oc-page py-6">
    <v-breadcrumbs :items="crumbs" density="compact" class="px-0 pt-0 pb-4" />

    <v-skeleton-loader v-if="loading && !request && !isCreate" type="heading, article, article" />
    <v-alert v-else-if="loadError" type="error">{{ loadError }}</v-alert>

    <v-defaults-provider v-else :defaults="formDefaults">
      <v-form ref="formRef" :readonly="!canEdit" @submit.prevent="submit">
        <header class="mb-6">
          <div v-if="request" class="d-flex flex-wrap align-center ga-2 mb-2 text-body-2 text-medium-emphasis">
            <RequestStatusChip :status="request.status" />
            <span>Request #{{ request.id }}</span>
            <span aria-hidden="true" class="d-none d-sm-inline">·</span>
            <span>Submitted by {{ personName(request.user) }} on {{ formatDay(request.createdAt) }}</span>
          </div>

          <div class="d-flex align-start ga-4">
            <div class="flex-grow-1 min-w-0">
              <v-textarea
                v-if="canEdit"
                v-model="form.purpose"
                :rules="required"
                placeholder="What's this trip for?"
                aria-label="Purpose"
                variant="plain"
                rows="1"
                auto-grow
                hide-details="auto"
                :autofocus="isCreate"
                class="title-input"
                data-test="purpose"
              />
              <h1 v-else class="text-headline-large font-weight-bold my-0">{{ request.purpose }}</h1>
            </div>
            <v-btn
              v-if="canCancel"
              color="error"
              variant="outlined"
              class="oc-cta flex-shrink-0 mt-1"
              data-test="cancel-request"
              @click="cancelRequest"
            >
              Cancel request
            </v-btn>
          </div>

          <p v-if="isCreate" class="text-body-1 text-medium-emphasis mt-2 mb-0">
            Tell us about your trip. An area admin will review it and assign a vehicle.
          </p>
        </header>

        <v-alert
          v-if="!canEdit"
          type="info"
          variant="tonal"
          density="compact"
          icon="mdi-lock-outline"
          class="mb-6"
          data-test="locked"
        >
          This request is {{ statusMeta(request.status).label.toLowerCase() }}, so it can no longer be edited.
        </v-alert>
        <v-alert v-if="actionError" type="error" density="compact" class="mb-6">{{ actionError }}</v-alert>

        <v-row>
          <v-col cols="12" md="8" class="d-flex flex-column ga-6">
            <v-card elevation="1">
              <v-card-item>
                <v-card-title class="section-title">Trip details</v-card-title>
              </v-card-item>
              <v-card-text class="pt-3">
                <v-row>
                  <v-col cols="12" sm="8">
                    <v-select
                      v-model="form.area_id"
                      :items="areas"
                      item-title="name"
                      item-value="id"
                      label="Area"
                      :rules="required"
                      data-test="area"
                    />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="form.number_of_people"
                      type="number"
                      min="0"
                      label="Number of people"
                      :rules="peopleRules"
                      data-test="people"
                    />
                  </v-col>
                </v-row>

                <div class="d-flex align-center justify-space-between mt-6 mb-3">
                  <div class="text-subtitle-1 font-weight-bold">When</div>
                  <v-switch
                    v-if="canEdit"
                    v-model="form.all_day"
                    label="All day"
                    color="primary"
                    density="compact"
                    inset
                    hide-details
                    class="flex-grow-0"
                  />
                  <v-chip v-else-if="form.all_day" size="small" variant="tonal" label>All day</v-chip>
                </div>
                <div v-if="!canEdit" class="text-body-1" data-test="trip-dates">{{ formatTripDates(request) }}</div>
                <v-row v-else>
                  <v-col cols="12" sm="6" class="d-flex ga-3">
                    <v-text-field
                      v-model="form.start_date"
                      type="date"
                      label="Start date"
                      :rules="required"
                      data-test="start-date"
                    />
                    <v-text-field
                      v-if="!form.all_day"
                      v-model="form.start_time"
                      type="time"
                      label="Start time"
                      :rules="required"
                      class="time-field"
                    />
                  </v-col>
                  <v-col cols="12" sm="6" class="d-flex ga-3">
                    <v-text-field
                      v-model="form.end_date"
                      type="date"
                      label="End date"
                      :rules="endRules"
                      data-test="end-date"
                    />
                    <v-text-field
                      v-if="!form.all_day"
                      v-model="form.end_time"
                      type="time"
                      label="End time"
                      :rules="endRules"
                      class="time-field"
                    />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card elevation="1">
              <v-card-item>
                <v-card-title class="section-title">Destinations</v-card-title>
                <v-card-subtitle v-if="canEdit">In the order you'll visit them. Every trip starts and ends on campus.</v-card-subtitle>
              </v-card-item>
              <v-card-text class="pt-3">
                <DestinationStops
                  v-model="form.destinations"
                  :saved="savedDestinations"
                  :readonly="!canEdit"
                  :error="destinationsError"
                />
              </v-card-text>
            </v-card>

            <v-card elevation="1">
              <v-card-item>
                <v-card-title class="section-title">Drivers</v-card-title>
                <v-card-subtitle v-if="canEdit">Only approved drivers with a current license are listed.</v-card-subtitle>
              </v-card-item>
              <v-card-text class="pt-3">
                <div v-if="!canEdit" class="d-flex flex-wrap ga-2" data-test="drivers">
                  <v-chip v-for="driver in request.drivers" :key="driver.id" prepend-icon="mdi-account-outline" label>
                    {{ personName(driver) }}
                    <span v-if="driver.hasCdl" class="text-medium-emphasis ml-1">· CDL</span>
                  </v-chip>
                </div>
                <v-autocomplete
                  v-else
                  v-model="form.drivers"
                  :items="driverOptions"
                  :item-title="personName"
                  item-value="id"
                  label="Drivers"
                  multiple
                  chips
                  :closable-chips="canEdit"
                  :rules="driverRules"
                  data-test="drivers"
                >
                  <template #item="{ props: itemProps, item }">
                    <v-list-item
                      v-bind="itemProps"
                      :subtitle="`License expires ${formatDay(`${item.licenseExpirationDate}T00:00:00`)}${item.hasCdl ? ' · CDL' : ''}`"
                    />
                  </template>
                </v-autocomplete>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <div class="side-column d-flex flex-column ga-6">
              <v-card elevation="1">
                <v-card-text class="pa-5">
                  <div class="fact-label">Estimated mileage</div>
                  <template v-if="request">
                    <div class="text-headline-medium font-weight-bold text-primary mt-1" data-test="estimated-miles">
                      {{ request.estimated_miles.toLocaleString() }} mi
                    </div>
                    <div class="text-body-2 text-medium-emphasis">Round trip from campus</div>
                  </template>
                  <div v-else class="text-body-2 text-medium-emphasis mt-1">
                    Calculated from your destinations when you submit.
                  </div>

                  <template v-if="request">
                    <v-divider class="my-4" />
                    <dl class="facts">
                      <dt class="fact-label">Requested by</dt>
                      <dd>{{ personName(request.user) }}</dd>
                      <dt class="fact-label">Approval</dt>
                      <dd v-if="request.approver">{{ personName(request.approver) }} · {{ formatDay(request.approved_at) }}</dd>
                      <dd v-else class="text-medium-emphasis">Not approved yet</dd>
                    </dl>
                  </template>
                </v-card-text>
              </v-card>

              <v-card v-if="canManage" elevation="1" data-test="review">
                <v-card-item>
                  <v-card-title class="section-title">Review</v-card-title>
                  <v-card-subtitle>{{ reviewStep }}</v-card-subtitle>
                </v-card-item>
                <v-card-text>
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
                    variant="outlined"
                    density="compact"
                    hide-details
                    :loading="statusSaving"
                    data-test="status"
                    @update:model-value="setStatus"
                  />
                </v-card-text>
              </v-card>

              <v-card v-if="request && (canManage || request.vehicles.length)" elevation="1" data-test="vehicles">
                <v-card-item>
                  <v-card-title class="section-title">Vehicles</v-card-title>
                  <template v-if="canManage" #append>
                    <v-btn variant="text" color="primary" class="oc-cta" data-test="assign-vehicles" @click="assignOpen = true">
                      {{ request.vehicles.length ? "Change" : "Assign" }}
                    </v-btn>
                  </template>
                </v-card-item>
                <v-list v-if="request.vehicles.length" density="compact" class="py-0 bg-transparent">
                  <v-list-item
                    v-for="vehicle in request.vehicles"
                    :key="vehicle.id"
                    :title="vehicleLabel(vehicle)"
                    :subtitle="`${vehicle.universityId} · ${vehicle.passengerCapacity} seats`"
                    prepend-icon="mdi-car-side"
                  />
                </v-list>
                <v-card-text v-else class="text-body-2 text-medium-emphasis pt-0">No vehicles assigned yet.</v-card-text>
                <v-card-text v-if="request.vehicles.length" class="pt-2">
                  <v-alert v-if="capacity.short" type="warning" variant="tonal" density="compact" data-test="capacity-warning">
                    {{ capacity.seats }} seats for {{ request.number_of_people }} people.
                  </v-alert>
                  <div v-else class="text-body-2 text-medium-emphasis d-flex align-center ga-1">
                    <v-icon icon="mdi-check-circle-outline" color="success" size="16" />
                    {{ capacity.seats }} seats for {{ request.number_of_people }} people
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-col>
        </v-row>

        <div v-if="canEdit && (isCreate || dirty)" class="save-bar">
          <v-card elevation="8" class="d-flex flex-wrap align-center ga-3 px-5 py-3">
            <div class="flex-grow-1 text-body-2">
              <v-alert v-if="saveError" type="error" variant="tonal" density="compact">{{ saveError }}</v-alert>
              <span v-else-if="resetsApproval" class="d-flex align-center ga-2">
                <v-icon icon="mdi-information-outline" color="warning" size="18" />
                Saving trip changes will send this request back to pending for re-approval.
              </span>
              <span v-else-if="isCreate" class="text-medium-emphasis">Every field is required, plus at least one stop and one driver.</span>
              <span v-else class="text-medium-emphasis">You have unsaved changes.</span>
            </div>
            <v-btn v-if="isCreate" color="secondary" variant="text" class="oc-cta" :to="{ name: 'home' }">Cancel</v-btn>
            <v-btn v-else color="secondary" variant="text" class="oc-cta" @click="discard">Discard</v-btn>
            <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" data-test="save-request" @click="submit">
              {{ isCreate ? "Submit request" : "Save changes" }}
            </v-btn>
          </v-card>
        </div>
      </v-form>
    </v-defaults-provider>

    <AssignVehiclesDialog v-if="canManage" v-model="assignOpen" :request :save="saveVehicles" />

    <v-snackbar :model-value="!!notice" color="success" timeout="3000" @update:model-value="notice = ''">
      {{ notice }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.section-title {
  font-size: 1.125rem;
  font-weight: 700;
}

.v-card-subtitle {
  white-space: normal;
}

/* The purpose doubles as the page title: a borderless headline input with an underline on hover/focus. */
.title-input :deep(.v-field),
.title-input :deep(.v-field__input) {
  opacity: 1;
}

/* Vuetify's auto-grow measures with these variables, so set them rather than overriding padding/min-height. */
.title-input {
  --v-input-padding-top: 0px;
}

.title-input :deep(.v-field) {
  --v-field-padding-top: 0px;
  --v-field-padding-bottom: 4px;
}

.title-input :deep(.v-field__input) {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.25;
  color: rgb(var(--v-theme-primary));
  mask-image: none;
  -webkit-mask-image: none;
}

.title-input :deep(.v-field__input::placeholder) {
  color: rgba(var(--v-theme-on-surface), 0.38);
  opacity: 1;
}

.title-input :deep(.v-field) {
  border-bottom: 2px solid transparent;
  border-radius: 0;
  transition: border-color 0.15s;
}

.title-input:hover :deep(.v-field),
.title-input :deep(.v-field--focused) {
  border-bottom-color: rgba(var(--v-theme-primary), 0.4);
}

.time-field {
  flex: 0 0 140px;
}

.fact-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.facts {
  display: grid;
  gap: 4px;
  margin: 0;
}

.facts dd {
  margin: 0 0 8px;
}

.facts dd:last-child {
  margin-bottom: 0;
}

.save-bar {
  position: sticky;
  bottom: 16px;
  z-index: 5;
  margin-top: 24px;
}

@media (min-width: 960px) {
  .side-column {
    position: sticky;
    top: 88px;
  }
}
</style>
