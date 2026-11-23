<script setup>
/**
 * UI/UX backlog #73: a small "has notes" marker for list rows, so people can spot conversations without opening each
 * record. Shows nothing when the record has no notes. `record` carries `noteCount` and `lastNoteAt` from the list API.
 */
import { computed } from "vue";

const props = defineProps({ record: { type: Object, required: true } });

const count = computed(() => Number(props.record.noteCount) || 0);
const label = computed(() => {
  const notes = `${count.value} ${count.value === 1 ? "note" : "notes"}`;
  if (!props.record.lastNoteAt) return notes;
  const latest = new Date(props.record.lastNoteAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${notes}, latest ${latest}`;
});
</script>

<template>
  <v-tooltip v-if="count" :text="label" location="top">
    <template #activator="{ props: tooltip }">
      <span v-bind="tooltip" class="note-count text-medium-emphasis" :aria-label="label" data-test="note-count">
        <v-icon icon="mdi-comment-text-outline" size="14" />
        {{ count }}
      </span>
    </template>
  </v-tooltip>
</template>

<style scoped>
.note-count {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.75rem;
  white-space: nowrap;
}
</style>
