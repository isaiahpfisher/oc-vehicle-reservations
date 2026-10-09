<script setup>
import { computed } from "vue";
import ConfirmModal from "./ConfirmModal.vue";
import { useConfirmState } from "../../composables/useConfirm.js";

const { state, accept, cancel } = useConfirmState();

const modalProps = computed(() => {
  const { onConfirm, ...rest } = state.options;
  return rest;
});
</script>

<template>
  <ConfirmModal
    v-bind="modalProps"
    :model-value="state.open"
    :loading="state.loading"
    :error="state.error"
    @update:model-value="(open) => !open && cancel()"
    @confirm="accept"
  />
</template>
