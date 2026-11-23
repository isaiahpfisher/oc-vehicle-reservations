<script setup>
import EmptyIllustration from "./EmptyIllustration.vue";

/**
 * Loading, error, empty, and no-results states for a list (ui-style-system.mdc).
 * UI/UX backlog #46: empty states use the app's own drawings (`emptyArt`), never stock icons, and pages put a
 * create button in `#empty-actions` when the viewer can create something.
 */
defineProps({
  loading: Boolean,
  error: { type: String, default: "" },
  empty: Boolean,
  noResults: Boolean,

  emptyTitle: { type: String, default: "Nothing here yet" },
  emptyText: { type: String, default: "" },
  /** EmptyIllustration name (vehicles, trips, maintenance, logs, people, places, search, soon); none = text only. */
  emptyArt: { type: String, default: "" },
  noResultsTitle: { type: String, default: "No matches" },
  noResultsText: { type: String, default: "Try different search terms." },
  skeletons: { type: Number, default: 5 },
});
</script>

<template>
  <!-- STILL LOADING: UI/UX backlog #52, shaped like the table that's coming, not like an article. -->
  <v-card v-if="loading && empty" flat border>
    <v-skeleton-loader :type="`table-thead, table-row-divider@${skeletons}`" />
  </v-card>

  <!-- ERROR -->
  <v-alert v-else-if="error && empty" type="error" variant="tonal">
    {{ error }}
  </v-alert>

  <!-- NO DATA -->
  <v-empty-state v-else-if="empty" :title="emptyTitle" :text="emptyText" class="list-empty" data-test="list-empty">
    <template v-if="emptyArt" #media>
      <EmptyIllustration :name="emptyArt" />
    </template>
    <template v-if="$slots['empty-actions']" #actions>
      <slot name="empty-actions" />
    </template>
  </v-empty-state>

  <!-- DATA EXISTS, NO SEARCH RESULTS -->
  <template v-else>
    <v-progress-linear :active="loading" indeterminate class="mb-2" />
    <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>

    <v-empty-state v-if="noResults" :title="noResultsTitle" :text="noResultsText" class="list-empty">
      <template #media>
        <EmptyIllustration name="search" />
      </template>
    </v-empty-state>
    <slot v-else />
  </template>
</template>

<style scoped>
.list-empty :deep(.v-empty-state__title) {
  font-size: 1.125rem;
  font-weight: 600;
}

.list-empty :deep(.v-empty-state__text) {
  max-width: 420px;
}
</style>
