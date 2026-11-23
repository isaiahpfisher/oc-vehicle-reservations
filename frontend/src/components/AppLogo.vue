<script setup>
/**
 * App logo for the MenuBar and Sidebar (sits on a `primary` background).
 * UI/UX backlog #43: the OC Vehicles mark (BrandMark.vue) with the app's name.
 */
import BrandMark from "./BrandMark.vue";

defineProps({
  collapsed: Boolean,
});
</script>

<template>
  <div class="d-flex align-center ga-3 text-no-wrap">
    <BrandMark :size="40" inverse />
    <div v-if="!collapsed" class="d-flex flex-column text-white">
      <span class="text-title-medium font-weight-bold">OC Vehicles</span>
      <span class="text-body-small app-logo__subtitle">Oklahoma Christian University</span>
    </div>
  </div>
</template>

<style scoped>
.app-logo__subtitle {
  opacity: 0.8;
}
</style>
