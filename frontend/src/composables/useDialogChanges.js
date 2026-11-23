import { computed, nextTick, ref, watch } from "vue";

/**
 * UI/UX backlog #31: true once a dialog's contents differ from when it opened, so the dialog can turn `persistent`
 * and a stray click outside it doesn't throw the typing away. Cancel still closes it.
 * `current` returns what the dialog would save (plain, JSON-able values).
 */
export const useDialogChanges = (open, current) => {
  const opened = ref("");

  // After the dialog's own open watcher has filled in the form.
  watch(open, async (isOpen) => {
    await nextTick();
    opened.value = isOpen ? JSON.stringify(current()) : "";
  });

  return computed(() => !!opened.value && JSON.stringify(current()) !== opened.value);
};
