<script setup>
import { computed, ref, watch } from "vue";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  destination: { type: Object, default: null },
  save: { type: Function, required: true },
});

const emptyForm = () => ({
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  milesFromCampus: "",
  isSaved: true,
});

const form = ref(emptyForm());
const formError = ref("");
const saving = ref(false);

const isEdit = computed(() => !!props.destination);

const optional = (value) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const milesValue = () => {
  const raw = form.value.milesFromCampus;
  if (raw === "" || raw === null || raw === undefined) {
    return { value: null };
  }

  const text = String(raw).trim();
  if (!/^\d+$/.test(text)) {
    return { error: "Miles from campus must be a whole number of 0 or more." };
  }

  return { value: Number(text) };
};

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  const destination = props.destination;
  form.value = destination
    ? {
        name: destination.name ?? "",
        addressLine1: destination.address_line_1 ?? "",
        addressLine2: destination.address_line_2 ?? "",
        city: destination.city ?? "",
        state: destination.state ?? "",
        zipCode: destination.zip_code ?? "",
        milesFromCampus: destination.miles_from_campus ?? "",
        isSaved: destination.is_saved !== false,
      }
    : emptyForm();
  formError.value = "";
});

const submit = async () => {
  if (saving.value) {
    return;
  }

  const name = form.value.name.trim();
  const addressLine1 = form.value.addressLine1.trim();
  const addressLine2 = form.value.addressLine2.trim();
  const city = form.value.city.trim();
  const state = form.value.state.trim();
  const zipCode = form.value.zipCode.trim();
  formError.value = "";

  if (!name || !addressLine1 || !city || !state) {
    formError.value = "Required field.";
    return;
  }

  if (name.length > 255) {
    formError.value = "Name too long.";
    return;
  }
  if (addressLine1.length > 255) {
    formError.value = "Address line 1 too long.";
    return;
  }
  if (addressLine2.length > 255) {
    formError.value = "Address line 2 too long.";
    return;
  }
  if (city.length > 255) {
    formError.value = "City too long.";
    return;
  }
  if (state.length > 255) {
    formError.value = "State too long.";
    return;
  }
  if (zipCode.length > 255) {
    formError.value = "ZIP code too long.";
    return;
  }

  const miles = milesValue();
  if (miles.error) {
    formError.value = miles.error;
    return;
  }

  saving.value = true;

  try {
    await props.save({
      name,
      address_line_1: addressLine1,
      address_line_2: optional(form.value.addressLine2),
      city,
      state,
      zip_code: optional(form.value.zipCode),
      is_saved: form.value.isSaved,
      miles_from_campus: miles.value,
    });
    open.value = false;
  } catch (error) {
    formError.value = error.response?.data?.message || "Failed to save destination.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="560" :persistent="saving">
    <v-card rounded="lg">
      <v-card-item>
        <v-card-title>{{ isEdit ? "Edit destination" : "New destination" }}</v-card-title>
        <template #append>
          <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="submit">
            {{ isEdit ? "Save" : "Create" }}
          </v-btn>
          <v-btn variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
        </template>
      </v-card-item>
      <v-card-text>
        <v-text-field v-model="form.name" label="Name" density="comfortable" />
        <v-text-field v-model="form.addressLine1" label="Address line 1" density="comfortable" />
        <v-text-field v-model="form.addressLine2" label="Address line 2" density="comfortable" />
        <v-text-field v-model="form.city" label="City" density="comfortable" />
        <v-text-field v-model="form.state" label="State" density="comfortable" />
        <v-text-field v-model="form.zipCode" label="ZIP code" density="comfortable" />
        <v-text-field v-model="form.milesFromCampus" label="Miles from campus" density="comfortable" />
        <v-switch v-model="form.isSaved" label="Official" color="primary" hide-details />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
