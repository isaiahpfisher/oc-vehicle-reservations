<script setup>
import { ref, watch } from "vue";
import { validateServiceLogForm } from "../../models/serviceLogs.js";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  users: { type: Array, default: () => [] },
  serviceTypes: { type: Array, default: () => [] },
  save: { type: Function, required: true },
});

const blank = () => ({
  userId: null,
  serviceTypeId: null,
  miles: "",
  maintenanceNeedId: "",
  servicedAt: "",
});

const form = ref(blank());
const formError = ref("");
const saving = ref(false);

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  form.value = blank();
  formError.value = "";
});

const submit = async () => {
  if (saving.value) {
    return;
  }

  const result = validateServiceLogForm(form.value);
  formError.value = result.message || "";
  if (result.message) {
    return;
  }

  saving.value = true;

  try {
    await props.save(result.value);
    open.value = false;
  } catch (error) {
    formError.value = error.response?.data?.message || "Failed to save service log.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="560" :persistent="saving">
    <v-card v-if="open" rounded="lg">
      <v-card-title>New service log</v-card-title>
      <v-card-text>
        <v-select v-model="form.userId" :items="users" item-title="label" item-value="id" label="User" density="comfortable" />
        <v-select
          v-model="form.serviceTypeId"
          :items="serviceTypes"
          item-title="name"
          item-value="id"
          label="Service Type"
          density="comfortable"
        />
        <v-text-field v-model="form.miles" label="Mileage" type="number" step="1" density="comfortable" />
        <!-- INTERIM: a number until Feature 11 supplies maintenance needs. -->
        <v-text-field
          v-model="form.maintenanceNeedId"
          label="Maintenance Need"
          type="number"
          min="1"
          step="1"
          density="comfortable"
        />
        <v-text-field v-model="form.servicedAt" label="Serviced At" type="date" density="comfortable" />
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
