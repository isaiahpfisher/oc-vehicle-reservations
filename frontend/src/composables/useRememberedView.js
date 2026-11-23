import { ref, watch } from "vue";

/**
 * UI/UX backlog #50: a page's view choice (table, week, month) that survives leaving and coming back. A per-viewer
 * convenience, so it lives in this browser only; if storage is blocked, the page just starts on `fallback`.
 */
export const useRememberedView = (key, fallback, allowed) => {
  const storageKey = `view:${key}`;
  let initial = fallback;
  try {
    const saved = localStorage.getItem(storageKey);
    if (allowed.includes(saved)) initial = saved;
  } catch {
    // Storage unavailable: use the fallback.
  }

  const view = ref(initial);
  watch(view, (value) => {
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // Storage unavailable: the choice lasts until the page closes.
    }
  });
  return view;
};
