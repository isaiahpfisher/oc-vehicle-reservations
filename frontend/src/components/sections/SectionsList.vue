<script setup>
import { ref } from "vue";
import sectionServices from "../../services/sectionServices";
import { useRequest } from "../../composables/useRequest.js";
import { useConfirm } from "../../composables/useConfirm.js";

const sectionList = defineModel({ type: Object, required: true });
const props = defineProps({
  courseId: { type: Number, default: null },
  faculty: { type: Object, default: null },
  semesters: { tpye: Object, default: null },
});
const rowSaved = ref();
const page = ref(1);
const required = (label) => (v) =>
  (Array.isArray(v) ? v.length > 0 : !!String(v ?? "").trim()) || `${label} is required.`;

const oneOf = (options, label) => (v) =>
  [v].flat().every((x) => options.includes(x)) || `${label} must be one of ${options.join(", ")}.`;

const rules = {
  sectionNumber: [
    required("Section number"),
    (v) => /^[A-Z]{4}-\d{4}-\d{2}$/.test(v) || "Number must be in the format XXXX-####-## (ex. COMP-1234-89).",
  ],
  semesterId: [required("Semester")],
  facultyFacultyId: [required("Faculty")],
  startTime: [required("Start Time")],
  endTime: [required("End Time")],
  daysOfWeek: [
    required("Days"),
    (v) => /^(M|T|W|TH|F)(,(M|T|W|TH|F))*$/.test(v) || "Days must be a comma seperated list of days (ex. M,W,F).",
  ],
};

function isValid(section) {
  return Object.entries(rules).every(([field, fieldRules]) =>
    fieldRules.every((rule) => rule(section[field]) === true),
  );
}

function addSection() {
  let newSection = {
    sectionNumber: null,
    startTime: null,
    endTime: null,
    semesterId: null,
    facultyFacultyId: null,
    courseId: props.courseId,
    daysOfWeek: null,
  };
  console.log(newSection);
  sectionList.value = [newSection, ...sectionList.value];
}

const {
  data: newSection,
  loadingSection,
  sectionError,
  run: createSection,
} = useRequest(sectionServices.createSection, { initial: [], fallback: "Failed to create section." });
const {
  data: updatedSection,
  loadingSectionUpdate,
  sectionUpdateError,
  run: updateSection,
} = useRequest(sectionServices.updateSection, { initial: [], fallback: "Failed to update section." });

async function save(section, index) {
  if (!isValid(section)) {
    console.log("here");
    return;
  }
  if (section.id == null) {
    console.log(props.courseId);
    await createSection(section);
    const index = sectionList.value.findIndex((item) => item.sectionNumber === section.sectionNumber);

    if (index !== -1) {
      // Replace the entire object at that index
      sectionList.value[index] = newSection.value;
    }
  } else {
    updateSection(section.id, section);
  }
  rowSaved.value = index;
  setTimeout(() => {
    rowSaved.value = undefined;
  }, 500);
}

const confirmDelete = useConfirm();

const deleteSection = async (section, index) => {
  if (section.id == undefined) {
    sectionList.value.splice(index, 1);
    return;
  }
  const deleted = await confirmDelete({
    title: "Delete section",
    message: `Delete "${section.sectionNumber}"? This action is permanent.`,
    confirmText: "Delete Section",
    confirmColor: "error",
    onConfirm: () => sectionServices.removeSection(section.id),
  });

  if (deleted) {
    sectionList.value = sectionList.value.filter((item) => item.id !== section.id);
  }
};
</script>

<template>
  <div class="d-flex justify-space-between">
    <v-card-title>Course Sections</v-card-title>
    <v-btn @click="addSection()" color="primary" variant="elevated" class="oc-cta"> + New Section </v-btn>
  </div>
  <v-defaults-provider :defaults="{ global: { density: 'comfortable' } }">
    <v-card-text v-if="sectionList.length < 1">No sections yet. Create your first section.</v-card-text>
    <v-data-iterator :items="sectionList" :page="page" :items-per-page="3">
      <template v-slot:default="{ items }">
        <template v-for="(section, index) in items" :key="index" :section="section">
          <v-row @focusout="save(section.raw, index)" class="" :class="{ saved: rowSaved == index }">
            <v-col cols="2">
              <v-text-field
                :model-value="section.raw.sectionNumber"
                label="Number"
                hint="e.g. COMP-1234-21"
                :rules="rules.sectionNumber"
                @update:model-value="section.raw.sectionNumber = $event.toUpperCase()"
              />
            </v-col>
            <v-col cols="1/8">
              <v-text-field
                v-model="section.raw.startTime"
                type=""
                label="Start Time"
                :rules="rules.startTime"
                hint="e.g. 12:30pm"
              />
            </v-col>
            <v-col cols="1/8">
              <v-text-field
                v-model="section.raw.endTime"
                type=""
                label="End Time"
                :rules="rules.endTime"
                hint="e.g. 12:30pm"
              />
            </v-col>
            <v-col cols="5/24">
              <v-select
                v-model="section.raw.semesterId"
                label="Semester"
                :items="props.semesters"
                item-title="name"
                item-value="id"
                :rules="rules.semesterId"
                chips
              />
            </v-col>
            <v-col cols="5/24">
              <v-select
                v-model="section.raw.facultyFacultyId"
                label="Professor"
                :items="props.faculty"
                :item-title="(item) => `${item.firstName} ${item.lastName}`"
                item-value="facultyId"
                :rules="rules.facultyFacultyId"
                chips
              />
            </v-col>
            <v-col cols="1/10">
              <v-text-field v-model="section.raw.daysOfWeek" label="Days" :rules="rules.daysOfWeek" hint="e.g. M,W,F" />
            </v-col>
            <v-col cols="1/20">
              <v-list-item
                title=""
                class="pt-4"
                aria-label="Delete section"
                prepend-icon="mdi-trash-can"
                @click="deleteSection(section.raw, index)"
              />
            </v-col>
          </v-row>
        </template>
      </template>
      <template v-slot:footer="{ pageCount }">
        <v-pagination v-model="page" :length="pageCount"></v-pagination>
      </template>
    </v-data-iterator>
  </v-defaults-provider>
</template>

<style>
.saved {
  background-color: rgba(34, 187, 51, 0.3);
}
</style>
