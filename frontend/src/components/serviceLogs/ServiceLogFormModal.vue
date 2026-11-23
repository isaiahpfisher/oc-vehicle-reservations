<script setup>
import { ref, watch } from "vue";
import { useDialogChanges } from "../../composables/useDialogChanges.js";
import { validateServiceLogForm } from "../../models/serviceLogs.js";
import { useRoles } from "../../composables/useRoles.js";
import { todayInput } from "../../models/issueReports.js";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  users: { type: Array, default: () => [] },
  serviceTypes: { type: Array, default: () => [] },
  maintenanceNeeds: { type: Array, default: () => [] },
  /** Set when the dialog is opened for one maintenance need. */
  presetNeedId: { type: [Number, null], default: null },
  lockNeed: { type: Boolean, default: false },
  /** Set when the dialog is opened for one service (a due date on the service calendar); a new log starts with it. */
  presetServiceTypeId: { type: [Number, null], default: null },
  /** Pre-filled values when editing an existing service log. */
  initial: { type: Object, default: null },
  title: { type: String, default: "New service log" },
  submitLabel: { type: String, default: "Create" },
  /** UI/UX backlog #25: offer to mark the linked maintenance need completed; `save` gets `{ completeNeed }`. */
  offerCompleteNeed: Boolean,
  save: { type: Function, required: true },
});

const { user, hasRole } = useRoles();
const formRef = ref(null);
// UI/UX backlog #29: each field shows its own problem (same messages as the model check, which still runs).
const required = (value) =>
  (Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && String(value).trim() !== "") ||
  "Required field.";
const wholeMiles = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return true;
  if (!/^-?\d+$/.test(text)) return "Mileage must be a whole number.";
  return Number(text) >= 0 || "Mileage must be zero or greater.";
};
const completeNeed = ref(true);

const blank = () => ({
  userId: null,
  serviceTypeId: null,
  miles: "",
  maintenanceNeedId: null,
  servicedAt: "",
});

const form = ref(blank());
const formError = ref("");
const saving = ref(false);

watch(
  () => [open.value, props.presetNeedId, props.presetServiceTypeId, props.initial],
  ([isOpen]) => {
    if (!isOpen) {
      return;
    }

    // UI/UX backlog #24: a maintenance user logging work is usually the one who did it; the date is usually today.
    const me = hasRole("maintenance") && props.users.some(({ id }) => id === user.value?.userId) ? user.value.userId : null;
    // UI/UX backlog #26: a new entry is a visit, so it takes several services; editing changes one log.
    const { serviceTypeId: _one, ...fresh } = blank();
    form.value = props.initial
      ? { ...blank(), ...props.initial }
      : {
          ...fresh,
          serviceTypeIds: props.presetServiceTypeId ? [props.presetServiceTypeId] : [],
          userId: me,
          servicedAt: todayInput(),
          maintenanceNeedId: props.presetNeedId ?? null,
        };
    formError.value = "";
    completeNeed.value = true;
  },
);

const submit = async () => {
  if (saving.value) {
    return;
  }

  const { valid } = (await formRef.value?.validate()) ?? { valid: true };
  if (!valid) {
    formError.value = "";
    return;
  }

  const result = validateServiceLogForm(form.value);
  formError.value = result.message || "";
  if (result.message) {
    return;
  }

  saving.value = true;

  try {
    await props.save(result.value, { completeNeed: props.offerCompleteNeed && !!result.value.maintenanceNeedId && completeNeed.value });
    open.value = false;
  } catch (error) {
    formError.value = error.response?.data?.message || "Failed to save service log.";
  } finally {
    saving.value = false;
  }
};

// UI/UX backlog #31: once something is typed, a click outside doesn't close (and lose) the dialog.
const changed = useDialogChanges(open, () => form.value);
</script>

<template>
  <v-dialog v-model="open" max-width="560" :persistent="saving || changed">
    <!-- UI/UX backlog #30: a form, so Enter saves. -->
    <v-form v-if="open" ref="formRef" @submit.prevent="submit">
    <v-card rounded="lg">
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <!-- UI/UX backlog #24: pickers, not comboboxes, so only real users and service types can be chosen. -->
        <v-autocomplete
          v-model="form.userId"
          :items="users"
          item-title="label"
          item-value="id"
          label="User"
          density="comfortable"
          :rules="[required]"
        />
        <v-autocomplete
          v-if="Array.isArray(form.serviceTypeIds)"
          v-model="form.serviceTypeIds"
          :items="serviceTypes"
          item-title="name"
          item-value="id"
          label="Service Types"
          hint="Everything done on this visit. They share one odometer reading."
          persistent-hint
          multiple
          chips
          closable-chips
          density="comfortable"
          class="mb-2"
          :rules="[required]"
        />
        <v-autocomplete
          v-else
          v-model="form.serviceTypeId"
          :items="serviceTypes"
          item-title="name"
          item-value="id"
          label="Service Type"
          density="comfortable"
          :rules="[required]"
        />
        <v-text-field
          v-model="form.miles"
          label="Mileage"
          inputmode="numeric"
          suffix="mi"
          hint="The odometer reading at this visit."
          density="comfortable"
          :rules="[required, wholeMiles]"
        />
        <v-select
          v-model="form.maintenanceNeedId"
          :items="maintenanceNeeds"
          item-title="title"
          item-value="id"
          label="Maintenance Need"
          :clearable="!lockNeed"
          :disabled="lockNeed"
          density="comfortable"
        />
        <v-text-field v-model="form.servicedAt" label="Serviced At" type="date" density="comfortable" :rules="[required]" />
        <v-checkbox
          v-if="offerCompleteNeed && form.maintenanceNeedId"
          v-model="completeNeed"
          label="Mark the maintenance need completed"
          color="primary"
          density="compact"
          hide-details
          data-test="complete-need"
        />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="secondary" variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
        <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :loading="saving">{{ submitLabel }}</v-btn>
      </v-card-actions>
    </v-card>
    </v-form>
  </v-dialog>
</template>
