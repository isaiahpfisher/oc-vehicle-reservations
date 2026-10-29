<script setup>
import { computed } from "vue";
import { statusMeta } from "../../models/requests.js";

const props = defineProps({
  status: { type: String, required: true },
  size: { type: String, default: "small" },
});

const meta = computed(() => statusMeta(props.status));
</script>

<template>
  <v-chip :color="meta.color" :prepend-icon="meta.icon" :size variant="tonal" label>{{ meta.label }}</v-chip>
</template>
