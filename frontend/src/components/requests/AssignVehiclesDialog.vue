<script setup>
import { computed, ref, watch } from "vue";
import EmptyIllustration from "../common/EmptyIllustration.vue";
import requestServices from "../../services/requestServices.js";
import { useRequest } from "../../composables/useRequest.js";
import Utils from "../../config/utils.js";
import { capacityCheck, vehicleLabel } from "../../models/requests.js";
import { nextServiceText, problemKinds } from "../../models/vehicles.js";
import ProblemList from "../vehicles/ProblemList.vue";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  request: { type: Object, required: true },
  save: { type: Function, required: true },
});

const selected = ref([]);
const onlyShow = ref(["available"]);
const saving = ref(false);
const saveError = ref("");

const {
  data: options,
  loading,
  error,
  run: getOptions,
} = useRequest(requestServices.getVehicleOptions, { initial: [], fallback: "Failed to load vehicles." });

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  selected.value = props.request.vehicles.map(({ id }) => id);
  saveError.value = "";
  getOptions(props.request.id);
});

/** Feature 18: blocking problems (FR-005) can't be newly assigned; the rest are warnings (FR-006). */
const assignedIds = computed(() => props.request.vehicles.map(({ id }) => id));
const blocking = (option) => option.problems.filter((problem) => problem.blocking);
const chips = (option) => problemKinds(option.problems);
const isAssigned = (option) => assignedIds.value.includes(option.vehicle.id);
/** Already-assigned vehicles stay selectable so they can be removed (FR-005). */
const isDisabled = (option) => blocking(option).length > 0 && !isAssigned(option);
const serviceDue = (option) => option.problems.some(({ type }) => type === "service_due");

const isHidden = (option) =>
  (onlyShow.value.includes("available") && blocking(option).length > 0) ||
  (onlyShow.value.includes("service") && serviceDue(option));

// Selected vehicles stay listed even when a filter would hide them.
const shown = computed(() => options.value.filter((option) => !isHidden(option) || selected.value.includes(option.vehicle.id)));
const hiddenCount = computed(() => options.value.length - shown.value.length);

const capacity = computed(() =>
  capacityCheck(
    options.value.filter((option) => selected.value.includes(option.vehicle.id)).map((option) => option.vehicle),
    props.request.numberOfPeople,
  ),
);

const toggle = (option) => {
  if (isDisabled(option)) {
    return;
  }

  const id = option.vehicle.id;
  selected.value = selected.value.includes(id) ? selected.value.filter((value) => value !== id) : [...selected.value, id];
};

const submit = async () => {
  saving.value = true;
  saveError.value = "";

  try {
    await props.save(selected.value);
    open.value = false;
  } catch (err) {
    saveError.value = Utils.errorMessage(err, "Failed to assign vehicles.");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="720" scrollable :persistent="saving">
    <v-card rounded="lg">
      <v-card-item class="px-6 pt-5">
        <v-card-title class="font-weight-bold">Assign vehicles</v-card-title>
        <v-card-subtitle>
          {{ request.numberOfPeople }} people ·
          {{ request.estimatedMiles === null ? "mileage unknown" : `about ${request.estimatedMiles} miles` }} ·
          {{ request.area?.name }}
        </v-card-subtitle>
      </v-card-item>

      <div class="d-flex flex-wrap align-center ga-2 px-6 pb-3">
        <span class="text-body-medium text-medium-emphasis mr-1">Show only</span>
        <v-chip-group v-model="onlyShow" multiple filter column selected-class="text-primary" class="py-0">
          <v-chip value="available" variant="outlined">Available on these dates</v-chip>
          <v-chip value="service" variant="outlined">Not due for service</v-chip>
        </v-chip-group>
      </div>

      <v-divider />

      <v-card-text class="pa-0" style="max-height: 420px">
        <div v-if="loading" class="pa-6"><v-skeleton-loader type="list-item-two-line@3" /></div>
        <v-alert v-else-if="error" type="error" class="ma-4">{{ error }}</v-alert>
        <!-- UI/UX backlog #46: the app's own drawing, not a stock icon. -->
        <v-empty-state
          v-else-if="!shown.length"
          :title="options.length ? 'No vehicles match these filters' : 'This area has no vehicles yet'"
          :text="hiddenCount ? `${hiddenCount} hidden by filters` : ''"
        >
          <template #media><EmptyIllustration name="vehicles" /></template>
          <template v-if="hiddenCount" #actions>
            <v-btn variant="outlined" color="primary" class="oc-cta" @click="onlyShow = []">Show all vehicles</v-btn>
          </template>
        </v-empty-state>
        <v-list v-else lines="two" class="py-0">
          <v-list-item
            v-for="option in shown"
            :key="option.vehicle.id"
            :active="selected.includes(option.vehicle.id)"
            :disabled="isDisabled(option)"
            color="primary"
            data-test="vehicle-option"
            :data-vehicle="option.vehicle.universityId"
            @click="toggle(option)"
          >
            <template #prepend>
              <v-checkbox-btn :model-value="selected.includes(option.vehicle.id)" :disabled="isDisabled(option)" readonly class="mr-2" />
            </template>
            <v-list-item-title class="font-weight-medium">
              {{ vehicleLabel(option.vehicle) }}
              <span class="text-medium-emphasis font-weight-regular">· {{ option.vehicle.universityId }}</span>
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ option.vehicle.vehicleType?.name }} · {{ option.vehicle.passengerCapacity }} seats
              <template v-if="nextServiceText(option.nextService)"> · {{ nextServiceText(option.nextService) }}</template>
            </v-list-item-subtitle>
            <ProblemList
              v-if="option.problems.length"
              :problems="option.problems"
              :assigned="isAssigned(option)"
              class="option-problems text-body-small mt-1"
              data-test="option-problems"
            />
            <template #append>
              <div class="d-flex flex-wrap justify-end ga-1">
                <v-chip
                  v-for="chip in chips(option)"
                  :key="chip.type"
                  size="small"
                  :color="chip.blocking ? 'error' : 'warning'"
                  variant="tonal"
                  label
                >
                  {{ chip.label }}
                </v-chip>
              </div>
            </template>
          </v-list-item>
          <div v-if="hiddenCount" class="d-flex align-center ga-2 px-6 py-2 text-body-medium text-medium-emphasis">
            {{ hiddenCount }} hidden by filters
            <v-btn variant="text" color="primary" size="small" class="oc-cta" @click="onlyShow = []">Show all</v-btn>
          </div>
        </v-list>
      </v-card-text>

      <v-divider />

      <v-alert v-if="saveError" type="error" density="compact" class="mx-6 mt-4">{{ saveError }}</v-alert>

      <v-card-actions class="flex-wrap px-6 py-4 ga-2">
        <div
          v-if="capacity.short"
          class="assign-summary d-flex align-center ga-2 text-body-medium text-warning font-weight-medium"
          data-test="capacity-warning"
        >
          <v-icon icon="mdi-alert-outline" size="18" />
          {{ capacity.seats }} seats selected for {{ request.numberOfPeople }} people. You can still save.
        </div>
        <div v-else class="assign-summary text-body-medium text-medium-emphasis">
          {{ selected.length }} selected · {{ capacity.seats }} seats for {{ request.numberOfPeople }} people
        </div>
        <v-spacer />
        <v-btn color="secondary" variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" data-test="save-vehicles" @click="submit">
          Save assignment
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Disabled rows stay readable so the reason can be read (US-18.6). */
.v-list-item--disabled .option-problems {
  opacity: 1;
}

/* On phones the selection summary takes its own line above the buttons. */
@media (max-width: 599px) {
  .assign-summary {
    flex-basis: 100%;
  }
}
</style>
