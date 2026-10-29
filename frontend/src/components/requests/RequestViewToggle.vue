<script setup>
/** Table / week / month switch for request lists; sits in the PageShell header actions. */
const view = defineModel({ type: String, default: "table" });
</script>

<template>
  <v-btn-toggle v-model="view" mandatory density="compact" variant="outlined" color="primary" class="request-view-toggle ga-2">
    <v-btn value="table" prepend-icon="mdi-table" class="oc-cta">Table</v-btn>
    <v-btn value="week" prepend-icon="mdi-calendar-week" class="oc-cta">Week</v-btn>
    <v-btn value="month" prepend-icon="mdi-calendar-month" class="oc-cta">Month</v-btn>
  </v-btn-toggle>
</template>

<style scoped>
/* Spaced-out buttons: give each its own full border and radius back from the joined group styling. */
.request-view-toggle :deep(.v-btn) {
  border: thin solid currentColor;
  border-radius: 8px;
}
</style>
