<script setup>
/**
 * UI/UX backlog #33: delete something that still has vehicles by moving them all somewhere else first — one step,
 * done by the API in one transaction. `save(targetId)` does the request; its error shows here.
 */
import { ref, watch } from "vue";
import Utils from "../../config/utils.js";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  title: { type: String, required: true },
  message: { type: String, required: true },
  /** `[{ title, value }]` — where the vehicles can go. */
  items: { type: Array, default: () => [] },
  label: { type: String, required: true },
  confirmText: { type: String, default: "Move and Delete" },
  save: { type: Function, required: true },
});

const target = ref(null);
const saving = ref(false);
const error = ref("");
const formRef = ref(null);
const required = (value) => value != null || "Choose where the vehicles go.";

watch(open, (isOpen) => {
  if (isOpen) {
    target.value = null;
    error.value = "";
  }
});

const submit = async () => {
  const { valid } = (await formRef.value?.validate()) ?? { valid: true };
  if (!valid || saving.value) return;

  saving.value = true;
  error.value = "";
  try {
    await props.save(target.value);
    open.value = false;
  } catch (err) {
    error.value = Utils.errorMessage(err, "Something went wrong.");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="460" :persistent="saving">
    <v-form ref="formRef" @submit.prevent="submit">
      <v-card rounded="lg" data-test="move-and-delete">
        <v-card-title class="px-6 pt-5 font-weight-bold">{{ title }}</v-card-title>
        <v-card-text class="px-6">
          <p class="mb-4">{{ message }}</p>
          <v-select v-model="target" :items :label density="comfortable" :rules="[required]" />
          <p v-if="!items.length" class="text-body-small text-medium-emphasis mb-0">
            There's nowhere else to move them yet. Create another one first, or delete the vehicles.
          </p>
          <v-alert v-if="error" type="error" density="compact" class="mt-2">{{ error }}</v-alert>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn color="secondary" variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
          <v-btn type="submit" color="error" variant="elevated" class="oc-cta" :loading="saving" :disabled="!items.length">
            {{ confirmText }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
</template>
