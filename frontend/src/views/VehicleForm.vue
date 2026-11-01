<script setup>
import { computed, nextTick, ref, watch } from "vue";
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
      return;
    }

    const { data } = await vehicleServices.getVehicle(route.params.id);
    if (!ownsVehicle(data)) {
      await router.replace({ name: "home" });
      return;
    }

    loaded.value = data;
    form.value = fromVehicle(data);
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
  if (saving.value) {
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
</script>

<template>
  <PageShell :title="title" :breadcrumbs :loading :error="loadError" :max-width="720">
    <v-form @submit.prevent="submit">
      <v-select v-model="form.areaId" :items="areaItems" item-title="title" item-value="value" label="Area" />
      <v-select v-model="form.vehicleTypeId" :items="typeItems" item-title="title" item-value="value" label="Vehicle Type" />
      <v-text-field v-model="form.universityId" label="University Id" />
      <v-text-field v-model="form.identifier" :label="identifierLabel" />
      <v-text-field v-model="form.make" label="Make" />
      <v-text-field v-model="form.model" label="Model" />
      <v-text-field
        :model-value="form.year"
        label="Year"
        type="number"
        step="1"
        max="9999"
        @update:model-value="setYear"
        @keydown="onYearKeydown"
      />
      <v-text-field v-model="form.color" label="Color" />
      <v-text-field v-model="form.passengerCapacity" label="Passenger Capacity" />
      <v-text-field v-model="form.purchasedAt" label="Purchase Date" type="date" />
      <v-text-field v-model="form.licensePlate" label="License Plate" />
      <v-text-field v-model="form.licensePlateExpirationDate" label="License Plate Expiration Date" type="date" />
      <v-select v-model="form.status" :items="statusItems" label="Status" />

      <v-alert v-if="formError" type="error" density="compact" class="mb-4">{{ formError }}</v-alert>

      <div class="d-flex ga-2 mt-2">
        <button type="submit" class="vehicle-form__save" :disabled="saving" :aria-busy="saving" @click="submit">
          {{ saving ? "Saving…" : isCreate ? "Create" : "Save" }}
        </button>
        <button type="button" class="vehicle-form__cancel" :disabled="saving" @click="cancel">Cancel</button>
      </div>
    </v-form>
  </PageShell>
</template>

<style scoped>
.vehicle-form__save,
.vehicle-form__cancel {
  min-height: 36px;
  padding: 0 16px;
  border-radius: 4px;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
}

.vehicle-form__save {
  border: 0;
  background: #801328;
  color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
}

.vehicle-form__save:disabled,
.vehicle-form__cancel:disabled {
  cursor: default;
  opacity: 0.6;
}

.vehicle-form__cancel {
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
}
</style>
