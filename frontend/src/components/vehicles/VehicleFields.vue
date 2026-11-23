<script setup>
/**
 * The vehicle's editable fields, in their sections: on the New Vehicle page, and in the "Edit details" dialog on a
 * vehicle's page (so the page itself reads as a dashboard, not a form in the middle of everything).
 */
import FormSection from "../layout/FormSection.vue";

const form = defineModel({ type: Object, required: true });

defineProps({
  /** Field name → message, from the page's checks. */
  fieldErrors: { type: Object, default: () => ({}) },
  areaItems: { type: Array, default: () => [] },
  typeItems: { type: Array, default: () => [] },
  identifierLabel: { type: String, default: "VIN" },
  /** New vehicles only: the starting odometer (UI/UX backlog #19). */
  showOdometer: Boolean,
});

// Stored lowercase; shown capitalized.
const statusItems = [
  { title: "Active", value: "active" },
  { title: "Retired", value: "retired" },
];

/** Four digits at most, no "e" or signs. */
const setYear = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length <= 4) {
    form.value.year = digits;
    return;
  }

  const previous = String(form.value.year ?? "");
  form.value.year = previous.length === 4 ? previous : digits.slice(0, 4);
};

const onYearKeydown = (event) => {
  if (["e", "E", "+", "-", "."].includes(event.key)) {
    event.preventDefault();
    return;
  }

  if (event.key.length !== 1 || !/\d/.test(event.key)) {
    return;
  }

  const input = event.target;
  const selected = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
  if (String(form.value.year ?? "").length - selected >= 4) {
    event.preventDefault();
  }
};
</script>

<template>
  <FormSection title="Assignment" subtitle="The area that manages it, and whether it's still in the fleet. Retired vehicles can't be assigned to trips.">
    <v-row density="comfortable">
      <v-col cols="12" sm="6">
        <v-select v-model="form.areaId" :items="areaItems" item-title="title" item-value="value" label="Area" hide-details="auto" :error-messages="fieldErrors.areaId" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select v-model="form.status" :items="statusItems" label="Status" hide-details="auto" :error-messages="fieldErrors.status" />
      </v-col>
    </v-row>
  </FormSection>

  <FormSection title="Identity" subtitle="How the university and the manufacturer identify it. Service schedules count from the purchase date until a service is logged.">
    <v-row density="comfortable">
      <v-col cols="12" sm="6">
        <v-select
          v-model="form.vehicleTypeId"
          :items="typeItems"
          item-title="title"
          item-value="value"
          label="Vehicle Type"
          hide-details="auto"
          :error-messages="fieldErrors.vehicleTypeId"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.universityId" label="University Id" hide-details="auto" :error-messages="fieldErrors.universityId" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.identifier" :label="identifierLabel" hide-details="auto" :error-messages="fieldErrors.identifier" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.purchasedAt" label="Purchase Date" type="date" hide-details="auto" :error-messages="fieldErrors.purchasedAt" />
      </v-col>
    </v-row>
  </FormSection>

  <FormSection title="Description" subtitle="What it is and how many people it carries.">
    <v-row density="comfortable">
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.make" label="Make" hide-details="auto" :error-messages="fieldErrors.make" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.model" label="Model" hide-details="auto" :error-messages="fieldErrors.model" />
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field
          :model-value="form.year"
          label="Year"
          type="number"
          step="1"
          max="9999"
          hide-details="auto"
          :error-messages="fieldErrors.year"
          @update:model-value="setYear"
          @keydown="onYearKeydown"
        />
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field v-model="form.color" label="Color" hide-details="auto" :error-messages="fieldErrors.color" />
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field v-model="form.passengerCapacity" label="Passenger Capacity" hide-details="auto" :error-messages="fieldErrors.passengerCapacity" />
      </v-col>
    </v-row>
  </FormSection>

  <FormSection title="Registration" subtitle="Vehicles whose plate expires before a trip ends are flagged when they're assigned.">
    <v-row density="comfortable">
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.licensePlate" label="License Plate" hide-details="auto" :error-messages="fieldErrors.licensePlate" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="form.licensePlateExpirationDate"
          label="License Plate Expiration Date"
          type="date"
          hide-details="auto"
          :error-messages="fieldErrors.licensePlateExpirationDate"
        />
      </v-col>
    </v-row>
  </FormSection>

  <!-- UI/UX backlog #19 -->
  <FormSection
    v-if="showOdometer"
    title="Mileage"
    subtitle="Optional. Today's odometer reading becomes the first mileage log, so the mileage estimate and service schedule start from it."
  >
    <v-row density="comfortable">
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="form.odometerReading"
          label="Current odometer"
          inputmode="numeric"
          suffix="mi"
          hide-details="auto"
          :error-messages="fieldErrors.odometerReading"
          data-test="starting-odometer"
        />
      </v-col>
    </v-row>
  </FormSection>
</template>

