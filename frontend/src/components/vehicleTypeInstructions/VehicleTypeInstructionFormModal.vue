<script setup>
import { ref, watch } from "vue";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  instruction: { type: Object, default: null },
  vehicleTypes: { type: Array, default: () => [] },
  areas: { type: Array, default: () => [] },
  areaRequired: { type: Boolean, default: false },
  save: { type: Function, required: true },
});

const instructionTemplate = `Pickup the vehicle from the lot behind Garvey.
You will be driving ___.
Pickup the keys from Support Central during office hours.
On return, fill with gas, clean up, and put the keys in the drop box outside support.
Contact the area admin if there is an issue.`;

const form = ref({ vehicleTypeId: null, areaId: null, content: "" });
const formError = ref("");
const saving = ref(false);

const reset = () => {
  form.value = {
    vehicleTypeId: props.instruction?.vehicleTypeId ?? null,
    areaId: props.instruction?.areaId ?? null,
    content: props.instruction?.content ?? instructionTemplate,
  };
  formError.value = "";
};

watch(open, (isOpen) => {
  if (isOpen) {
    reset();
  }
});

const submit = async () => {
  if (saving.value) {
    return;
  }

  const content = form.value.content.trim();
  formError.value = "";

  if (!form.value.vehicleTypeId || !content || (props.areaRequired && !form.value.areaId)) {
    formError.value = "Required field.";
    return;
  }

  saving.value = true;

  try {
    await props.save({
      vehicleTypeId: form.value.vehicleTypeId,
      areaId: form.value.areaId ?? null,
      content,
    });
    open.value = false;
  } catch (error) {
    formError.value = error.response?.data?.message || "Failed to save vehicle type instruction.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="640" :persistent="saving">
    <v-card rounded="lg">
      <v-card-item>
        <v-card-title>{{ instruction ? "Edit vehicle type instruction" : "New vehicle type instruction" }}</v-card-title>
        <template #append>
          <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="submit">
            {{ instruction ? "Save" : "Create" }}
          </v-btn>
          <v-btn variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
        </template>
      </v-card-item>
      <v-card-text>
        <v-select
          v-model="form.vehicleTypeId"
          label="Vehicle type"
          :items="vehicleTypes"
          item-title="name"
          item-value="id"
          density="comfortable"
        />
        <v-select
          v-model="form.areaId"
          label="Area"
          :items="areas"
          item-title="name"
          item-value="id"
          :clearable="!areaRequired"
          density="comfortable"
        />
        <v-textarea v-model="form.content" label="Instruction message" density="comfortable" />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
