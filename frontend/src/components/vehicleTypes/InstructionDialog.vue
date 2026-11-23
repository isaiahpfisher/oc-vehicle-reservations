<script setup>
/**
 * UI/UX backlog #9: write one set of pickup and return instructions, either a vehicle type's default or one area's
 * version of it. `save(content, areaId)` does the request; its error shows here. With `areaItems`, the dialog first
 * asks which area the new instructions are for (`areaId`); otherwise the caller already knows.
 *
 * Variables (`{{vehicle}}`, …) are filled in from each trip. The Variables panel adds one at the cursor, Preview shows
 * them filled in from a sample trip, and a name that isn't a variable can't be saved.
 */
import { nextTick, ref, watch } from "vue";
import { useDialogChanges } from "../../composables/useDialogChanges.js";
import { INSTRUCTIONS_PLACEHOLDER, unknownVariables, variableGroups, variableToken } from "../../models/instructionVariables.js";
import Utils from "../../config/utils.js";
import InstructionText from "./InstructionText.vue";

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  /** What the box starts with. */
  initial: { type: String, default: "" },
  submitLabel: { type: String, default: "Save" },
  /** `{ title, value }` areas to choose from, for new area instructions. Empty: no choice to make. */
  areaItems: { type: Array, default: () => [] },
  save: { type: Function, required: true },
});

const content = ref("");
const areaId = ref(null);
const mode = ref("write");
/** Preview a trip with one vehicle of this type, or two (where {{vehicle}} lists both). */
const vehicleCount = ref(1);
const formRef = ref(null);
const editorRef = ref(null);
const saving = ref(false);
const error = ref("");
const groups = variableGroups();

const required = (value) => !!String(value ?? "").trim() || "Required field.";
const knownVariables = (value) => {
  const [unknown] = unknownVariables(value);
  return unknown === undefined || `${variableToken(unknown)} isn't a variable. Pick one from Variables.`;
};

/* Adding a variable where the cursor was (or at the end, before the box has been clicked). */
const cursor = ref(null);
const textarea = () => editorRef.value?.$el?.querySelector("textarea") ?? null;
const rememberCursor = () => {
  const el = textarea();
  if (el) cursor.value = { start: el.selectionStart, end: el.selectionEnd };
};

watch(open, (isOpen) => {
  if (isOpen) {
    content.value = props.initial;
    areaId.value = null;
    mode.value = "write";
    vehicleCount.value = 1;
    cursor.value = null;
    error.value = "";
  }
});

const insertVariable = async (name) => {
  const token = variableToken(name);
  const value = content.value ?? "";
  const { start, end } = cursor.value ?? { start: value.length, end: value.length };
  const before = value.slice(0, start);
  // Added to the end of what's written, it gets a space.
  const spacer = !cursor.value && before && !/\s$/.test(before) ? " " : "";
  content.value = `${before}${spacer}${token}${value.slice(end)}`;
  const caret = start + spacer.length + token.length;
  cursor.value = { start: caret, end: caret };
  mode.value = "write";

  await nextTick();
  const el = textarea();
  if (el) {
    el.focus();
    el.setSelectionRange(caret, caret);
  }
};

const submit = async () => {
  if (saving.value) return;
  const { valid } = (await formRef.value?.validate()) ?? { valid: true };
  if (!valid) {
    mode.value = "write";
    return;
  }

  saving.value = true;
  error.value = "";
  try {
    await props.save(content.value.trim(), areaId.value);
    open.value = false;
  } catch (err) {
    error.value = Utils.errorMessage(err, "Failed to save the instructions.");
  } finally {
    saving.value = false;
  }
};

// UI/UX backlog #31: once something is typed, a click outside doesn't close (and lose) the dialog.
const changed = useDialogChanges(open, () => [content.value, areaId.value]);
</script>

<template>
  <v-dialog v-model="open" max-width="960" :persistent="saving || changed" scrollable>
    <v-form ref="formRef" @submit.prevent="submit">
      <v-card rounded="lg">
        <v-card-item>
          <v-card-title>{{ title }}</v-card-title>
          <v-card-subtitle v-if="subtitle" class="text-wrap">{{ subtitle }}</v-card-subtitle>
        </v-card-item>

        <v-card-text class="pt-2">
          <div class="editor">
            <div class="editor__main">
              <v-select
                v-if="areaItems.length"
                v-model="areaId"
                :items="areaItems"
                label="Area"
                density="comfortable"
                class="mb-2"
                :rules="[required]"
                data-test="instruction-area-select"
              />

              <v-tabs v-model="mode" density="compact" color="primary" class="mb-3">
                <v-tab value="write" prepend-icon="mdi-pencil-outline" data-test="instruction-write">Write</v-tab>
                <v-tab value="preview" prepend-icon="mdi-eye-outline" data-test="instruction-preview">Preview</v-tab>
              </v-tabs>

              <v-textarea
                v-show="mode === 'write'"
                ref="editorRef"
                v-model="content"
                label="Instructions"
                :placeholder="INSTRUCTIONS_PLACEHOLDER"
                persistent-placeholder
                rows="8"
                auto-grow
                density="comfortable"
                hide-details="auto"
                :rules="[required, knownVariables]"
                data-test="instruction-content"
                @blur="rememberCursor"
                @click="rememberCursor"
                @keyup="rememberCursor"
              />

              <div v-if="mode === 'preview'" class="preview">
                <div class="preview__head">
                  <span class="text-label-medium text-medium-emphasis">What a driver sees, for a sample trip with</span>
                  <v-btn-toggle v-model="vehicleCount" mandatory density="compact" variant="outlined" color="primary" class="oc-spaced-toggle preview__count">
                    <v-btn :value="1" size="small" class="oc-cta" data-test="preview-one-vehicle">1 vehicle</v-btn>
                    <v-btn :value="2" size="small" class="oc-cta" data-test="preview-two-vehicles">2 vehicles</v-btn>
                  </v-btn-toggle>
                </div>
                <div data-test="instruction-preview-text">
                  <InstructionText v-if="content.trim()" :content preview :many="vehicleCount === 2" />
                  <p v-else class="text-medium-emphasis mb-0">Nothing written yet.</p>
                </div>
                <p class="text-body-small text-medium-emphasis mt-3 mb-0" data-test="preview-note">
                  <template v-if="vehicleCount === 2">Every driver on the trip gets this, each in their own email. Vehicle lists both vehicles, since a driver isn't tied to one.</template>
                  <template v-else>Each driver on the trip gets their own email.</template>
                </p>
              </div>

              <p class="text-body-small text-medium-emphasis mt-2 mb-0">
                Words in double braces, like <code v-pre>{{vehicle}}</code>, are variables. Each trip fills in its own details when the
                instructions go out to drivers. Add one from Variables.
              </p>
            </div>

            <aside class="editor__variables" aria-labelledby="variables-heading" data-test="instruction-variables">
              <div id="variables-heading" class="text-title-small font-weight-bold">Variables</div>
              <div class="text-body-small text-medium-emphasis mb-1">Click one to add it where your cursor is.</div>
              <div class="variables-list">
                <template v-for="{ group, variables } in groups" :key="group">
                  <div class="variables-group text-label-small text-medium-emphasis">{{ group }}</div>
                  <button
                    v-for="variable in variables"
                    :key="variable.name"
                    type="button"
                    class="variable-option"
                    :data-test="`insert-${variable.name}`"
                    @mousedown.prevent
                    @click="insertVariable(variable.name)"
                  >
                    <span class="variable-option__label">
                      <span class="font-weight-medium">{{ variable.label }}</span>
                      <code>{{ variableToken(variable.name) }}</code>
                    </span>
                    <span class="text-body-small text-medium-emphasis">{{ variable.description }}</span>
                  </button>
                </template>
              </div>
            </aside>
          </div>

          <v-alert v-if="error" type="error" density="compact" class="mt-3">{{ error }}</v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
          <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :loading="saving" data-test="instruction-save">
            {{ submitLabel }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
</template>

<style scoped>
.editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 24px;
  align-items: start;
}

.preview {
  min-height: 216px;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.preview__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 12px;
}

.preview__count {
  height: 28px;
}

.editor__variables {
  border-left: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-left: 20px;
}

/* The options' hover background runs past the text, so the list sits 8px wider and the text lines up with the headings. */
.variables-list {
  max-height: 400px;
  overflow-y: auto;
  margin: 0 -8px;
}

.variables-group {
  padding: 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 10px 0 2px;
}

.variable-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.variable-option:hover,
.variable-option:focus-visible {
  background: rgba(var(--v-theme-primary), 0.08);
  outline: none;
}

.variable-option__label {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 8px;
}

code {
  font-size: 0.85em;
  color: rgb(var(--v-theme-primary));
}

/* Phones and narrow windows: the variables go under the box. */
@media (max-width: 760px) {
  .editor {
    grid-template-columns: minmax(0, 1fr);
  }

  .editor__variables {
    border-left: none;
    border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
    padding: 16px 0 0;
  }

  .variables-list {
    max-height: none;
  }
}
</style>
