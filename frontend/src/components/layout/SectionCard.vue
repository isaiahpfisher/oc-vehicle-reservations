<script setup>
/**
 * A titled content card (ui-style-system.mdc → Page Shells).
 * Header: title, optional subtitle, optional `#append` (e.g. a CTA — never inside v-card-title).
 * Body: default slot. Footer: `#actions`, right-aligned under a divider (secondary/cancel first, primary last).
 */
defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
});
</script>

<template>
  <v-card>
    <v-card-item v-if="title || subtitle || $slots.append" class="px-6 pt-6 pb-2">
      <v-card-title v-if="title" class="text-title-medium font-weight-bold">{{ title }}</v-card-title>
      <v-card-subtitle v-if="subtitle" class="text-body-medium text-wrap">{{ subtitle }}</v-card-subtitle>
      <template v-if="$slots.append" #append>
        <slot name="append" />
      </template>
    </v-card-item>

    <v-card-text v-if="$slots.default" class="px-6 pb-6">
      <slot />
    </v-card-text>

    <template v-if="$slots.actions">
      <v-divider />
      <v-card-actions class="px-6 py-4">
        <v-spacer />
        <slot name="actions" />
      </v-card-actions>
    </template>
  </v-card>
</template>
