<script setup>
/**
 * Detail page body (ui-style-system.mdc → Page Shells): `#header` (usually DetailHeader) on top,
 * then a narrow `#aside` column (what the record is / settings, as SectionCards) beside the wide
 * default slot (what happened to it: tabs, tables). Stacks on small screens.
 */
</script>

<template>
  <div class="d-flex flex-column ga-6">
    <slot name="header" />

    <v-row>
      <v-col v-if="$slots.aside" cols="12" md="4" class="d-flex flex-column ga-6">
        <slot name="aside" />
      </v-col>
      <v-col cols="12" :md="$slots.aside ? 8 : 12" class="d-flex flex-column ga-6">
        <slot />
      </v-col>
    </v-row>
  </div>
</template>
