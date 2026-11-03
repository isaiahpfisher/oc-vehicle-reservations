<script setup>
/**
 * One titled group of fields on a form page (ui-style-system.mdc → Page Shells).
 * Title and description on the left, fields (default slot) on the right, vertically centered beside them;
 * stacks on small screens. Consecutive sections are separated by a divider.
 */
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
});
</script>

<template>
  <v-row tag="section" align="center" class="form-section py-6">
    <v-col cols="12" md="4">
      <h3 class="text-title-medium font-weight-bold mt-0 mb-1">{{ title }}</h3>
      <p v-if="subtitle" class="text-body-medium text-medium-emphasis mb-0">{{ subtitle }}</p>
    </v-col>
    <v-col cols="12" md="8">
      <slot />
    </v-col>
  </v-row>
</template>

<style scoped>
.form-section + .form-section {
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
