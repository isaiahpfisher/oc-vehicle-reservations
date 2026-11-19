<script setup>
/**
 * Feature 14 (US-14.6): the one issue report form, used to create, edit, and view a report.
 * - `create`: anyone. Status and assignee only show with `canTriage` (admins and area admins); requesters never see them.
 * - `edit`: admins and area admins of the report's area. Every field is editable.
 * - `view`: everyone else who can read the report. The same sections, as text.
 * Lives inside the page's `v-form`, so the page's `validate()` checks these fields.
 */
import { computed } from "vue";
import IssueTypePicker from "./IssueTypePicker.vue";
import {
  ISSUE_STATUSES,
  assigneeRoles,
  closedOnLabel,
  closesOnDate,
  ISSUE_TYPE_DETAILS,
  personName,
  statusDetails,
  statusLabel,
  todayInput,
  typeLabel,
  vehicleOptionLabel,
  withTrip,
} from "../../models/issueReports.js";
import { formatTripDates } from "../../models/requests.js";
import SectionCard from "../layout/SectionCard.vue";

const form = defineModel({ type: Object, required: true });

const props = defineProps({
  mode: { type: String, required: true, validator: (value) => ["create", "edit", "view"].includes(value) },
  /** Show status, resolved date, and assignee as inputs (admins and area admins). */
  canTriage: Boolean,
  /** The saved report (edit and view): names and labels for its current values. */
  report: { type: Object, default: null },
  vehicles: { type: Array, default: () => [] },
  trips: { type: Array, default: () => [] },
  assignees: { type: Array, default: () => [] },
  assigneesLoading: Boolean,
  /** Why the assignee was just cleared, if it was. */
  assigneeNotice: { type: String, default: "" },
  /** The assignee list failed to load. */
  assigneesError: { type: String, default: "" },
});

/** Every option is searchable by all of its text, not just its label. */
const SEARCH_KEYS = ["raw.search"];

const editing = computed(() => props.mode !== "view");
const showTracking = computed(() => props.mode === "view" || props.canTriage);

const rules = {
  vehicle: [(value) => !!value || "Choose the vehicle."],
  type: [(value) => !!value || "Choose the kind of problem."],
  description: [(value) => !!String(value ?? "").trim() || "Describe the problem."],
  resolvedAt: [(value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) || "Enter the date it was closed."],
};

// Saved values stay selectable even when the lists don't include them (e.g. an area admin can't list every user).
const withCurrent = (items, current) => (current && !items.some(({ id }) => id === current.id) ? [current, ...items] : items);

const selectedTrip = computed(() => props.trips.find(({ id }) => id === form.value.vehicleRequestId) ?? null);

const tripDates = (trip) => (trip.startAt ? formatTripDates(trip) : "");
const tripItems = computed(() =>
  withCurrent(props.trips, props.report?.vehicleRequest).map((trip) => ({
    ...trip,
    search: [trip.purpose, tripDates(trip), trip.area?.name, ...(trip.vehicles ?? []).map(({ universityId }) => universityId)].join(" "),
  })),
);
const tripProps = (trip) => ({ subtitle: [tripDates(trip), trip.area?.name].filter(Boolean).join(" · ") });

/** A trip with vehicles narrows the choice to them; otherwise every vehicle the user can pick. */
const vehicleItems = computed(() => {
  const base = selectedTrip.value?.vehicles?.length ? selectedTrip.value.vehicles : props.vehicles;
  const current = props.report?.vehicle ?? props.vehicles.find(({ id }) => id === form.value.vehicleId);
  const items = current && current.id === form.value.vehicleId ? withCurrent(base, current) : base;
  return items.map((vehicle) => ({
    ...vehicle,
    label: vehicleOptionLabel(vehicle),
    search: [vehicleOptionLabel(vehicle), vehicle.color, vehicle.licensePlate].filter(Boolean).join(" "),
  }));
});

const assigneeItems = computed(() =>
  withCurrent(props.assignees, props.report?.assignee).map((person) => ({
    ...person,
    label: personName(person),
    search: `${personName(person)} ${assigneeRoles(person)}`,
  })),
);
const assigneeProps = (person) => ({ subtitle: assigneeRoles(person) });

const vehicleNoData = computed(() =>
  props.vehicles.length ? "No matching vehicles." : "No vehicles yet. Pick a trip that has a vehicle assigned.",
);

const chooseTrip = (tripId) => {
  form.value = withTrip({ ...form.value, vehicleRequestId: tripId ?? null }, props.trips.find(({ id }) => id === tripId));
};

const chooseStatus = (status) => {
  if (!status) return;
  // Closing (Resolved or Moved to maintenance) defaults the date to today; the other statuses don't keep one.
  const resolvedAt = closesOnDate(status) ? form.value.resolvedAt || todayInput() : "";
  form.value = { ...form.value, status, resolvedAt };
};

const formatDay = (value) =>
  new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const savedTrip = computed(() => props.trips.find(({ id }) => id === props.report?.vehicleRequestId) ?? props.report?.vehicleRequest);
</script>

<template>
  <div class="d-flex flex-column ga-6">
    <!-- 1. Which vehicle -->
    <SectionCard
      title="Vehicle"
      :subtitle="editing ? 'Which vehicle has the problem? Picking the trip fills in its vehicle.' : ''"
      data-test="section-vehicle"
    >
      <div v-if="editing" class="d-flex flex-column ga-4">
        <v-alert
          v-if="mode === 'create' && !vehicles.length && !trips.length"
          type="info"
          variant="tonal"
          density="compact"
          data-test="no-trips"
        >
          You can report problems with vehicles from your trips. None of your trips has a vehicle yet.
        </v-alert>
        <v-autocomplete
          :model-value="form.vehicleRequestId"
          :items="tripItems"
          item-title="purpose"
          item-value="id"
          :item-props="tripProps"
          :filter-keys="SEARCH_KEYS"
          auto-select-first
          label="Trip (optional)"
          placeholder="Search by purpose, date, or area"
          prepend-inner-icon="mdi-map-marker-path"
          no-data-text="No trips found."
          clearable
          hide-details="auto"
          data-test="trip"
          @update:model-value="chooseTrip"
        />
        <v-autocomplete
          v-model="form.vehicleId"
          :items="vehicleItems"
          item-title="label"
          item-value="id"
          :filter-keys="SEARCH_KEYS"
          auto-select-first
          label="Vehicle"
          placeholder="Search by number, make, or model"
          prepend-inner-icon="mdi-van-passenger"
          :rules="rules.vehicle"
          :no-data-text="vehicleNoData"
          hide-details="auto"
          data-test="vehicle"
        />
      </div>

      <dl v-else class="facts">
        <dt>Vehicle</dt>
        <dd data-test="view-vehicle">{{ vehicleOptionLabel(vehicles.find(({ id }) => id === report.vehicleId) ?? report.vehicle) }}</dd>
        <dt>Trip</dt>
        <dd data-test="view-trip">
          <template v-if="savedTrip">
            {{ savedTrip.purpose }}
            <span v-if="savedTrip.startAt" class="text-medium-emphasis"> · {{ formatTripDates(savedTrip) }}</span>
          </template>
          <span v-else class="text-medium-emphasis">Not tied to a trip</span>
        </dd>
      </dl>
    </SectionCard>

    <!-- 2. What's wrong -->
    <SectionCard
      title="Problem"
      :subtitle="editing ? 'What kind of problem is it, and what did you notice?' : ''"
      data-test="section-problem"
    >
      <div v-if="editing" class="d-flex flex-column ga-5">
        <IssueTypePicker v-model="form.type" :rules="rules.type" />
        <v-textarea
          v-model="form.description"
          label="Description"
          hint="What you noticed and where. For example: “Rear passenger tire looks low.”"
          persistent-hint
          rows="4"
          auto-grow
          :rules="rules.description"
          hide-details="auto"
          data-test="description"
        />
      </div>

      <div v-else class="d-flex flex-column ga-4">
        <div class="d-flex align-center ga-3" data-test="view-type">
          <v-avatar color="primary-container" size="40">
            <v-icon :icon="ISSUE_TYPE_DETAILS[report.type]?.icon" color="primary" />
          </v-avatar>
          <div>
            <div class="text-title-small font-weight-bold">{{ typeLabel(report.type) }}</div>
            <div class="text-body-small text-medium-emphasis">{{ ISSUE_TYPE_DETAILS[report.type]?.hint }}</div>
          </div>
        </div>
        <p class="text-body-medium description mb-0" data-test="view-description">{{ report.description }}</p>
      </div>
    </SectionCard>

    <!-- 3. Where it stands: managers set it; requesters never see it while creating and only read it afterwards. -->
    <SectionCard
      v-if="showTracking"
      title="Status"
      :subtitle="editing ? 'Where it stands and who is handling it.' : ''"
      data-test="section-status"
    >
      <div v-if="editing" class="d-flex flex-column ga-4">
        <div>
          <div id="status-label" class="text-label-large mb-2">Status</div>
          <!-- Separate chips with an even gap; the chosen one is filled in its status color and checked. -->
          <v-chip-group
            :model-value="form.status"
            mandatory
            class="status-chips"
            role="radiogroup"
            aria-labelledby="status-label"
            data-test="status"
            @update:model-value="chooseStatus"
          >
            <v-chip
              v-for="option in ISSUE_STATUSES"
              :key="option.value"
              :value="option.value"
              :prepend-icon="statusDetails(option.value).icon"
              :color="form.status === option.value ? statusDetails(option.value).color : undefined"
              :variant="form.status === option.value ? 'tonal' : 'outlined'"
              role="radio"
              :aria-checked="form.status === option.value"
              size="large"
              label
              :data-test="`status-${option.value}`"
            >
              {{ option.title }}
            </v-chip>
          </v-chip-group>
          <div class="text-body-small text-medium-emphasis mt-2" data-test="status-meaning">
            {{ statusDetails(form.status).meaning }}
          </div>
        </div>

        <v-text-field
          v-if="closesOnDate(form.status)"
          v-model="form.resolvedAt"
          :label="closedOnLabel(form.status)"
          type="date"
          :max="todayInput()"
          :rules="rules.resolvedAt"
          hide-details="auto"
          data-test="resolved-at"
        />

        <v-autocomplete
          v-model="form.assigneeId"
          :items="assigneeItems"
          item-title="label"
          item-value="id"
          :item-props="assigneeProps"
          :filter-keys="SEARCH_KEYS"
          auto-select-first
          label="Assignee (optional)"
          placeholder="Search by name or role"
          prepend-inner-icon="mdi-account-wrench-outline"
          :disabled="!form.vehicleId"
          :loading="assigneesLoading"
          :hint="form.vehicleId ? 'Admins, this vehicle\'s area admins, and maintenance staff.' : 'Choose the vehicle first.'"
          persistent-hint
          no-data-text="No matching people."
          clearable
          hide-details="auto"
          data-test="assignee"
        />
        <v-alert v-if="assigneesError" type="warning" variant="tonal" density="compact" data-test="assignees-error">
          {{ assigneesError }}
        </v-alert>
        <v-alert v-if="assigneeNotice" type="info" variant="tonal" density="compact" data-test="assignee-notice">
          {{ assigneeNotice }}
        </v-alert>
      </div>

      <dl v-else class="facts">
        <dt>Status</dt>
        <dd data-test="view-status">
          <v-chip
            :color="statusDetails(report.status).color"
            :prepend-icon="statusDetails(report.status).icon"
            size="small"
            variant="tonal"
            label
          >
            {{ statusLabel(report.status) }}
          </v-chip>
          <div class="text-body-small text-medium-emphasis mt-1">{{ statusDetails(report.status).meaning }}</div>
        </dd>
        <template v-if="report.resolvedAt">
          <dt>{{ closedOnLabel(report.status) }}</dt>
          <dd>{{ formatDay(report.resolvedAt) }}</dd>
        </template>
        <dt>Assignee</dt>
        <dd data-test="view-assignee">
          <template v-if="report.assignee">{{ personName(report.assignee) }}</template>
          <span v-else class="text-medium-emphasis">Not assigned yet</span>
        </dd>
      </dl>
    </SectionCard>
  </div>
</template>

<style scoped>
.facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 12px 24px;
  margin: 0;
}

.facts dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.facts dd {
  margin: 0;
}

.description {
  white-space: pre-line;
  overflow-wrap: anywhere;
}

/* An even 8px gap between the status chips, in place of the group's uneven default margins. */
.status-chips :deep(.v-slide-group__content) {
  gap: 8px;
}

.status-chips :deep(.v-chip) {
  margin: 0;
}
</style>
