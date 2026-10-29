<script setup>
import { onMounted, ref } from "vue";
import serviceTypeServices from "../services/serviceTypeServices.js";
import { validateServiceTypeForm } from "../models/serviceTypes.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import PageShell from "../components/layout/PageShell.vue";
import ServiceTypeFormModal from "../components/serviceTypes/ServiceTypeFormModal.vue";

const ITEMS_PER_PAGE = 10;

const headers = [
  { title: "Name", key: "name" },
  { title: "Frequency Days", key: "service_frequency_days" },
  { title: "Frequency Miles", key: "service_frequency_miles" },
  { title: "Actions", key: "actions", sortable: false, align: "end", nowrap: true },
];

const formOpen = ref(false);
const editingId = ref(null);
const draft = ref({ name: "", service_frequency_days: "", service_frequency_miles: "" });
const formError = ref("");
const saving = ref(false);

const {
  data: serviceTypes,
  loading,
  error,
  run: getServiceTypes,
} = useRequest(serviceTypeServices.getServiceTypes, {
  initial: [],
  fallback: "Failed to fetch service types.",
});

const openCreate = () => {
  formOpen.value = true;
};

const createServiceType = async (payload) => {
  await serviceTypeServices.createServiceType(payload);
  await getServiceTypes();
};

const startEdit = (serviceType) => {
  if (saving.value) {
    return;
  }

  editingId.value = serviceType.id;
  draft.value = {
    name: serviceType.name,
    service_frequency_days: String(serviceType.service_frequency_days),
    service_frequency_miles: String(serviceType.service_frequency_miles),
  };
  formError.value = "";
};

const cancelEdit = () => {
  if (saving.value) {
    return;
  }

  editingId.value = null;
  formError.value = "";
};

const saveEdit = async () => {
  if (saving.value || editingId.value === null) {
    return;
  }

  const result = validateServiceTypeForm(draft.value, serviceTypes.value, editingId.value);
  formError.value = result.message || "";
  if (result.message) {
    return;
  }

  saving.value = true;

  try {
    await serviceTypeServices.updateServiceType(editingId.value, result.value);
    editingId.value = null;
    await getServiceTypes();
  } catch (saveError) {
    formError.value = saveError.response?.data?.message || "Failed to save service type.";
  } finally {
    saving.value = false;
  }
};

const confirmDelete = useConfirm();

const deleteServiceType = async (serviceType) => {
  const deleted = await confirmDelete({
    title: "Delete service type",
    message: `Delete "${serviceType.name}"? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => serviceTypeServices.removeServiceType(serviceType.id),
  });

  if (deleted) {
    if (editingId.value === serviceType.id) {
      editingId.value = null;
      formError.value = "";
    }
    await getServiceTypes();
  }
};

onMounted(getServiceTypes);
</script>

<template>
  <PageShell title="Service Type Management">
    <template #actions>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Service Type</v-btn>
    </template>

    <ListState
      :loading
      :error
      :empty="!serviceTypes.length"
      empty-title="No service types yet. Create your first service type."
      empty-icon="mdi-wrench-outline"
    >
      <v-alert v-if="formError" type="error" density="compact" class="mb-4">{{ formError }}</v-alert>

      <v-data-table
        :headers="headers"
        :items="serviceTypes"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
        <template #[`item.name`]="{ item }">
          <v-text-field
            v-if="editingId === item.id"
            v-model="draft.name"
            label="Name"
            density="compact"
            hide-details
            variant="outlined"
          />
          <span v-else class="service-type-name d-block text-truncate" :title="item.name">{{ item.name }}</span>
        </template>

        <template #[`item.service_frequency_days`]="{ item }">
          <v-text-field
            v-if="editingId === item.id"
            v-model="draft.service_frequency_days"
            label="Frequency Days"
            type="number"
            min="1"
            step="1"
            density="compact"
            hide-details
            variant="outlined"
          />
          <span v-else>{{ item.service_frequency_days }}</span>
        </template>

        <template #[`item.service_frequency_miles`]="{ item }">
          <v-text-field
            v-if="editingId === item.id"
            v-model="draft.service_frequency_miles"
            label="Frequency Miles"
            type="number"
            min="1"
            step="1"
            density="compact"
            hide-details
            variant="outlined"
          />
          <span v-else>{{ item.service_frequency_miles }}</span>
        </template>

        <template #[`item.actions`]="{ item }">
          <div v-if="editingId === item.id" class="d-flex justify-end ga-1">
            <v-btn size="small" variant="text" color="primary" :loading="saving" @click="saveEdit">Save</v-btn>
            <v-btn size="small" variant="text" :disabled="saving" @click="cancelEdit">Cancel</v-btn>
          </div>
          <div v-else class="d-flex justify-end ga-1">
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              aria-label="Edit service type"
              @click="startEdit(item)"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              aria-label="Delete service type"
              @click="deleteServiceType(item)"
            />
          </div>
        </template>
      </v-data-table>
    </ListState>

    <ServiceTypeFormModal v-model="formOpen" :service-types="serviceTypes" :save="createServiceType" />
  </PageShell>
</template>

<style scoped>
.service-type-name {
  max-width: 16rem;
}
</style>
