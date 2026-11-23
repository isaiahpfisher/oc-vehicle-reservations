<script setup>
/**
 * A maintenance need's editable fields, in their sections: on the New Maintenance Need page, and in the "Edit details"
 * dialog on a need's page (the same pattern as vehicles).
 */
import { NEED_STATUS_OPTIONS } from "../../models/maintenanceNeeds.js";
import { formatDay } from "../../models/vehicles.js";
import FormSection from "../layout/FormSection.vue";
import AffectedTripsNotice from "../vehicles/AffectedTripsNotice.vue";
import VehicleStatusChip from "../vehicles/VehicleStatusChip.vue";

const form = defineModel({ type: Object, required: true });

defineProps({
  vehicleItems: { type: Array, default: () => [] },
  assigneeItems: { type: Array, default: () => [] },
  /** Vehicle id → its status, for the chips in the vehicle list. */
  vehicleStatus: { type: Function, default: () => null },
  /** Trips the chosen vehicle is booked for; shown when the need would take it out of service. */
  affectedTrips: { type: Array, default: () => [] },
  canOpenTrip: { type: Function, default: () => false },
});

const required = (value) => (value !== null && value !== undefined && String(value).trim() !== "") || "Required field.";
const priorities = ["High", "Medium", "Low", "None"];
const outOfServiceItems = [
  { title: "Yes", value: true },
  { title: "No", value: false },
];

const limitTitle = (value) => {
  form.value.title = String(value ?? "").slice(0, 50);
};

const isClosed = (status) => status === "Completed" || status === "Canceled";
</script>

<template>
  <FormSection title="What needs doing" subtitle="A short title for the list, and the details for whoever does the work.">
    <div class="d-flex flex-column ga-4">
      <v-text-field
        :model-value="form.title"
        label="Title"
        maxlength="50"
        hide-details="auto"
        :rules="[required]"
        @update:model-value="limitTitle"
      />
      <v-textarea v-model="form.description" label="Description" rows="4" no-resize hide-details="auto" />
    </div>
  </FormSection>

  <FormSection title="Vehicle" subtitle="Out-of-service vehicles can't be assigned to trips until the need is closed.">
    <div class="d-flex flex-column ga-4">
      <v-select
        v-model="form.vehicleId"
        :items="vehicleItems"
        item-title="title"
        item-value="value"
        label="Vehicle"
        hide-details="auto"
        :rules="[required]"
      >
        <template #item="{ props: itemProps, item }">
          <v-list-item v-bind="itemProps" data-test="vehicle-choice">
            <template v-if="vehicleStatus(item.value)" #append><VehicleStatusChip :status="vehicleStatus(item.value)" /></template>
          </v-list-item>
        </template>
      </v-select>
      <v-select
        v-model="form.outOfService"
        :items="outOfServiceItems"
        item-title="title"
        item-value="value"
        label="Out of Service"
        hide-details="auto"
      />
      <AffectedTripsNotice v-if="affectedTrips.length" :trips="affectedTrips" :can-open-trip="canOpenTrip" />
    </div>
  </FormSection>

  <FormSection title="Planning" subtitle="Who's on it, how urgent it is, and where it stands.">
    <v-row density="comfortable">
      <v-col cols="12" sm="6">
        <v-select
          v-model="form.assigneeId"
          :items="assigneeItems"
          item-title="title"
          item-value="value"
          label="Assignee"
          clearable
          hide-details="auto"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select v-model="form.priority" :items="priorities" label="Priority" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select v-model="form.status" :items="NEED_STATUS_OPTIONS" label="Status" hide-details="auto" />
      </v-col>
      <!-- UI/UX backlog #62: the date is set for you when the need closes, not typed in. -->
      <v-col v-if="isClosed(form.status)" cols="12" sm="6" class="d-flex align-center">
        <span class="text-body-medium text-medium-emphasis" data-test="resolved-on">
          {{ form.status === "Canceled" ? "Cancelled" : "Resolved" }} {{ formatDay(String(form.resolvedAt ?? "").slice(0, 10)) }}
        </span>
      </v-col>
    </v-row>
  </FormSection>
</template>
