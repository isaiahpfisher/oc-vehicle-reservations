<script setup>
import { computed, ref, watch } from "vue";
import { toFormModel, toPayload } from "../../models/faculty.js";
import FacultyForm from "./FacultyForm.vue";
import { useRequest } from "../../composables/useRequest.js";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  faculty: { type: Object, default: null },
  save: { type: Function, required: true },
});

const form = ref(toFormModel());
const formKey = ref(0);

const isEdit = computed(() => !!props.faculty);
const title = computed(() => (isEdit.value ? "Edit Faculty" : "Add Faculty"));
const submitLabel = computed(() => (isEdit.value ? "Save" : "Create"));

const {
  loading,
  error,
  run: runSave,
} = useRequest((payload) => props.save(payload), { fallback: "Failed to save faculty." });

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
  form.value = toFormModel(props.faculty ?? {});
  error.value = "";
  formKey.value++;
});
</script>

<template>
  <v-dialog v-model="open" max-width="800" :persistent="loading">
    <v-form :disabled="loading" @submit.prevent="submit">
      <v-card rounded="lg">
        <v-card-title>{{ title }}</v-card-title>
        <v-card-text>
          <FacultyForm :key="formKey" v-model="form" />
          <v-alert v-if="error" type="error" density="compact" class="mt-2">{{ error }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="loading" @click="open = false">Cancel</v-btn>
          <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :loading="loading">
            {{ submitLabel }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
</template>