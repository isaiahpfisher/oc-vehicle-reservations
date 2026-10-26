<script setup>
import { onMounted, ref } from "vue";
import areaServices from "../services/areaServices.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import AreaFormModal from "../components/areas/AreaFormModal.vue";

const formOpen = ref(false);
const editing = ref(null);

const {
  data: areas,
  loading,
  error,
  run: getAreas,
} = useRequest(areaServices.getAreas, { initial: [], fallback: "Failed to fetch areas." });

const openCreate = () => {
  editing.value = null;
  formOpen.value = true;
};

const openEdit = (area) => {
  editing.value = area;
  formOpen.value = true;
};

const saveArea = async (payload) => {
  if (editing.value) {
    await areaServices.updateArea(editing.value.id, payload);
  } else {
    await areaServices.createArea(payload);
  }

  await getAreas();
};

const confirmDelete = useConfirm();

const deleteArea = async (area) => {
  const deleted = await confirmDelete({
    title: "Delete area",
    message: `Delete "${area.name}"? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => areaServices.removeArea(area.id),
  });

  if (deleted) {
    await getAreas();
  }
};

onMounted(getAreas);
</script>

<template>
  <v-container class="py-8">
    <v-toolbar color="transparent" flat>
      <template #title>
        <h2 class="text-headline-large font-weight-bold">Area Management</h2>
      </template>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Area</v-btn>
    </v-toolbar>

    <ListState
      :loading
      :error
      :empty="!areas.length"
      empty-title="No areas yet. Create your first area."
      empty-icon="mdi-map-marker-outline"
    >
      <div class="d-flex flex-column ga-4">
        <v-card v-for="area in areas" :key="area.id" rounded="lg">
          <v-card-item>
            <v-card-title>{{ area.name }}</v-card-title>
            <template #append>
              <v-btn size="small" icon="mdi-pencil" aria-label="Edit area" @click="openEdit(area)" />
              <v-btn size="small" icon="mdi-delete" aria-label="Delete area" @click="deleteArea(area)" />
            </template>
          </v-card-item>
          <v-card-text v-if="area.logo">
            <img :src="area.logo" :alt="`${area.name} logo`" />
          </v-card-text>
        </v-card>
      </div>
    </ListState>

    <AreaFormModal v-model="formOpen" :area="editing" :areas="areas" :save="saveArea" />
  </v-container>
</template>
