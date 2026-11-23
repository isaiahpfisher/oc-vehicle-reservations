<script setup>
import { computed, ref } from "vue";
import { needStatusLabel } from "../../models/maintenanceNeeds.js";
import SectionCard from "../layout/SectionCard.vue";
import RequestStatusChip from "../requests/RequestStatusChip.vue";
import VehicleStatusChip from "./VehicleStatusChip.vue";
import { formatTripDates } from "../../models/requests.js";
import {
  SERVICE_STATES,
  daysLeftText,
  dueLeftText,
  formatDay,
  formatMiles,
  isUrgentService,
  mileageDetail,
  milesLeftText,
  sortServices,
} from "../../models/vehicles.js";

/**
 * Feature 18, US-18.3: why a vehicle has its status. The chip, four at-a-glance tiles, then the details; the service
 * schedule shows only what needs attention until expanded, and long trip lists are cut to the first few.
 */
const props = defineProps({
  /** A vehicle from `GET /api/vehicles/:id` (with `condition` and `upcomingTrips`). */
  vehicle: { type: Object, required: true },
  /** Whether the signed-in user may open a trip's request page. */
  canOpenTrip: { type: Function, default: () => false },
});

const TRIPS_SHOWN = 3;
const showAllServices = ref(false);
const showAllTrips = ref(false);

const condition = computed(() => props.vehicle.condition);
const retired = computed(() => condition.value.status === "retired");

// FR-002: a plate is good through its expiration date.
const plateExpired = computed(() => condition.value.reasons.some(({ status }) => status === "plate_expired"));
// Within 30 days of running out: still good, but time to renew.
const plateExpiring = computed(() => condition.value.reasons.some(({ status }) => status === "plate_expiring"));
const plateDetail = computed(() => {
  const expires = props.vehicle.licensePlateExpirationDate;
  if (!expires) return "No expiration date";
  return `${plateExpired.value ? "Expired" : "Expires"} ${formatDay(expires)}`;
});
const services = computed(() => sortServices(condition.value.services));
const urgentCount = computed(() => services.value.filter(isUrgentService).length);
const nextService = computed(() => services.value.find(({ state }) => state !== "never_due") ?? null);
const trips = computed(() => props.vehicle.upcomingTrips ?? []);
const shownTrips = computed(() => (showAllTrips.value ? trips.value : trips.value.slice(0, TRIPS_SHOWN)));

const lastServiced = (service) => (service.lastServicedAt ? formatDay(service.lastServicedAt) : "Never");
const lastServicedDetail = (service) =>
  service.lastServicedAt ? formatMiles(service.lastServiceMiles) : "Counted from purchase";
const dueAt = (service) =>
  [service.dueDate && formatDay(service.dueDate), service.dueMiles !== null && formatMiles(service.dueMiles)].filter(Boolean).join(" · ");
</script>

<template>
  <SectionCard title="Status" data-test="vehicle-status">
    <template #append>
      <VehicleStatusChip :status="condition.status" size="default" />
    </template>

    <!-- At a glance -->
    <v-row density="comfortable" class="mb-2 mt-0">
      <v-col cols="12" sm="6" md="3">
        <div class="status-tile" data-test="estimated-mileage">
          <div class="status-tile__label">Estimated mileage</div>
          <div class="status-tile__value">{{ formatMiles(condition.mileage.miles) }}</div>
          <div class="status-tile__detail">{{ mileageDetail(condition.mileage) }}</div>
        </div>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <div class="status-tile" data-test="next-service">
          <div class="status-tile__label">Next service</div>
          <template v-if="nextService && !retired">
            <div class="status-tile__value text-truncate" :title="nextService.serviceType.name">{{ nextService.serviceType.name }}</div>
            <div class="status-tile__detail" :class="{ 'text-error': nextService.state === 'overdue' }">{{ dueLeftText(nextService) }}</div>
          </template>
          <template v-else>
            <div class="status-tile__value">—</div>
            <div class="status-tile__detail">{{ retired ? "Retired vehicles aren't scheduled" : "No service types yet" }}</div>
          </template>
        </div>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <div class="status-tile" data-test="trip-count">
          <div class="status-tile__label">Upcoming trips</div>
          <div class="status-tile__value">{{ trips.length }}</div>
          <div class="status-tile__detail text-truncate">
            {{ trips.length ? `Next: ${formatTripDates(trips[0])}` : "Nothing booked" }}
          </div>
        </div>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <div class="status-tile" data-test="license-plate">
          <div class="status-tile__label">License plate</div>
          <div class="status-tile__value text-truncate">{{ vehicle.licensePlate || "—" }}</div>
          <div class="status-tile__detail" :class="{ 'text-error': plateExpired, 'text-warning font-weight-medium': plateExpiring }">{{ plateDetail }}</div>
        </div>
      </v-col>
    </v-row>

    <!-- Out-of-service needs (only when there are some) -->
    <section v-if="condition.outOfServiceNeeds.length" class="status-section" data-test="out-of-service-needs">
      <h3 class="status-section__title">Out-of-service maintenance needs</h3>
      <v-list density="compact" class="py-0 bg-transparent">
        <v-list-item
          v-for="need in condition.outOfServiceNeeds"
          :key="need.id"
          :to="{ name: 'maintenanceNeedEdit', params: { id: need.id } }"
          prepend-icon="mdi-tools"
          class="px-0"
        >
          <v-list-item-title class="need-title">{{ need.title }}</v-list-item-title>
          <v-list-item-subtitle>{{ needStatusLabel(need.status) }} · {{ need.priority }} priority</v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </section>

    <!-- Service schedule: what needs attention, the rest on request -->
    <section v-if="!retired" class="status-section" data-test="service-schedule">
      <div class="d-flex align-center ga-2">
        <h3 class="status-section__title mr-auto">Service schedule</h3>
        <v-btn
          v-if="services.length > urgentCount"
          variant="text"
          color="primary"
          size="small"
          class="oc-cta"
          data-test="toggle-services"
          @click="showAllServices = !showAllServices"
        >
          {{ showAllServices ? "Show only what's due" : `Show all ${services.length}` }}
        </v-btn>
      </div>
      <p v-if="!services.length" class="text-body-medium text-medium-emphasis mb-0">No service types yet.</p>
      <p v-else-if="!urgentCount && !showAllServices" class="text-body-medium text-medium-emphasis mb-0">
        All {{ services.length }} services are up to date.
      </p>
      <v-table v-show="urgentCount || showAllServices" density="compact" class="bg-transparent service-table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Last serviced</th>
            <th>Next due</th>
            <th class="text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="service in services"
            v-show="showAllServices || isUrgentService(service)"
            :key="service.serviceType.id"
            :data-service="service.serviceType.name"
          >
            <td class="font-weight-medium">{{ service.serviceType.name }}</td>
            <td>
              <div>{{ lastServiced(service) }}</div>
              <div class="text-body-small text-medium-emphasis">{{ lastServicedDetail(service) }}</div>
            </td>
            <td>
              <template v-if="service.state === 'never_due'">
                <span class="text-medium-emphasis">No frequency set</span>
              </template>
              <template v-else>
                <div>{{ dueAt(service) }}</div>
                <div class="text-body-small" :class="service.state === 'overdue' ? 'text-error' : 'text-medium-emphasis'">
                  {{ [milesLeftText(service.milesLeft), daysLeftText(service.daysLeft)].filter(Boolean).join(" · ") }}
                </div>
              </template>
            </td>
            <td class="text-right">
              <v-chip :color="SERVICE_STATES[service.state].color" size="small" variant="tonal" label>
                {{ SERVICE_STATES[service.state].label }}
              </v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>
    </section>

    <!-- Upcoming trips (only when there are some), the first few -->
    <section v-if="trips.length" class="status-section" data-test="upcoming-trips">
      <h3 class="status-section__title">Upcoming trips</h3>
      <v-list density="compact" class="py-0 bg-transparent">
        <v-list-item
          v-for="trip in shownTrips"
          :key="trip.id"
          :to="canOpenTrip(trip) ? { name: 'request', params: { requestId: trip.id } } : undefined"
          class="px-0"
        >
          <v-list-item-title class="text-truncate" :title="trip.purpose">{{ trip.purpose }}</v-list-item-title>
          <v-list-item-subtitle>{{ formatTripDates(trip) }} · {{ trip.area?.name }}</v-list-item-subtitle>
          <template #append><RequestStatusChip :status="trip.status" /></template>
        </v-list-item>
      </v-list>
      <v-btn
        v-if="trips.length > TRIPS_SHOWN"
        variant="text"
        color="primary"
        size="small"
        class="oc-cta mt-1"
        data-test="toggle-trips"
        @click="showAllTrips = !showAllTrips"
      >
        {{ showAllTrips ? "Show fewer" : `Show ${trips.length - TRIPS_SHOWN} more` }}
      </v-btn>
    </section>
  </SectionCard>
</template>

<style scoped>
.status-tile {
  height: 100%;
  padding: 12px 16px;
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}

.status-tile__label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.status-tile__value {
  margin-top: 2px;
  font-size: 1.25rem;
  font-weight: 700;
}

.status-tile__detail {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.status-tile__detail.text-error {
  color: rgb(var(--v-theme-error));
}

.status-section {
  padding-top: 16px;
  margin-top: 16px;
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.status-section__title {
  margin: 0 0 4px;
  font-size: 0.875rem;
  font-weight: 700;
}

.need-title {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.service-table :deep(th) {
  white-space: nowrap;
}
</style>
