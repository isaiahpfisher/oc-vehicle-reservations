<script setup>
import { ref, watch } from "vue";
import { validateMileageLogForm } from "../../models/mileageLogs.js";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  log: { type: Object, default: null },
  save: { type: Function, required: true },
});

const form = ref({ odometerReading: "", recordedAt: "" });
const formError = ref("");
const saving = ref(false);

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  form.value = {
    odometerReading: props.log ? String(props.log.odometerReading) : "",
    recordedAt: props.log?.recordedAt ?? "",
  };
  formError.value = "";
});

const submit = async () => {
  if (saving.value) {
    return;
  }

  const result = validateMileageLogForm(form.value);
  formError.value = result.message || "";
  if (result.message) {
    return;
  }

  saving.value = true;

  try {
    await props.save(result.value);
    open.value = false;
  } catch (error) {
    formError.value = error.response?.data?.message || "Failed to save mileage log.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="500" :persistent="saving">
    <v-card rounded="lg">
      <v-card-title>{{ log ? "Edit mileage log" : "New mileage log" }}</v-card-title>
      <v-card-text>
        <v-text-field v-model="form.odometerReading" label="Odometer reading" type="number" step="1" density="comfortable" />
        <v-text-field v-model="form.recordedAt" label="Recorded date" type="date" density="comfortable" />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="secondary" variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="submit">
          {{ log ? "Save" : "Create" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
