<script setup>
import { computed, nextTick, ref } from "vue";
import CustomDestinationDialog from "./CustomDestinationDialog.vue";
import { CAMPUS_NAME, MAX_STOPS, destinationAddress, destinationPlace, repeatsInARow } from "../../models/requests.js";

/** Ordered stops: saved destinations (with `id`) or new ones (address fields only). Each carries a list `key`. */
const stops = defineModel({ type: Array, default: () => [] });

defineProps({
  saved: { type: Array, default: () => [] },
  readonly: Boolean,
  error: { type: String, default: "" },
});

let nextKey = 0;
const picked = ref(null);
const customOpen = ref(false);

const repeated = computed(() => repeatsInARow(stops.value));
const full = computed(() => stops.value.length >= MAX_STOPS);

const add = async (destination) => {
  if (!destination) {
    return;
  }

  stops.value = [...stops.value, { ...destination, key: `stop-${nextKey++}` }];
  await nextTick();
  picked.value = null;
};

const move = (index, direction) => {
  const next = [...stops.value];
  [next[index], next[index + direction]] = [next[index + direction], next[index]];
  stops.value = next;
};

const remove = (index) => {
  stops.value = stops.value.filter((_, i) => i !== index);
};
</script>

<template>
  <div>
    <ol class="route" data-test="stops">
      <li class="route-stop">
        <span class="route-marker route-marker--campus"><v-icon icon="mdi-school-outline" size="16" /></span>
        <div class="route-body">
          <div class="route-title">{{ CAMPUS_NAME }}</div>
          <div class="route-sub">Departure</div>
        </div>
      </li>

      <li v-for="(stop, index) in stops" :key="stop.key" class="route-stop" data-test="stop">
        <span class="route-marker route-marker--stop">{{ index + 1 }}</span>
        <div class="route-body">
          <div class="route-title">
            {{ stop.name }}
            <v-chip v-if="!stop.id" size="x-small" variant="tonal" color="primary" class="ml-1" label>New</v-chip>
          </div>
          <div class="route-sub">{{ destinationAddress(stop) }}</div>
        </div>
        <div v-if="!readonly" class="route-actions">
          <v-btn
            icon="mdi-arrow-up"
            size="small"
            variant="text"
            density="comfortable"
            :disabled="index === 0"
            :aria-label="`Move ${stop.name} up`"
            @click="move(index, -1)"
          />
          <v-btn
            icon="mdi-arrow-down"
            size="small"
            variant="text"
            density="comfortable"
            :disabled="index === stops.length - 1"
            :aria-label="`Move ${stop.name} down`"
            @click="move(index, 1)"
          />
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            density="comfortable"
            :aria-label="`Remove ${stop.name}`"
            @click="remove(index)"
          />
        </div>
      </li>

      <li v-if="!stops.length" class="route-stop">
        <span class="route-marker route-marker--empty" />
        <div class="route-empty" :class="{ 'route-empty--error': error }">
          {{ readonly ? "No stops on this trip." : "No stops yet. Add where you're going below." }}
        </div>
      </li>

      <li class="route-stop">
        <span class="route-marker route-marker--campus"><v-icon icon="mdi-school-outline" size="16" /></span>
        <div class="route-body">
          <div class="route-title">{{ CAMPUS_NAME }}</div>
          <div class="route-sub">Return</div>
        </div>
      </li>
    </ol>

    <div v-if="error" class="text-error text-body-small mt-2 ml-12" data-test="destinations-error">{{ error }}</div>
    <v-alert v-if="repeated" type="warning" variant="tonal" density="compact" class="mt-3">
      A destination can't be listed twice in a row.
    </v-alert>

    <div v-if="!readonly" class="d-flex flex-wrap align-center ga-3 mt-4">
      <v-autocomplete
        v-model="picked"
        :items="saved"
        item-title="name"
        return-object
        placeholder="Add a saved destination"
        aria-label="Add a saved destination"
        :disabled="full"
        prepend-inner-icon="mdi-map-marker-plus-outline"
        variant="outlined"
        density="compact"
        hide-details
        class="route-picker"
        @update:model-value="add"
      >
        <template #item="{ props: itemProps, item }">
          <v-list-item v-bind="itemProps" :subtitle="destinationPlace(item)" />
        </template>
      </v-autocomplete>
      <v-btn
        variant="outlined"
        color="primary"
        prepend-icon="mdi-plus"
        height="40"
        class="oc-cta"
        :disabled="full"
        @click="customOpen = true"
      >
        Custom address
      </v-btn>
    </div>
    <div v-if="!readonly && full" class="text-body-small text-medium-emphasis mt-2" data-test="stops-full">
      Trips can have up to {{ MAX_STOPS }} stops. Remove one to add another.
    </div>

    <CustomDestinationDialog v-model="customOpen" @add="add" />
  </div>
</template>

<style scoped>
.route {
  list-style: none;
  margin: 0;
  padding: 0;
}

.route-stop {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 56px;
  padding: 6px 0;
}

/* The line connecting each marker to the next one. */
.route-stop:not(:last-child)::after {
  content: "";
  position: absolute;
  left: 15px;
  top: calc(50% + 16px);
  height: calc(100% - 32px);
  border-left: 2px dashed rgba(var(--v-theme-outline), 0.5);
}

.route-marker {
  flex: 0 0 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
}

.route-marker--campus {
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-secondary));
}

.route-marker--stop {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.route-marker--empty {
  border: 2px dashed rgba(var(--v-theme-outline), 0.5);
}

.route-body {
  flex: 1 1 auto;
  min-width: 0;
}

.route-title {
  font-weight: 600;
  line-height: 1.4;
}

.route-sub {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.route-actions {
  display: flex;
  flex: 0 0 auto;
}

.route-empty {
  flex: 1 1 auto;
  padding: 10px 14px;
  border: 1px dashed rgba(var(--v-theme-outline), 0.6);
  border-radius: 8px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.route-empty--error {
  border-color: rgb(var(--v-theme-error));
}

.route-picker {
  flex: 1 1 260px;
}
</style>
