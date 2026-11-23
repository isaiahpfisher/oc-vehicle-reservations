<script setup>
/**
 * Table / week / month switch for any list with a calendar (like the request lists' `RequestViewToggle`). Lists of
 * whole-day things (service visits) leave out `week`: its hour grid would sit empty.
 */
const view = defineModel({ type: String, default: "table" });
defineProps({
  views: { type: Array, default: () => ["table", "week", "month"] },
});

const BUTTONS = {
  table: { icon: "mdi-table", label: "Table" },
  week: { icon: "mdi-calendar-week", label: "Week" },
  month: { icon: "mdi-calendar-month", label: "Month" },
};
</script>

<template>
  <v-btn-toggle v-model="view" mandatory density="compact" variant="outlined" color="primary" class="oc-spaced-toggle" data-test="view-toggle">
    <v-btn v-for="name in views" :key="name" :value="name" :prepend-icon="BUTTONS[name].icon" class="oc-cta" :data-test="`view-${name}`">
      {{ BUTTONS[name].label }}
    </v-btn>
  </v-btn-toggle>
</template>
