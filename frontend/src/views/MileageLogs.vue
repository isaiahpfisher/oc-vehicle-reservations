<script setup>
import { computed, onMounted, ref } from "vue";
import { useNoticeStore } from "../stores/notice.js";
import { PAGE_SIZES } from "../utils/lists.js";
import { useRoute } from "vue-router";
import mileageLogServices from "../services/mileageLogServices.js";
import vehicleServices from "../services/vehicleServices.js";
import { addedByName } from "../models/mileageLogs.js";
import { formatDay, formatMiles, mileageDetail, vehicleName } from "../models/vehicles.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import { matchesWords } from "../utils/search.js";
import PageShell from "../components/layout/PageShell.vue";
import MileageLogFormModal from "../components/mileageLogs/MileageLogFormModal.vue";

// UI/UX backlog #48: the app-wide success toast.
const { notify } = useNoticeStore();
const route = useRoute();
const vehicleId = computed(() => route.params.vehicleId);

// UI/UX backlog #55: date first, the change since the previous reading (like the vehicle page's card), and "Added by"
// sorts on the name (#49).
const headers = [
  { title: "Recorded date", key: "recordedAt", nowrap: true },
  { title: "Odometer reading", key: "odometerReading", nowrap: true },
  { title: "Change", key: "change", sortable: false, nowrap: true },
  { title: "Added by", key: "addedBy", value: (log) => addedByName(log) },
  // UI/UX backlog #56: whether the reading was entered here or taken at a service visit.
  { title: "Source", key: "source", value: (log) => sourceText(log) },
  { title: "Actions", key: "actions", sortable: false, align: "end", nowrap: true },
];

const formOpen = ref(false);

const {
  data: mileageLogs,
  loading,
  error,
  run: getMileageLogs,
} = useRequest(mileageLogServices.getMileageLogs, {
  initial: [],
  fallback: "Failed to fetch mileage logs.",
});

// UI/UX backlog #39: from the vehicle itself, so a vehicle with no logs still has its name in the crumb and subtitle.
const { data: vehicle, run: getVehicle } = useRequest(vehicleServices.getVehicle, { fallback: "" });
const universityId = computed(() => vehicle.value?.universityId ?? mileageLogs.value[0]?.vehicle?.universityId ?? "");

const breadcrumbs = computed(() => [
  { title: "Vehicles", to: { name: "vehicles" } },
  { title: universityId.value || "Vehicle", to: { name: "vehicleDetails", params: { id: vehicleId.value } } },
  { title: "Mileage Log", disabled: true },
]);

// UI/UX backlog #34: create and edit both use the dialog.
const editing = ref(null);

const openCreate = () => {
  editing.value = null;
  formOpen.value = true;
};

const openEdit = (log) => {
  editing.value = log;
  formOpen.value = true;
};

const saveMileageLog = async (payload) => {
  const body = { vehicleId: Number(vehicleId.value), ...payload };
  if (editing.value) {
    await mileageLogServices.updateMileageLog(editing.value.id, body);
    notify("Mileage log saved.");
  } else {
    await mileageLogServices.createMileageLog(body);
    notify("Mileage log created.");
  }
  await getMileageLogs(vehicleId.value);
};

const confirmDelete = useConfirm();

const deleteMileageLog = async (log) => {
  const deleted = await confirmDelete({
    title: "Delete mileage log",
    message: `Delete the reading of ${formatMiles(log.odometerReading)} from ${formatDay(log.recordedAt)}? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => mileageLogServices.removeMileageLog(log.id),
  });

  if (deleted) {
    notify("Mileage log deleted.");
    await getMileageLogs(vehicleId.value);
  }
};

onMounted(() => {
  getMileageLogs(vehicleId.value);
  getVehicle(vehicleId.value);
});

// UI/UX backlog #32: search the list.
const search = ref("");
const searched = computed(() => mileageLogs.value.filter((row) => matchesWords(search.value, ((log) => [log.odometerReading, log.recordedAt, addedByName(log), sourceText(log)])(row))));

/** UI/UX backlog #57: the highest reading so far, as a hint for the next one. */
const latestReading = computed(() =>
  mileageLogs.value.length ? Math.max(...mileageLogs.value.map(({ odometerReading }) => odometerReading)) : null,
);

/** UI/UX backlog #55: each reading's change from the one before it (by date), as on the vehicle page's card. */
const changes = computed(() => {
  const ordered = [...mileageLogs.value].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id - b.id);
  return new Map(ordered.map((log, i) => [log.id, i ? log.odometerReading - ordered[i - 1].odometerReading : null]));
});
const changeText = (change) => {
  if (change === null || change === undefined) return "First reading";
  if (change === 0) return "No change";
  return `+${formatMiles(change)}`;
};

/** UI/UX backlog #56: a reading from a service visit names the services; one entered here says so. */
const fromService = (log) => Boolean(log.services?.length);
const sourceText = (log) => (fromService(log) ? `Service: ${log.services.join(", ")}` : "Entered here");

/** The vehicle as people know it: "V-100 · 2022 Ford Transit". */
const vehicleSubtitle = computed(() =>
  [universityId.value, vehicle.value?.make ? vehicleName(vehicle.value) : ""].filter(Boolean).join(" · "),
);

/** UI/UX backlog #55: where the vehicle's mileage stands now (Feature 18's estimate). */
const estimate = computed(() => vehicle.value?.condition?.mileage ?? null);
</script>

<template>
  <!-- UI/UX backlog #53: named like the vehicle page's "Mileage log" card. -->
  <PageShell title="Mileage log" :subtitle="vehicleSubtitle" :breadcrumbs>
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Mileage Log</v-btn>
    </template>

    <v-text-field
      v-model="search"
      prepend-inner-icon="mdi-magnify"
      placeholder="Search by reading, date, or who added it"
      aria-label="Search mileage logs"
      variant="outlined"
      density="compact"
      clearable
      hide-details
      class="oc-list-search mb-4"
      data-test="list-search"
    />

    <v-alert v-if="estimate" type="info" variant="tonal" density="compact" class="mb-4" data-test="mileage-estimate">
      Estimated now: <strong>{{ formatMiles(estimate.miles) }}</strong>
      <span class="text-medium-emphasis"> · {{ mileageDetail(estimate) }}</span>
    </v-alert>

    <ListState
      :loading
      :error
      :empty="!mileageLogs.length"
      :no-results="!searched.length"
      no-results-title="Nothing matches your search."
      no-results-text=""
      empty-title="No mileage logged yet"
      empty-text="Readings keep the mileage estimate and service schedule accurate."
      empty-art="logs"
    >
      <template #empty-actions>
        <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Mileage Log</v-btn>
      </template>
      <v-data-table
        :headers="headers"
        :items="searched"
        :items-per-page-options="PAGE_SIZES"
        item-value="id"
      >
        <template #[`item.recordedAt`]="{ item }">{{ formatDay(item.recordedAt) }}</template>
        <template #[`item.odometerReading`]="{ item }">{{ formatMiles(item.odometerReading) }}</template>
        <template #[`item.change`]="{ item }">
          <span class="text-medium-emphasis">{{ changeText(changes.get(item.id)) }}</span>
        </template>
        <template #[`item.addedBy`]="{ item }">
          {{ addedByName(item) }}
        </template>
        <template #[`item.source`]="{ item }">
          <router-link
            v-if="fromService(item)"
            :to="{ name: 'service-logs', params: { vehicleId } }"
            class="source-link"
            data-test="mileage-source-service"
          >{{ sourceText(item) }}</router-link>
          <span v-else class="text-medium-emphasis">{{ sourceText(item) }}</span>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-tooltip text="Edit mileage log" location="top">
              <template #activator="{ props: tooltip }">
                <v-btn v-bind="tooltip" icon="mdi-pencil" size="small" variant="text" aria-label="Edit mileage log" @click="openEdit(item)" />
              </template>
            </v-tooltip>
            <!-- UI/UX backlog #56: a service visit's reading goes with its service log, so say why it can't be deleted. -->
            <v-tooltip
              :text="fromService(item) ? 'Recorded at a service visit, so the service log still uses it.' : 'Delete mileage log'"
              location="top"
            >
              <template #activator="{ props: tooltip }">
                <span v-bind="tooltip">
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    aria-label="Delete mileage log"
                    :disabled="fromService(item)"
                    data-test="mileage-delete"
                    @click="deleteMileageLog(item)"
                  />
                </span>
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table>
    </ListState>

    <MileageLogFormModal v-model="formOpen" :log="editing" :latest-reading="latestReading" :save="saveMileageLog" />
  </PageShell>
</template>

<style scoped>
.source-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.source-link:hover,
.source-link:focus-visible {
  text-decoration: underline;
}
</style>
