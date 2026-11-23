<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { useNoticeStore } from "../stores/notice.js";
import { useRoute, useRouter } from "vue-router";
import areaServices from "../services/areaServices.js";
import maintenanceNeedServices from "../services/maintenanceNeedServices.js";
import mileageLogServices from "../services/mileageLogServices.js";
import serviceLogServices from "../services/serviceLogServices.js";
import serviceTypeServices from "../services/serviceTypeServices.js";
import vehicleServices from "../services/vehicleServices.js";
import vehicleTypeServices from "../services/vehicleTypeServices.js";
import { fullName } from "../models/users.js";
import { formatTripDates } from "../models/requests.js";
import { VIN_CHARACTERS_MESSAGE, formatDay, isVinCharacters, purchaseDateMessage, vehicleName } from "../models/vehicles.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import { useUnsavedChanges } from "../composables/useUnsavedChanges.js";
import { useRoles } from "../composables/useRoles.js";
import VehicleFields from "../components/vehicles/VehicleFields.vue";
import SectionCard from "../components/layout/SectionCard.vue";
import PageShell from "../components/layout/PageShell.vue";
import MoreActionsMenu from "../components/common/MoreActionsMenu.vue";
import MileageLogFormModal from "../components/mileageLogs/MileageLogFormModal.vue";
import ServiceLogFormModal from "../components/serviceLogs/ServiceLogFormModal.vue";
import VehicleStatusCard from "../components/vehicles/VehicleStatusCard.vue";
import VehicleWork from "../components/vehicles/VehicleWork.vue";
import Utils from "../config/utils.js";
import { canOpen } from "../router.js";

const route = useRoute();
const router = useRouter();
// UI/UX backlog #48: the app-wide success toast.
const { notify } = useNoticeStore();
const { hasRole, areaAdminAreaIds } = useRoles();

const isCreate = computed(() => route.name === "vehicleCreate");
const loading = ref(true);
const loadError = ref("");
const formError = ref("");
const saving = ref(false);
const areas = ref([]);
const vehicleTypes = ref([]);
const vehicles = ref([]);
const loaded = ref(null);

const blank = () => ({
  areaId: null,
  vehicleTypeId: null,
  universityId: "",
  identifier: "",
  make: "",
  model: "",
  year: "",
  color: "",
  passengerCapacity: "",
  purchasedAt: "",
  licensePlate: "",
  licensePlateExpirationDate: "",
  status: null,
  /** UI/UX backlog #19: create only — becomes the first mileage log. */
  odometerReading: "",
});

const form = ref(blank());
// UI/UX backlog #31: ask before leaving with unsaved changes. `baseline` is the form as loaded.
const baseline = ref("");
const snapshot = () => {
  baseline.value = JSON.stringify(form.value);
};
const dirty = computed(() => baseline.value !== "" && JSON.stringify(form.value) !== baseline.value);
/**
 * An existing vehicle's page is read-only; "Edit details" opens the fields in a dialog (your call, after #34). So the
 * leave-the-page guard only matters on New Vehicle, or while that dialog is open with changes.
 */
const editOpen = ref(false);
const { allowLeave } = useUnsavedChanges(computed(() => (isCreate.value || editOpen.value) && dirty.value));

const serviceLogOpen = ref(false);
const serviceUsers = ref([]);
const serviceTypes = ref([]);
const serviceNeeds = ref([]);
const mileageLogOpen = ref(false);

/** US-18.3: the vehicle page shows the last few log entries (RecentMileageLogs / RecentServiceVisits) and links to the full pages. */
const newestFirst = (key) => (a, b) => String(b[key]).localeCompare(String(a[key])) || b.id - a.id;

const { data: mileageLogs, error: mileageLogsError, run: getMileageLogs } = useRequest(mileageLogServices.getMileageLogs, {
  initial: [],
  fallback: "Failed to load mileage logs.",
  select: (res) => [...(res?.data ?? [])].sort(newestFirst("recordedAt")),
});

const { data: serviceLogs, error: serviceLogsError, run: getServiceLogs } = useRequest(serviceLogServices.getServiceLogsByVehicle, {
  initial: [],
  fallback: "Failed to load service logs.",
  select: (res) => [...(res?.data ?? [])].sort(newestFirst("servicedAt")),
});

const confirm = useConfirm();

const visibleAreas = computed(() => {
  if (hasRole("admin")) {
    return areas.value;
  }

  const ids = new Set(areaAdminAreaIds.value.map(Number));
  return areas.value.filter((area) => ids.has(Number(area.id)));
});

const areaItems = computed(() => visibleAreas.value.map((area) => ({ title: area.name, value: area.id })));
const typeItems = computed(() => vehicleTypes.value.map((type) => ({ title: type.name, value: type.id })));
const selectedType = computed(() => vehicleTypes.value.find((type) => type.id === form.value.vehicleTypeId));
const identifierLabel = computed(() => (selectedType.value?.identifier === "Serial" ? "Serial" : "VIN"));

const title = computed(() => {
  if (isCreate.value) {
    return "New Vehicle";
  }

  // "2022 Ford Transit", the same vehicle name the mileage and service log pages use.
  return loaded.value ? vehicleName(loaded.value) : "";
});

const breadcrumbs = computed(() => [
  { title: "Vehicles", to: { name: "vehicles" } },
  // UI/UX backlog #39: the University ID, the same label the mileage and service log pages use for this vehicle.
  { title: loaded.value?.universityId || title.value || "Vehicle", disabled: true },
]);

const fromVehicle = (vehicle) => ({
  areaId: vehicle.areaId ?? null,
  vehicleTypeId: vehicle.vehicleTypeId ?? null,
  universityId: vehicle.universityId ?? "",
  identifier: vehicle.identifier ?? "",
  make: vehicle.make ?? "",
  model: vehicle.model ?? "",
  year: vehicle.year ?? "",
  color: vehicle.color ?? "",
  passengerCapacity: vehicle.passengerCapacity ?? "",
  purchasedAt: vehicle.purchasedAt ?? "",
  licensePlate: vehicle.licensePlate ?? "",
  licensePlateExpirationDate: vehicle.licensePlateExpirationDate ?? "",
  status: vehicle.status ?? null,
});

const managesArea = (areaId) => areaAdminAreaIds.value.map(Number).includes(Number(areaId));

const ownsVehicle = (vehicle) => hasRole("admin") || hasRole("maintenance") || managesArea(vehicle.areaId);

const canEditVehicle = computed(
  () => hasRole("admin") || (hasRole("area_admin") && (isCreate.value || managesArea(loaded.value?.areaId))),
);

const readOnly = computed(() => !isCreate.value && !canEditVehicle.value);

/** UI/UX backlog #63: the vehicle's details as text (everyone, now; editors change them in the dialog). */
const facts = computed(() => {
  const vehicle = loaded.value ?? {};
  return [
    { label: "Area", value: areas.value.find((area) => area.id === vehicle.areaId)?.name },
    { label: "Vehicle type", value: vehicleTypes.value.find((type) => type.id === vehicle.vehicleTypeId)?.name },
    { label: "University ID", value: vehicle.universityId },
    { label: identifierLabel.value, value: vehicle.identifier },
    { label: "Year, make, and model", value: vehicle.make ? vehicleName(vehicle) : "" },
    { label: "Color", value: vehicle.color },
    { label: "Passenger capacity", value: vehicle.passengerCapacity },
    { label: "Purchased", value: vehicle.purchasedAt ? formatDay(vehicle.purchasedAt) : "" },
    { label: "License plate", value: vehicle.licensePlate },
    { label: "Plate expires", value: vehicle.licensePlateExpirationDate ? formatDay(vehicle.licensePlateExpirationDate) : "" },
    { label: "Status", value: vehicle.status === "retired" ? "Retired" : "Active" },
  ];
});

/** UI/UX backlog #28: maintenance-only users don't file issue reports. */
const canReportIssues = computed(() => canOpen(router.resolve({ name: "issueReportCreate" })));

const load = async () => {
  loading.value = true;
  loadError.value = "";
  formError.value = "";

  try {
    const [areaResult, typeResult, vehicleList] = await Promise.all([
      areaServices.getAreas(),
      vehicleTypeServices.getVehicleTypes(),
      vehicleServices.getVehicles(),
    ]);
    areas.value = areaResult.data ?? [];
    vehicleTypes.value = typeResult.data ?? [];
    vehicles.value = vehicleList.data ?? [];

    if (isCreate.value) {
      loaded.value = null;
      form.value = blank();
      snapshot();
      return;
    }

    const { data } = await vehicleServices.getVehicle(route.params.id);
    if (!ownsVehicle(data)) {
      await router.replace({ name: "home" });
      return;
    }

    loaded.value = data;
    form.value = fromVehicle(data);
    snapshot();
    getMileageLogs(data.id);
    getServiceLogs(data.id);
  } catch (error) {
    if (error.response?.status === 403) {
      await router.replace({ name: "home" });
      return;
    }

    loadError.value = Utils.errorMessage(error, "Failed to fetch vehicle.");
  } finally {
    loading.value = false;
  }
};

watch(() => [route.name, route.params.id], load, { immediate: true });

/** After a log is added, status and mileage change; reload them without touching unsaved form edits. */
const refreshStatus = async () => {
  try {
    const { data } = await vehicleServices.getVehicle(route.params.id);
    loaded.value = { ...loaded.value, condition: data.condition, upcomingTrips: data.upcomingTrips };
  } catch {
    // The page keeps the status it already shows; the logs below still update.
  }
};

const canOpenTrip = (trip) => hasRole("admin") || managesArea(trip.area?.id);

/** US-18.12: retiring a vehicle that is booked asks first and names the trips. */
const confirmRetire = () => {
  const trips = loaded.value?.upcomingTrips ?? [];
  if (form.value.status !== "retired" || loaded.value?.status === "retired" || !trips.length) {
    return true;
  }

  return confirm({
    title: "Retire vehicle",
    message: `${vehicleName(loaded.value)} is assigned to ${trips.length} upcoming trip${trips.length === 1 ? "" : "s"}. Retiring it leaves ${trips.length === 1 ? "that trip" : "them"} needing another vehicle.`,
    // Long lists stop at five so the dialog stays readable.
    items: [
      ...trips.slice(0, 5).map((trip) => `${trip.purpose} · ${formatTripDates(trip)} · ${trip.area?.name}`),
      ...(trips.length > 5 ? [`…and ${trips.length - 5} more`] : []),
    ],
    confirmText: "Retire Vehicle",
    confirmColor: "error",
    maxWidth: 520,
  });
};

const currentId = computed(() => (isCreate.value ? null : Number(route.params.id)));

const blankText = (value) => value === null || value === undefined || String(value).trim() === "";

/**
 * UI/UX backlog #29: every problem, keyed by the field it belongs to, so each shows under its own field
 * (`fieldErrors`). The API checks the same things.
 */
const validateFields = () => {
  const value = form.value;
  const errors = {};
  const set = (key, message) => {
    if (!errors[key]) errors[key] = message;
  };

  for (const key of ["areaId", "vehicleTypeId", "universityId", "identifier", "make", "model", "year", "purchasedAt", "color", "passengerCapacity", "status"]) {
    if (blankText(value[key])) set(key, "Required field.");
  }

  const universityId = String(value.universityId ?? "").trim();
  const identifier = String(value.identifier ?? "").trim();
  const plate = String(value.licensePlate ?? "").trim();

  if (universityId.length > 255) set("universityId", "University id too long.");
  if (String(value.make ?? "").trim().length > 255) set("make", "Make too long.");
  if (String(value.model ?? "").trim().length > 255) set("model", "Model too long.");
  if (identifier && selectedType.value?.identifier === "VIN" && identifier.length !== 17) set("identifier", "VIN must be 17 characters.");
  if (identifier && selectedType.value?.identifier === "VIN" && !isVinCharacters(identifier)) set("identifier", VIN_CHARACTERS_MESSAGE);
  if (identifier.length > 255) set("identifier", "Serial number too long.");
  const purchaseMessage = purchaseDateMessage(value.year, value.purchasedAt);
  if (purchaseMessage) set("purchasedAt", purchaseMessage);
  if (isCreate.value && !/^\d*$/.test(String(value.odometerReading ?? "").trim())) {
    set("odometerReading", "Starting odometer reading must be a whole number of 0 or more.");
  }
  if (String(value.color ?? "").trim().length > 255) set("color", "Color too long.");
  if (plate.length > 8) set("licensePlate", "License plate too long.");

  const others = vehicles.value.filter((vehicle) => vehicle.id !== currentId.value);
  if (universityId && others.some((vehicle) => vehicle.universityId === universityId)) set("universityId", "University id already taken.");
  if (identifier && others.some((vehicle) => vehicle.identifier === identifier)) set("identifier", "Identifier already taken.");
  if (plate && others.some((vehicle) => vehicle.licensePlate === plate)) set("licensePlate", "License plate already taken.");

  return errors;
};

const fieldErrors = ref({});
/** Typing in a field clears its message. */
watch(
  form,
  (next, previous) => {
    if (next !== previous) return;
    fieldErrors.value = Object.fromEntries(
      Object.entries(fieldErrors.value).filter(([key]) => String(next[key] ?? "") === String(lastChecked.value[key] ?? "")),
    );
  },
  { deep: true },
);
const lastChecked = ref({});

const payload = () => ({
  areaId: form.value.areaId,
  vehicleTypeId: form.value.vehicleTypeId,
  universityId: String(form.value.universityId).trim(),
  make: String(form.value.make).trim(),
  model: String(form.value.model).trim(),
  year: Number(form.value.year),
  identifier: String(form.value.identifier).trim(),
  purchasedAt: form.value.purchasedAt,
  color: String(form.value.color).trim(),
  passengerCapacity: Number(form.value.passengerCapacity),
  licensePlate: String(form.value.licensePlate ?? "").trim() || null,
  licensePlateExpirationDate: String(form.value.licensePlateExpirationDate ?? "").trim() || null,
  status: form.value.status,
  ...(isCreate.value ? { odometerReading: String(form.value.odometerReading ?? "").trim() || null } : {}),
});

const submit = async (event) => {
  event?.preventDefault?.();
  if (saving.value || readOnly.value) {
    return;
  }

  saving.value = true;
  formError.value = "";
  await nextTick();

  try {
    fieldErrors.value = validateFields();
    lastChecked.value = { ...form.value };
    if (Object.keys(fieldErrors.value).length) {
      return;
    }

    if (isCreate.value) {
      const response = await vehicleServices.createVehicle(payload());
      if (response?.status !== 201) {
        formError.value = "Failed to save vehicle.";
        return;
      }
      notify("Vehicle created.");
      allowLeave();
      await router.push({ name: "vehicles" });
      return;
    }

    if (!(await confirmRetire())) {
      return;
    }

    const response = await vehicleServices.updateVehicle(route.params.id, payload());
    if (response?.status !== 200) {
      formError.value = "Failed to save vehicle.";
      return;
    }

    notify("Vehicle saved.");
    // Stay on the vehicle: close the dialog and show what was saved.
    loaded.value = { ...loaded.value, ...(response.data ?? {}) };
    await refreshVehicle();
    editOpen.value = false;
  } catch (error) {
    formError.value = Utils.errorMessage(error, "Failed to save vehicle.");
  } finally {
    saving.value = false;
  }
};

const cancel = () => {
  allowLeave();
  router.push({ name: "vehicles" });
};

/** Open the "Edit details" dialog with the vehicle as saved. */
const openEdit = () => {
  form.value = fromVehicle(loaded.value);
  snapshot();
  fieldErrors.value = {};
  lastChecked.value = {};
  formError.value = "";
  editOpen.value = true;
};

const closeEdit = () => {
  if (saving.value) return;
  editOpen.value = false;
  form.value = fromVehicle(loaded.value);
  snapshot();
};

/** After saving, everything on the page that depends on the vehicle (status, title, details) reloads. */
const refreshVehicle = async () => {
  try {
    const { data } = await vehicleServices.getVehicle(route.params.id);
    loaded.value = data;
    form.value = fromVehicle(data);
    snapshot();
  } catch {
    // The saved values already show; the status catches up on the next visit.
  }
};

/** UI/UX backlog #36: delete lives in the page's ⋮ menu, not on every list row. */
const deleteVehicle = async () => {
  const deleted = await confirm({
    title: "Delete vehicle",
    message: `Delete ${vehicleName(loaded.value)}? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => vehicleServices.removeVehicle(route.params.id),
  });

  if (deleted) {
    notify("Vehicle deleted.");
    allowLeave();
    await router.push({ name: "vehicles" });
  }
};

const withLabel = (user) => ({ ...user, label: fullName(user) });

const openServiceLog = async () => {
  const [userResult, typeResult, needResult] = await Promise.allSettled([
    maintenanceNeedServices.getMaintenanceNeedOptions(),
    serviceTypeServices.getServiceTypes(),
    maintenanceNeedServices.getMaintenanceNeeds(),
  ]);

  serviceTypes.value = typeResult.status === "fulfilled" ? typeResult.value.data : [];
  serviceNeeds.value =
    needResult.status === "fulfilled"
      ? // UI/UX backlog #57: only needs still open can take new work.
        needResult.value.data.filter(
          (need) => String(need.vehicleId) === String(route.params.id) && ["Open", "In Progress"].includes(need.status),
        )
      : [];
  serviceUsers.value = userResult.status === "fulfilled" ? userResult.value.data.assignees.map(withLabel) : [];

  serviceLogOpen.value = true;
};

const createServiceLog = async (payload) => {
  await serviceLogServices.createServiceLog({ ...payload, vehicleId: Number(route.params.id) });
  notify("Service log created.");
  await Promise.all([getServiceLogs(route.params.id), getMileageLogs(route.params.id), refreshStatus()]);
};

const openMileageLog = () => {
  mileageLogOpen.value = true;
};

const createMileageLog = async (payload) => {
  await mileageLogServices.createMileageLog({ ...payload, vehicleId: Number(route.params.id) });
  notify("Mileage log created.");
  await Promise.all([getMileageLogs(route.params.id), refreshStatus()]);
};
</script>

<template>
  <PageShell
    :title="title"
    :subtitle="isCreate ? 'Add a vehicle to an area\'s fleet.' : ''"
    :breadcrumbs
    :loading
    :error="loadError"
    :max-width="1040"
    centered
  >
    <!-- UI/UX backlog #18: report a problem or plan work without leaving the vehicle; each form returns here. -->
    <template v-if="!isCreate && loaded" #actions>
      <v-btn
        v-if="canReportIssues"
        variant="outlined"
        color="primary"
        class="oc-cta"
        :to="{ name: 'issueReportCreate', query: { vehicleId: route.params.id } }"
        data-test="vehicle-report-issue"
      >
        Report an issue
      </v-btn>
      <v-btn
        variant="outlined"
        color="primary"
        class="oc-cta"
        :to="{ name: 'maintenanceNeedCreate', query: { vehicleId: route.params.id } }"
        data-test="vehicle-new-need"
      >
        New maintenance need
      </v-btn>
      <MoreActionsMenu v-if="canEditVehicle">
        <v-list-item
          prepend-icon="mdi-delete-outline"
          title="Delete vehicle"
          base-color="error"
          data-test="delete-vehicle"
          @click="deleteVehicle"
        />
      </MoreActionsMenu>
    </template>

    <div class="d-flex flex-column ga-6">
      <VehicleStatusCard v-if="!isCreate && loaded?.condition" :vehicle="loaded" :can-open-trip="canOpenTrip" />

      <!-- An existing vehicle's details read as text; editors change them in the "Edit details" dialog. -->
      <SectionCard v-if="!isCreate" title="Details" data-test="vehicle-details">
        <template v-if="canEditVehicle" #append>
          <v-btn variant="tonal" color="primary" class="oc-cta" prepend-icon="mdi-pencil-outline" data-test="edit-vehicle" @click="openEdit">
            Edit details
          </v-btn>
        </template>
        <dl class="vehicle-facts">
          <template v-for="fact in facts" :key="fact.label">
            <dt>{{ fact.label }}</dt>
            <dd>{{ fact.value || "—" }}</dd>
          </template>
        </dl>
      </SectionCard>

      <!-- New Vehicle: the whole page is the form. -->
      <v-form v-else @submit.prevent="submit">
        <VehicleFields
          v-model="form"
          :field-errors="fieldErrors"
          :area-items="areaItems"
          :type-items="typeItems"
          :identifier-label="identifierLabel"
          show-odometer
        />

        <v-divider />
        <v-alert v-if="formError" type="error" density="compact" class="mt-6">{{ formError }}</v-alert>
        <div class="d-flex justify-end ga-2 pt-6">
          <v-btn color="secondary" variant="text" class="vehicle-form__cancel" :disabled="saving" @click="cancel">Cancel</v-btn>
          <v-btn
            type="submit"
            color="primary"
            variant="elevated"
            class="oc-cta vehicle-form__save"
            :disabled="saving"
            :aria-busy="saving"
            @click="submit"
          >
            {{ saving ? "Saving…" : "Create" }}
          </v-btn>
        </div>
      </v-form>

      <!-- UI/UX backlog #20: service visits, mileage, needs, issue reports, and trips, as tabs of one card. -->
      <VehicleWork
        v-if="!isCreate && loaded"
        :vehicle-id="route.params.id"
        :recent-trips="loaded.recentTrips ?? []"
        :show-issues="canReportIssues"
        :can-open-trip="canOpenTrip"
        :mileage-logs="mileageLogs ?? []"
        :mileage-logs-error="mileageLogsError"
        :service-logs="serviceLogs ?? []"
        :service-logs-error="serviceLogsError"
        @add-mileage-log="openMileageLog"
        @add-service-log="openServiceLog"
      />
    </div>



    <!-- Edit details: the same fields as New Vehicle, in a dialog that keeps the page behind it. -->
    <v-dialog
      v-if="!isCreate"
      v-model="editOpen"
      max-width="880"
      scrollable
      :fullscreen="$vuetify.display.xs"
      :persistent="saving || dirty"
    >
      <v-form class="h-100" @submit.prevent="submit">
        <v-card rounded="lg" data-test="edit-vehicle-dialog">
          <v-card-item>
            <v-card-title>Edit details</v-card-title>
            <v-card-subtitle>{{ loaded?.universityId }} · {{ title }}</v-card-subtitle>
          </v-card-item>
          <v-divider />
          <v-card-text class="px-6">
            <VehicleFields
              v-model="form"
              :field-errors="fieldErrors"
              :area-items="areaItems"
              :type-items="typeItems"
              :identifier-label="identifierLabel"
            />
            <v-alert v-if="formError" type="error" density="compact" class="mt-4">{{ formError }}</v-alert>
          </v-card-text>
          <v-divider />
          <v-card-actions class="px-6 py-4">
            <v-spacer />
            <v-btn color="secondary" variant="text" class="vehicle-form__cancel" :disabled="saving" @click="closeEdit">Cancel</v-btn>
            <v-btn
              type="submit"
              color="primary"
              variant="elevated"
              class="oc-cta vehicle-form__save"
              :disabled="saving"
              :aria-busy="saving"
            >
              {{ saving ? "Saving…" : "Save" }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>

    <MileageLogFormModal
      v-if="!isCreate"
      v-model="mileageLogOpen"
      :latest-reading="(mileageLogs ?? []).length ? Math.max(...mileageLogs.map(({ odometerReading }) => odometerReading)) : null"
      :save="createMileageLog"
    />
    <ServiceLogFormModal
      v-if="!isCreate"
      v-model="serviceLogOpen"
      :users="serviceUsers"
      :service-types="serviceTypes"
      :maintenance-needs="serviceNeeds"
      :save="createServiceLog"
    />
  </PageShell>
</template>

<style scoped>
.vehicle-facts {
  display: grid;
  grid-template-columns: minmax(140px, auto) 1fr;
  gap: 8px 24px;
  margin: 0;
}

/* Two pairs a row where there's room, so eleven facts don't run down one narrow column. */
@media (min-width: 960px) {
  .vehicle-facts {
    grid-template-columns: minmax(140px, auto) 1fr minmax(140px, auto) 1fr;
  }
}

.vehicle-facts dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.vehicle-facts dd {
  margin: 0;
}
</style>
