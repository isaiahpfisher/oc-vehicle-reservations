<script setup>
import { ref, watch } from "vue";
import { useDialogChanges } from "../../composables/useDialogChanges.js";
import { validateServiceTypeForm } from "../../models/serviceTypes.js";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  serviceTypes: { type: Array, default: () => [] },
  /** UI/UX backlog #34: the service type being edited; `null` creates one. */
  serviceType: { type: Object, default: null },
  save: { type: Function, required: true },
});

const form = ref({ name: "", service_frequency_days: "", service_frequency_miles: "" });
const formError = ref("");
const formRef = ref(null);
// UI/UX backlog #29: problems show on their own field (same messages as validateServiceTypeForm, which still runs).
const requiredName = (value) => !!String(value ?? "").trim() || "Required field.";
const positiveWhole = (value) => {
  const text = String(value ?? "").trim();
  return !text || (/^\d+$/.test(text) && Number(text) >= 1) || "Must be a positive whole number.";
};
const saving = ref(false);

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  const editing = props.serviceType;
  form.value = {
    name: editing?.name ?? "",
    service_frequency_days: editing?.service_frequency_days ?? "",
    service_frequency_miles: editing?.service_frequency_miles ?? "",
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

  const result = validateServiceTypeForm(form.value, props.serviceTypes, props.serviceType?.id ?? null);
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

// UI/UX backlog #31: once something is typed, a click outside doesn't close (and lose) the dialog.
const changed = useDialogChanges(open, () => form.value);
</script>

<template>
  <v-dialog v-model="open" max-width="500" :persistent="saving || changed">
    <!-- UI/UX backlog #30: a form, so Enter saves. -->
    <v-form ref="formRef" @submit.prevent="submit">
      <v-card rounded="lg">
        <v-card-title>{{ serviceType ? "Edit service type" : "New service type" }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="Name" density="comfortable" :rules="[requiredName]" />
          <v-text-field
            v-model="form.service_frequency_days"
            label="Frequency Days"
            inputmode="numeric"
            suffix="days"
            density="comfortable"
            :rules="[positiveWhole]"
          />
          <v-text-field
            v-model="form.service_frequency_miles"
            label="Frequency Miles"
            inputmode="numeric"
            suffix="mi"
            density="comfortable"
            :rules="[positiveWhole]"
          />
          <!-- UI/UX backlog #83: say what leaving both blank means. -->
          <div class="text-body-small text-medium-emphasis">
            Fill in one or both. With both, it's due after whichever comes first.
          </div>
          <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
          <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :loading="saving">
            {{ serviceType ? "Save" : "Create" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
</template>
