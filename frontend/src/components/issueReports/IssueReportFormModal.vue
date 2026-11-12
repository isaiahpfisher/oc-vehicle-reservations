<script setup>
import { ref, watch } from "vue";
import { ISSUE_STATUSES, ISSUE_TYPES, validateIssueReportForm } from "../../models/issueReports.js";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  report: { type: Object, default: null },
  vehicles: { type: Array, default: () => [] },
  vehicleRequests: { type: Array, default: () => [] },
  users: { type: Array, default: () => [] },
  save: { type: Function, required: true },
});

const blank = () => ({
  vehicleId: null,
  vehicleRequestId: null,
  type: null,
  description: "",
  status: "pending",
  assigneeId: null,
  resolvedAt: "",
});

const form = ref(blank());
const formError = ref("");
const saving = ref(false);

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  form.value = props.report
    ? {
        vehicleId: props.report.vehicleId,
        vehicleRequestId: props.report.vehicleRequestId,
        type: props.report.type,
        description: props.report.description,
        status: props.report.status,
        assigneeId: props.report.assigneeId,
        resolvedAt: props.report.resolvedAt ?? "",
      }
    : blank();
  formError.value = "";
});

const submit = async () => {
  if (saving.value) {
    return;
  }

  const result = validateIssueReportForm(form.value);
  formError.value = result.message || "";
  if (result.message) {
    return;
  }

  saving.value = true;

  try {
    await props.save(result.value);
    open.value = false;
  } catch (error) {
    formError.value = error.response?.data?.message || "Failed to save issue report.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="560" :persistent="saving">
    <v-card v-if="open" rounded="lg">
      <v-card-title>{{ report ? "Edit issue report" : "New issue report" }}</v-card-title>
      <v-card-text>
        <v-select
          v-model="form.vehicleId"
          :items="vehicles"
          item-title="universityId"
          item-value="id"
          label="Vehicle"
          density="comfortable"
        />
        <v-select
          v-model="form.vehicleRequestId"
          :items="vehicleRequests"
          item-title="label"
          item-value="id"
          label="Vehicle request"
          density="comfortable"
          clearable
        />
        <v-select v-model="form.type" :items="ISSUE_TYPES" label="Type" density="comfortable" />
        <v-textarea v-model="form.description" label="Description" density="comfortable" rows="3" />
        <v-select v-model="form.status" :items="ISSUE_STATUSES" label="Status" density="comfortable" />
        <v-select
          v-model="form.assigneeId"
          :items="users"
          item-title="label"
          item-value="id"
          label="Assignee"
          density="comfortable"
          clearable
        />
        <v-text-field
          v-if="form.status === 'resolved'"
          v-model="form.resolvedAt"
          label="Resolved date"
          type="date"
          density="comfortable"
        />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="secondary" variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="submit">
          {{ report ? "Save" : "Create" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
