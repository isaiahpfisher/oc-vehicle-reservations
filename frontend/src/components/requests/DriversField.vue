<script setup>
import { personName } from "../../models/requests.js";

/** Selected driver ids. */
const driverIds = defineModel({ type: Array, default: () => [] });

defineProps({
  /** Approved drivers to choose from. */
  options: { type: Array, default: () => [] },
  /** Read-only: show these drivers as chips instead of a picker. */
  readonly: Boolean,
  drivers: { type: Array, default: () => [] },
});

const rules = [(value) => value.length > 0 || "Add at least one driver."];
</script>

<template>
  <div v-if="readonly" class="d-flex flex-wrap ga-2" data-test="drivers">
    <v-chip v-for="driver in drivers" :key="driver.id" prepend-icon="mdi-account-outline" label>
      {{ personName(driver) }}
    </v-chip>
  </div>
  <v-autocomplete
    v-else
    v-model="driverIds"
    :items="options"
    :item-title="personName"
    item-value="id"
    label="Drivers"
    multiple
    chips
    closable-chips
    :rules
    data-test="drivers"
  />
</template>
