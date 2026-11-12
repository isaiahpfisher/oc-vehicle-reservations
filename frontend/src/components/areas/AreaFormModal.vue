<script setup>
import { computed, ref, watch } from "vue";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  area: { type: Object, default: null },
  areas: { type: Array, default: () => [] },
  save: { type: Function, required: true },
});

const form = ref({ name: "", logo: "" });
const formError = ref("");
const saving = ref(false);

const isEdit = computed(() => !!props.area);

const isLogoUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  form.value = {
    name: props.area?.name ?? "",
    logo: props.area?.logo ?? "",
  };
  formError.value = "";
});

const submit = async () => {
  if (saving.value) {
    return;
  }

  const name = form.value.name.trim();
  const logo = form.value.logo.trim();
  formError.value = "";

  if (!name) {
    formError.value = "Required field.";
    return;
  }

  if (name.length > 255) {
    formError.value = "Name too long.";
    return;
  }

  if (logo && !isLogoUrl(logo)) {
    formError.value = "Invalid logo URL.";
    return;
  }

  const taken = props.areas.some((area) => area.name === name && area.id !== props.area?.id);
  if (taken) {
    formError.value = "Name already taken.";
    return;
  }

  saving.value = true;

  try {
    await props.save({ name, logo });
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
      <v-card-item>
        <v-card-title>{{ isEdit ? "Edit area" : "New area" }}</v-card-title>
        <template #append>
          <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="submit">
            {{ isEdit ? "Save" : "Create" }}
          </v-btn>
          <v-btn variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
        </template>
      </v-card-item>
      <v-card-text>
        <v-text-field v-model="form.name" label="Name" density="comfortable" />
        <v-text-field v-model="form.logo" label="Logo" density="comfortable" />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
