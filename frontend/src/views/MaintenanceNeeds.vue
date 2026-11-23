<script setup>
import { computed, ref } from "vue";
import { useNoticeStore } from "../stores/notice.js";
import { NEED_PRIORITY_COLORS, NEED_STATUS_COLORS, NEED_STATUS_OPTIONS, needStatusLabel } from "../models/maintenanceNeeds.js";
import { PAGE_SIZES } from "../utils/lists.js";
import { useRouter } from "vue-router";
import maintenanceNeedServices from "../services/maintenanceNeedServices.js";
import serviceLogServices from "../services/serviceLogServices.js";
import serviceTypeServices from "../services/serviceTypeServices.js";
import { fullName } from "../models/users.js";
import { useRequest } from "../composables/useRequest.js";
import { useRoles } from "../composables/useRoles.js";
import ListState from "../components/common/ListState.vue";
import NoteCount from "../components/common/NoteCount.vue";
import PageShell from "../components/layout/PageShell.vue";
import ServiceLogFormModal from "../components/serviceLogs/ServiceLogFormModal.vue";

const router = useRouter();
// UI/UX backlog #48: the app-wide success toast.
const { notify } = useNoticeStore();
const { hasRole, areaAdminAreaIds, user } = useRoles();
const isMaintenance = computed(() => hasRole("maintenance"));

// UI/UX backlog #27: priority sorts by urgency, not alphabetically.
const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2, None: 3 };
const PRIORITY_COLORS = NEED_PRIORITY_COLORS;
const STATUS_COLORS = NEED_STATUS_COLORS;

const headers = [
  // The title takes the room the other columns leave (at least 200px) and cuts off a long title with "…", so the
  // title and its out-of-service flag stay on one line and the table never runs off the side.
  { title: "Title", key: "title", width: "100%", minWidth: "200px", cellProps: { class: "need-title-cell" } },
  // UI/UX backlog #27: which vehicle, without opening the need.
  { title: "Vehicle", key: "vehicle", value: (need) => need.vehicle?.universityId ?? "", nowrap: true },
  { title: "Priority", key: "priority", value: (need) => PRIORITY_RANK[need.priority] ?? 9, nowrap: true },
  { title: "Assignee", key: "assignee", value: (need) => personName(need.assignee), nowrap: true },
  { title: "Status", key: "status", nowrap: true },
  { title: "Created", key: "createdAt", nowrap: true },
  { title: "Actions", key: "actions", sortable: false, align: "end" },
];

const formatDay = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

/** UI/UX backlog #27: search by title, description, vehicle, or assignee. */
const search = ref("");
const matchesSearch = (need) => {
  const words = search.value?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  const text = [need.title, need.description, need.vehicle?.universityId, need.vehicle?.make, need.vehicle?.model, personName(need.assignee)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return words.every((word) => text.includes(word));
};
const isOpenNeed = (need) => need.status === "Open" || need.status === "In Progress";

const {
  data: maintenanceNeeds,
  loading,
  error,
  run: loadNeeds,
} = useRequest(() => maintenanceNeedServices.getMaintenanceNeeds(), {
  initial: [],
  fallback: "Failed to fetch maintenance needs.",
});

const personName = (person) => (person ? `${person.firstName} ${person.lastName}` : "");

const visibleNeeds = computed(() => {
  const rows = [...maintenanceNeeds.value].sort(
    (left, right) => String(right.createdAt).localeCompare(String(left.createdAt)) || right.id - left.id,
  );

  if (hasRole("admin") || hasRole("maintenance")) {
    return rows;
  }

  const areaIds = new Set(areaAdminAreaIds.value.map(Number));
  return rows.filter((need) => areaIds.has(Number(need.vehicle?.areaId)));
});

/**
 * Filters like the other lists: a Status dropdown (starting on the needs still to do) and, for maintenance users, an
 * "Assigned to me" button that starts on, like the request list's "Needs my action".
 */
const OPEN_STATUSES = ["Open", "In Progress"];
const statuses = ref([...OPEN_STATUSES]);
const assignedOnly = ref(isMaintenance.value);
const isMine = (need) => need.assigneeId === user.value?.userId;

const statusNeeds = computed(() =>
  statuses.value.length ? visibleNeeds.value.filter((need) => statuses.value.includes(need.status)) : visibleNeeds.value,
);
const assignedCount = computed(() => statusNeeds.value.filter(isMine).length);
const filteredNeeds = computed(() => (assignedOnly.value ? statusNeeds.value.filter(isMine) : statusNeeds.value));

/** Only needs that take their vehicle out of service; the button's count is how many the other filters leave. */
const outOfServiceOnly = ref(false);
const outOfServiceCount = computed(() => filteredNeeds.value.filter((need) => need.outOfService).length);

const searchedNeeds = computed(() =>
  filteredNeeds.value.filter((need) => matchesSearch(need) && (!outOfServiceOnly.value || need.outOfService)),
);

const startingStatuses = computed(
  () => statuses.value.length === OPEN_STATUSES.length && OPEN_STATUSES.every((status) => statuses.value.includes(status)),
);
/** The page as it starts: the open statuses, assigned-only for maintenance users, nothing else. */
const atStart = computed(
  () => startingStatuses.value && assignedOnly.value === isMaintenance.value && !outOfServiceOnly.value && !search.value?.trim(),
);
/** Outside the list so "Clear filters" stays reachable when nothing matches, like Issue Reports. */
const hidingSome = computed(() => visibleNeeds.value.length > 0 && searchedNeeds.value.length < visibleNeeds.value.length);
const clearFilters = () => {
  search.value = "";
  statuses.value = [];
  assignedOnly.value = false;
  outOfServiceOnly.value = false;
};

const assignedEmpty = computed(() => atStart.value && assignedOnly.value && !filteredNeeds.value.length);
const listEmpty = computed(() => !visibleNeeds.value.length);

/** UI/UX backlog #27: an empty result says why, instead of Vuetify's "No data available". */
const noResultsTitle = computed(() => {
  if (search.value?.trim()) return "No maintenance needs match your search.";
  if (outOfServiceOnly.value) return "Nothing here takes a vehicle out of service.";
  if (assignedOnly.value) return "Nothing assigned to you here.";
  if (startingStatuses.value) return "Nothing open right now.";
  return "No maintenance needs with those statuses.";
});

const serviceLogOpen = ref(false);
const serviceLogNeed = ref(null);
const serviceUsers = ref([]);
const serviceTypes = ref([]);

const withLabel = (person) => ({ ...person, label: fullName(person) });

const openNeed = (need) => {
  router.push({ name: "maintenanceNeedEdit", params: { id: need.id } });
};

const openServiceLog = async (need) => {
  const [userResult, typeResult] = await Promise.allSettled([
    maintenanceNeedServices.getMaintenanceNeedOptions(),
    serviceTypeServices.getServiceTypes(),
  ]);

  serviceTypes.value = typeResult.status === "fulfilled" ? typeResult.value.data : [];
  serviceUsers.value = userResult.status === "fulfilled" ? userResult.value.data.assignees.map(withLabel) : [];

  serviceLogNeed.value = need;
  serviceLogOpen.value = true;
};

const createServiceLog = async (payload) => {
  await serviceLogServices.createServiceLog({
    ...payload,
    vehicleId: Number(serviceLogNeed.value.vehicleId ?? serviceLogNeed.value.vehicle?.id),
    maintenanceNeedId: serviceLogNeed.value.id,
  });
  notify("Service log created.");
};

loadNeeds();
</script>

<template>
  <PageShell title="Maintenance Needs">
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="router.push({ name: 'maintenanceNeedCreate' })">+ New Maintenance Need</v-btn>
    </template>


    <div class="oc-list-toolbar">
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        placeholder="Search by title, vehicle, or assignee"
        aria-label="Search maintenance needs"
        variant="outlined"
        density="compact"
        clearable
        hide-details
        class="oc-list-search"
        data-test="need-search"
      />
      <v-select
        v-model="statuses"
        :items="NEED_STATUS_OPTIONS"
        label="Status"
        placeholder="All statuses"
        persistent-placeholder
        variant="outlined"
        density="compact"
        multiple
        hide-details
        clearable
        class="oc-list-filter"
        data-test="status-filter"
      >
        <template #selection="{ item, index }">
          <span v-if="index === 0" class="text-truncate">{{ item.title }}</span>
          <span v-else-if="index === 1" class="text-medium-emphasis ml-1">+{{ statuses.length - 1 }}</span>
        </template>
      </v-select>
      <!-- Like the request list's "Needs my action": on for maintenance users, whose work this is. -->
      <v-btn
        v-if="isMaintenance"
        :variant="assignedOnly ? 'flat' : 'outlined'"
        color="primary"
        :prepend-icon="assignedOnly ? 'mdi-check' : 'mdi-account-wrench-outline'"
        height="40"
        class="oc-cta"
        :aria-pressed="assignedOnly"
        data-test="assigned-filter"
        @click="assignedOnly = !assignedOnly"
      >
        Assigned to me
        <v-badge v-if="assignedCount" :content="assignedCount" :color="assignedOnly ? 'surface' : 'primary'" inline />
      </v-btn>
      <!-- Like the vehicle list's "Needs attention": the needs keeping a vehicle off trips. -->
      <v-btn
        :variant="outOfServiceOnly ? 'flat' : 'outlined'"
        color="error"
        :prepend-icon="outOfServiceOnly ? 'mdi-check' : 'mdi-car-off'"
        height="40"
        class="oc-cta"
        :aria-pressed="outOfServiceOnly"
        title="Only needs that take their vehicle out of service"
        data-test="out-of-service-filter"
        @click="outOfServiceOnly = !outOfServiceOnly"
      >
        Out of service
        <v-badge v-if="outOfServiceCount" :content="outOfServiceCount" :color="outOfServiceOnly ? 'surface' : 'error'" inline />
      </v-btn>
    </div>

    <div
      v-if="hidingSome"
      class="d-flex align-center ga-2 mb-2 text-body-medium text-medium-emphasis"
      data-test="result-count"
    >
      Showing {{ searchedNeeds.length }} of {{ visibleNeeds.length }}
      <v-btn variant="text" size="small" color="primary" class="text-none" data-test="clear-filters" @click="clearFilters">
        Clear filters
      </v-btn>
    </div>

    <ListState
      :loading
      :error
      :empty="listEmpty || assignedEmpty"
      :no-results="!searchedNeeds.length"
      :empty-title="assignedEmpty ? 'Nothing to do. Enjoy your day!' : 'No maintenance needs yet'"
      :empty-text="assignedEmpty ? 'Needs assigned to you show up here.' : 'Work planned on vehicles shows up here.'"
      empty-art="maintenance"
      :no-results-title="noResultsTitle"
      no-results-text=""
    >
      <template #empty-actions>
        <v-btn color="primary" variant="elevated" class="oc-cta" v-if="!assignedEmpty" @click="router.push({ name: 'maintenanceNeedCreate' })">+ New Maintenance Need</v-btn>
      </template>
      <v-data-table
        :headers="headers"
        :items="searchedNeeds"
        :items-per-page-options="PAGE_SIZES"
        item-value="id"
      >
        <template #[`item.title`]="{ item }">
          <!-- One line: a long title is cut off (full title on hover); the flag and note count never wrap under it. -->
          <div class="need-title d-flex align-center flex-nowrap ga-2 py-2">
            <router-link
              :to="{ name: 'maintenanceNeedEdit', params: { id: item.id } }"
              class="need-link need-title__text font-weight-medium"
              :title="item.title"
            >
              {{ item.title }}
            </router-link>
            <!--
              UI/UX backlog #27: these needs keep a vehicle off trips, so they stand out. The same icon as the "Out of
              service" filter, not a chip, so the title keeps its room.
            -->
            <v-tooltip v-if="item.outOfService && isOpenNeed(item)" location="top" :text="`Out of service: ${item.vehicle?.universityId ?? 'the vehicle'} can't go on trips`">
              <template #activator="{ props: tooltip }">
                <v-icon
                  v-bind="tooltip"
                  icon="mdi-car-off"
                  color="error"
                  size="small"
                  class="flex-shrink-0"
                  role="img"
                  aria-label="Out of service"
                  data-test="out-of-service"
                />
              </template>
            </v-tooltip>
            <!-- UI/UX backlog #73: which needs have a conversation. -->
            <NoteCount :record="item" class="flex-shrink-0" />
          </div>
        </template>
        <template #[`item.vehicle`]="{ item }">{{ item.vehicle?.universityId }}</template>
        <template #[`item.priority`]="{ item }">
          <v-chip v-if="item.priority !== 'None'" size="small" :color="PRIORITY_COLORS[item.priority]" variant="tonal" label>
            {{ item.priority }}
          </v-chip>
          <span v-else class="text-medium-emphasis">None</span>
        </template>
        <template #[`item.status`]="{ item }">
          <v-chip size="small" :color="STATUS_COLORS[item.status]" variant="tonal" label>{{ needStatusLabel(item.status) }}</v-chip>
        </template>
        <template #[`item.createdAt`]="{ item }">{{ formatDay(item.createdAt) }}</template>
        <template #[`item.assignee`]="{ item }">
          <template v-if="item.assignee">{{ personName(item.assignee) }}</template>
          <span v-else class="text-medium-emphasis">Unassigned</span>
        </template>
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-tooltip text="Create service log" location="top">
              <template #activator="{ props: tooltip }">
                <v-btn v-bind="tooltip"
              icon="mdi-clipboard-plus-outline"
              size="small"
              variant="text"
              aria-label="Create service log"
              @click="openServiceLog(item)"
            />
              </template>
            </v-tooltip>
            <v-tooltip text="Edit maintenance need" location="top">
              <template #activator="{ props: tooltip }">
                <v-btn v-bind="tooltip" icon="mdi-pencil" size="small" variant="text" aria-label="Edit maintenance need" @click="openNeed(item)" />
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table>
    </ListState>

    <ServiceLogFormModal
      v-model="serviceLogOpen"
      :users="serviceUsers"
      :service-types="serviceTypes"
      :maintenance-needs="serviceLogNeed ? [serviceLogNeed] : []"
      :preset-need-id="serviceLogNeed?.id ?? null"
      lock-need
      :save="createServiceLog"
    />
  </PageShell>
</template>

<style scoped>
/* Paired with the column's width: 100%, so the cell shrinks to what's left instead of to its content. */
:deep(.need-title-cell) {
  max-width: 0;
}

.need-title__text {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


.need-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.need-link:hover,
.need-link:focus-visible {
  text-decoration: underline;
}
</style>
