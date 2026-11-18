<script setup>
import { computed, nextTick, ref, watch } from "vue";
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
import { vehicleName } from "../models/vehicles.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import { useRoles } from "../composables/useRoles.js";
import FormSection from "../components/layout/FormSection.vue";
import PageShell from "../components/layout/PageShell.vue";
import MileageLogFormModal from "../components/mileageLogs/MileageLogFormModal.vue";
import ServiceLogFormModal from "../components/serviceLogs/ServiceLogFormModal.vue";
import RecentMileageLogs from "../components/vehicles/RecentMileageLogs.vue";
import RecentServiceVisits from "../components/vehicles/RecentServiceVisits.vue";
import VehicleStatusCard from "../components/vehicles/VehicleStatusCard.vue";
import Utils from "../config/utils.js";

const route = useRoute();
const router = useRouter();
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
});

const form = ref(blank());
const serviceLogOpen = ref(false);
const serviceLogSaved = ref("");
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
// Stored lowercase; shown capitalized.
const statusItems = [
  { title: "Active", value: "active" },
  { title: "Retired", value: "retired" },
];

const selectedType = computed(() => vehicleTypes.value.find((type) => type.id === form.value.vehicleTypeId));
const identifierLabel = computed(() => (selectedType.value?.identifier === "Serial" ? "Serial" : "VIN"));

const title = computed(() => {
  if (isCreate.value) {
    return "New vehicle";
  }

  return loaded.value ? `${loaded.value.make} ${loaded.value.model}` : "";
});

const breadcrumbs = computed(() => [
  { title: "Vehicles", to: { name: "vehicles" } },
  { title: title.value || "Vehicle", disabled: true },
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
      return;
    }

    const { data } = await vehicleServices.getVehicle(route.params.id);
    if (!ownsVehicle(data)) {
      await router.replace({ name: "home" });
      return;
    }

    loaded.value = data;
    form.value = fromVehicle(data);
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

const validate = () => {
  const value = form.value;
  if (blankText(value.areaId) || blankText(value.vehicleTypeId) || blankText(value.universityId)) {
    return "Required field.";
  }
  if (blankText(value.identifier) || blankText(value.make) || blankText(value.model) || blankText(value.year)) {
    return "Required field.";
  }
  if (blankText(value.purchasedAt) || blankText(value.color) || blankText(value.passengerCapacity) || blankText(value.status)) {
    return "Required field.";
  }

  const universityId = String(value.universityId).trim();
  const make = String(value.make).trim();
  const modelName = String(value.model).trim();
  const identifier = String(value.identifier).trim();
  const color = String(value.color).trim();
  const plate = String(value.licensePlate ?? "").trim();

  if (universityId.length > 255) return "University id too long.";
  if (make.length > 255) return "Make too long.";
  if (modelName.length > 255) return "Model too long.";
  if (selectedType.value?.identifier === "VIN" && identifier.length !== 17) return "VIN must be 17 characters.";
  if (identifier.length > 255) return "Serial number too long.";
  if (color.length > 255) return "Color too long.";
  if (plate.length > 8) return "License plate too long.";

  const others = vehicles.value.filter((vehicle) => vehicle.id !== currentId.value);
  if (others.some((vehicle) => vehicle.universityId === universityId)) return "University id already taken.";
  if (others.some((vehicle) => vehicle.identifier === identifier)) return "Identifier already taken.";
  if (plate && others.some((vehicle) => vehicle.licensePlate === plate)) return "License plate already taken.";

  return "";
};

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
    formError.value = validate();
    if (formError.value) {
      return;
    }

    if (isCreate.value) {
      const response = await vehicleServices.createVehicle(payload());
      if (response?.status !== 201) {
        formError.value = "Failed to save vehicle.";
        return;
      }
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

    await router.push({ name: "vehicles" });
  } catch (error) {
    formError.value = Utils.errorMessage(error, "Failed to save vehicle.");
  } finally {
    saving.value = false;
  }
};

const setYear = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length <= 4) {
    form.value.year = digits;
    return;
  }

  const previous = String(form.value.year ?? "");
  form.value.year = previous.length === 4 ? previous : digits.slice(0, 4);
};

const onYearKeydown = (event) => {
  if (["e", "E", "+", "-", "."].includes(event.key)) {
    event.preventDefault();
    return;
  }

  if (event.key.length !== 1 || !/\d/.test(event.key)) {
    return;
  }

  const input = event.target;
  const selected = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
  if (String(form.value.year ?? "").length - selected >= 4) {
    event.preventDefault();
  }
};

const cancel = () => {
  router.push({ name: "vehicles" });
};

const withLabel = (user) => ({ ...user, label: fullName(user) });

const openServiceLog = async () => {
  serviceLogSaved.value = "";
  const [userResult, typeResult, needResult] = await Promise.allSettled([
    maintenanceNeedServices.getMaintenanceNeedOptions(),
    serviceTypeServices.getServiceTypes(),
    maintenanceNeedServices.getMaintenanceNeeds(),
  ]);

  serviceTypes.value = typeResult.status === "fulfilled" ? typeResult.value.data : [];
  serviceNeeds.value =
    needResult.status === "fulfilled"
      ? needResult.value.data.filter((need) => String(need.vehicleId) === String(route.params.id))
      : [];
  serviceUsers.value = userResult.status === "fulfilled" ? userResult.value.data.assignees.map(withLabel) : [];

  serviceLogOpen.value = true;
};

const createServiceLog = async (payload) => {
  await serviceLogServices.createServiceLog({ ...payload, vehicleId: Number(route.params.id) });
  serviceLogSaved.value = "Service log created.";
  await Promise.all([getServiceLogs(route.params.id), getMileageLogs(route.params.id), refreshStatus()]);
};

const openMileageLog = () => {
  serviceLogSaved.value = "";
  mileageLogOpen.value = true;
};

const createMileageLog = async (payload) => {
  await mileageLogServices.createMileageLog({ ...payload, vehicleId: Number(route.params.id) });
  serviceLogSaved.value = "Mileage log created.";
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
    <div class="d-flex flex-column ga-6">
      <VehicleStatusCard v-if="!isCreate && loaded?.condition" :vehicle="loaded" :can-open-trip="canOpenTrip" />

      <v-form @submit.prevent="submit">
        <FormSection title="Assignment" subtitle="The area that manages it, and whether it's still in the fleet. Retired vehicles can't be assigned to trips.">
          <v-row density="comfortable">
            <v-col cols="12" sm="6">
              <v-select v-model="form.areaId" :items="areaItems" item-title="title" item-value="value" label="Area" hide-details="auto" :disabled="readOnly" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="form.status" :items="statusItems" label="Status" hide-details="auto" :disabled="readOnly" />
            </v-col>
          </v-row>
        </FormSection>

        <FormSection title="Identity" subtitle="How the university and the manufacturer identify it. Service schedules count from the purchase date until a service is logged.">
          <v-row density="comfortable">
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.vehicleTypeId"
                :items="typeItems"
                item-title="title"
                item-value="value"
                label="Vehicle Type"
                hide-details="auto"
                :disabled="readOnly"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.universityId" label="University Id" hide-details="auto" :disabled="readOnly" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.identifier" :label="identifierLabel" hide-details="auto" :disabled="readOnly" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.purchasedAt" label="Purchase Date" type="date" hide-details="auto" :disabled="readOnly" />
            </v-col>
          </v-row>
        </FormSection>

        <FormSection title="Description" subtitle="What it is and how many people it carries.">
          <v-row density="comfortable">
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.make" label="Make" hide-details="auto" :disabled="readOnly" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.model" label="Model" hide-details="auto" :disabled="readOnly" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                :model-value="form.year"
                label="Year"
                type="number"
                step="1"
                max="9999"
                hide-details="auto"
                :disabled="readOnly"
                @update:model-value="setYear"
                @keydown="onYearKeydown"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="form.color" label="Color" hide-details="auto" :disabled="readOnly" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="form.passengerCapacity" label="Passenger Capacity" hide-details="auto" :disabled="readOnly" />
            </v-col>
          </v-row>
        </FormSection>

        <FormSection title="Registration" subtitle="Vehicles whose plate expires before a trip ends are flagged when they're assigned.">
          <v-row density="comfortable">
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.licensePlate" label="License Plate" hide-details="auto" :disabled="readOnly" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.licensePlateExpirationDate"
                label="License Plate Expiration Date"
                type="date"
                hide-details="auto"
                :disabled="readOnly"
              />
            </v-col>
          </v-row>
        </FormSection>

        <v-divider />
        <v-alert v-if="formError" type="error" density="compact" class="mt-6">{{ formError }}</v-alert>
        <div class="d-flex justify-end ga-2 pt-6">
          <v-btn color="secondary" variant="text" class="vehicle-form__cancel" :disabled="saving" @click="cancel">Cancel</v-btn>
          <v-btn
            v-if="!readOnly"
            type="submit"
            color="primary"
            variant="elevated"
            class="oc-cta vehicle-form__save"
            :disabled="saving"
            :aria-busy="saving"
            @click="submit"
          >
            {{ saving ? "Saving…" : isCreate ? "Create" : "Save" }}
          </v-btn>
        </div>
      </v-form>

      <v-row v-if="!isCreate" density="comfortable">
        <v-col cols="12" md="6">
          <RecentMileageLogs :logs="mileageLogs" :error="mileageLogsError" :vehicle-id="route.params.id" @add="openMileageLog" />
        </v-col>
        <v-col cols="12" md="6">
          <RecentServiceVisits :logs="serviceLogs" :error="serviceLogsError" :vehicle-id="route.params.id" @add="openServiceLog" />
        </v-col>
      </v-row>
    </div>

    <v-snackbar :model-value="!!serviceLogSaved" color="success" timeout="3000" @update:model-value="serviceLogSaved = ''">
      {{ serviceLogSaved }}
    </v-snackbar>

    <MileageLogFormModal v-if="!isCreate" v-model="mileageLogOpen" :save="createMileageLog" />
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
