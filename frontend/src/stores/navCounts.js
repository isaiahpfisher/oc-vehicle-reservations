import { ref } from "vue";
import { defineStore } from "pinia";
import navCountServices from "../services/navCountServices.js";
import "./index.js";

/**
 * UI/UX backlog #15: the numbers on Sidebar links (`meta.badge` names the key). Refreshed when the Sidebar mounts and
 * after each navigation, so finishing something elsewhere updates the badge. A failed refresh keeps the last numbers.
 */
export const useNavCountsStore = defineStore("navCounts", () => {
  const counts = ref({});
  let latest = 0;

  const refresh = async () => {
    const id = ++latest;
    try {
      const { data } = await navCountServices.getNavCounts();
      if (id === latest) counts.value = data ?? {};
    } catch {
      // Badges are a hint; the pages themselves show errors.
    }
  };

  const countFor = (key) => (key ? (counts.value[key] ?? 0) : 0);

  return { counts, refresh, countFor };
});
