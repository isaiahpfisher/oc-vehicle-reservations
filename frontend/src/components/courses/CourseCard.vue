<script setup>
import { ref } from "vue";
import SectionStudentModal from "../sections/SectionStudentModal.vue";

const props = defineProps({
  course: { type: Object, required: true },
  canManage: { type: Boolean, default: false },
  enrolledSectionIds: { type: Array, default: () => [] },
  pendingSectionId: { default: null },
});

const emit = defineEmits(["edit", "delete", "enroll", "unenroll"]);
const isEnrolled = (section) => props.enrolledSectionIds.includes(section.id);
const sectionModalId = ref(null);
const sectionModalOpen = ref(false);

const openSectionStudentsModal = (id) => {
  sectionModalOpen.value = true;
  sectionModalId.value = id;
};
</script>

<template>
  <v-card>
    <v-card-item>
      <v-card-title>{{ course.name }}</v-card-title>

      <v-card-subtitle> {{ course.department }}: {{ course.number }} </v-card-subtitle>

      <template v-slot:append v-if="canManage">
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn
              icon="mdi-dots-vertical"
              variant="text"
              v-bind="props"
              density="compact"
              aria-label="Course actions"
            ></v-btn>
          </template>

          <v-list>
            <v-list-item title="Edit" prepend-icon="mdi-pencil" density="compact" @click="emit('edit', course)" />
            <v-list-item
              title="Delete"
              prepend-icon="mdi-trash-can"
              density="compact"
              @click="emit('delete', course)"
            />
          </v-list>
        </v-menu>
      </template>
    </v-card-item>

    <v-card-text>
      <div>{{ course.description }}</div>
    </v-card-text>

    <div class="px-4 my-2">
      <div class="d-flex gc-2">
        <v-chip color="primary">{{ course.hours }} hours</v-chip>

        <v-chip color="blue">{{ course.frequency }}</v-chip>

        <v-chip color="green" v-for="semester in course.semesters" :key="semester">{{ semester }}</v-chip>
      </div>
    </div>
    <v-expansion-panels>
      <v-expansion-panel title="Sections">
        <v-expansion-panel-text>
          <v-card class="mb-1" v-for="(section, index) in course.sections" :key="index" :section="section">
            <v-card-item
              :title="`${section.sectionNumber}: ${section.faculty.firstName} ${section.faculty.lastName}`"
              :subtitle="`${section.daysOfWeek}, ${section.startTime} - ${section.endTime}`"
            >
              <template v-slot:append v-if="canManage">
                <v-btn
                  color="primary"
                  variant="tonal"
                  class="oc-cta mt-2"
                  @click="() => openSectionStudentsModal(section.id)"
                >
                  View Students
                </v-btn>
              </template>
            </v-card-item>
            <v-card-text>
              <div>Semester: {{ section.semester.name }}</div>
              <v-btn
                v-if="!canManage"
                color="primary"
                variant="elevated"
                class="oc-cta mt-2"
                :loading="pendingSectionId === section.id"
                @click="isEnrolled(section) ? emit('unenroll', section) : emit('enroll', section)"
              >
                {{ isEnrolled(section) ? "Unenroll" : "Enroll" }}
              </v-btn>
            </v-card-text>
          </v-card>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-card>

  <SectionStudentModal v-model="sectionModalOpen" :section-id="sectionModalId" />
</template>
