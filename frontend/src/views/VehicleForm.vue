<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import areaServices from "../services/areaServices.js";
import vehicleServices from "../services/vehicleServices.js";
import vehicleTypeServices from "../services/vehicleTypeServices.js";
import { useRoles } from "../composables/useRoles.js";
import PageShell from "../components/layout/PageShell.vue";
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
const saved = ref(blank());

const visibleAreas = computed(() => {
  if (hasRole("admin")) {
    return areas.value;
  }

  const ids = new Set(areaAdminAreaIds.value.map(Number));
  return areas.value.filter((area) => ids.has(Number(area.id)));
});

const areaItems = computed(() => visibleAreas.value.map((area) => ({ title: area.name, value: area.id })));
const typeItems = computed(() => vehicleTypes.value.map((type) => ({ title: type.name, value: type.id })));
const statusItems = ["active", "retired"];

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

const ownsVehicle = (vehicle) =>
  hasRole("admin") || areaAdminAreaIds.value.map(Number).includes(Number(vehicle.areaId));

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
      saved.value = blank();
      return;
    }

    const { data } = await vehicleServices.getVehicle(route.params.id);
    if (!ownsVehicle(data)) {
      await router.replace({ name: "home" });
      return;
    }

    loaded.value = data;
    form.value = fromVehicle(data);
    saved.value = fromVehicle(data);
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

  const universityId = value.universityId.trim();
  const make = value.make.trim();
  const modelName = value.model.trim();
  const identifier = value.identifier.trim();
  const color = value.color.trim();
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
  universityId: form.value.universityId.trim(),
  make: form.value.make.trim(),
  model: form.value.model.trim(),
  year: Number(form.value.year),
  identifier: form.value.identifier.trim(),
  purchasedAt: form.value.purchasedAt,
  color: form.value.color.trim(),
  passengerCapacity: Number(form.value.passengerCapacity),
  licensePlate: String(form.value.licensePlate ?? "").trim() || null,
  licensePlateExpirationDate: String(form.value.licensePlateExpirationDate ?? "").trim() || null,
  status: form.value.status,
});

const submit = async () => {
  formError.value = validate();
  if (formError.value || saving.value) {
    return;
  }

  saving.value = true;
  try {
    if (isCreate.value) {
      const response = await vehicleServices.createVehicle(payload());
      if (response?.status !== 201) {
        formError.value = "Failed to save vehicle.";
        return;
      }
      await router.push({ name: "vehicles" });
      return;
    }

    const response = await vehicleServices.updateVehicle(route.params.id, payload());
    if (response?.status !== 200) {
      formError.value = "Failed to save vehicle.";
      return;
    }

    loaded.value = { ...loaded.value, ...response.data };
    saved.value = fromVehicle(response.data);
    form.value = fromVehicle(response.data);
  } catch (error) {
    formError.value = Utils.errorMessage(error, "Failed to save vehicle.");
  } finally {
    saving.value = false;
  }
};

const cancel = () => {
  formError.value = "";
  if (isCreate.value) {
    router.push({ name: "vehicles" });
    return;
  }

  form.value = { ...saved.value };
};
</script>

<template>
  <PageShell :title="title" :breadcrumbs :loading :error="loadError" :max-width="720">
    <v-form @submit.prevent="submit">
      <v-alert v-if="formError" type="error" density="compact" class="mb-4">{{ formError }}</v-alert>

      <v-select v-model="form.areaId" :items="areaItems" item-title="title" item-value="value" label="Area" />
      <v-select v-model="form.vehicleTypeId" :items="typeItems" item-title="title" item-value="value" label="Vehicle Type" />
      <v-text-field v-model="form.universityId" label="University Id" />
      <v-text-field v-model="form.identifier" :label="identifierLabel" />
      <v-text-field v-model="form.make" label="Make" />
      <v-text-field v-model="form.model" label="Model" />
      <v-text-field v-model="form.year" label="Year" />
      <v-text-field v-model="form.color" label="Color" />
      <v-text-field v-model="form.passengerCapacity" label="Passenger Capacity" />
      <v-text-field v-model="form.purchasedAt" label="Purchase Date" type="date" />
      <v-text-field v-model="form.licensePlate" label="License Plate" />
      <v-text-field v-model="form.licensePlateExpirationDate" label="License Plate Expiration Date" type="date" />
      <v-select v-model="form.status" :items="statusItems" label="Status" />

      <div class="d-flex ga-2 mt-2">
        <v-btn type="button" color="primary" variant="elevated" class="oc-cta" @click="submit">
          {{ isCreate ? "Create" : "Save" }}
        </v-btn>
        <v-btn type="button" variant="text" @click="cancel">Cancel</v-btn>
      </div>
    </v-form>
  </PageShell>
</template>
