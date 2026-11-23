<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useNoticeStore } from "../stores/notice.js";
import vehicleTypeServices from "../services/vehicleTypeServices.js";
import vehicleTypeInstructionServices from "../services/vehicleTypeInstructionServices.js";
import vehicleServices from "../services/vehicleServices.js";
import { useRequest } from "../composables/useRequest.js";
import { useRoles } from "../composables/useRoles.js";
import ListState from "../components/common/ListState.vue";
import { matchesWords } from "../utils/search.js";
import PageShell from "../components/layout/PageShell.vue";
import VehicleTypeFormModal from "../components/vehicleTypes/VehicleTypeFormModal.vue";

// UI/UX backlog #48: the app-wide success toast.
const { notify } = useNoticeStore();
const router = useRouter();
const { hasRole } = useRoles();
// UI/UX backlog #9: area admins open vehicle types (read-only) to write their areas' instructions.
const isAdmin = computed(() => hasRole("admin"));
const formOpen = ref(false);

const {
  data: vehicleTypes,
  loading,
  error,
  run: getVehicleTypes,
} = useRequest(vehicleTypeServices.getVehicleTypes, { initial: [], fallback: "Failed to fetch vehicle types." });
const { data: instructions, run: getInstructions } = useRequest(vehicleTypeInstructionServices.getVehicleTypeInstructions, {
  initial: [],
});

/** UI/UX backlog #9: what each type's instructions cover, e.g. "Default + 2 areas". */
const instructionsOf = (vehicleType) => instructions.value.filter((row) => row.vehicleTypeId === vehicleType.id);
const hasDefault = (vehicleType) => instructionsOf(vehicleType).some((row) => row.areaId == null);
const instructionSummary = (vehicleType) => {
  const areas = instructionsOf(vehicleType).filter((row) => row.areaId != null).length;
  const parts = [
    ...(hasDefault(vehicleType) ? ["Default"] : []),
    ...(areas ? [`${areas} ${areas === 1 ? "area" : "areas"}`] : []),
  ];
  return parts.join(" + ");
};

/** How many vehicles of each type (the vehicles this person can see). */
const { data: fleet, run: getFleet } = useRequest(vehicleServices.getVehicles, { initial: [] });
const vehicleCount = (vehicleType) => fleet.value.filter((vehicle) => vehicle.vehicleTypeId === vehicleType.id).length;
const vehicleText = (vehicleType) => {
  const count = vehicleCount(vehicleType);
  return count ? `${count} ${count === 1 ? "vehicle" : "vehicles"}` : "No vehicles";
};

/** A picture for each kind of vehicle, from its name; anything else gets a plain car. */
const ICONS = [
  [/golf|cart/i, "mdi-golf-cart"],
  [/mini\s*bus|shuttle/i, "mdi-bus-side"],
  [/bus|coach/i, "mdi-bus"],
  [/van/i, "mdi-van-passenger"],
  [/truck|pickup/i, "mdi-truck-outline"],
  [/suv|jeep/i, "mdi-car-estate"],
  [/trailer/i, "mdi-truck-trailer"],
];
const iconFor = (vehicleType) => ICONS.find(([pattern]) => pattern.test(vehicleType.name))?.[1] ?? "mdi-car-outline";

const openCreate = () => {
  formOpen.value = true;
};

const createVehicleType = async (payload) => {
  const response = await vehicleTypeServices.createVehicleType(payload);
  notify("Vehicle type created.");
  // Straight to the new type's page, where its instructions are added.
  if (response?.data?.id) {
    await router.push({ name: "vehicleTypeDetails", params: { id: response.data.id } });
    return;
  }
  await getVehicleTypes();
};

onMounted(() => {
  getVehicleTypes();
  getInstructions();
  getFleet();
});

// UI/UX backlog #32: search the list.
const search = ref("");
const searched = computed(() =>
  vehicleTypes.value
    .filter((row) => matchesWords(search.value, [row.name, row.identifier]))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name)),
);
</script>

<template>
  <!-- UI/UX backlog #42: the page title matches its menu label. -->
  <PageShell
    title="Vehicle Types"
    :subtitle="
      isAdmin
        ? 'The kinds of vehicles in the fleet, and the pickup and return instructions drivers see for each.'
        : 'Open a type to write the pickup and return instructions for your areas\' trips.'
    "
  >
    <template v-if="isAdmin" #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Vehicle Type</v-btn>
    </template>

    <v-text-field
      v-model="search"
      prepend-inner-icon="mdi-magnify"
      placeholder="Search vehicle types"
      aria-label="Search vehicle types"
      variant="outlined"
      density="compact"
      clearable
      hide-details
      class="oc-list-search mb-4"
      data-test="list-search"
    />

    <ListState
      :loading
      :error
      :empty="!vehicleTypes.length"
      :no-results="!searched.length"
      no-results-title="Nothing matches your search."
      no-results-text=""
      empty-title="No vehicle types yet"
      empty-text="Vehicle types group the fleet (vans, buses, carts) and say whether each uses a VIN or a serial number."
      empty-art="vehicles"
    >
      <template v-if="isAdmin" #empty-actions>
        <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Vehicle Type</v-btn>
      </template>

      <!-- A handful of kinds of vehicle: cards, each opening the type's page (instructions, edit, delete). -->
      <v-row density="comfortable" data-test="type-cards">
        <v-col v-for="vehicleType in searched" :key="vehicleType.id" cols="12" md="6" xl="4">
          <v-card
            :to="{ name: 'vehicleTypeDetails', params: { id: vehicleType.id } }"
            class="type-card h-100"
            :aria-label="`${vehicleType.name}: ${vehicleText(vehicleType)}`"
            data-test="type-card"
          >
            <div class="d-flex align-start ga-4 pa-4">
              <div class="type-tile" aria-hidden="true">
                <v-icon :icon="iconFor(vehicleType)" size="28" />
              </div>
              <div class="flex-grow-1 min-width-0">
                <div class="text-title-medium font-weight-bold text-truncate">{{ vehicleType.name }}</div>
                <div class="text-body-small text-medium-emphasis">Identified by {{ vehicleType.identifier }}</div>
                <ul class="type-facts mt-2">
                  <li data-test="type-vehicles">
                    <v-icon icon="mdi-car-outline" size="16" aria-hidden="true" />
                    <span :class="{ 'text-medium-emphasis': !vehicleCount(vehicleType) }">{{ vehicleText(vehicleType) }}</span>
                  </li>
                  <!-- Without a default, trips in areas that haven't written their own show no instructions. -->
                  <li v-if="hasDefault(vehicleType)" data-test="type-instructions">
                    <v-icon icon="mdi-text-box-check-outline" size="16" aria-hidden="true" />
                    <span>Instructions: {{ instructionSummary(vehicleType) }}</span>
                  </li>
                  <template v-else>
                    <li class="text-warning type-facts__wrap" data-test="type-instructions">
                      <v-icon icon="mdi-alert-outline" size="16" aria-hidden="true" />
                      <span>No default instructions</span>
                    </li>
                    <li v-if="instructionSummary(vehicleType)" class="text-medium-emphasis" data-test="type-area-instructions">
                      <v-icon icon="mdi-text-box-outline" size="16" aria-hidden="true" />
                      <span>{{ instructionSummary(vehicleType) }} with their own</span>
                    </li>
                  </template>
                </ul>
              </div>
              <v-icon icon="mdi-chevron-right" class="type-card__go text-medium-emphasis" aria-hidden="true" />
            </div>
          </v-card>
        </v-col>
      </v-row>
    </ListState>

    <VehicleTypeFormModal v-model="formOpen" :vehicle-types="vehicleTypes" :save="createVehicleType" />
  </PageShell>
</template>

<style scoped>
.type-tile {
  flex: 0 0 56px;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-primary-container));
  color: rgb(var(--v-theme-primary));
}

.type-facts {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.type-facts li {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 0.875rem;
  line-height: 1.4;
}

.type-facts li > span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-facts li.type-facts__wrap {
  align-items: flex-start;
}

.type-facts li.type-facts__wrap > span {
  white-space: normal;
}

.type-facts li.type-facts__wrap > .v-icon {
  margin-top: 2px;
}

.type-facts li > .v-icon {
  flex: 0 0 auto;
  opacity: 0.7;
}

.type-card__go {
  align-self: center;
  transition: transform 0.15s ease;
}

.type-card:hover .type-card__go,
.type-card:focus-visible .type-card__go {
  transform: translateX(2px);
}

.min-width-0 {
  min-width: 0;
}

@media (max-width: 600px) {
  .type-tile {
    flex-basis: 44px;
    width: 44px;
    height: 44px;
  }
}
</style>
