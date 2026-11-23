<script setup>
/**
 * UI/UX backlog #46: the app's own empty-state drawings, replacing stock icons. One small, consistent set: the same
 * 128×96 canvas, a soft backdrop, 2px rounded strokes in the theme's primary, and accents in its neutrals. Colors come
 * from theme variables (ui-style-system.mdc). Decorative only: the empty state's title and text carry the meaning.
 */
defineProps({
  /** vehicles | trips | maintenance | logs | people | places | search | soon */
  name: { type: String, required: true },
});
</script>

<template>
  <svg
    class="empty-illustration"
    viewBox="0 0 128 96"
    width="128"
    height="96"
    aria-hidden="true"
    focusable="false"
    fill="none"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <!-- Shared backdrop -->
    <ellipse class="ei-backdrop" cx="64" cy="52" rx="54" ry="38" />
    <ellipse class="ei-shadow" cx="64" cy="82" rx="36" ry="4" />

    <!-- A van -->
    <g v-if="name === 'vehicles'" class="ei-line">
      <path class="ei-fill" d="M28 66V44a6 6 0 0 1 6-6h40l14 12h8a4 4 0 0 1 4 4v12a2 2 0 0 1-2 2H30a2 2 0 0 1-2-2Z" />
      <path d="M74 38v12h22" />
      <path class="ei-glass" d="M36 44h12v8H36zM54 44h14v8H54z" />
      <circle class="ei-wheel" cx="44" cy="70" r="7" />
      <circle class="ei-wheel" cx="86" cy="70" r="7" />
      <path class="ei-accent" d="M98 58h4" />
    </g>

    <!-- A route: start, dashed path, pin -->
    <g v-else-if="name === 'trips'" class="ei-line">
      <circle class="ei-fill" cx="34" cy="64" r="6" />
      <path class="ei-dash" d="M40 62c14-6 18-26 34-22s14 16 18 6" />
      <path class="ei-fill" d="M92 26a10 10 0 0 0-10 10c0 8 10 18 10 18s10-10 10-18a10 10 0 0 0-10-10Z" />
      <circle class="ei-accent-dot" cx="92" cy="36" r="3" />
    </g>

    <!-- A wrench over a clipboard -->
    <g v-else-if="name === 'maintenance'" class="ei-line">
      <rect class="ei-fill" x="36" y="22" width="44" height="56" rx="4" />
      <path class="ei-fill" d="M50 18h16v8H50z" />
      <path class="ei-muted" d="M44 38h28M44 46h20M44 54h24" />
      <path class="ei-fill" d="M84 46l-12 12 4 4 12-12a8 8 0 0 0 10-10l-5 5-4-1-1-4 5-5a8 8 0 0 0-10 10Z" />
    </g>

    <!-- A logbook with an odometer dial -->
    <g v-else-if="name === 'logs'" class="ei-line">
      <rect class="ei-fill" x="30" y="24" width="40" height="52" rx="4" />
      <path d="M38 24v52" />
      <path class="ei-muted" d="M46 36h16M46 44h16M46 52h10" />
      <circle class="ei-fill" cx="88" cy="56" r="16" />
      <path d="M88 56l7-7" />
      <path class="ei-muted" d="M76 56h3M97 56h3M88 44v3" />
    </g>

    <!-- Two people -->
    <g v-else-if="name === 'people'" class="ei-line">
      <circle class="ei-fill" cx="50" cy="40" r="10" />
      <path class="ei-fill" d="M32 72a18 18 0 0 1 36 0Z" />
      <circle class="ei-fill" cx="80" cy="44" r="8" />
      <path class="ei-fill" d="M66 72a14 14 0 0 1 28 0Z" />
    </g>

    <!-- A folded map with a pin -->
    <g v-else-if="name === 'places'" class="ei-line">
      <path class="ei-fill" d="M28 34l20-8 22 8 22-8v42l-22 8-22-8-20 8Z" />
      <path class="ei-muted" d="M48 26v42M70 34v42" />
      <path class="ei-fill" d="M70 30a8 8 0 0 0-8 8c0 6 8 14 8 14s8-8 8-14a8 8 0 0 0-8-8Z" />
      <circle class="ei-accent-dot" cx="70" cy="38" r="2.5" />
    </g>

    <!-- A magnifier over nothing -->
    <g v-else-if="name === 'search'" class="ei-line">
      <rect class="ei-fill" x="30" y="28" width="44" height="44" rx="4" />
      <path class="ei-muted" d="M38 40h20M38 48h28M38 56h14" />
      <circle class="ei-glass" cx="80" cy="52" r="14" />
      <path d="M90 62l10 10" />
    </g>

    <!-- A calendar page with a clock: coming soon -->
    <g v-else class="ei-line">
      <rect class="ei-fill" x="32" y="26" width="46" height="46" rx="4" />
      <path d="M32 38h46M44 22v8M66 22v8" />
      <path class="ei-muted" d="M40 48h8M54 48h8M40 58h8" />
      <circle class="ei-fill" cx="84" cy="62" r="12" />
      <path d="M84 56v6l4 3" />
    </g>
  </svg>
</template>

<style scoped>
.empty-illustration {
  display: block;
  margin: 0 auto 8px;
}

.ei-backdrop {
  fill: rgba(var(--v-theme-primary-container), 0.55);
}

.ei-shadow {
  fill: rgba(var(--v-theme-on-surface), 0.06);
}

.ei-line {
  stroke: rgb(var(--v-theme-primary));
}

.ei-fill {
  fill: rgb(var(--v-theme-surface));
}

.ei-glass {
  fill: rgba(var(--v-theme-primary-container), 0.9);
}

.ei-wheel {
  fill: rgb(var(--v-theme-surface-variant));
}

.ei-muted {
  stroke: rgba(var(--v-theme-primary), 0.35);
}

.ei-dash {
  stroke-dasharray: 4 5;
}

.ei-accent,
.ei-accent-dot {
  stroke: rgb(var(--v-theme-secondary));
  fill: rgb(var(--v-theme-secondary));
}
</style>
