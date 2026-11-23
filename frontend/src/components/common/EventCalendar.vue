<script setup>
/**
 * A week or month calendar of dated things (service visits, due dates, trips), laid out like the request lists'
 * calendar: a title with Today and previous / next, an optional color key, then Vuetify's `v-calendar`.
 *
 * `events` are `v-calendar` events (`{ name, start, end?, timed?, color }`, `start` a `YYYY-MM-DD` day for all-day
 * ones) plus anything else the page needs back; clicking one emits `open` with it.
 */
import { computed, ref } from "vue";
import { calendarTitle, toDateInput } from "../../models/requests.js";

const props = defineProps({
  view: { type: String, default: "month" },
  events: { type: Array, default: () => [] },
  /** `[{ label, color }]` for the key under the title. */
  legend: { type: Array, default: () => [] },
  /** The day to start on (`YYYY-MM-DD`); today by default. */
  start: { type: String, default: "" },
});
const emit = defineEmits(["open"]);

const focus = ref(props.start || toDateInput(new Date()));
const title = computed(() => calendarTitle(focus.value, props.view));

const move = (direction) => {
  const date = new Date(`${focus.value}T00:00:00`);
  if (props.view === "month") date.setMonth(date.getMonth() + direction, 1);
  else date.setDate(date.getDate() + 7 * direction);
  focus.value = toDateInput(date);
};
</script>

<template>
  <v-card border flat class="event-calendar" data-test="event-calendar">
    <div class="d-flex align-center ga-1 px-4 py-3">
      <h2 class="text-title-large font-weight-bold my-0 mr-auto" data-test="calendar-title">{{ title }}</h2>
      <v-btn variant="outlined" color="secondary" size="small" class="oc-cta mr-2" @click="focus = toDateInput(new Date())">Today</v-btn>
      <v-btn
        icon="mdi-chevron-left"
        variant="text"
        density="comfortable"
        :aria-label="view === 'month' ? 'Previous month' : 'Previous week'"
        data-test="calendar-previous"
        @click="move(-1)"
      />
      <v-btn
        icon="mdi-chevron-right"
        variant="text"
        density="comfortable"
        :aria-label="view === 'month' ? 'Next month' : 'Next week'"
        data-test="calendar-next"
        @click="move(1)"
      />
    </div>
    <ul v-if="legend.length" class="event-calendar__legend d-flex flex-wrap ga-4 px-4 pb-3 text-body-small" aria-label="Key">
      <li v-for="item in legend" :key="item.label" class="d-flex align-center ga-2">
        <span class="event-calendar__swatch" :class="`bg-${item.color}`" />
        {{ item.label }}
      </li>
    </ul>
    <div v-if="$slots.note" class="px-4 pb-3 text-body-small text-medium-emphasis"><slot name="note" /></div>
    <v-divider />
    <v-calendar
      v-model="focus"
      :type="view"
      :first-interval="6"
      :interval-count="16"
      :events
      color="primary"
      :day-format="(day) => String(day.day)"
      :show-month-on-first="false"
      event-overlap-mode="stack"
      class="event-calendar__grid"
      @click:event="(_event, { event }) => emit('open', event)"
    />
  </v-card>
</template>

<style scoped>
.event-calendar__grid {
  min-height: 600px;
}


.event-calendar__legend {
  list-style: none;
  margin: 0;
}

.event-calendar__swatch {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.event-calendar__grid :deep(.v-event) {
  cursor: pointer;
}
</style>
