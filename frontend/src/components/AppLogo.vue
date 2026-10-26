<script setup>
/**
 * App logo for the MenuBar and Sidebar (sits on a `primary` background).
 * PLACEHOLDER: "OC" monogram until the official OC logo file is added — put it in `public/`
 * and replace the avatar text with `<v-img src="/oc-logo.svg" alt="Oklahoma Christian University" />`.
 */
defineProps({
  collapsed: Boolean,
});
</script>

<template>
  <div class="d-flex align-center ga-3 text-no-wrap">
    <v-avatar color="white" size="40" rounded="lg">
      <span class="text-primary font-weight-bold">OC</span>
    </v-avatar>
    <div v-if="!collapsed" class="d-flex flex-column text-white">
      <span class="text-title-medium font-weight-bold">Vehicle Registration</span>
      <span class="text-body-small app-logo__subtitle">Oklahoma Christian University</span>
    </div>
  </div>
</template>

<style scoped>
.app-logo__subtitle {
  opacity: 0.8;
}
</style>
