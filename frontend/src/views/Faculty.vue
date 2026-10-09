<script setup>
import { computed, onMounted, ref, watch } from "vue";
import facultyServices from "../services/facultyServices.js";
import Utils from "../config/utils.js";
import { useConfirm } from "../composables/useConfirm.js";
import FacultyFormModal from "../components/faculty/FacultyFormModal.vue";
import FacultyCard from "../components/faculty/FacultyCard.vue";
import { facultyMatchesQuery } from "../models/faculty.js";
import { usePagination } from "../composables/usePagination.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import { nextTick } from "vue";

const isAdmin = Utils.getStore("user")?.role === "admin";
const query = ref("");
const formOpen = ref(false);
const editingFaculty = ref(null);

const {
  data: faculty,
  loading,
  error,
  run: getFaculty,
} = useRequest(facultyServices.getFaculty, { initial: [], fallback: "Failed to fetch faculty." });

const filteredFaculty = computed(() => faculty.value.filter((faculty) => facultyMatchesQuery(faculty, query.value)));

const { page, pageCount, pageItems: paginatedFaculty } = usePagination(filteredFaculty);

const openForm = (faculty = null) => {
  editingFaculty.value = faculty;
  formOpen.value = true;
};

const saveFaculty = async (payload) => {
  if (editingFaculty.value) {
    await facultyServices.updateFaculty(editingFaculty.value.facultyId, payload);
  } else {
    await facultyServices.createFaculty(payload);
  }

  formOpen.value = false;
  await nextTick();
  await getFaculty();
};

const confirmDelete = useConfirm();

const deleteFaculty = async (faculty) => {
  const deleted = await confirmDelete({
    title: "Delete faculty",
    message: `Delete "${faculty.firstName} ${faculty.lastName} "? This action is permanent.`,
    confirmText: "Delete Faculty",
    confirmColor: "error",
    onConfirm: () => facultyServices.removeFaculty(faculty.facultyId),
  });

  if (deleted) {
    await getFaculty();
  }
};

onMounted(getFaculty);

watch(query, () => {
  page.value = 1;
});
</script>

<template>
  <v-container class="py-8">
    <v-toolbar color="transparent" flat>
      <template #title>
        <h2 class="text-headline-large font-weight-bold">Faculty</h2>
      </template>
      <template v-if="isAdmin">
        <v-btn color="primary" variant="elevated" class="oc-cta" @click="openForm()"> + New Faculty </v-btn>
      </template>
    </v-toolbar>

    <v-text-field v-if="isAdmin" v-model="query" prepend-inner-icon="mdi-magnify" placeholder="Search faculty..." />

    <ListState
      :loading
      :error
      :empty="!faculty.length"
      :no-results="!filteredFaculty.length"
      empty-title="No faculty yet"
      :empty-text="'Create your first faculty to get started.'"
      empty-icon="mdi-book-open-page-variant-outline"
    >
      <template #append v-if="isAdmin">
        <v-btn color="primary" variant="elevated" class="oc-cta" @click="openForm()">+ New Faculty</v-btn>
      </template>

      <div class="d-flex flex-column ga-4">
        <FacultyCard
          v-for="faculty in paginatedFaculty"
          :key="faculty.facultyId"
          :faculty="faculty"
          :canManage="isAdmin"
          @edit="openForm"
          @delete="deleteFaculty"
        />
      </div>
    </ListState>

    <v-pagination v-if="pageCount > 1" v-model="page" :length="pageCount" class="mt-4" />

    <FacultyFormModal v-model="formOpen" :faculty="editingFaculty" :save="saveFaculty" />
  </v-container>
</template>