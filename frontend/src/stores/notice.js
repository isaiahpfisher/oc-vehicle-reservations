import { ref } from "vue";
import { defineStore } from "pinia";
import "./index.js";

/**
 * UI/UX backlog #48: the app's one success toast. Any page calls `notify("Vehicle saved.")`; App.vue shows it.
 * It lives in a store so a page can notify and then navigate away, and the toast still shows on the next page.
 */
export const useNoticeStore = defineStore("notice", () => {
  const message = ref("");
  const color = ref("success");
  /** Bumps on every notice, so the same text twice in a row still shows again. */
  const key = ref(0);

  const notify = (text, { tone = "success" } = {}) => {
    message.value = text;
    color.value = tone;
    key.value += 1;
  };

  const clear = () => {
    message.value = "";
  };

  return { message, color, key, notify, clear };
});
