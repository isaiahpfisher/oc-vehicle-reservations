import { onBeforeUnmount, onMounted, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { useConfirm } from "./useConfirm.js";

/**
 * UI/UX backlog #31: ask before leaving a form with unsaved changes (the issue report page's guard, shared).
 * - Leaving through the router asks "Discard changes?"; the browser warns on reload or close.
 * - Call `allowLeave()` right before navigating away on purpose (after a save, or from Cancel) to skip the question.
 *
 * `dirty` is a ref/computed that's true while the form differs from what was loaded or saved.
 */
export const useUnsavedChanges = (dirty, { message = "You have unsaved changes. Leave and discard them?" } = {}) => {
  const confirm = useConfirm();
  const leaving = ref(false);

  const allowLeave = () => {
    leaving.value = true;
  };

  onBeforeRouteLeave(() => {
    if (leaving.value || !dirty.value) return true;
    return confirm({
      title: "Discard changes?",
      message,
      confirmText: "Discard Changes",
      cancelText: "Keep Editing",
      confirmColor: "error",
    });
  });

  const warnOnUnload = (event) => {
    if (dirty.value && !leaving.value) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  onMounted(() => window.addEventListener("beforeunload", warnOnUnload));
  onBeforeUnmount(() => window.removeEventListener("beforeunload", warnOnUnload));

  return { allowLeave };
};
