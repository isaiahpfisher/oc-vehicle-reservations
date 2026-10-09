<script setup>
defineProps({
  loading: Boolean,
  error: { type: String, default: "" },
  empty: Boolean,
  noResults: Boolean,

  emptyTitle: { type: String, default: "Nothing here yet" },
  emptyText: { type: String, default: "" },
  emptyIcon: { type: String, default: "mdi-inbox-outline" },
  noResultsTitle: { type: String, default: "No matches" },
  noResultsText: { type: String, default: "Try different search terms." },
  skeletons: { type: Number, default: 3 },
});
</script>

<template>
  <!-- STILL LOADING -->
  <div v-if="loading && empty" class="d-flex flex-column ga-4">
    <v-skeleton-loader v-for="n in skeletons" :key="n" type="article" />
  </div>

  <!-- ERROR -->
  <v-alert v-else-if="error && empty" type="error" variant="tonal">
    {{ error }}
  </v-alert>

  <!-- NO DATA -->
  <v-empty-state v-else-if="empty" :icon="emptyIcon" :title="emptyTitle" :text="emptyText">
    <template v-if="$slots['empty-actions']" #actions>
      <slot name="empty-actions" />
    </template>
  </v-empty-state>

  <!-- DATA EXISTS, NO SEARCH RESULTS -->
  <template v-else>
    <v-progress-linear :active="loading" indeterminate class="mb-2" />
    <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>

    <v-empty-state v-if="noResults" icon="mdi-magnify" :title="noResultsTitle" :text="noResultsText" />
    <slot v-else />
  </template>
</template>
