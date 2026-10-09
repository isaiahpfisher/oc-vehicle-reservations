<script setup>
import { onMounted, ref } from "vue";
import semesterServices from "../services/semesterServices.js";
import Utils from "../config/utils.js";
import { useConfirm } from "../composables/useConfirm.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";

const isAdmin = Utils.getStore("user")?.role === "admin";
const formOpen = ref(false);
const editing = ref(null);
const formError = ref("");
const form = ref({ name: "", startDate: "", endDate: "" });

const {
  data: semesters,
  loading,
  error,
  run: getSemesters,
} = useRequest(semesterServices.getSemesters, { initial: [], fallback: "Failed to fetch semesters." });

const openCreate = () => {
  editing.value = null;
  formError.value = "";
  form.value = { name: "", startDate: "", endDate: "" };
  formOpen.value = true;
};

const openEdit = (semester) => {
  editing.value = semester;
  formError.value = "";
  form.value = {
    name: semester.name,
    startDate: semester.startDate,
    endDate: semester.endDate,
  };
  formOpen.value = true;
};

const saveSemester = async () => {
  formError.value = "";
  const payload = {
    name: form.value.name.trim(),
    startDate: form.value.startDate,
    endDate: form.value.endDate,
  };

  if (!payload.name || !payload.startDate || !payload.endDate) {
    formError.value = "Name, start date, and end date are required.";
    return;
  }

  if (payload.endDate < payload.startDate) {
    formError.value = "End date must be on or after the start date.";
    return;
  }

  try {
    if (editing.value) {
      await semesterServices.updateSemester(editing.value.id, payload);
    } else {
      await semesterServices.createSemester(payload);
    }
  } catch (error) {
    formError.value = error.response?.data?.message || "Failed to save semester.";
    return;
  }

  formOpen.value = false;
  await getSemesters();
};

const confirmDelete = useConfirm();

const deleteSemester = async (semester) => {
  const deleted = await confirmDelete({
    title: "Delete semester",
    message: `Delete "${semester.name}"? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => semesterServices.removeSemester(semester.id),
  });

  if (deleted) {
    await getSemesters();
  }
};

onMounted(getSemesters);
</script>

<template>
  <v-container class="py-8">
    <v-toolbar color="transparent" flat>
      <template #title>
        <h2 class="text-headline-large font-weight-bold">Semesters</h2>
      </template>
      <template v-if="isAdmin">
        <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New Semester</v-btn>
      </template>
    </v-toolbar>

    <ListState
      :loading
      :error
      :empty="!semesters.length"
      empty-title="No semesters yet. Create your first semester."
      empty-icon="mdi-calendar-blank-outline"
    >
      <div class="d-flex flex-column ga-4">
        <v-card v-for="semester in semesters" :key="semester.id">
          <v-card-title>{{ semester.name }}</v-card-title>
          <v-card-text>{{ semester.startDate }} – {{ semester.endDate }}</v-card-text>
          <v-card-actions v-if="isAdmin">
            <v-btn size="small" icon="mdi-pencil" aria-label="Edit semester" @click="openEdit(semester)" />
            <v-btn size="small" icon="mdi-delete" aria-label="Delete semester" @click="deleteSemester(semester)" />
          </v-card-actions>
        </v-card>
      </div>
    </ListState>

    <v-dialog v-model="formOpen" max-width="500">
      <v-card>
        <v-card-title>{{ editing ? "Edit semester" : "New semester" }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="Name" />
          <v-text-field v-model="form.startDate" label="Start date" type="date" />
          <v-text-field v-model="form.endDate" label="End date" type="date" />
          <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="formOpen = false">Cancel</v-btn>
          <v-btn color="primary" class="oc-cta" @click="saveSemester">{{ editing ? "Save" : "Create" }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>