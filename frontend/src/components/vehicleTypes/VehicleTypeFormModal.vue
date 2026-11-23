<script setup>
import { ref, watch } from "vue";
import { useDialogChanges } from "../../composables/useDialogChanges.js";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  vehicleTypes: { type: Array, default: () => [] },
  /** UI/UX backlog #34: the vehicle type being edited; `null` creates one. */
  vehicleType: { type: Object, default: null },
  save: { type: Function, required: true },
});

const IDENTIFIERS = [
  { title: "VIN", value: "VIN" },
  { title: "Serial", value: "Serial" },
];

const form = ref({ name: "", identifier: "" });
const formError = ref("");
/** UI/UX backlog #29: which field `formError` belongs to ("name" or "identifier"); empty for API errors. */
const fieldError = ref("");
const saving = ref(false);

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  form.value = { name: props.vehicleType?.name ?? "", identifier: props.vehicleType?.identifier ?? "" };
  formError.value = "";
  fieldError.value = "";
});

const submit = async () => {
  if (saving.value) {
    return;
  }

  const name = form.value.name.trim();
  const identifier = form.value.identifier;
  formError.value = "";
  fieldError.value = "";

  if (!name || !identifier) {
    formError.value = "Required field.";
    fieldError.value = name ? "identifier" : "name";
    return;
  }

  if (name.length > 255) {
    formError.value = "Name too long.";
    fieldError.value = "name";
    return;
  }

  const taken = props.vehicleTypes.some(
    (type) => type.name.toLowerCase() === name.toLowerCase() && type.id !== props.vehicleType?.id,
  );
  if (taken) {
    formError.value = "Name already taken.";
    fieldError.value = "name";
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

// UI/UX backlog #31: once something is typed, a click outside doesn't close (and lose) the dialog.
const changed = useDialogChanges(open, () => form.value);
</script>

<template>
  <v-dialog v-model="open" max-width="500" :persistent="saving || changed">
    <!-- UI/UX backlog #30: a form, so Enter saves. #81: buttons in the footer, Cancel first, like every other dialog. -->
    <v-form @submit.prevent="submit">
      <v-card rounded="lg">
        <v-card-title>{{ vehicleType ? "Edit vehicle type" : "New vehicle type" }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.name"
            label="Name"
            density="comfortable"
            :error-messages="fieldError === 'name' ? formError : ''"
          />
          <!-- UI/UX backlog #82: say what the identifier means. -->
          <v-select
            v-model="form.identifier"
            label="Identifier"
            :items="IDENTIFIERS"
            hint="VIN for road vehicles (17 characters); Serial for carts and equipment without one."
            persistent-hint
            density="comfortable"
            :error-messages="fieldError === 'identifier' ? formError : ''"
          />
          <v-alert v-if="formError && !fieldError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
          <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :loading="saving">
            {{ vehicleType ? "Save" : "Create" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
</template>
