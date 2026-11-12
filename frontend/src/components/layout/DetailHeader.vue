<script setup>
/**
 * Identity card at the top of a detail page (ui-style-system.mdc → Page Shells).
 * Avatar (initials or icon), h2 title, subtitle, small meta line, and `#append` for status chips.
 */
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  meta: { type: String, default: "" },
  /** Shown in the avatar; falls back to `icon`. */
  initials: { type: String, default: "" },
  icon: { type: String, default: "mdi-information-outline" },
});
</script>

<template>
  <v-card class="detail-header">
    <v-card-text class="d-flex flex-wrap align-center ga-4 pa-6">
      <slot name="avatar">
        <v-avatar color="primary-container" size="64">
          <span v-if="initials" class="text-primary text-title-large font-weight-bold">{{ initials }}</span>
          <v-icon v-else :icon color="primary" size="32" />
        </v-avatar>
      </slot>

      <div class="flex-grow-1">
        <h2 class="text-headline-small font-weight-bold my-0">{{ title }}</h2>
        <div v-if="subtitle" class="text-body-medium text-medium-emphasis">{{ subtitle }}</div>
        <div v-if="meta" class="text-body-small text-medium-emphasis mt-1">{{ meta }}</div>
      </div>

      <div v-if="$slots.append" class="d-flex flex-wrap ga-1">
        <slot name="append" />
      </div>
    </v-card-text>
  </v-card>
</template>
