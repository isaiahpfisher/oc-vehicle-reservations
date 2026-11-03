<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import driverServices from "../services/driverServices.js";
import { useRequest } from "../composables/useRequest.js";
import PageShell from "../components/layout/PageShell.vue";
import { DRIVER_STATUS_OPTIONS, LICENSE_STATES, isValidPhoneNumber } from "../models/drivers.js";
import { fullName } from "../models/users.js";

const props = defineProps({
  /** The driver being edited; none on the create route. */
  id: { type: [String, Number], default: null },
});

const router = useRouter();
const formRef = ref(null);

const blank = () => ({
  userId: null,
  firstName: "",
  lastName: "",
  phoneNumber: "",
  licenseState: "OK",
  licenseExpirationDate: "",
  status: "pending",
});

const form = ref(blank());

const loadForm = async (id) => {
  const [users, driver] = await Promise.all([
    driverServices.getAvailableUsers(id ?? undefined),
    id ? driverServices.getDriver(id) : null,
  ]);
  return { users: users.data, driver: driver?.data ?? null };
};

const {
  data: loaded,
  loading,
  error: loadError,
  run: load,
} = useRequest(loadForm, {
  initial: { users: [], driver: null },
  fallback: "Failed to load driver.",
  select: (result) => result,
});

const {
  loading: saving,
  error: saveError,
  run: saveDriver,
} = useRequest(
  (payload) => (props.id ? driverServices.updateDriver(props.id, payload) : driverServices.createDriver(payload)),
  { fallback: "Failed to save driver." },
);

const title = computed(() => {
  if (!props.id) return "New Driver";
  return loaded.value.driver ? fullName(loaded.value.driver) : "";
});

const breadcrumbs = computed(() => [
  { title: "Drivers", to: { name: "drivers" } },
  { title: title.value || "Driver", disabled: true },
]);

const userLabel = (user) => `${fullName(user)} (${user.email})`;

const required = (value) => !!String(value ?? "").trim() || "Required";
const maxLength = (value) => String(value ?? "").trim().length <= 255 || "Must be 255 characters or fewer.";
const phoneFormat = (value) => isValidPhoneNumber(value) || "Phone number must be in format xxx-xxx-xxxx.";

const toPayload = (values) => ({
  ...values,
  firstName: values.firstName.trim(),
  lastName: values.lastName.trim(),
  phoneNumber: values.phoneNumber.trim(),
});

const save = async () => {
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  if (await saveDriver(toPayload(form.value))) {
    await router.push({ name: "drivers" });
  }
};

const cancel = () => router.push({ name: "drivers" });

watch(
  () => props.id,
  async (id) => {
    if (await load(id)) {
      const { driver } = loaded.value;
      form.value = driver
        ? {
            userId: driver.userId,
            firstName: driver.firstName,
            lastName: driver.lastName,
            phoneNumber: driver.phoneNumber,
            licenseState: driver.licenseState,
            licenseExpirationDate: driver.licenseExpirationDate,
            status: driver.status,
          }
        : blank();
    }
  },
  { immediate: true },
);
</script>

<template>
  <PageShell :title :breadcrumbs :loading :error="loadError" :max-width="720">
    <v-form ref="formRef" @submit.prevent="save">
      <v-autocomplete
        v-model="form.userId"
        :items="loaded.users"
        :item-title="userLabel"
        item-value="id"
        label="User"
        hint="Optional. Search by name or email. Only users without a driver are listed."
        persistent-hint
        no-data-text="No matching users."
        clearable
        class="mb-4"
      />
      <v-text-field v-model="form.firstName" label="First Name" :rules="[required, maxLength]" />
      <v-text-field v-model="form.lastName" label="Last Name" :rules="[required, maxLength]" />
      <v-text-field v-model="form.phoneNumber" label="Phone Number" placeholder="405-425-1234" :rules="[required, phoneFormat]" />
      <v-select v-model="form.licenseState" :items="LICENSE_STATES" label="License State" :rules="[required]" />
      <v-text-field v-model="form.licenseExpirationDate" label="License Expiration Date" type="date" :rules="[required]" />
      <v-select v-model="form.status" :items="DRIVER_STATUS_OPTIONS" label="Status" :rules="[required]" />

      <v-alert v-if="saveError" type="error" density="compact" class="mb-4">{{ saveError }}</v-alert>

      <div class="d-flex justify-end ga-2">
        <v-btn color="secondary" variant="text" :disabled="saving" @click="cancel">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" class="oc-cta" type="submit" :loading="saving">Save</v-btn>
      </div>
    </v-form>
  </PageShell>
</template>
