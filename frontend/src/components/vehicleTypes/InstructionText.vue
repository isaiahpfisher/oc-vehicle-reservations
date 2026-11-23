<script setup>
/**
 * Pickup and return instructions with their variables made visible. By default a variable shows as a highlighted label
 * ("Vehicle"), so it reads as "filled in for each trip"; `preview` shows what a sample trip fills in instead. A name
 * that isn't a variable is marked as an error.
 */
import { computed } from "vue";
import { instructionParts } from "../../models/instructionVariables.js";

const props = defineProps({
  content: { type: String, default: "" },
  /** Fill variables in with the sample trip, like a driver would see them. */
  preview: Boolean,
  /** With `preview`: the sample trip has two vehicles of this type. */
  many: Boolean,
});

const parts = computed(() => instructionParts(props.content));
const sampleFor = (part) => (props.many ? part.variable.sampleMany : undefined) ?? part.variable.sample;
</script>

<template>
  <p class="instruction-text">
    <template v-for="(part, i) in parts" :key="i">
      <template v-if="part.name === undefined">{{ part.text }}</template>
      <span
        v-else-if="!part.variable"
        class="instruction-variable instruction-variable--unknown"
        :title="`${part.text} isn't a variable`"
        data-test="unknown-variable"
        >{{ part.text }}</span
      >
      <span v-else-if="preview" class="instruction-filled" :title="`From ${part.text}`" data-test="filled-variable">{{ sampleFor(part) }}</span>
      <span
        v-else
        class="instruction-variable"
        :title="`${part.text}: ${part.variable.description}, filled in for each trip`"
        data-test="instruction-variable"
        >{{ part.variable.label }}</span
      >
    </template>
  </p>
</template>

<style scoped>
.instruction-text {
  white-space: pre-line;
  margin: 0;
}

/* A label, not text: tinted and slightly smaller, so it reads as a slot the trip fills in. */
.instruction-variable {
  display: inline-block;
  padding: 0 6px;
  border-radius: 6px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-size: 0.92em;
  font-weight: 500;
  line-height: 1.5;
}

.instruction-variable--unknown {
  background: rgba(var(--v-theme-error), 0.1);
  color: rgb(var(--v-theme-error));
  text-decoration: underline wavy;
}

.instruction-filled {
  background: rgba(var(--v-theme-primary), 0.08);
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.45);
  border-radius: 2px;
  padding: 0 2px;
}
</style>
