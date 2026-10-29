<script setup>
import { computed } from "vue";
import { formatTripDates } from "../../models/requests.js";

/** `{ purpose, areaId, numberOfPeople, allDay, startDate, startTime, endDate, endTime }` */
const trip = defineModel({ type: Object, required: true });

const props = defineProps({
  areas: { type: Array, default: () => [] },
  /** Read-only: show the saved request as text instead of inputs. */
  readonly: Boolean,
  request: { type: Object, default: null },
});

const required = [(value) => (value !== null && value !== undefined && String(value).trim() !== "") || "Required field."];
const peopleRules = [...required, (value) => /^\d+$/.test(String(value)) || "Enter a whole number, 0 or more."];
const endRules = computed(() => [
  ...required,
  () => {
    const { allDay, startDate, startTime, endDate, endTime } = trip.value;
    const start = allDay ? startDate : `${startDate}T${startTime}`;
    const end = allDay ? endDate : `${endDate}T${endTime}`;
    return !startDate || end >= start || "End can't be before the start.";
  },
]);

const areaName = computed(() => props.request?.area?.name ?? props.areas.find(({ id }) => id === trip.value.areaId)?.name);
</script>

<template>
  <dl v-if="readonly" class="facts">
    <dt>Area</dt>
    <dd>{{ areaName }}</dd>
    <dt>People</dt>
    <dd>{{ request.numberOfPeople }}</dd>
    <dt>When</dt>
    <dd data-test="trip-dates">{{ formatTripDates(request) }}</dd>
  </dl>

  <div v-else class="d-flex flex-column ga-4">
    <v-textarea
      v-model="trip.purpose"
      label="Purpose"
      rows="2"
      auto-grow
      :rules="required"
      data-test="purpose"
    />
    <v-select
      v-model="trip.areaId"
      :items="areas"
      item-title="name"
      item-value="id"
      label="Area"
      :rules="required"
      data-test="area"
    />
    <v-text-field
      v-model="trip.numberOfPeople"
      type="number"
      min="0"
      label="Number of people"
      :rules="peopleRules"
      data-test="people"
    />

    <div class="d-flex align-center justify-space-between">
      <div class="text-title-small font-weight-bold">When</div>
      <v-switch
        v-model="trip.allDay"
        label="All day"
        color="primary"
        density="compact"
        inset
        hide-details
        class="flex-grow-0"
      />
    </div>
    <div class="d-flex ga-3">
      <v-text-field v-model="trip.startDate" type="date" label="Start date" :rules="required" data-test="start-date" />
      <v-text-field
        v-if="!trip.allDay"
        v-model="trip.startTime"
        type="time"
        label="Start time"
        :rules="required"
        class="time-field"
      />
    </div>
    <div class="d-flex ga-3">
      <v-text-field v-model="trip.endDate" type="date" label="End date" :rules="endRules" data-test="end-date" />
      <v-text-field
        v-if="!trip.allDay"
        v-model="trip.endTime"
        type="time"
        label="End time"
        :rules="endRules"
        class="time-field"
      />
    </div>
  </div>
</template>

<style scoped>
.time-field {
  flex: 0 0 130px;
}

.facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 24px;
  margin: 0;
}

.facts dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.facts dd {
  margin: 0;
}
</style>
