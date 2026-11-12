<script setup>
/** Placeholder for a section a later feature fills in. */
defineProps({
  text: { type: String, default: "" },
  icon: { type: String, default: "mdi-progress-clock" },
  compact: Boolean,
});
</script>

<template>
  <div v-if="compact" class="d-flex align-start ga-3 text-medium-emphasis">
    <v-icon :icon size="20" class="mt-1" />
    <div>
      <div class="text-title-small font-weight-bold">Coming soon</div>
      <div v-if="text" class="text-body-medium">{{ text }}</div>
    </div>
  </div>
  <v-empty-state v-else :icon title="Coming soon" :text />
</template>
