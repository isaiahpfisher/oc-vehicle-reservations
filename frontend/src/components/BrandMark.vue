<script setup>
/**
 * UI/UX backlog #43: the OC Vehicles mark, a van on the road in a rounded tile. Same drawing as `public/favicon.svg`.
 * `inverse` draws a white tile with a maroon van, for use on the maroon sidebar and menu bar.
 */
defineProps({
  size: { type: [Number, String], default: 40 },
  inverse: Boolean,
});
</script>

<template>
  <svg
    class="brand-mark"
    :class="{ 'brand-mark--inverse': inverse }"
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    role="img"
    aria-label="OC Vehicles"
  >
    <rect class="brand-mark__tile" width="64" height="64" rx="14" />
    <path class="brand-mark__road" d="M8 50h48" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="6 5" fill="none" />
    <path
      class="brand-mark__van"
      d="M9 41V25a4 4 0 0 1 4-4h27.5a4 4 0 0 1 2.9 1.2L51 30h2a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2Z"
    />
    <rect class="brand-mark__cut" x="14" y="25" width="9" height="7" rx="1.5" />
    <rect class="brand-mark__cut" x="26" y="25" width="9" height="7" rx="1.5" />
    <path class="brand-mark__cut" d="M38 25h2.4a2 2 0 0 1 1.4.6l5.8 6.4H38Z" />
    <circle class="brand-mark__wheel" cx="19" cy="43" r="5.5" stroke-width="2.5" />
    <circle class="brand-mark__wheel" cx="45" cy="43" r="5.5" stroke-width="2.5" />
  </svg>
</template>

<style scoped>
.brand-mark {
  --tile: rgb(var(--v-theme-primary));
  --ink: #ffffff;
  --road: rgb(var(--v-theme-primary-container));
  display: block;
  flex-shrink: 0;
}

.brand-mark--inverse {
  --tile: #ffffff;
  --ink: rgb(var(--v-theme-primary));
  --road: rgba(var(--v-theme-primary), 0.35);
}

.brand-mark__tile,
.brand-mark__cut {
  fill: var(--tile);
}

.brand-mark__van {
  fill: var(--ink);
}

.brand-mark__road {
  stroke: var(--road);
}

.brand-mark__wheel {
  fill: var(--tile);
  stroke: var(--ink);
}
</style>
