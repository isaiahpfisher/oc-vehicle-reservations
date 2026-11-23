<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useDialogChanges } from "../../composables/useDialogChanges.js";
import { LOGO_ACCEPT, areaInitials, areaNameMessage, logoFileMessage, logoFilename } from "../../models/areas.js";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  areas: { type: Array, default: () => [] },
  /** UI/UX backlog #34: the area being edited; `null` creates one. */
  area: { type: Object, default: null },
  save: { type: Function, required: true },
});

const name = ref("");
const file = ref(null);
/** Editing only: take the area's current logo off. */
const removeLogo = ref(false);
const formError = ref("");
const saving = ref(false);
const fileInput = ref(null);
/** UI/UX backlog #29: the name's problem shows on the name field; file problems stay in the alert. */
const nameError = ref("");

/** UI/UX backlog #80: a preview of the chosen logo. */
const canPreview = typeof URL.createObjectURL === "function";
const previewUrl = computed(() => (file.value && canPreview ? URL.createObjectURL(file.value) : ""));
watch(previewUrl, (_next, previous) => previous && URL.revokeObjectURL(previous));
/** The logo the area will have: a newly chosen file, else its current one (unless it's being removed). */
const shownLogo = computed(() => previewUrl.value || (removeLogo.value ? "" : props.area?.logo || ""));
const shownName = computed(() => file.value?.name || (removeLogo.value ? "" : logoFilename(props.area?.logo)));
const hasLogo = computed(() => Boolean(file.value || shownName.value));
onBeforeUnmount(() => previewUrl.value && URL.revokeObjectURL(previewUrl.value));

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  name.value = props.area?.name ?? "";
  file.value = null;
  removeLogo.value = false;
  formError.value = "";
  nameError.value = "";
});

const pickFile = () => {
  fileInput.value?.click();
};

const clearFile = () => {
  file.value = null;
  removeLogo.value = Boolean(props.area?.logo);
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
  if (!message) removeLogo.value = false;
};

const submit = async () => {
  if (saving.value) {
    return;
  }

  const nameMessage = areaNameMessage(name.value, props.areas, props.area?.id ?? null);
  nameError.value = nameMessage;
  if (nameMessage) {
    return;
  }

  if (formError.value) {
    return;
  }

  const body = new FormData();
  body.append("name", name.value.trim());
  if (file.value) {
    body.append("logo", file.value);
  } else if (removeLogo.value) {
    body.append("removeLogo", "true");
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

// UI/UX backlog #31: once something is typed, a click outside doesn't close (and lose) the dialog.
const changed = useDialogChanges(open, () => ({ name: name.value, file: file.value?.name ?? null, removeLogo: removeLogo.value }));
</script>

<template>
  <v-dialog v-model="open" max-width="500" :persistent="saving || changed">
    <!-- UI/UX backlog #30: a form, so Enter saves. -->
    <v-form @submit.prevent="submit">
      <v-card rounded="lg">
        <v-card-title>{{ area ? "Edit area" : "New area" }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="name"
            label="Name"
            density="comfortable"
            :error-messages="nameError"
            @update:model-value="nameError = ''"
          />
          <!-- UI/UX backlog #80: a labelled, secondary logo picker with a preview, so it doesn't compete with Create. -->
          <div class="text-body-medium font-weight-medium mb-2">Logo (optional)</div>
          <div class="d-flex align-center ga-3">
            <div class="area-logo-preview">
              <img v-if="shownLogo" :src="shownLogo" alt="Chosen logo" />
              <!-- No logo: the initials the area's card shows instead, so the preview is never an empty box. -->
              <span v-else-if="name.trim()" class="area-logo-preview__initials" aria-hidden="true">{{ areaInitials(name) }}</span>
            </div>
            <div class="d-flex flex-column ga-1 min-width-0">
              <span v-if="shownName" class="text-body-small text-truncate" data-test="logo-filename">{{ shownName }}</span>
              <div class="d-flex ga-2">
                <v-btn color="primary" variant="outlined" size="small" class="oc-cta" :disabled="saving" @click="pickFile">
                  {{ hasLogo ? "Choose another" : "Upload logo" }}
                </v-btn>
                <v-btn v-if="hasLogo" color="secondary" variant="text" size="small" class="oc-cta" :disabled="saving" @click="clearFile">
                  Remove logo
                </v-btn>
              </div>
              <span class="text-body-small text-medium-emphasis">PNG, JPG, or WebP under 2 MB. Without one, the area's initials show.</span>
            </div>
          </div>
          <input ref="fileInput" class="d-none" type="file" :accept="LOGO_ACCEPT" @change="onFile" />
          <v-alert v-if="formError" type="error" density="compact" class="mt-4">{{ formError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
          <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :loading="saving">
            {{ area ? "Save" : "Create" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
</template>

<style scoped>
.area-logo-preview {
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  border: thin dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.area-logo-preview:has(.area-logo-preview__initials) {
  border: none;
}

.area-logo-preview__initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgb(var(--v-theme-primary-container));
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}

.area-logo-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.min-width-0 {
  min-width: 0;
}
</style>
