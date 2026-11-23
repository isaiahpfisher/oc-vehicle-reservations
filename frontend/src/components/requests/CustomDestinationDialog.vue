<script setup>
import { computed, ref, watch } from "vue";
import { useDialogChanges } from "../../composables/useDialogChanges.js";
import { destinationAddress, similarDestinations } from "../../models/requests.js";
import AddressSearchField from "../common/AddressSearchField.vue";

const open = defineModel({ type: Boolean, default: false });
const emit = defineEmits(["add"]);

const props = defineProps({
  /** The saved (official) destinations, to suggest instead of adding the same place again (UI/UX backlog #6). */
  saved: { type: Array, default: () => [] },
});

const blank = () => ({ name: "", addressLine1: "", addressLine2: "", city: "", state: "", zipCode: "" });
const form = ref(blank());
const formRef = ref(null);
const searchRef = ref(null);
const required = [(value) => !!value?.trim() || "Required field."];

watch(open, (isOpen) => {
  if (isOpen) {
    form.value = blank();
    searchRef.value?.reset();
  }
});

const fillFromSearch = ({ placeId, name, ...address }) => {
  form.value = { ...form.value, ...address, name: form.value.name.trim() || name };
};

const suggestions = computed(() => similarDestinations(form.value, props.saved));

const useSaved = (destination) => {
  emit("add", destination);
  open.value = false;
};

const submit = async () => {
  const { valid } = await formRef.value.validate();
  if (!valid) {
    return;
  }

  emit("add", Object.fromEntries(Object.entries(form.value).map(([key, value]) => [key, value.trim()])));
  open.value = false;
};

// UI/UX backlog #31: once something is typed, a click outside doesn't close (and lose) the dialog.
const changed = useDialogChanges(open, () => form.value);
</script>

<template>
  <v-dialog v-model="open" max-width="520" :persistent="changed">
    <!-- UI/UX backlog #30: the whole card is the form, so Enter (and the Add stop button) submit it. -->
    <v-form ref="formRef" @submit.prevent="submit">
    <v-card rounded="lg" class="pa-2">
      <v-card-item>
        <v-card-title class="font-weight-bold">Add a custom address</v-card-title>
        <v-card-subtitle>For a place that isn't in the saved list.</v-card-subtitle>
      </v-card-item>
      <v-card-text>
        <AddressSearchField ref="searchRef" class="mb-4" autofocus @select="fillFromSearch" />

        <!-- UI/UX backlog #6: point to a saved destination that's already this place. -->
        <div v-if="suggestions.length" class="suggestions mb-4" data-test="destination-suggestions">
          <div class="text-body-medium font-weight-medium mb-1">Already a saved destination?</div>
          <div v-for="destination in suggestions" :key="destination.id" class="suggestion d-flex align-center ga-3 py-1">
            <div class="flex-1-1 min-width-0">
              <div class="text-body-medium text-truncate">{{ destination.name }}</div>
              <div class="text-body-small text-medium-emphasis text-truncate">{{ destinationAddress(destination) }}</div>
            </div>
            <v-btn size="small" variant="tonal" color="primary" class="oc-cta" data-test="use-saved-destination" @click="useSaved(destination)">
              Use this
            </v-btn>
          </div>
        </div>

        <v-defaults-provider :defaults="{ VTextField: { variant: 'outlined', hideDetails: 'auto' } }">
          <div class="d-flex flex-column ga-4">
            <v-text-field v-model="form.name" label="Place name" :rules="required" />
            <v-text-field v-model="form.addressLine1" label="Street address" :rules="required" />
            <v-text-field v-model="form.addressLine2" label="Apt, suite, building (optional)" />
            <div class="d-flex ga-3">
              <v-text-field v-model="form.city" label="City" :rules="required" class="flex-1-1-100" />
              <v-text-field v-model="form.state" label="State" :rules="required" class="state-field" />
              <v-text-field v-model="form.zipCode" label="ZIP" class="zip-field" />
            </div>
          </div>
        </v-defaults-provider>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn color="secondary" variant="text" class="oc-cta" @click="open = false">Cancel</v-btn>
        <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" data-test="add-custom-destination">
          Add stop
        </v-btn>
      </v-card-actions>
    </v-card>
    </v-form>
  </v-dialog>
</template>

<style scoped>
.suggestions {
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 8px 12px;
}

.min-width-0 {
  min-width: 0;
}

.state-field {
  flex: 0 0 96px;
}

.zip-field {
  flex: 0 0 120px;
}
</style>
