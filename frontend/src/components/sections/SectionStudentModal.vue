<script setup>
import { computed, watch } from "vue";
import sectionServices from "../../services/sectionServices.js";
import { useRequest } from "../../composables/useRequest.js";

const open = defineModel({ type: Boolean, default: false });
const props = defineProps({ sectionId: { type: Number, default: null } });

const headers = [
  { title: "First Name", key: "first", sortable: true },
  { title: "Last Name", key: "last", sortable: true },
  { title: "Email", key: "email", sortable: true },
];

const {
  loading,
  error,
  data: section,
  run: getSectionWithStudents,
} = useRequest(sectionServices.getSection, { fallback: "Failed to load students." });

watch(open, (isOpen) => {
  if (!isOpen) {
    props.sectionId = null;
    return;
  }

  getSectionWithStudents(props.sectionId);
});

const students = computed(() => {
  if (loading.value || error.value) return [];

  return section.value.enrollments.map((enrollment) => ({
    first: enrollment.user.firstName,
    last: enrollment.user.lastName,
    email: enrollment.user.email,
  }));
});
</script>

<template>
  <v-dialog v-model="open" max-width="1000" :persistent="loading">
    <v-card rounded="lg">
      <v-card-item
        v-if="!loading && !error"
        :title="`${section.sectionNumber}: ${section.faculty.firstName} ${section.faculty.lastName}`"
        :subtitle="`${section.daysOfWeek}, ${section.startTime} - ${section.endTime}`"
      >
      </v-card-item>

      <v-card-text>
        <v-alert v-if="error" type="error" density="compact" class="mt-2">{{ error }}</v-alert>
        <v-data-table
          :headers="headers"
          :items="students"
          :loading="loading"
          :items-per-page="20"
          no-data-text="No students have enrolled in this section yet."
        >
          <template v-slot:loading> <v-skeleton-loader type="table-row@10"></v-skeleton-loader> </template
        ></v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
