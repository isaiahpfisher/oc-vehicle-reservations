<script setup>
/**
 * Issue reports list (Feature 10). Feature 14 (US-14.8): search, status and type filters, sortable columns,
 * and only the columns that matter, so the table fits without scrolling sideways. Everything else is on the report page.
 */
import { computed, onMounted, ref, watch } from "vue";
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
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import { useRoles } from "../composables/useRoles.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";

const ITEMS_PER_PAGE = 10;

const { hasAnyRole, user } = useRoles();
const canManage = computed(() => hasAnyRole(["admin", "area_admin"]));
/** Below the md breakpoint, rows stack as cards instead of squeezing five columns. */
const { smAndDown } = useDisplay();

// Fixed widths for the short columns; Issue takes whatever is left and truncates, so nothing scrolls sideways.
const headers = computed(() => [
  { title: "Issue", key: "description" },
  { title: "Vehicle", key: "vehicleName", width: 120, nowrap: true },
  { title: "Status", key: "statusText", width: 136, nowrap: true },
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
const statusFilter = ref(null);
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

const confirmDelete = useConfirm();

const deleteIssueReport = async (report) => {
  const deleted = await confirmDelete({
    title: "Delete issue report",
    message: `Delete "${report.description}"? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => issueReportServices.removeIssueReport(report.id),
  });

  if (deleted) {
    await loadReports();
  }
};

onMounted(loadReports);
</script>

<template>
  <PageShell title="Issue Reports">
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'issueReportCreate' }">+ New Issue Report</v-btn>
    </template>

    <v-row density="comfortable" class="mb-2" data-test="filters">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="search"
          label="Search"
          placeholder="Description, vehicle, person, or trip"
          prepend-inner-icon="mdi-magnify"
          density="comfortable"
          clearable
          hide-details
          data-test="search"
        />
      </v-col>
      <v-col cols="6" md="3">
        <v-select
          v-model="statusFilter"
          :items="statusOptions"
          label="Status"
          placeholder="All statuses"
          persistent-placeholder
          density="comfortable"
          clearable
          hide-details
          data-test="status-filter"
        />
      </v-col>
      <v-col cols="6" md="3">
        <v-select
          v-model="typeFilter"
          :items="typeOptions"
          label="Type"
          placeholder="All types"
          persistent-placeholder
          density="comfortable"
          clearable
          hide-details
          data-test="type-filter"
        />
      </v-col>
    </v-row>

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
      empty-title="No issue reports yet. Create your first issue report."
      empty-icon="mdi-alert-circle-outline"
      no-results-title="No issue reports match"
      no-results-text="Try other words, or clear the filters."
    >
      <v-data-table
        v-model:page="page"
        v-model:sort-by="sortBy"
        :headers="headers"
        :items="filtered"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
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
                  <v-btn
                    v-if="!canManage"
                    icon="mdi-eye-outline"
                    size="small"
                    variant="text"
                    aria-label="View issue report"
                    :to="reportPage(item)"
                  />
                  <template v-else>
                    <v-btn icon="mdi-pencil" size="small" variant="text" aria-label="Edit issue report" :to="reportPage(item)" />
                    <v-btn icon="mdi-delete" size="small" variant="text" aria-label="Delete issue report" @click="deleteIssueReport(item)" />
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
            <v-btn
              v-if="!canManage"
              icon="mdi-eye-outline"
              size="small"
              variant="text"
              aria-label="View issue report"
              :to="reportPage(item)"
            />
            <template v-if="canManage">
              <v-btn icon="mdi-pencil" size="small" variant="text" aria-label="Edit issue report" :to="reportPage(item)" />
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                aria-label="Delete issue report"
                @click="deleteIssueReport(item)"
              />
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
