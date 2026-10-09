<script setup>
import { computed, onMounted, ref, watch } from "vue";
import courseServices from "../services/courseServices.js";
import Utils from "../config/utils.js";
import { useConfirm } from "../composables/useConfirm.js";
import CourseFormModal from "../components/courses/CourseFormModal.vue";
import CourseCard from "../components/courses/CourseCard.vue";
import { courseMatchesQuery } from "../models/courses.js";
import { usePagination } from "../composables/usePagination.js";
import { useRequest } from "../composables/useRequest.js";
import ListState from "../components/common/ListState.vue";
import facultyServices from "../services/facultyServices.js";
import semesterServices from "../services/semesterServices.js";
import enrollmentServices from "../services/enrollmentServices.js";

const isAdmin = Utils.getStore("user")?.role === "admin";
const query = ref("");
const formOpen = ref(false);
const editingCourse = ref(null);

const {
  data: courses,
  loading,
  error,
  run: getCourses,
} = useRequest(courseServices.getCourses, { initial: [], fallback: "Failed to fetch courses." });

const {
  data: faculty,
  loadingFaculty,
  facultyError,
  run: getFaculty,
} = useRequest(facultyServices.getFaculty, { initial: [], fallback: "Failed to fetch faculty." });

const {
  data: semesters,
  loadingSemesters,
  semesterError,
  run: getSemesters,
} = useRequest(semesterServices.getSemesters, { initial: [], fallback: "Failed to fetch semesters." });

const {
  data: enrollments,
  error: enrollmentsError,
  run: getEnrollments,
} = useRequest(enrollmentServices.getEnrollments, { initial: [], fallback: "Failed to fetch enrollments." });

const pendingSectionId = ref(null);
const enrollmentError = ref("");

const enrolledSectionIds = computed(() =>
  (Array.isArray(enrollments.value) ? enrollments.value : []).map((row) => row.sectionId),
);

const filteredCourses = computed(() => courses.value.filter((course) => courseMatchesQuery(course, query.value)));

const { page, pageCount, pageItems: paginatedCourses } = usePagination(filteredCourses);

const openForm = (course = null) => {
  editingCourse.value = course;
  formOpen.value = true;
};

const saveCourse = async (payload) => {
  if (editingCourse.value) {
    await courseServices.updateCourse(editingCourse.value.id, payload);
  } else {
    await courseServices.createCourse(payload);
  }

  await getCourses();
};

const changeEnrollment = async (section, request, fallback) => {
  pendingSectionId.value = section.id;
  enrollmentError.value = "";
  try {
    await request();
    const refreshed = await getEnrollments();
    if (!refreshed) {
      enrollmentError.value = enrollmentsError.value || "Failed to fetch enrollments.";
    }
  } catch (err) {
    enrollmentError.value = Utils.errorMessage(err, fallback);
  } finally {
    pendingSectionId.value = null;
  }
};

const enroll = (section) =>
  changeEnrollment(section, () => enrollmentServices.createEnrollment({ sectionId: section.id }), "Failed to enroll.");

const unenroll = (section) =>
  changeEnrollment(section, () => enrollmentServices.deleteEnrollment(section.id), "Failed to unenroll.");

const confirmDelete = useConfirm();

const deleteCourse = async (course) => {
  const deleted = await confirmDelete({
    title: "Delete course",
    message: `Delete "${course.name}"? This action is permanent.`,
    confirmText: "Delete Course",
    confirmColor: "error",
    onConfirm: () => courseServices.removeCourse(course.id),
  });

  if (deleted) {
    await getCourses();
  }
};

onMounted(() => {
  getCourses();
  if (isAdmin) {
    getFaculty();
  }
  getSemesters();
  if (!isAdmin) {
    getEnrollments();
  }
});

watch(query, () => {
  page.value = 1;
});
</script>

<template>
  <v-container class="py-8">
    <v-toolbar color="transparent" flat>
      <template #title>
        <h2 class="text-headline-large font-weight-bold">Courses</h2>
      </template>
      <template #append v-if="isAdmin">
        <v-btn color="primary" variant="elevated" class="oc-cta" @click="openForm()"> + New Course </v-btn>
      </template>
    </v-toolbar>

    <v-text-field v-model="query" prepend-inner-icon="mdi-magnify" placeholder="Search courses..." />

    <v-alert v-if="!isAdmin && (enrollmentError || enrollmentsError)" type="error" density="compact" class="mb-4">
      {{ enrollmentError || enrollmentsError }}
    </v-alert>

    <ListState
      :loading
      :error
      :empty="!courses.length"
      :no-results="!filteredCourses.length"
      empty-title="No courses yet"
      :empty-text="isAdmin ? 'Create your first course to get started.' : 'Check back later.'"
      empty-icon="mdi-book-open-page-variant-outline"
    >
      <template v-if="isAdmin" #empty-actions>
        <v-btn color="primary" variant="elevated" class="oc-cta" @click="openForm()">+ New Course</v-btn>
      </template>

      <div class="d-flex flex-column ga-4">
        <CourseCard
          v-for="course in paginatedCourses"
          :key="course.id"
          :course="course"
          :can-manage="isAdmin"
          :enrolled-section-ids="enrolledSectionIds"
          :pending-section-id="pendingSectionId"
          @edit="openForm"
          @delete="deleteCourse"
          @enroll="enroll"
          @unenroll="unenroll"
        />
      </div>
    </ListState>

    <v-pagination v-if="pageCount > 1" v-model="page" :length="pageCount" class="mt-4" />

    <CourseFormModal
      v-model="formOpen"
      :course="editingCourse"
      :save="saveCourse"
      :faculty="faculty"
      :semesters="semesters"
    />
  </v-container>
</template>
