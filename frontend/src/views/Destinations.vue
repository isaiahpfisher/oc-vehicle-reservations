<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import destinationServices from "../services/destinationServices.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";
import { AVAILABILITY_OPTIONS, destinationHasAvailability, destinationMatchesQuery } from "../models/destinations.js";

const ITEMS_PER_PAGE = 10;

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

const confirmDelete = useConfirm();

const deleteDestination = async (destination) => {
  const deleted = await confirmDelete({
    title: "Delete destination",
    message: `Delete "${destination.name}"? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => destinationServices.removeDestination(destination.id),
  });

  if (deleted) {
    await getDestinations();
  }
};

onMounted(getDestinations);
</script>

<template>
  <PageShell title="Destination Management">
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" :to="{ name: 'destinationCreate' }">+ New Destination</v-btn>
    </template>

    <v-row>
      <v-col cols="12" md="8">
        <v-text-field
          v-model="query"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search destinations by name or address..."
          aria-label="Search destinations"
          clearable
          @click:clear="query = ''"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-select v-model="availabilityFilter" :items="AVAILABILITY_OPTIONS" label="Filter by availability" clearable />
      </v-col>
    </v-row>

    <ListState
      :loading
      :error
      :empty="!destinations.length"
      :no-results="!filteredDestinations.length"
      empty-title="No destinations yet. Create your first destination."
      empty-icon="mdi-map-marker-outline"
      no-results-title="No destinations match your search."
      no-results-text=""
    >
      <v-data-table
        v-model:page="page"
        :headers="headers"
        :items="filteredDestinations"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
        <template #[`item.name`]="{ item }">
          <router-link
            :to="{ name: 'destinationDetails', params: { id: item.id } }"
            class="destinations-name d-block text-truncate text-primary font-weight-medium"
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
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              aria-label="Edit destination"
              @click="editDestination(item)"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              aria-label="Delete destination"
              @click="deleteDestination(item)"
            />
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
