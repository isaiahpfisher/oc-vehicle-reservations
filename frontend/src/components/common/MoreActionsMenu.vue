<script setup>
/**
 * UI/UX backlog #36: the ⋮ menu at the top right of a detail page. Destructive actions (delete) live here instead of a
 * trash icon on every list row, so they're one deliberate step away and never mistaken for edit.
 *
 * Pass the menu's items as `v-list-item`s in the default slot; give a delete item `base-color="error"`.
 */
</script>

<template>
  <v-menu location="bottom end">
    <template #activator="{ props: menu }">
      <v-btn v-bind="menu" icon="mdi-dots-vertical" variant="text" aria-label="More actions" data-test="more-actions" />
    </template>
    <v-list density="compact" min-width="220">
      <slot />
    </v-list>
  </v-menu>
</template>
