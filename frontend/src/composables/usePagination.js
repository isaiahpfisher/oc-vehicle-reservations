import { computed, ref, watch } from "vue";

export const usePagination = (items, perPage = 20) => {
  const page = ref(1);
  const pageCount = computed(() => Math.max(1, Math.ceil(items.value.length / perPage)));
  const pageItems = computed(() => items.value.slice((page.value - 1) * perPage, page.value * perPage));

  watch(pageCount, (count) => {
    if (page.value > count) page.value = count;
  });

  return { page, pageCount, pageItems };
};
