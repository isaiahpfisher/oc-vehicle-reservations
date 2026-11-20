<script setup>
import { computed } from "vue";
import { vehicleStatusMeta } from "../../models/vehicles.js";

/** Feature 18: one of the six vehicle statuses (FR-002). */
const props = defineProps({
  status: { type: String, default: null },
  size: { type: String, default: "small" },
});

const meta = computed(() => vehicleStatusMeta(props.status));
</script>

<template>
  <v-chip
    :color="meta.color"
    :prepend-icon="meta.icon"
    :size
    variant="tonal"
    label
    class="vehicle-status-chip"
    :data-status="status"
  >
    {{ meta.label }}
  </v-chip>
</template>
