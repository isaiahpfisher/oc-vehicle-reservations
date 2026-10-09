<script setup>
import { computed, onMounted, ref, watch } from "vue";
import courseListingServices from "../services/courseListingServices.js";
import semesterServices from "../services/semesterServices.js";
import Utils from "../config/utils.js";
import { useConfirm } from "../composables/useConfirm.js";
import CourseListingCard from "../components/courseListing/CourseListingCard.vue";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";

const isStudent = Utils.getStore("user")?.role === "student";

const selectedSemester = ref(null);

const emptyMessage = computed(() => 
  selectedSemester.value ? "No enrolled courses." : "Select a semester to view courses."
);

const {
  data: semesters,
  run: getSemesters,
} = useRequest(semesterServices.getSemesters, { initial: [], fallback: "Failed to fetch semesters." });

const {
  data: courseListings,
  loading: courseListingLoading,
  error: courseListingError,
  run: getCourseListings,
} = useRequest(courseListingServices.getCourseListings, { initial: [], fallback: "Failed to fetch course listings." });

const selectSemester = () => {
  getCourseListings(selectedSemester.value);
};

const confirmDelete = useConfirm();

const deleteEnrollment = async (courseListing) => {
  // TODO: Make this work.
  const deleted = await confirmDelete({
    title: "Unenroll",
    message: `Unenroll from "${courseListing.sectionId}: ${courseListing.courseName} "?`,
    confirmText: "Unenroll",
    confirmColor: "error",
    onConfirm: () => courseListingServices.removeEnrollment(courseListing.enrollmentId),
  });
  
  if (deleted) {
    await getCourseListings(selectedSemester.value);
  }
};

onMounted(getSemesters);

</script>

<template>
  <v-container class="py-8">
    <v-toolbar color="transparent" flat>
      <template #title>
        <h2 class="text-headline-large font-weight-bold">Course Listing</h2>
      </template>
      <template v-if="isStudent">
        <v-select 
          v-model=selectedSemester 
          label="Semester" 
          :items=semesters 
          item-title="name" 
          item-value="id" 
          @update:modelValue="selectSemester" />
      </template>
    </v-toolbar>

    <ListState
      :loading=courseListingLoading
      :error=courseListingError
      :empty="!selectedSemester || !courseListings.length"
      :empty-title=emptyMessage
      empty-icon="mdi-book-open-page-variant-outline"
    >

      <div class="d-flex flex-column ga-4">
        <CourseListingCard
          v-for="courseListing in courseListings"
          :key="courseListing.enrollmentId"
          :courseListing="courseListing"
          :canManage="isStudent"
          @delete="deleteEnrollment"
        />
      </div>
    </ListState>
  </v-container>
</template>