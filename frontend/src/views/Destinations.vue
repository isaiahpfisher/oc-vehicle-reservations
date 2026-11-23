<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { PAGE_SIZES } from "../utils/lists.js";
import { useRouter } from "vue-router";
import destinationServices from "../services/destinationServices.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";
import { AVAILABILITY_OPTIONS, destinationHasAvailability, destinationMatchesQuery } from "../models/destinations.js";


const router = useRouter();
const query = ref("");
const availabilityFilter = ref(null);
const page = ref(1);

const {
  data: destinations,
  loading,
  error,
  run: getDestinations,
} = useRequest(destinationServices.getDestinations, { initial: [], fallback: "Failed to fetch destinations." });

const headers = [
  { title: "Name", key: "name", sortable: false },
  { title: "City", key: "city", sortable: false, nowrap: true },
  { title: "State", key: "state", sortable: false, nowrap: true },
  { title: "Availability", key: "is_saved", sortable: false, nowrap: true },
  { title: "Actions", key: "actions", sortable: false, align: "end", nowrap: true },
];

const filteredDestinations = computed(() =>
  destinations.value.filter(
    (destination) =>
      destinationMatchesQuery(destination, query.value) &&
      destinationHasAvailability(destination, availabilityFilter.value),
  ),
);

watch([query, availabilityFilter], () => {
  page.value = 1;
});

const editDestination = (destination) =>
  router.push({ name: "destinationDetails", params: { id: destination.id } });

onMounted(getDestinations);
</script>

<template>
  <!-- UI/UX backlog #42: the page title matches its menu label. -->
  <PageShell title="Destinations">
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'destinationCreate' }">+ New Destination</v-btn>
    </template>

    <div class="oc-list-toolbar">
      <v-text-field
        v-model="query"
        prepend-inner-icon="mdi-magnify"
        placeholder="Search by name or address"
        aria-label="Search destinations"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="oc-list-search"
        @click:clear="query = ''"
      />
      <v-select
        v-model="availabilityFilter"
        :items="AVAILABILITY_OPTIONS"
        label="Availability"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="oc-list-filter"
      />
    </div>

    <ListState
      :loading
      :error
      :empty="!destinations.length"
      :no-results="!filteredDestinations.length"
      empty-title="No destinations yet"
      empty-text="Official destinations can be picked on trip requests. Custom stops from requests show up here too."
      empty-art="places"
      no-results-title="No destinations match your search."
      no-results-text=""
    >
      <template #empty-actions>
        <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'destinationCreate' }">+ New Destination</v-btn>
      </template>
      <v-data-table
        v-model:page="page"
        :headers="headers"
        :items="filteredDestinations"
        :items-per-page-options="PAGE_SIZES"
        item-value="id"
      >
        <template #[`item.name`]="{ item }">
          <router-link
            :to="{ name: 'destinationDetails', params: { id: item.id } }"
            class="destinations-name oc-link d-block text-truncate font-weight-medium"
            :title="item.name"
          >
            {{ item.name }}
          </router-link>
        </template>

        <template #[`item.is_saved`]="{ item }">
          <v-chip size="small" :color="item.is_saved ? 'primary' : undefined" variant="tonal">
            {{ item.is_saved ? "Official" : "Unofficial" }}
          </v-chip>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-tooltip text="Edit destination" location="top">
              <template #activator="{ props: tooltip }">
                <v-btn v-bind="tooltip"
              icon="mdi-pencil"
              size="small"
              variant="text"
              aria-label="Edit destination"
              @click="editDestination(item)"
            />
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table>
    </ListState>
  </PageShell>
</template>

<style scoped>
.destinations-name {
  max-width: 18rem;
}
</style>
