<script setup>
/**
 * Issue reports list (Feature 10). Feature 14 (US-14.8): search, status and type filters, sortable columns,
 * and only the columns that matter, so the table fits without scrolling sideways. Everything else is on the report page.
 */
import { computed, onMounted, ref, watch } from "vue";
import { PAGE_SIZES } from "../utils/lists.js";
import { useDisplay } from "vuetify";
import issueReportServices from "../services/issueReportServices.js";
import {
  ISSUE_STATUSES,
  ISSUE_TYPES,
  ISSUE_TYPE_DETAILS,
  personName,
  statusDetails,
  statusLabel,
  typeLabel,
} from "../models/issueReports.js";
import { useRequest } from "../composables/useRequest.js";
import { useRoles } from "../composables/useRoles.js";
import ListState from "../components/common/ListState.vue";
import NoteCount from "../components/common/NoteCount.vue";
import PageShell from "../components/layout/PageShell.vue";

const { hasAnyRole, user } = useRoles();
const canManage = computed(() => hasAnyRole(["admin", "area_admin"]));
/** Below the md breakpoint, rows stack as cards instead of squeezing five columns. */
const { smAndDown } = useDisplay();

// Fixed widths for the short columns; Issue takes whatever is left and truncates, so nothing scrolls sideways.
const headers = computed(() => [
  { title: "Issue", key: "description" },
  { title: "Vehicle", key: "vehicleName", width: 120, nowrap: true },
  // Wide enough for the longest chip ("Moved to maintenance", icon included) so it never crops.
  { title: "Status", key: "statusText", width: 216, nowrap: true },
  { title: "Reported", key: "createdAt", width: 136, nowrap: true },
  { title: "Actions", key: "actions", sortable: false, align: "end", width: canManage.value ? 104 : 72, nowrap: true },
]);

/** Feature 14 (US-14.6): reports are created, viewed, and edited on their own page. */
const reportPage = (report) => ({ name: "issueReport", params: { issueReportId: report.id } });

const {
  data: issueReports,
  loading,
  error,
  run: getIssueReports,
} = useRequest(
  (params) => issueReportServices.getIssueReports(params),
  { initial: [], fallback: "Failed to fetch issue reports." },
);

const loadReports = () => {
  if (canManage.value) {
    return getIssueReports();
  }

  return getIssueReports({ userId: user.value?.userId });
};

const search = ref("");
// Pending first: those still need someone. Clearing the filter (or "Clear filters") shows every status.
const statusFilter = ref("pending");
const typeFilter = ref(null);
const page = ref(1);
const sortBy = ref([{ key: "createdAt", order: "desc" }]);

const statusOptions = ISSUE_STATUSES;
const typeOptions = ISSUE_TYPES;

const rows = computed(() =>
  issueReports.value.map((report) => ({
    ...report,
    vehicleName: report.vehicle?.universityId ?? "",
    statusText: statusLabel(report.status),
    search: [
      report.description,
      typeLabel(report.type),
      statusLabel(report.status),
      report.vehicle?.universityId,
      personName(report.author),
      personName(report.assignee),
      report.vehicleRequest?.purpose,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  })),
);

const filtered = computed(() => {
  const words = search.value?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  return rows.value.filter(
    (row) =>
      (!statusFilter.value || row.status === statusFilter.value) &&
      (!typeFilter.value || row.type === typeFilter.value) &&
      words.every((word) => row.search.includes(word)),
  );
});

const filtering = computed(() => !!search.value?.trim() || !!statusFilter.value || !!typeFilter.value);
/** Only the starting Pending filter is on, so an empty list means nothing's waiting, not a search that missed. */
const onlyPending = computed(() => statusFilter.value === "pending" && !search.value?.trim() && !typeFilter.value);

const clearFilters = () => {
  search.value = "";
  statusFilter.value = null;
  typeFilter.value = null;
};

// Changing what's shown starts again at page 1 (ui-style-system.mdc → List page conventions).
watch([search, statusFilter, typeFilter], () => {
  page.value = 1;
});

const formatDay = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

onMounted(loadReports);
</script>

<template>
  <PageShell title="Issue Reports">
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'issueReportCreate' }">+ New Issue Report</v-btn>
    </template>

    <div class="oc-list-toolbar" data-test="filters">
      <v-text-field
        v-model="search"
        placeholder="Search by description, vehicle, person, or trip"
        aria-label="Search issue reports"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        clearable
        hide-details
        class="oc-list-search"
        data-test="search"
      />
      <v-select
        v-model="statusFilter"
        :items="statusOptions"
        label="Status"
        placeholder="All statuses"
        persistent-placeholder
        variant="outlined"
        density="compact"
        clearable
        hide-details
        class="oc-list-filter"
        data-test="status-filter"
      />
      <v-select
        v-model="typeFilter"
        :items="typeOptions"
        label="Type"
        placeholder="All types"
        persistent-placeholder
        variant="outlined"
        density="compact"
        clearable
        hide-details
        class="oc-list-filter"
        data-test="type-filter"
      />
    </div>

    <!-- Outside ListState so "Clear filters" stays reachable when nothing matches. -->
    <div
      v-if="filtering && issueReports.length"
      class="d-flex align-center ga-2 mb-2 text-body-medium text-medium-emphasis"
      data-test="result-count"
    >
      Showing {{ filtered.length }} of {{ issueReports.length }}
      <v-btn variant="text" size="small" color="primary" class="text-none" data-test="clear-filters" @click="clearFilters">
        Clear filters
      </v-btn>
    </div>

    <ListState
      :loading
      :error
      :empty="!issueReports.length"
      :no-results="!filtered.length"
      empty-title="No issue reports"
      empty-text="Problems reported with vehicles show up here."
      empty-art="maintenance"
      :no-results-title="onlyPending ? 'No pending issue reports' : 'No issue reports match'"
      :no-results-text="onlyPending ? 'Everything reported has been handled. Clear the filters to see past reports.' : 'Try other words, or clear the filters.'"
    >
      <template #empty-actions>
        <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'issueReportCreate' }">+ New Issue Report</v-btn>
      </template>
      <v-data-table
        v-model:page="page"
        v-model:sort-by="sortBy"
        :headers="headers"
        :items="filtered"
        :items-per-page-options="PAGE_SIZES"
        must-sort
        item-value="id"
        hover
        :mobile="smAndDown"
        class="issue-table"
      >
        <!-- Phones: one compact row per report instead of five stacked label/value lines. -->
        <template v-if="smAndDown" #item="{ item }">
          <tr class="issue-mobile-row" data-test="issue-mobile-row">
            <td :colspan="headers.length">
              <div class="d-flex ga-3 py-3">
                <v-avatar color="primary-container" size="36" class="flex-shrink-0">
                  <v-icon :icon="ISSUE_TYPE_DETAILS[item.type]?.icon" color="primary" size="20" />
                </v-avatar>
                <div class="issue-cell__text">
                  <router-link :to="reportPage(item)" class="issue-link issue-link--wrap" :title="item.description">
                    {{ item.description }}
                  </router-link>
                  <div class="text-body-small text-medium-emphasis text-truncate">
                    {{ typeLabel(item.type) }} · {{ personName(item.author) }}
                <NoteCount :record="item" class="ml-1" />
                  </div>
                  <div class="d-flex align-center flex-wrap ga-2 mt-2 text-body-small text-medium-emphasis">
                    <v-chip
                      :color="statusDetails(item.status).color"
                      :prepend-icon="statusDetails(item.status).icon"
                      size="x-small"
                      variant="tonal"
                      label
                    >
                      {{ item.statusText }}
                    </v-chip>
                    <span>{{ item.vehicleName }}</span>
                    <span aria-hidden="true">·</span>
                    <span>{{ formatDay(item.createdAt) }}</span>
                  </div>
                </div>
                <div class="d-flex flex-column align-end flex-shrink-0">
                  <v-tooltip v-if="!canManage" text="View issue report" location="top">
                    <template #activator="{ props: tooltip }">
                      <v-btn v-bind="tooltip"
                   
                    icon="mdi-eye-outline"
                    size="small"
                    variant="text"
                    aria-label="View issue report"
                    :to="reportPage(item)"
                  />
                    </template>
                  </v-tooltip>
                  <template v-else>
                    <v-tooltip text="Edit issue report" location="top">
                      <template #activator="{ props: tooltip }">
                        <v-btn v-bind="tooltip" icon="mdi-pencil" size="small" variant="text" aria-label="Edit issue report" :to="reportPage(item)" />
                      </template>
                    </v-tooltip>
                  </template>
                </div>
              </div>
            </td>
          </tr>
        </template>
        <template #[`item.description`]="{ item }">
          <div class="d-flex align-center ga-3 py-2 issue-cell">
            <v-avatar color="primary-container" size="36" class="flex-shrink-0">
              <v-icon :icon="ISSUE_TYPE_DETAILS[item.type]?.icon" color="primary" size="20" />
            </v-avatar>
            <div class="issue-cell__text">
              <!-- Feature 14 (US-14.6): the description links to the issue report page. -->
              <router-link :to="reportPage(item)" class="issue-link d-block text-truncate" :title="item.description">
                {{ item.description }}
              </router-link>
              <div class="text-body-small text-medium-emphasis text-truncate">
                {{ typeLabel(item.type) }} · {{ personName(item.author) }}
                <NoteCount :record="item" class="ml-1" />
              </div>
            </div>
          </div>
        </template>
        <template #[`item.statusText`]="{ item }">
          <v-chip
            :color="statusDetails(item.status).color"
            :prepend-icon="statusDetails(item.status).icon"
            size="small"
            variant="tonal"
            label
          >
            {{ item.statusText }}
          </v-chip>
        </template>
        <template #[`item.createdAt`]="{ item }">{{ formatDay(item.createdAt) }}</template>
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-tooltip v-if="!canManage" text="View issue report" location="top">
              <template #activator="{ props: tooltip }">
                <v-btn v-bind="tooltip"
             
              icon="mdi-eye-outline"
              size="small"
              variant="text"
              aria-label="View issue report"
              :to="reportPage(item)"
            />
              </template>
            </v-tooltip>
            <template v-if="canManage">
              <v-tooltip text="Edit issue report" location="top">
                <template #activator="{ props: tooltip }">
                  <v-btn v-bind="tooltip" icon="mdi-pencil" size="small" variant="text" aria-label="Edit issue report" :to="reportPage(item)" />
                </template>
              </v-tooltip>
            </template>
          </div>
        </template>
      </v-data-table>
    </ListState>
  </PageShell>
</template>

<style scoped>
/* The issue column takes the room that's left and truncates, so the table never scrolls sideways. */
.issue-table:not(.v-table--mobile) :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.issue-cell {
  min-width: 0;
}

.issue-cell__text {
  min-width: 0;
  flex: 1 1 auto;
}

/* The brand maroon like the other tables' record links, not the browser's default blue; underline on hover and focus. */
.issue-link {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
  text-decoration: none;
}

/* On phones the description may take two lines rather than being cut to a few words. */
.issue-link--wrap {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.issue-mobile-row td {
  width: 100%;
  max-width: 0;
}

.issue-link:hover,
.issue-link:focus-visible {
  text-decoration: underline;
}
</style>
