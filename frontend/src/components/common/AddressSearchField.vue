<script setup>
import { ref, watch } from "vue";
import placeServices from "../../services/placeServices.js";
import { useRequest } from "../../composables/useRequest.js";

/**
 * Google Places address search (Feature 8, FR-008), proxied by the backend. Used wherever a destination's address is entered.
 * Emits `select` with `{ placeId, name, addressLine1, addressLine2, city, state, zipCode }`.
 */
const props = defineProps({
  hint: { type: String, default: "Pick a result to fill in the fields below, or type them yourself." },
  autofocus: Boolean,
});

const emit = defineEmits(["select"]);

// FR-008: Google bills each search, so wait for 3+ characters and a pause in typing.
const MIN_SEARCH_LENGTH = 3;
const SEARCH_DELAY_MS = 350;

const query = ref("");
const picked = ref(null);
// One token per address: Google bills the searches and the final lookup as one session.
let sessionToken = crypto.randomUUID();
let searchTimer;

const {
  data: suggestions,
  loading: searching,
  error: searchError,
  run: search,
} = useRequest(placeServices.searchAddresses, { initial: [], fallback: "Address search failed." });
const {
  data: address,
  loading: filling,
  error: fillError,
  run: fillAddress,
} = useRequest(placeServices.getAddress, { fallback: "Couldn't load that address." });

/** Start over for a new address (the parent dialog reopened). */
const reset = () => {
  clearTimeout(searchTimer);
  query.value = "";
  picked.value = null;
  suggestions.value = [];
  searchError.value = "";
  fillError.value = "";
  sessionToken = crypto.randomUUID();
};

defineExpose({ reset });

watch(query, (value) => {
  clearTimeout(searchTimer);
  const input = value?.trim() ?? "";
  // Selecting a suggestion puts its name in the box; that isn't a new search.
  if (input === picked.value?.name) {
    return;
  }

  if (input.length < MIN_SEARCH_LENGTH) {
    suggestions.value = [];
    return;
  }

  searchTimer = setTimeout(() => search(input, sessionToken), SEARCH_DELAY_MS);
});

const pick = async (suggestion) => {
  if (!suggestion) {
    return;
  }

  clearTimeout(searchTimer);
  if (await fillAddress(suggestion.placeId, sessionToken)) {
    emit("select", { ...address.value, placeId: suggestion.placeId, name: suggestion.name });
  }
  // The lookup ends the session; another search starts a new one.
  sessionToken = crypto.randomUUID();
};
</script>

<template>
  <v-autocomplete
    v-model="picked"
    v-model:search="query"
    :items="suggestions"
    item-title="name"
    item-value="placeId"
    return-object
    no-filter
    :loading="searching || filling"
    :hide-no-data="searching || (query?.trim().length ?? 0) < MIN_SEARCH_LENGTH"
    no-data-text="No matching addresses."
    label="Search for an address"
    prepend-inner-icon="mdi-magnify"
    variant="outlined"
    :messages="searchError || fillError || props.hint"
    data-test="address-search"
    :autofocus
    @update:model-value="pick"
  >
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps" :subtitle="item.description" />
    </template>
  </v-autocomplete>
</template>
