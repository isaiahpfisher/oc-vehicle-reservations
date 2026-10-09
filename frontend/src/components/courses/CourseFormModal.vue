<script setup>
import { computed, ref, watch } from "vue";
import { toFormModel, toPayload } from "../../models/courses.js";
import CourseForm from "./CourseForm.vue";
import SectionsList from "../sections/SectionsList.vue";
import { useRequest } from "../../composables/useRequest.js";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  course: { type: Object, default: null },
  save: { type: Function, required: true },
  faculty: {type: Object, default: null},
  semesters: {type: Object, default: null}
});

const form = ref(toFormModel());
const formKey = ref(0);

const isEdit = computed(() => !!props.course);
const title = computed(() => (isEdit.value ? "Edit Course" : "Add Course"));
const submitLabel = computed(() => (isEdit.value ? "Save" : "Create"));

const {
  loading,
  error,
  run: runSave,
} = useRequest((payload) => props.save(payload), { fallback: "Failed to save course." });

const submit = async (event) => {
  if (loading.value) return;

  const { valid } = await event;
  if (!valid) return;

  const result = await runSave(toPayload(form.value));
  if (result) open.value = false;
};

// reset the form every time the modal opens
watch(open, (isOpen) => {
  if (!isOpen) return;
  if(props.course){

  }
  form.value = toFormModel(props.course ?? {});
  error.value = "";
  formKey.value++;
});
</script>

<template>
  <v-dialog v-model="open" max-width="1000" :persistent="loading">
    <v-form :disabled="loading" @submit.prevent="submit">
      <v-card rounded="lg" :title="title">

          <template #append>
            <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :loading="loading">
              {{ submitLabel }}
            </v-btn>      
            <v-btn variant="text" :disabled="loading" @click="open = false">Cancel</v-btn>
          </template>
        
        <v-card-text>
          <CourseForm :key="formKey" v-model="form" />
          <v-alert v-if="error" type="error" density="compact" class="mt-2">{{ error }}</v-alert>
          <SectionsList v-if="isEdit" :key="formKey" v-model="form.sections" :courseId="props.course.id" :faculty="props.faculty" :semesters="props.semesters"></SectionsList>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
</template>
