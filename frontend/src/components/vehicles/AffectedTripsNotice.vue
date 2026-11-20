<script setup>
import { computed, ref, watch } from "vue";
import RequestStatusChip from "../requests/RequestStatusChip.vue";
import { formatTripDates } from "../../models/requests.js";

/**
 * Feature 18, US-18.11: the trips a vehicle is booked for, shown when it's about to be taken out of service.
 * A quiet card with a warning edge rather than a solid alert, so the trip rows stay readable; long lists show the first few.
 */
const props = defineProps({
  trips: { type: Array, default: () => [] },
  /** Whether the signed-in user may open a trip's request page; others see the purpose as text. */
  canOpenTrip: { type: Function, default: () => false },
});

const SHOWN = 3;
const showAll = ref(false);
watch(() => props.trips, () => (showAll.value = false));

const shown = computed(() => (showAll.value ? props.trips : props.trips.slice(0, SHOWN)));
const count = computed(() => props.trips.length);
</script>

<template>
  <section class="affected-trips" role="status" data-test="affected-trips">
    <div class="d-flex align-start ga-3">
      <v-icon icon="mdi-alert-outline" color="warning" size="22" class="mt-1" />
      <div class="flex-grow-1 min-width-0">
        <div class="text-title-small font-weight-bold">
          Booked for {{ count }} upcoming trip{{ count === 1 ? "" : "s" }}
        </div>
        <div class="text-body-medium text-medium-emphasis">
          Taking this vehicle out of service affects {{ count === 1 ? "this trip" : "these trips" }}. Let the area admins who
          manage {{ count === 1 ? "it" : "them" }} know so they can assign another vehicle.
        </div>

        <ul class="affected-trips__list mt-3">
          <li v-for="trip in shown" :key="trip.id" class="affected-trips__trip">
            <div class="min-width-0">
              <!-- A new tab, so following the link doesn't lose the unsaved maintenance need. -->
              <router-link
                v-if="canOpenTrip(trip)"
                :to="{ name: 'request', params: { requestId: trip.id } }"
                target="_blank"
                class="trip-link d-inline-flex align-center ga-1 font-weight-medium text-truncate"
                :title="`Open ${trip.purpose} in a new tab`"
                data-test="affected-trip-link"
              >
                <span class="text-truncate">{{ trip.purpose }}</span>
                <v-icon icon="mdi-open-in-new" size="14" />
              </router-link>
              <div v-else class="font-weight-medium text-truncate" :title="trip.purpose">{{ trip.purpose }}</div>
              <div class="text-body-small text-medium-emphasis">{{ formatTripDates(trip) }} · {{ trip.area?.name }}</div>
            </div>
            <RequestStatusChip :status="trip.status" />
          </li>
        </ul>

        <v-btn
          v-if="count > SHOWN"
          variant="text"
          color="primary"
          size="small"
          class="oc-cta mt-1 px-0"
          @click="showAll = !showAll"
        >
          {{ showAll ? "Show fewer" : `Show ${count - SHOWN} more` }}
        </v-btn>
      </div>
    </div>
  </section>
</template>

<style scoped>
.affected-trips {
  margin-bottom: 16px;
  padding: 12px 16px;
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-left: 4px solid rgb(var(--v-theme-warning));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}

.affected-trips__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.affected-trips__trip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
}

.affected-trips__trip + .affected-trips__trip {
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.min-width-0 {
  min-width: 0;
}

.trip-link {
  max-width: 100%;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.trip-link:hover {
  text-decoration: underline;
}
</style>
