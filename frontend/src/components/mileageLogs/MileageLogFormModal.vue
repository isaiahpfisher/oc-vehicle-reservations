<script setup>
import { ref, watch } from "vue";
import { useDialogChanges } from "../../composables/useDialogChanges.js";
import { validateMileageLogForm } from "../../models/mileageLogs.js";
import { todayInput } from "../../models/issueReports.js";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  log: { type: Object, default: null },
  save: { type: Function, required: true },
  /** UI/UX backlog #57: the vehicle's latest reading, shown as a hint (readings only go up, #3). */
  latestReading: { type: Number, default: null },
});

const form = ref({ odometerReading: "", recordedAt: "" });
const formRef = ref(null);
// UI/UX backlog #29: each field shows its own problem; the model check below still runs before saving.
const required = (value) => (value !== null && value !== undefined && String(value).trim() !== "") || "Required field.";
// Same messages as the API (Feature 9).
const wholeMiles = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return true;
  if (!/^-?\d+$/.test(text)) return "Odometer reading must be a whole number.";
  return Number(text) >= 0 || "Odometer reading must be zero or greater.";
};
const formError = ref("");
const saving = ref(false);

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  form.value = {
    odometerReading: props.log ? String(props.log.odometerReading) : "",
    // UI/UX backlog #57: a new reading is usually today's.
    recordedAt: props.log?.recordedAt ?? todayInput(),
  };
  formError.value = "";
});

const submit = async () => {
  if (saving.value) {
    return;
  }

  const { valid } = (await formRef.value?.validate()) ?? { valid: true };
  if (!valid) {
    formError.value = "";
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

// UI/UX backlog #31: once something is typed, a click outside doesn't close (and lose) the dialog.
const changed = useDialogChanges(open, () => form.value);
</script>

<template>
  <v-dialog v-model="open" max-width="500" :persistent="saving || changed">
    <!-- UI/UX backlog #30: a form, so Enter saves. -->
    <v-form ref="formRef" @submit.prevent="submit">
    <v-card rounded="lg">
      <v-card-title>{{ log ? "Edit mileage log" : "New mileage log" }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="form.odometerReading"
          label="Odometer reading"
          :hint="latestReading !== null && !log ? `Last reading: ${latestReading.toLocaleString()} mi` : ''"
          persistent-hint
          inputmode="numeric"
          suffix="mi"
          density="comfortable"
          :rules="[required, wholeMiles]"
        />
        <v-text-field v-model="form.recordedAt" label="Recorded date" type="date" density="comfortable" :rules="[required]" />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="secondary" variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
        <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :loading="saving">
          {{ log ? "Save" : "Create" }}
        </v-btn>
      </v-card-actions>
    </v-card>
    </v-form>
  </v-dialog>
</template>
