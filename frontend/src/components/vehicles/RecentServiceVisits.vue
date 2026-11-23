<script setup>
import { computed } from "vue";
import { formatDay, formatMiles } from "../../models/vehicles.js";
import { mileageReading, serviceTypeName, userName } from "../../models/serviceLogs.js";

/**
 * Feature 18, US-18.3: the vehicle page's latest service visits, as the Service visits tab of its "Work and history"
 * card. Logs from the same day and odometer reading are one
 * visit, so a visit that logged 14 services is one row. Each row shows the date and who did it on the left, the
 * odometer on the right, and the services as chips (two, then "+N" with the rest in a tooltip).
 */
const props = defineProps({
  /** Every service log for the vehicle, newest first. */
  logs: { type: Array, default: () => [] },
  error: { type: String, default: "" },
  vehicleId: { type: [String, Number], required: true },
});
defineEmits(["add"]);

const SHOWN = 5;
const CHIPS = 2;

const visits = computed(() => {
  const byVisit = new Map();
  props.logs.forEach((log) => {
    const key = `${log.servicedAt}|${mileageReading(log)}`;
    const visit = byVisit.get(key) ?? { key, servicedAt: log.servicedAt, miles: mileageReading(log), names: [], people: new Set() };
    visit.names.push(serviceTypeName(log));
    if (userName(log)) visit.people.add(userName(log));
    byVisit.set(key, visit);
  });
  return [...byVisit.values()];
});

const rows = computed(() =>
  visits.value.slice(0, SHOWN).map((visit) => {
    // Alphabetical, so a visit's chips read the same way every time.
    const names = [...visit.names].sort((a, b) => a.localeCompare(b));
    return {
      ...visit,
      shownNames: names.slice(0, CHIPS),
      hiddenNames: names.slice(CHIPS),
      by: visit.people.size ? `by ${[...visit.people].join(", ")}` : "",
    };
  }),
);

const subtitle = computed(() => {
  const total = visits.value.length;
  if (!total) return "";
  return total > SHOWN ? `Latest ${SHOWN} of ${total} visits` : `${total} visit${total === 1 ? "" : "s"}`;
});
</script>

<template>
  <div data-test="recent-service-logs">
    <div class="recent-log-head">
      <span class="text-body-small text-medium-emphasis">{{ subtitle }}</span>
      <v-btn variant="text" color="primary" size="small" class="oc-cta" @click="$emit('add')">+ New Service Log</v-btn>
    </div>

    <v-alert v-if="error" type="error" density="compact">{{ error }}</v-alert>

    <v-list v-else-if="rows.length" density="compact" class="py-0 bg-transparent" aria-label="Latest service visits">
      <v-list-item v-for="visit in rows" :key="visit.key" :title="formatDay(visit.servicedAt)" :subtitle="visit.by" class="recent-log-row px-0">
        <div class="d-flex flex-wrap ga-1 mt-1">
          <v-chip v-for="name in visit.shownNames" :key="name" size="small" variant="tonal" label>{{ name }}</v-chip>
          <v-tooltip v-if="visit.hiddenNames.length" location="top">
            <template #activator="{ props: tooltipProps }">
              <v-chip
                v-bind="tooltipProps"
                size="small"
                variant="outlined"
                label
                tabindex="0"
                :aria-label="`${visit.hiddenNames.length} more services: ${visit.hiddenNames.join(', ')}`"
              >
                +{{ visit.hiddenNames.length }}
              </v-chip>
            </template>
            <div v-for="name in visit.hiddenNames" :key="name">{{ name }}</div>
          </v-tooltip>
        </div>

        <template #append>
          <div v-if="visit.miles !== ''" class="recent-log-row__figure text-body-medium text-medium-emphasis">
            {{ formatMiles(visit.miles) }}
          </div>
        </template>
      </v-list-item>
    </v-list>

    <div v-else class="recent-log-empty">
      <div class="text-body-medium font-weight-medium">No services logged yet</div>
      <div class="text-body-small text-medium-emphasis">Until one is, each service is counted as due from the purchase date.</div>
    </div>

    <div class="recent-log-foot">
      <v-btn
        variant="text"
        color="primary"
        size="small"
        class="oc-cta"
        append-icon="mdi-arrow-right"
        :to="{ name: 'service-logs', params: { vehicleId } }"
      >
        View all service logs
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

.recent-log-row :deep(.v-list-item__append) {
  align-self: flex-start;
  padding-top: 2px;
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
