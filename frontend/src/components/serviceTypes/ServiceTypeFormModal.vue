<script setup>
import { ref, watch } from "vue";
import { validateServiceTypeForm } from "../../models/serviceTypes.js";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  serviceTypes: { type: Array, default: () => [] },
  save: { type: Function, required: true },
});

const form = ref({ name: "", service_frequency_days: "", service_frequency_miles: "" });
const formError = ref("");
const saving = ref(false);

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  form.value = { name: "", service_frequency_days: "", service_frequency_miles: "" };
  formError.value = "";
});

const submit = async () => {
  if (saving.value) {
    return;
  }

  const result = validateServiceTypeForm(form.value, props.serviceTypes);
  formError.value = result.message || "";
  if (result.message) {
    return;
  }

  saving.value = true;

  try {
    await props.save(result.value);
    open.value = false;
  } catch (error) {
    formError.value = error.response?.data?.message || "Failed to save service type.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="500" :persistent="saving">
    <v-card rounded="lg">
      <v-card-title>New service type</v-card-title>
      <v-card-text>
        <v-text-field v-model="form.name" label="Name" density="comfortable" />
        <v-text-field
          v-model="form.service_frequency_days"
          label="Frequency Days"
          type="number"
          min="1"
          step="1"
          density="comfortable"
        />
        <v-text-field
          v-model="form.service_frequency_miles"
          label="Frequency Miles"
          type="number"
          min="1"
          step="1"
          density="comfortable"
        />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="secondary" variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="submit">Create</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
