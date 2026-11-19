<script setup>
import { computed, onMounted, ref } from "vue";
import areaServices from "../services/areaServices.js";
import { LOGO_ACCEPT, areaNameMessage, logoFileMessage, logoFilename } from "../models/areas.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";
import AreaFormModal from "../components/areas/AreaFormModal.vue";

const ITEMS_PER_PAGE = 10;

const headers = [
  { title: "", key: "logoImage", sortable: false, width: 56 },
  { title: "Name", key: "name" },
  { title: "Logo", key: "logo", sortable: false },
  { title: "Actions", key: "actions", sortable: false, align: "end", nowrap: true },
];

const formOpen = ref(false);
const editingId = ref(null);
const draft = ref({ name: "", file: null, removeLogo: false });
const formError = ref("");
const saving = ref(false);
const fileInput = ref(null);

const {
  data: areas,
  loading,
  error,
  run: getAreas,
} = useRequest(areaServices.getAreas, { initial: [], fallback: "Failed to fetch areas." });

const editingArea = computed(() => areas.value.find((area) => area.id === editingId.value) ?? null);

const shownFilename = computed(() => {
  if (draft.value.file) {
    return draft.value.file.name;
  }

  if (draft.value.removeLogo) {
    return "";
  }

  return logoFilename(editingArea.value?.logo);
});

const shownLogo = computed(() => (draft.value.file || draft.value.removeLogo ? "" : editingArea.value?.logo || ""));

const removeDisabled = computed(() => {
  if (draft.value.file) {
    return false;
  }

  if (draft.value.removeLogo) {
    return true;
  }

  return !editingArea.value?.logo;
});

const openCreate = () => {
  formOpen.value = true;
};

const createArea = async (payload) => {
  await areaServices.createArea(payload);
  await getAreas();
};

const startEdit = (area) => {
  if (saving.value) {
    return;
  }

  editingId.value = area.id;
  draft.value = { name: area.name, file: null, removeLogo: false };
  formError.value = "";
};

const cancelEdit = () => {
  if (saving.value) {
    return;
  }

  editingId.value = null;
  formError.value = "";
};

const pickLogo = () => {
  fileInput.value?.click();
};

const onLogoFile = (event) => {
  const selected = event.target.files?.[0];
  event.target.value = "";
  if (!selected) {
    return;
  }

  const message = logoFileMessage(selected);
  formError.value = message;
  if (message) {
    return;
  }

  draft.value.file = selected;
  draft.value.removeLogo = false;
};

const clearLogo = () => {
  draft.value.file = null;
  draft.value.removeLogo = true;
  formError.value = "";
};

const saveEdit = async () => {
  if (saving.value || editingId.value === null) {
    return;
  }

  const nameMessage = areaNameMessage(draft.value.name, areas.value, editingId.value);
  if (nameMessage) {
    formError.value = nameMessage;
    return;
  }

  if (formError.value) {
    return;
  }

  const body = new FormData();
  body.append("name", draft.value.name.trim());
  if (draft.value.file) {
    body.append("logo", draft.value.file);
  } else if (draft.value.removeLogo) {
    body.append("removeLogo", "true");
  }

  saving.value = true;

  try {
    await areaServices.updateArea(editingId.value, body);
    editingId.value = null;
    await getAreas();
  } catch (saveError) {
    formError.value = saveError.response?.data?.message || "Failed to save area.";
  } finally {
    saving.value = false;
  }
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
    if (editingId.value === area.id) {
      editingId.value = null;
      formError.value = "";
    }
    await getAreas();
  }
};

onMounted(getAreas);
</script>

<template>
  <PageShell title="Area Management">
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Area</v-btn>
    </template>

    <ListState
      :loading
      :error
      :empty="!areas.length"
      empty-title="No areas yet. Create your first area."
      empty-icon="mdi-map-marker-outline"
    >
      <v-alert v-if="formError" type="error" density="compact" class="mb-4">{{ formError }}</v-alert>

      <v-data-table
        :headers="headers"
        :items="areas"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
        <template #[`item.logoImage`]="{ item }">
          <div class="logo-slot">
            <img
              v-if="editingId === item.id ? shownLogo : item.logo"
              class="area-logo"
              :src="editingId === item.id ? shownLogo : item.logo"
              :alt="`${item.name} logo`"
            />
          </div>
        </template>

        <template #[`item.name`]="{ item }">
          <v-text-field
            v-if="editingId === item.id"
            v-model="draft.name"
            label="Name"
            density="compact"
            hide-details
            variant="outlined"
          />
          <span v-else>{{ item.name }}</span>
        </template>

        <template #[`item.logo`]="{ item }">
          <div class="logo-details">
            <span class="logo-filename">{{ editingId === item.id ? shownFilename : logoFilename(item.logo) }}</span>
            <div class="logo-icons">
              <template v-if="editingId === item.id">
                <v-btn icon="mdi-upload" size="small" variant="text" aria-label="Upload logo" @click="pickLogo" />
                <v-btn
                  icon="mdi-close"
                  size="small"
                  variant="text"
                  aria-label="Remove logo"
                  :disabled="removeDisabled"
                  @click="clearLogo"
                />
                <input ref="fileInput" class="d-none" type="file" :accept="LOGO_ACCEPT" @change="onLogoFile" />
              </template>
            </div>
          </div>
        </template>

        <template #[`item.actions`]="{ item }">
          <div v-if="editingId === item.id" class="d-flex justify-end ga-1">
            <v-btn size="small" variant="text" color="primary" :loading="saving" @click="saveEdit">Save</v-btn>
            <v-btn size="small" variant="text" :disabled="saving" @click="cancelEdit">Cancel</v-btn>
          </div>
          <div v-else class="d-flex justify-end ga-1">
            <v-btn icon="mdi-pencil" size="small" variant="text" aria-label="Edit area" @click="startEdit(item)" />
            <v-btn icon="mdi-delete" size="small" variant="text" aria-label="Delete area" @click="deleteArea(item)" />
          </div>
        </template>
      </v-data-table>
    </ListState>

    <AreaFormModal v-model="formOpen" :areas="areas" :save="createArea" />
  </PageShell>
</template>

<style scoped>
.logo-slot {
  width: 40px;
  height: 40px;
}

.area-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
  display: block;
}

.logo-details {
  display: grid;
  grid-template-columns: minmax(8rem, 14rem) 5rem;
  align-items: center;
  column-gap: 0.5rem;
  min-height: 40px;
}

.logo-filename {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logo-icons {
  display: flex;
  align-items: center;
  width: 5rem;
}
</style>
