<script setup>
import { computed, ref, watch } from "vue";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  vehicleType: { type: Object, default: null },
  vehicleTypes: { type: Array, default: () => [] },
  save: { type: Function, required: true },
});

const IDENTIFIERS = [
  { title: "VIN", value: "VIN" },
  { title: "Serial", value: "Serial" },
];

const form = ref({ name: "", identifier: "" });
const formError = ref("");
const saving = ref(false);

const isEdit = computed(() => !!props.vehicleType);

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  form.value = {
    name: props.vehicleType?.name ?? "",
    identifier: props.vehicleType?.identifier ?? "",
  };
  formError.value = "";
});

const submit = async () => {
  if (saving.value) {
    return;
  }

  const name = form.value.name.trim();
  const identifier = form.value.identifier;
  formError.value = "";

  if (!name || !identifier) {
    formError.value = "Required field.";
    return;
  }

  if (name.length > 255) {
    formError.value = "Name too long.";
    return;
  }

  const taken = props.vehicleTypes.some(
    (type) => type.name.toLowerCase() === name.toLowerCase() && type.id !== props.vehicleType?.id,
  );
  if (taken) {
    formError.value = "Name already taken.";
    return;
  }

  saving.value = true;

  try {
    await props.save({ name, identifier });
    open.value = false;
  } catch (error) {
    formError.value = error.response?.data?.message || "Failed to save vehicle type.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="500" :persistent="saving">
    <v-card rounded="lg">
      <v-card-item>
        <v-card-title>{{ isEdit ? "Edit vehicle type" : "New vehicle type" }}</v-card-title>
        <template #append>
          <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="submit">
            {{ isEdit ? "Save" : "Create" }}
          </v-btn>
          <v-btn variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
        </template>
      </v-card-item>
      <v-card-text>
        <v-text-field v-model="form.name" label="Name" density="comfortable" />
        <v-select v-model="form.identifier" label="Identifier" :items="IDENTIFIERS" clearable density="comfortable" />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
