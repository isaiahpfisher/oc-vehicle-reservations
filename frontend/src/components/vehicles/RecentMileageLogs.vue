<script setup>
import { computed } from "vue";
import { formatDay, formatMiles } from "../../models/vehicles.js";
import { addedByName } from "../../models/mileageLogs.js";

/**
 * Feature 18, US-18.3: the vehicle page's latest odometer readings, as the Mileage tab of its "Work and history" card.
 * Each row shows the date on the left and the reading on the right with how far the vehicle went since the reading
 * before it, so usage reads at a glance.
 */
const props = defineProps({
  /** Every mileage log for the vehicle, newest first. */
  logs: { type: Array, default: () => [] },
  error: { type: String, default: "" },
  vehicleId: { type: [String, Number], required: true },
});
defineEmits(["add"]);

const SHOWN = 5;

const rows = computed(() =>
  props.logs.slice(0, SHOWN).map((log, index) => {
    const previous = props.logs[index + 1];
    return { ...log, change: previous ? log.odometerReading - previous.odometerReading : null };
  }),
);

const subtitle = computed(() => {
  const total = props.logs.length;
  if (!total) return "";
  return total > SHOWN ? `Latest ${SHOWN} of ${total} readings` : `${total} reading${total === 1 ? "" : "s"}`;
});

/** "+1,000 mi" since the reading before; a lower reading (a corrected odometer) shows as "−200 mi". */
const changeText = (change) => {
  if (change === null) return "First reading";
  if (change === 0) return "No change";
  return `${change > 0 ? "+" : "−"}${formatMiles(Math.abs(change))}`;
};
</script>

<template>
  <div data-test="recent-mileage-logs">
    <div class="recent-log-head">
      <span class="text-body-small text-medium-emphasis">{{ subtitle }}</span>
      <v-btn variant="text" color="primary" size="small" class="oc-cta" @click="$emit('add')">+ New Mileage Log</v-btn>
    </div>

    <v-alert v-if="error" type="error" density="compact">{{ error }}</v-alert>

    <v-list v-else-if="rows.length" density="compact" class="py-0 bg-transparent" aria-label="Latest odometer readings">
      <v-list-item
        v-for="log in rows"
        :key="log.id"
        :title="formatDay(log.recordedAt)"
        :subtitle="addedByName(log) ? `by ${addedByName(log)}` : ''"
        class="recent-log-row px-0"
      >
        <template #append>
          <div class="text-right">
            <div class="recent-log-row__figure font-weight-bold">{{ formatMiles(log.odometerReading) }}</div>
            <div class="recent-log-row__figure text-body-small text-medium-emphasis">{{ changeText(log.change) }}</div>
          </div>
        </template>
      </v-list-item>
    </v-list>

    <div v-else class="recent-log-empty">
      <div class="text-body-medium font-weight-medium">No mileage logged yet</div>
      <div class="text-body-small text-medium-emphasis">Readings keep the mileage estimate and service schedule accurate.</div>
    </div>

    <div class="recent-log-foot">
      <v-btn
        variant="text"
        color="primary"
        size="small"
        class="oc-cta"
        append-icon="mdi-arrow-right"
        :to="{ name: 'vehicle-mileage-logs', params: { vehicleId } }"
      >
        View all mileage logs
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
/* The count on the left, adding one on the right; "View all" closes the tab. */
.recent-log-head,
.recent-log-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 36px;
}

.recent-log-foot {
  justify-content: flex-end;
  margin-top: 4px;
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 4px;
}

.recent-log-row + .recent-log-row {
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.recent-log-row__figure {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.recent-log-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 0;
  text-align: center;
}
</style>
