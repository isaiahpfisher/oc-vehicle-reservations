<script setup>
import { computed, onMounted, ref } from "vue";
import { useNoticeStore } from "../stores/notice.js";
import areaServices from "../services/areaServices.js";
import vehicleServices from "../services/vehicleServices.js";
import userServices from "../services/userServices.js";
import requestServices from "../services/requestServices.js";
import { fullName } from "../models/users.js";
import { areaInitials } from "../models/areas.js";
import MoveAndDeleteDialog from "../components/common/MoveAndDeleteDialog.vue";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import { matchesWords } from "../utils/search.js";
import PageShell from "../components/layout/PageShell.vue";
import AreaFormModal from "../components/areas/AreaFormModal.vue";

// UI/UX backlog #48: the app-wide success toast.
const { notify } = useNoticeStore();
const formOpen = ref(false);

const { data: fleet, run: getFleet } = useRequest(vehicleServices.getVehicles, { initial: [] });
// UI/UX backlog #51: how many vehicles each area has (and so whether deleting it means moving them).
const vehicleCounts = computed(() => {
  const counts = new Map();
  fleet.value.forEach(({ areaId }) => counts.set(areaId, (counts.get(areaId) ?? 0) + 1));
  return counts;
});
const vehicleText = (area) => {
  const count = vehicleCounts.value.get(area.id) ?? 0;
  return `${count} ${count === 1 ? "vehicle" : "vehicles"}`;
};

/** Who approves each area's trips: its area admins. A failed load just leaves the line out. */
const { data: users, run: getUsers } = useRequest(userServices.getUsers, { initial: [] });
const adminsOf = (area) =>
  users.value
    .filter((user) => user.roles?.some(({ role, areaId }) => role === "area_admin" && Number(areaId) === Number(area.id)))
    .map(fullName)
    .sort((a, b) => a.localeCompare(b));


/** Requests still waiting for an area admin to approve them, per area: where approvals are stuck. */
const { data: requests, run: getRequests } = useRequest(requestServices.getRequests, { initial: [] });
const waitingCount = (area) =>
  requests.value.filter((request) => request.status === "pending" && Number(request.areaId ?? request.area?.id) === Number(area.id)).length;

const initials = areaInitials;
// UI/UX backlog #34: create and edit both use the dialog.
const editing = ref(null);

const {
  data: areas,
  loading,
  error,
  run: getAreas,
} = useRequest(areaServices.getAreas, { initial: [], fallback: "Failed to fetch areas." });

const openCreate = () => {
  editing.value = null;
  formOpen.value = true;
};

const openEdit = (area) => {
  editing.value = area;
  formOpen.value = true;
};

const saveArea = async (payload) => {
  if (editing.value) {
    await areaServices.updateArea(editing.value.id, payload);
    notify("Area saved.");
  } else {
    await areaServices.createArea(payload);
    notify("Area created.");
  }
  await getAreas();
};

const confirmDelete = useConfirm();

const deleteEmpty = async (area) => {
  const deleted = await confirmDelete({
    title: "Delete area",
    message: `Delete "${area.name}"? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => areaServices.removeArea(area.id),
  });

  if (deleted) {
    notify("Area deleted.");
    await getAreas();
  }
};

/* UI/UX backlog #33: one that still has vehicles can move them all elsewhere as part of the delete. */
const moving = ref(null);
const moveOpen = ref(false);
const moveCount = ref(0);
const moveTargets = computed(() =>
  areas.value.filter((other) => other.id !== moving.value?.id).map((other) => ({ title: other.name, value: other.id })),
);

const deleteArea = async (area) => {
  let count = 0;
  try {
    const { data } = await vehicleServices.getVehicles();
    count = data.filter((vehicle) => vehicle.areaId === area.id).length;
  } catch {
    // Fall back to the plain delete; the API still refuses one with vehicles and says why.
  }

  if (!count) {
    await deleteEmpty(area);
    return;
  }

  moving.value = area;
  moveCount.value = count;
  moveOpen.value = true;
};

const moveAndDelete = async (targetId) => {
  await areaServices.removeArea(moving.value.id, targetId);
  await Promise.all([getAreas(), getFleet()]);
};

onMounted(() => {
  getAreas();
  getFleet();
  getUsers();
  getRequests();
});

// UI/UX backlog #32: search the list.
const search = ref("");
const searched = computed(() =>
  areas.value
    .filter((area) => matchesWords(search.value, [area.name, ...adminsOf(area)]))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name)),
);
</script>

<template>
  <!-- UI/UX backlog #42: the page title matches its menu label. -->
  <PageShell title="Areas" subtitle="The departments that own vehicles. Each area's admins approve its trip requests.">
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Area</v-btn>
    </template>

    <v-text-field
      v-model="search"
      prepend-inner-icon="mdi-magnify"
      placeholder="Search areas or admins"
      aria-label="Search areas"
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
      :empty="!areas.length"
      :no-results="!searched.length"
      no-results-title="Nothing matches your search."
      no-results-text=""
      empty-title="No areas yet"
      empty-text="Areas are the departments that own vehicles and approve their trips."
      empty-art="people"
    >
      <template #empty-actions>
        <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Area</v-btn>
      </template>
      <!-- A handful of departments, each with a logo: cards read better than a four-column table. -->
      <v-row density="comfortable" data-test="area-cards">
        <v-col v-for="area in searched" :key="area.id" cols="12" sm="6" lg="4">
          <v-card class="area-card h-100" data-test="area-card">
            <div class="d-flex align-start ga-4 pa-4">
              <div class="area-tile" :class="{ 'area-tile--initials': !area.logo }">
                <img v-if="area.logo" :src="area.logo" :alt="`${area.name} logo`" />
                <span v-else aria-hidden="true">{{ initials(area.name) }}</span>
              </div>
              <div class="flex-grow-1 min-width-0">
                <div class="text-title-medium font-weight-bold text-truncate" :title="area.name">{{ area.name }}</div>
                <ul class="area-facts mt-1">
                  <li>
                    <v-icon icon="mdi-car-outline" size="16" aria-hidden="true" />
                    <router-link
                      v-if="vehicleCounts.get(area.id)"
                      :to="{ name: 'vehicles', query: { area: area.name } }"
                      class="area-link"
                      data-test="area-vehicles"
                    >
                      {{ vehicleText(area) }}
                    </router-link>
                    <span v-else class="text-medium-emphasis" data-test="area-vehicles">No vehicles</span>
                  </li>
                  <!-- Who approves this area's trips. None means its requests can't be approved, so say so. -->
                  <li v-if="adminsOf(area).length" :title="adminsOf(area).join(', ')" data-test="area-admins">
                    <v-icon icon="mdi-account-check-outline" size="16" aria-hidden="true" />
                    <!-- The first admin, then a "+N" pill that never gets cut off; every name is in the tooltip. -->
                    <span class="text-truncate">{{ adminsOf(area)[0] }}</span>
                    <span
                      v-if="adminsOf(area).length > 1"
                      class="more-pill"
                      :aria-label="`and ${adminsOf(area).length - 1} more`"
                    >+{{ adminsOf(area).length - 1 }}</span>
                  </li>
                  <li v-else class="text-warning" data-test="area-admins">
                    <v-icon icon="mdi-alert-outline" size="16" aria-hidden="true" />
                    <router-link :to="{ name: 'users' }" class="area-link area-link--warning">No area admin to approve trips</router-link>
                  </li>
                  <li v-if="waitingCount(area)" data-test="area-waiting">
                    <v-icon icon="mdi-clock-outline" size="16" aria-hidden="true" />
                    <router-link
                      :to="{ name: 'adminRequests', query: { area: String(area.id), status: 'pending' } }"
                      class="area-link"
                    >
                      {{ waitingCount(area) }} awaiting approval
                    </router-link>
                  </li>
                </ul>
              </div>
              <!-- UI/UX backlog #36: one quiet menu per card instead of a pencil and a trash can on every card. -->
              <v-menu location="bottom end">
                <template #activator="{ props: menu }">
                  <v-btn
                    v-bind="menu"
                    icon="mdi-dots-vertical"
                    size="small"
                    variant="text"
                    class="mt-n1 mr-n2 text-medium-emphasis"
                    :aria-label="`Actions for ${area.name}`"
                    data-test="area-actions"
                  />
                </template>
                <v-list density="compact" min-width="180">
                  <v-list-item prepend-icon="mdi-pencil-outline" title="Edit area" data-test="edit-area" @click="openEdit(area)" />
                  <v-list-item
                    prepend-icon="mdi-delete-outline"
                    title="Delete area"
                    base-color="error"
                    data-test="delete-area"
                    @click="deleteArea(area)"
                  />
                </v-list>
              </v-menu>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </ListState>

    <MoveAndDeleteDialog
      v-model="moveOpen"
      :title="`Delete ${moving?.name ?? ''}`"
      :message="`${moving?.name} has ${moveCount} vehicle${moveCount === 1 ? '' : 's'}. Move ${moveCount === 1 ? 'it' : 'them'} to another area, then delete ${moving?.name}.`"
      :items="moveTargets"
      label="Move vehicles to"
      :save="moveAndDelete"
    />
    <AreaFormModal v-model="formOpen" :areas="areas" :area="editing" :save="saveArea" />
  </PageShell>
</template>

<style scoped>
.area-tile {
  flex: 0 0 56px;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #fff;
}

.area-tile img {
  max-width: 44px;
  max-height: 44px;
  object-fit: contain;
}

.area-tile--initials {
  border: none;
  background: rgb(var(--v-theme-primary-container));
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
  font-size: 1.125rem;
}

.area-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.area-link:hover,
.area-link:focus-visible {
  text-decoration: underline;
}

.min-width-0 {
  min-width: 0;
}

.area-facts {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.area-facts li {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 0.875rem;
  line-height: 1.4;
}

.area-facts li > a,
.area-facts li > span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.area-facts li > .more-pill {
  flex: 0 0 auto;
  overflow: visible;
}

.more-pill {
  padding: 0 6px;
  border-radius: 999px;
  font-size: 0.75rem;
  line-height: 1.4;
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.8);
}

@media (max-width: 600px) {
  .area-tile {
    flex-basis: 44px;
    width: 44px;
    height: 44px;
  }

  .area-tile img {
    max-width: 34px;
    max-height: 34px;
  }

  .area-tile--initials {
    font-size: 1rem;
  }
}

.area-facts li > .v-icon {
  flex: 0 0 auto;
  opacity: 0.7;
}

.area-link--warning {
  color: rgb(var(--v-theme-warning));
}
</style>
