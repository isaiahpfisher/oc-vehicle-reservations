<script setup>
import { computed } from "vue";
import { groupProblems } from "../../models/vehicles.js";

/**
 * Feature 18: a vehicle's or driver's problems for a trip, one line per kind (see `groupProblems`), so a vehicle with
 * many services due still takes a line or two. Blocking problems are red, warnings orange. Hover a line for every
 * original message.
 */
const props = defineProps({
  problems: { type: Array, default: () => [] },
  /** The vehicle is already on the request: blocking problems read "Assigned, but now unavailable". */
  assigned: Boolean,
  /** Use the surrounding text color (e.g. inside an alert) instead of red/orange per line. */
  plain: Boolean,
});

const lines = computed(() => groupProblems(props.problems));
const colorOf = (line) => (props.plain ? "" : line.blocking ? "text-error" : "text-warning");
const textOf = (line) => (line.blocking && props.assigned ? `Assigned, but now unavailable: ${line.text}` : line.text);
</script>

<template>
  <ul class="problem-list">
    <li
      v-for="line in lines"
      :key="line.key"
      class="problem-list__line"
      :class="colorOf(line)"
      :title="line.detail !== line.text ? line.detail : undefined"
      data-test="problem-line"
    >
      <v-icon :icon="line.blocking ? 'mdi-cancel' : 'mdi-alert-outline'" size="16" class="problem-list__icon" />
      <span>{{ textOf(line) }}</span>
    </li>
  </ul>
</template>

<style scoped>
.problem-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.problem-list__line {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.4;
}

.problem-list__line + .problem-list__line {
  margin-top: 2px;
}

.problem-list__icon {
  flex-shrink: 0;
  margin-top: 1px;
}
</style>
