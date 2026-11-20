<script setup>
/**
 * Feature 14 (US-14.6): pick the problem type from four labeled tiles instead of a dropdown.
 * A radio group for assistive tech (arrow keys move the choice); wrapped in VInput so form validation shows its message.
 */
import { ref } from "vue";
import { ISSUE_TYPES, ISSUE_TYPE_DETAILS } from "../../models/issueReports.js";

const type = defineModel({ type: String, default: null });

defineProps({
  rules: { type: Array, default: () => [] },
});

const tiles = ref([]);

const choose = (value) => {
  type.value = value;
};

/** Arrow keys move to the next or previous tile and select it, like native radios. */
const move = (event, index) => {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!step) return;
  event.preventDefault();
  const next = (index + step + ISSUE_TYPES.length) % ISSUE_TYPES.length;
  choose(ISSUE_TYPES[next].value);
  tiles.value[next]?.focus();
};

/** Only the chosen tile (or the first, when none is) is in the tab order. */
const tabStop = (value, index) => (type.value ? (type.value === value ? 0 : -1) : index === 0 ? 0 : -1);
</script>

<template>
  <v-input :model-value="type" :rules hide-details="auto" class="issue-type-picker">
    <div role="radiogroup" aria-label="Problem type" class="tiles">
      <button
        v-for="(option, index) in ISSUE_TYPES"
        :key="option.value"
        ref="tiles"
        type="button"
        role="radio"
        class="tile"
        :class="{ 'tile--selected': type === option.value }"
        :aria-checked="type === option.value"
        :tabindex="tabStop(option.value, index)"
        :data-test="`type-${option.value}`"
        @click="choose(option.value)"
        @keydown="move($event, index)"
      >
        <v-icon :icon="ISSUE_TYPE_DETAILS[option.value].icon" size="28" class="tile__icon" />
        <span class="tile__label">{{ option.title }}</span>
        <span class="tile__hint">{{ ISSUE_TYPE_DETAILS[option.value].hint }}</span>
        <v-icon v-if="type === option.value" icon="mdi-check-circle" size="18" color="primary" class="tile__check" />
      </button>
    </div>
  </v-input>
</template>

<style scoped>
.tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}

@media (min-width: 720px) {
  .tiles {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-height: 112px;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.tile:hover {
  border-color: rgb(var(--v-theme-outline));
}

.tile:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.tile--selected {
  border: 2px solid rgb(var(--v-theme-primary));
  padding: 15px;
  background: rgb(var(--v-theme-primary-container));
}

.tile__icon {
  color: rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}

.tile__label {
  font-weight: 600;
  font-size: 0.9375rem;
}

.tile__hint {
  font-size: 0.8125rem;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.tile__check {
  position: absolute;
  top: 10px;
  right: 10px;
}

/* Errors: outline every tile so the missing choice is obvious. */
.issue-type-picker.v-input--error .tile:not(.tile--selected) {
  border-color: rgb(var(--v-theme-error));
}
</style>
