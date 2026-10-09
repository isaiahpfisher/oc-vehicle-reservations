import { ref, shallowRef } from "vue";
import Utils from "../config/utils";

export const useRequest = (
  request,
  { fallback = "Something went wrong.", initial = null, select = (res) => res?.data } = {},
) => {
  const data = shallowRef(initial);
  const loading = ref(false);
  const error = ref("");
  let latest = 0;

  const run = async (...args) => {
    const id = ++latest;
    loading.value = true;
    error.value = "";

    try {
      const result = select(await request(...args));
      if (id === latest) data.value = result;
      return true;
    } catch (e) {
      if (id === latest) error.value = Utils.errorMessage(e, fallback);
      return false;
    } finally {
      if (id === latest) loading.value = false;
    }
  };

  return { data, loading, error, run };
};
