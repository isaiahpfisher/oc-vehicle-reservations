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

const formatDay = (day) =>
  new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
</script>

<template>
  <div v-if="readonly" class="d-flex flex-wrap ga-2" data-test="drivers">
    <v-chip v-for="driver in drivers" :key="driver.id" prepend-icon="mdi-account-outline" label>
      {{ personName(driver) }}
      <span v-if="driver.hasCdl" class="text-medium-emphasis ml-1">· CDL</span>
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
  >
    <template #item="{ props: itemProps, item }">
      <v-list-item
        v-bind="itemProps"
        :subtitle="`License expires ${formatDay(item.licenseExpirationDate)}${item.hasCdl ? ' · CDL' : ''}`"
      />
    </template>
  </v-autocomplete>
</template>
