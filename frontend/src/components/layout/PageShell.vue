<script setup>
/**
 * Every routed view's outer frame (ui-style-system.mdc → Page Shells).
 * Container + breadcrumbs + h2 title/subtitle + header actions, and whole-page loading/error states.
 * List pages keep `loading`/`error` off and use ListState for the list instead, so filters stay visible.
 */
defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  /** Vuetify breadcrumb items; required on nested pages. */
  breadcrumbs: { type: Array, default: () => [] },
  /** Whole-page load in progress: shows the `loading` slot (or a default skeleton) instead of content. */
  loading: Boolean,
  /** Whole-page load failed: shows an error alert instead of content. */
  error: { type: String, default: "" },
  /** Narrow single-column pages (e.g. forms): content max width in px. */
  maxWidth: { type: [Number, String], default: null },
});
</script>

<template>
  <v-container class="py-8" :class="{ 'page-shell--narrow': maxWidth }" :style="maxWidth ? { maxWidth: `${maxWidth}px` } : undefined">
    <v-breadcrumbs v-if="breadcrumbs.length" :items="breadcrumbs" class="px-0 pt-0" />

    <div v-if="title || $slots.actions" class="d-flex flex-wrap align-center ga-4 mb-6">
      <div class="flex-grow-1">
        <h2 v-if="title" class="text-headline-large font-weight-bold my-0">{{ title }}</h2>
        <p v-if="subtitle" class="text-body-large text-medium-emphasis mt-1 mb-0">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="d-flex flex-wrap ga-2">
        <slot name="actions" />
      </div>
    </div>

    <slot v-if="loading" name="loading">
      <v-card><v-skeleton-loader type="heading, paragraph" /></v-card>
    </slot>
    <v-alert v-else-if="error" type="error" density="compact">{{ error }}</v-alert>
    <slot v-else />
  </v-container>
</template>

<style scoped>
.page-shell--narrow {
  margin-inline: 0;
}
</style>
