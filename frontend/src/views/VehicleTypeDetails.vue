<script setup>
/**
 * UI/UX backlog #9: a vehicle type's page, which holds its pickup and return instructions (Feature 15) instead of a
 * separate Instructions page. The default shows on trips in every area; an area's own instructions replace it there.
 * Admins edit the type and every instruction; area admins read the type and the default, and write their areas' own.
 */
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useNoticeStore } from "../stores/notice.js";
import vehicleTypeServices from "../services/vehicleTypeServices.js";
import vehicleTypeInstructionServices from "../services/vehicleTypeInstructionServices.js";
import areaServices from "../services/areaServices.js";
import vehicleServices from "../services/vehicleServices.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRoles } from "../composables/useRoles.js";
import Utils from "../config/utils.js";
import PageShell from "../components/layout/PageShell.vue";
import SectionCard from "../components/layout/SectionCard.vue";
import MoreActionsMenu from "../components/common/MoreActionsMenu.vue";
import MoveAndDeleteDialog from "../components/common/MoveAndDeleteDialog.vue";
import VehicleTypeFormModal from "../components/vehicleTypes/VehicleTypeFormModal.vue";
import InstructionDialog from "../components/vehicleTypes/InstructionDialog.vue";
import InstructionText from "../components/vehicleTypes/InstructionText.vue";
import { STARTING_INSTRUCTIONS, usesVariables } from "../models/instructionVariables.js";

const props = defineProps({ id: { type: [String, Number], required: true } });

const router = useRouter();
const { notify } = useNoticeStore();
const { hasRole, areaAdminAreaIds } = useRoles();
const isAdmin = computed(() => hasRole("admin"));
const managesArea = (areaId) => isAdmin.value || areaAdminAreaIds.value.map(Number).includes(Number(areaId));


const vehicleType = ref(null);
const vehicleTypes = ref([]);
const instructions = ref([]);
const areas = ref([]);
const vehicles = ref([]);
const loading = ref(true);
const loadError = ref("");

const load = async () => {
  loadError.value = "";
  try {
    const { data } = await vehicleTypeServices.getVehicleTypeById(props.id);
    vehicleType.value = data;
  } catch (err) {
    loadError.value = Utils.errorMessage(err, "Failed to load this vehicle type.");
    loading.value = false;
    return;
  }

  const [types, rows, areaList, fleet] = await Promise.allSettled([
    vehicleTypeServices.getVehicleTypes(),
    vehicleTypeInstructionServices.getVehicleTypeInstructions({ vehicleTypeId: props.id }),
    areaServices.getAreas(),
    vehicleServices.getVehicles(),
  ]);
  vehicleTypes.value = types.status === "fulfilled" ? types.value.data : [];
  instructions.value = rows.status === "fulfilled" ? rows.value.data : [];
  areas.value = areaList.status === "fulfilled" ? areaList.value.data : [];
  vehicles.value = fleet.status === "fulfilled" ? fleet.value.data : [];
  if (rows.status === "rejected") {
    loadError.value = Utils.errorMessage(rows.reason, "Failed to load the instructions.");
  }
  loading.value = false;
};

onMounted(load);

const vehicleCount = computed(() => vehicles.value.filter((vehicle) => vehicle.vehicleTypeId === vehicleType.value?.id).length);
const subtitle = computed(() => {
  if (!vehicleType.value) return "";
  const count = vehicleCount.value;
  return `Identified by ${vehicleType.value.identifier} · ${count} ${count === 1 ? "vehicle" : "vehicles"}`;
});
const breadcrumbs = computed(() => [
  { title: "Vehicle Types", to: { name: "vehicle-types" } },
  { title: vehicleType.value?.name ?? "Vehicle type", disabled: true },
]);

/* Instructions */
const fallback = computed(() => instructions.value.find((row) => row.areaId == null) ?? null);
const forArea = (area) => instructions.value.find((row) => row.areaId === area.id) ?? null;
/** Admins see every area; area admins see the areas they run. */
const shownAreas = computed(() =>
  (isAdmin.value ? areas.value : areas.value.filter((area) => managesArea(area.id))).slice().sort((a, b) => a.name.localeCompare(b.name)),
);
/** Only the areas that replace the default get a block; the rest are summed up in one line. */
const ownAreas = computed(() => shownAreas.value.filter((area) => forArea(area)));
const defaultAreas = computed(() => shownAreas.value.filter((area) => !forArea(area)));
/** Areas this person could add their own instructions for. */
const addableAreas = computed(() => defaultAreas.value.filter((area) => managesArea(area.id)));

/** "Admissions, Athletics, and 8 more use the default." */
const defaultAreasLine = computed(() => {
  const names = defaultAreas.value.map((area) => area.name);
  if (!names.length) return "";
  const shown = names.length <= 3 ? names : [...names.slice(0, 2), `${names.length - 2} more`];
  const list = shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(", ")}${shown.length > 2 ? "," : ""} and ${shown.at(-1)}`;
  const verb = names.length === 1 ? "uses" : "use";
  return fallback.value ? `${list} ${verb} the default.` : `${list} ${names.length === 1 ? "has" : "have"} none, so ${names.length === 1 ? "its" : "their"} drivers see no instructions.`;
});
const defaultUsage = computed(() => {
  if (!isAdmin.value || !areas.value.length) return "";
  const count = defaultAreas.value.length;
  return count === areas.value.length ? "Used by every area" : `Used by ${count} of ${areas.value.length} areas`;
});

const dialogOpen = ref(false);
/**
 * What the dialog writes: `area` (null for the default, or for a new area's instructions whose area is picked in the
 * dialog: `choosing`), and the instruction being changed, if there is one.
 */
const target = ref({ area: null, instruction: null, choosing: false });
const typeName = computed(() => vehicleType.value?.name ?? "");
const dialogTitle = computed(() => {
  if (target.value.choosing) return "Area instructions";
  return target.value.area ? `${target.value.area.name} instructions` : "Default instructions";
});
const dialogSubtitle = computed(() => {
  if (target.value.choosing) return `Shown instead of the default on that area's ${typeName.value} trips.`;
  return target.value.area
    ? `Shown instead of the default on ${target.value.area.name} ${typeName.value} trips.`
    : `Shown on ${typeName.value} trips in every area that doesn't have its own.`;
});
const dialogInitial = computed(() => {
  if (target.value.instruction) return target.value.instruction.content;
  // An area's own starts as a copy of the default; without one (or for the default itself), from the example.
  return (target.value.area || target.value.choosing ? fallback.value?.content : null) ?? STARTING_INSTRUCTIONS;
});
/** Any variables on the page yet? The hint explains them either way, with an example when there's none. */
const anyVariables = computed(() => instructions.value.some(({ content }) => usesVariables(content)));
const dialogAreaItems = computed(() =>
  target.value.choosing ? addableAreas.value.map((area) => ({ title: area.name, value: area.id })) : [],
);

const openInstruction = (area) => {
  target.value = { area, instruction: area ? forArea(area) : fallback.value, choosing: false };
  dialogOpen.value = true;
};

/** One area left to add: it's preset. Several: the dialog asks which. */
const openAddArea = () => {
  if (addableAreas.value.length === 1) {
    openInstruction(addableAreas.value[0]);
    return;
  }
  target.value = { area: null, instruction: null, choosing: true };
  dialogOpen.value = true;
};

const saveInstruction = async (content, chosenAreaId = null) => {
  const areaId = target.value.choosing ? chosenAreaId : target.value.area?.id ?? null;
  const body = { vehicleTypeId: vehicleType.value.id, areaId, content };
  if (target.value.instruction) {
    await vehicleTypeInstructionServices.updateVehicleTypeInstruction(target.value.instruction.id, body);
  } else {
    await vehicleTypeInstructionServices.createVehicleTypeInstruction(body);
  }
  notify("Instructions saved.");
  await load();
};

const confirm = useConfirm();

const removeInstruction = async (area) => {
  const instruction = area ? forArea(area) : fallback.value;
  const name = vehicleType.value.name;
  const deleted = await confirm({
    title: area ? `Remove ${area.name} instructions` : "Remove default instructions",
    message: area
      ? `Remove the ${area.name} instructions for ${name}? ${area.name} trips will show the default instead.`
      : `Remove the default instructions for ${name}? Areas without their own will show none.`,
    confirmText: "Remove",
    confirmColor: "error",
    onConfirm: () => vehicleTypeInstructionServices.removeVehicleTypeInstruction(instruction.id),
  });
  if (deleted) {
    notify("Instructions removed.");
    await load();
  }
};

/* The type itself (admins) */
const editOpen = ref(false);
const saveVehicleType = async (payload) => {
  await vehicleTypeServices.updateVehicleType(vehicleType.value.id, payload);
  notify("Vehicle type saved.");
  await load();
};

const moveOpen = ref(false);
const moveTargets = computed(() =>
  vehicleTypes.value.filter((other) => other.id !== vehicleType.value?.id).map((other) => ({ title: other.name, value: other.id })),
);
const leave = async () => {
  notify("Vehicle type deleted.");
  await router.push({ name: "vehicle-types" });
};

/** UI/UX backlog #33 / #36: delete from the ⋮ menu; one with vehicles moves them to another type first. */
const deleteVehicleType = async () => {
  if (vehicleCount.value) {
    moveOpen.value = true;
    return;
  }

  const deleted = await confirm({
    title: "Delete vehicle type",
    message: `Delete "${vehicleType.value.name}"? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => vehicleTypeServices.removeVehicleType(vehicleType.value.id),
  });
  if (deleted) await leave();
};

const moveAndDelete = async (targetId) => {
  await vehicleTypeServices.removeVehicleType(vehicleType.value.id, targetId);
  await leave();
};
</script>

<template>
  <PageShell :title="vehicleType?.name ?? ''" :subtitle :breadcrumbs :loading :error="vehicleType ? '' : loadError" :max-width="1040" centered>
    <template v-if="vehicleType && isAdmin" #actions>
      <v-btn color="primary" variant="outlined" class="oc-cta" data-test="edit-vehicle-type" @click="editOpen = true">Edit</v-btn>
      <MoreActionsMenu>
        <v-list-item
          prepend-icon="mdi-delete-outline"
          title="Delete vehicle type"
          base-color="error"
          data-test="delete-vehicle-type"
          @click="deleteVehicleType"
        />
      </MoreActionsMenu>
    </template>

    <SectionCard
      v-if="vehicleType"
      title="Pickup and return instructions"
      :subtitle="`What drivers are told about picking up and returning a ${typeName}.`"
      data-test="instructions"
    >
      <v-alert v-if="loadError" type="error" density="compact" class="mb-4">{{ loadError }}</v-alert>

      <!-- Variables are filled in from each trip; say what the highlighted words are. -->
      <p class="variables-hint text-body-medium text-medium-emphasis" data-test="variables-hint">
        <v-icon icon="mdi-code-braces" size="small" class="mr-2" />
        <span v-if="anyVariables">
          Highlighted words, like <span class="variables-hint__sample">Vehicle</span>, are variables: each trip fills in its own details.
        </span>
        <span v-else>Add variables, like the trip's vehicle or pickup time, from the Variables list when you edit.</span>
      </p>

      <!-- The default: every area without its own. -->
      <section class="instruction" :class="{ 'instruction--empty': !fallback }" data-test="instruction-default">
        <header class="instruction__head">
          <div class="instruction__name">
            <span class="text-title-small font-weight-bold">Default</span>
            <span v-if="fallback && defaultUsage" class="text-body-small text-medium-emphasis" data-test="default-usage">{{ defaultUsage }}</span>
          </div>
          <div v-if="isAdmin && fallback" class="instruction__actions">
            <v-btn variant="text" color="primary" size="small" class="oc-cta" data-test="edit-default" @click="openInstruction(null)">Edit</v-btn>
            <v-menu location="bottom end">
              <template #activator="{ props: menu }">
                <v-btn v-bind="menu" icon="mdi-dots-vertical" variant="text" size="small" class="text-medium-emphasis" aria-label="More actions for the default" data-test="default-actions" />
              </template>
              <v-list density="compact" min-width="200">
                <v-list-item prepend-icon="mdi-delete-outline" title="Remove default" base-color="error" data-test="remove-default" @click="removeInstruction(null)" />
              </v-list>
            </v-menu>
          </div>
        </header>

        <InstructionText v-if="fallback" :content="fallback.content" />
        <template v-else>
          <p class="mb-0 text-medium-emphasis">
            No default yet. Trips in areas without their own instructions show drivers nothing.
          </p>
          <v-btn v-if="isAdmin" color="primary" variant="tonal" size="small" class="oc-cta mt-3" data-test="edit-default" @click="openInstruction(null)">
            Add default
          </v-btn>
        </template>
      </section>

      <!-- Areas that replace the default. The rest are one line. -->
      <div class="areas-head">
        <div>
          <div class="text-title-small font-weight-bold">Area instructions</div>
          <div class="text-body-small text-medium-emphasis">Replace the default on that area's trips.</div>
        </div>
        <v-btn
          v-if="addableAreas.length"
          variant="text"
          color="primary"
          size="small"
          class="oc-cta"
          prepend-icon="mdi-plus"
          data-test="add-area-instructions"
          @click="openAddArea"
        >
          Add for an area
        </v-btn>
      </div>

      <section v-for="area in ownAreas" :key="area.id" class="instruction" :data-test="`instruction-area-${area.id}`">
        <header class="instruction__head">
          <div class="instruction__name">
            <img v-if="area.logo" :src="area.logo" alt="" class="instruction__logo" />
            <span class="text-title-small font-weight-bold">{{ area.name }}</span>
          </div>
          <div v-if="managesArea(area.id)" class="instruction__actions">
            <v-btn variant="text" color="primary" size="small" class="oc-cta" :data-test="`edit-area-${area.id}`" @click="openInstruction(area)">Edit</v-btn>
            <v-menu location="bottom end">
              <template #activator="{ props: menu }">
                <v-btn
                  v-bind="menu"
                  icon="mdi-dots-vertical"
                  variant="text"
                  size="small"
                  class="text-medium-emphasis"
                  :aria-label="`More actions for ${area.name}`"
                  :data-test="`area-actions-${area.id}`"
                />
              </template>
              <v-list density="compact" min-width="200">
                <v-list-item
                  prepend-icon="mdi-delete-outline"
                  :title="`Remove ${area.name} instructions`"
                  base-color="error"
                  :data-test="`remove-area-${area.id}`"
                  @click="removeInstruction(area)"
                />
              </v-list>
            </v-menu>
          </div>
        </header>
        <InstructionText :content="forArea(area).content" />
      </section>

      <p v-if="defaultAreasLine" class="text-body-medium text-medium-emphasis mt-3 mb-0" data-test="areas-using-default">{{ defaultAreasLine }}</p>
    </SectionCard>

    <InstructionDialog
      v-model="dialogOpen"
      :title="dialogTitle"
      :subtitle="dialogSubtitle"
      :initial="dialogInitial"
      :area-items="dialogAreaItems"
      :submit-label="target.instruction ? 'Save' : 'Add'"
      :save="saveInstruction"
    />
    <VehicleTypeFormModal v-model="editOpen" :vehicle-types="vehicleTypes" :vehicle-type="vehicleType" :save="saveVehicleType" />
    <MoveAndDeleteDialog
      v-model="moveOpen"
      :title="`Delete ${vehicleType?.name ?? ''}`"
      :message="`${vehicleType?.name} has ${vehicleCount} vehicle${vehicleCount === 1 ? '' : 's'}. Move ${vehicleCount === 1 ? 'it' : 'them'} to another vehicle type, then delete ${vehicleType?.name}.`"
      :items="moveTargets"
      label="Move vehicles to"
      :save="moveAndDelete"
    />
  </PageShell>
</template>

<style scoped>
.instruction {
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 12px 12px 16px 16px;
}

.instruction + .instruction {
  margin-top: 12px;
}

.instruction--empty {
  border-style: dashed;
}

.instruction__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
  margin-bottom: 4px;
}

.instruction__name {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  column-gap: 10px;
  min-width: 0;
}

.instruction__actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.variables-hint {
  display: flex;
  align-items: center;
  margin: -4px 0 16px;
}

.variables-hint__sample {
  padding: 0 6px;
  border-radius: 6px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.instruction__logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
  align-self: center;
}

.areas-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 12px;
  margin: 28px 0 12px;
}

.areas-head > div {
  flex: 1 1 220px;
}
</style>
