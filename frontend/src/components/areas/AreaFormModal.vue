<script setup>
import { ref, watch } from "vue";
import { LOGO_ACCEPT, areaNameMessage, logoFileMessage } from "../../models/areas.js";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  areas: { type: Array, default: () => [] },
  save: { type: Function, required: true },
});

const name = ref("");
const file = ref(null);
const formError = ref("");
const saving = ref(false);
const fileInput = ref(null);

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  name.value = "";
  file.value = null;
  formError.value = "";
});

const pickFile = () => {
  fileInput.value?.click();
};

const clearFile = () => {
  file.value = null;
  formError.value = "";
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const onFile = (event) => {
  const selected = event.target.files?.[0];
  event.target.value = "";
  if (!selected) {
    return;
  }

  const message = logoFileMessage(selected);
  formError.value = message;
  file.value = message ? null : selected;
};

const submit = async () => {
  if (saving.value) {
    return;
  }

  const nameMessage = areaNameMessage(name.value, props.areas);
  if (nameMessage) {
    formError.value = nameMessage;
    return;
  }

  if (formError.value) {
    return;
  }

  const body = new FormData();
  body.append("name", name.value.trim());
  if (file.value) {
    body.append("logo", file.value);
  }

  saving.value = true;

  try {
    await props.save(body);
    open.value = false;
  } catch (error) {
    formError.value = error.response?.data?.message || "Failed to save area.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="500" :persistent="saving">
    <v-card rounded="lg">
      <v-card-title>New area</v-card-title>
      <v-card-text>
        <v-text-field v-model="name" label="Name" density="comfortable" />
        <div class="d-flex align-center ga-3">
          <span>Logo</span>
          <v-btn color="primary" variant="elevated" class="oc-cta" :disabled="saving" @click="file ? clearFile() : pickFile()">
            {{ file ? "Remove File" : "Upload logo" }}
          </v-btn>
          <span v-if="file">{{ file.name }}</span>
        </div>
        <input ref="fileInput" class="d-none" type="file" :accept="LOGO_ACCEPT" @change="onFile" />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="secondary" variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="submit">Create</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
