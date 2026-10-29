<script setup>
import { ref, watch } from "vue";
import placeServices from "../../services/placeServices.js";
import { useRequest } from "../../composables/useRequest.js";

const open = defineModel({ type: Boolean, default: false });
const emit = defineEmits(["add"]);

// FR-008: Google bills each search, so wait for 3+ characters and a pause in typing.
const MIN_SEARCH_LENGTH = 3;
const SEARCH_DELAY_MS = 350;

const blank = () => ({ name: "", addressLine1: "", addressLine2: "", city: "", state: "", zipCode: "" });
const form = ref(blank());
const formRef = ref(null);
const required = [(value) => !!value?.trim() || "Required field."];

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

watch(open, (isOpen) => {
  if (isOpen) {
    form.value = blank();
    query.value = "";
    picked.value = null;
    suggestions.value = [];
    searchError.value = "";
    fillError.value = "";
    sessionToken = crypto.randomUUID();
  }
});

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
    form.value = { ...form.value, ...address.value, name: form.value.name.trim() || suggestion.name };
  }
  // The lookup ends the session; another search starts a new one.
  sessionToken = crypto.randomUUID();
};

const submit = async () => {
  const { valid } = await formRef.value.validate();
  if (!valid) {
    return;
  }

  emit("add", Object.fromEntries(Object.entries(form.value).map(([key, value]) => [key, value.trim()])));
  open.value = false;
};
</script>

<template>
  <v-dialog v-model="open" max-width="520">
    <v-card rounded="lg" class="pa-2">
      <v-card-item>
        <v-card-title class="font-weight-bold">Add a custom address</v-card-title>
        <v-card-subtitle>For a place that isn't in the saved list.</v-card-subtitle>
      </v-card-item>
      <v-card-text>
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
          :messages="searchError || fillError || 'Pick a result to fill in the fields below, or type them yourself.'"
          class="mb-4"
          data-test="address-search"
          autofocus
          @update:model-value="pick"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :subtitle="item.description" />
          </template>
        </v-autocomplete>

        <v-defaults-provider :defaults="{ VTextField: { variant: 'outlined', hideDetails: 'auto' } }">
          <v-form ref="formRef" class="d-flex flex-column ga-4" @submit.prevent="submit">
            <v-text-field v-model="form.name" label="Place name" :rules="required" />
            <v-text-field v-model="form.addressLine1" label="Street address" />
            <v-text-field v-model="form.addressLine2" label="Apt, suite, building (optional)" />
            <div class="d-flex ga-3">
              <v-text-field v-model="form.city" label="City" :rules="required" class="flex-1-1-100" />
              <v-text-field v-model="form.state" label="State" :rules="required" class="state-field" />
              <v-text-field v-model="form.zipCode" label="ZIP" class="zip-field" />
            </div>
          </v-form>
        </v-defaults-provider>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn color="secondary" variant="text" class="oc-cta" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" class="oc-cta" data-test="add-custom-destination" @click="submit">
          Add stop
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.state-field {
  flex: 0 0 96px;
}

.zip-field {
  flex: 0 0 120px;
}
</style>
