<script setup>
import { onMounted, ref } from "vue";
import destinationServices from "../services/destinationServices.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";
import DestinationFormModal from "../components/destinations/DestinationFormModal.vue";

const ITEMS_PER_PAGE = 10;

const formOpen = ref(false);
const page = ref(1);
const editing = ref(null);

const {
  data: destinations,
  loading,
  error,
  run: getDestinations,
} = useRequest(destinationServices.getDestinations, { initial: [], fallback: "Failed to fetch destinations." });

const headers = [
  { title: "Name", key: "name", sortable: false, nowrap: true },
  { title: "City", key: "city", sortable: false, nowrap: true },
  { title: "State", key: "state", sortable: false, nowrap: true },
  { title: "Availability", key: "is_saved", sortable: false, nowrap: true },
  { title: "Actions", key: "actions", sortable: false, align: "end", nowrap: true },
];

const openCreate = () => {
  editing.value = null;
  formOpen.value = true;
};

const openEdit = (destination) => {
  editing.value = destination;
  formOpen.value = true;
};

const saveDestination = async (payload) => {
  if (editing.value) {
    await destinationServices.updateDestination(editing.value.id, payload);
  } else {
    await destinationServices.createDestination(payload);
  }

  await getDestinations();
};

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
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Destination</v-btn>
    </template>

    <ListState
      :loading
      :error
      :empty="!destinations.length"
      empty-title="No destinations yet. Create your first destination."
      empty-icon="mdi-map-marker-outline"
    >
      <v-data-table
        v-model:page="page"
        :headers="headers"
        :items="destinations"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
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
              @click="openEdit(item)"
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

    <DestinationFormModal v-model="formOpen" :destination="editing" :save="saveDestination" />
  </PageShell>
</template>
