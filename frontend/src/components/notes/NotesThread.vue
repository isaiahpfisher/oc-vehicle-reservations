<script setup>
/**
 * Feature 14: the notes on a vehicle request, issue report, or maintenance need.
 *
 * Staff (admin, area admin, maintenance) get two channels on requests and reports: the conversation the requester
 * or reporter reads (**Everyone**), and **Staff only** notes they never see (US-14.3). Each channel has its own thread, its own
 * composer and draft, its own colour, and a post button that names where the note goes, so a staff note can't slip
 * into the conversation through a missed toggle. Everyone else sees only the conversation, with no hint that a staff
 * channel exists. On a maintenance need every reader is staff, so it has one thread.
 *
 * Notes read oldest first, newest just above the composer, like a chat: other people's on the left with their
 * avatar, the viewer's own on the right. Drafts survive leaving the page (per tab, per channel) so nothing typed is lost.
 */
import { computed, nextTick, onBeforeUnmount, reactive, ref, useId, watch } from "vue";
import { useDisplay } from "vuetify";
import noteServices from "../../services/noteServices.js";
import Utils from "../../config/utils.js";
import { useConfirm } from "../../composables/useConfirm.js";
import { useRequest } from "../../composables/useRequest.js";
import { useRoles } from "../../composables/useRoles.js";
import {
  NOTE_PARENT_DETAILS,
  authorInitials,
  authorName,
  canDeleteNote,
  friendlyTimestamp,
  hasStaffChannel,
  noteTimestamp,
} from "../../models/notes.js";

const props = defineProps({
  /** `vehicleRequestId`, `issueReportId`, or `maintenanceNeedId`. */
  parentKey: {
    type: String,
    required: true,
    validator: (value) => Object.keys(NOTE_PARENT_DETAILS).includes(value),
  },
  parentId: { type: [String, Number], required: true },
});

const { user, hasRole, hasAnyRole } = useRoles();
const confirm = useConfirm();
const { smAndDown } = useDisplay();
const uid = useId();

const isStaff = computed(() => hasAnyRole(["area_admin", "maintenance"]));
const viewer = computed(() => ({ userId: user.value?.userId, isAdmin: hasRole("admin") }));
const parent = computed(() => NOTE_PARENT_DETAILS[props.parentKey]);
/** Two channels only when the viewer may see staff notes and someone reading this parent may not. */
const showChannels = computed(() => isStaff.value && hasStaffChannel(props.parentKey));

const channel = ref("shared");
const inStaff = computed(() => showChannels.value && channel.value === "staff");
const channelName = computed(() => (inStaff.value ? "staff" : "shared"));

const {
  data: notes,
  loading,
  error,
  run: loadNotes,
} = useRequest(() => noteServices.getNotes(props.parentKey, props.parentId), {
  initial: [],
  fallback: "Failed to fetch notes.",
});

// Without channels the API already left out what this viewer may not see, so the one thread shows everything sent.
const sharedNotes = computed(() => (showChannels.value ? notes.value.filter((note) => note.isVisible) : notes.value));
const staffNotes = computed(() => notes.value.filter((note) => !note.isVisible));
const shown = computed(() => (inStaff.value ? staffNotes.value : sharedNotes.value));

const isMine = (note) => note.authorId === user.value?.userId;
// Deleting looks at every note the viewer can see, staff notes included: any later note by someone else is a reply (FR-004).
const canDelete = (note) => canDeleteNote(note, notes.value, viewer.value);

/** Ticks once a minute so "Today" becomes "Yesterday" on a page left open overnight. */
const now = ref(new Date());
const clock = setInterval(() => {
  now.value = new Date();
}, 60_000);

// ---- Drafts: one per channel, kept in sessionStorage so a reload or a trip to another page doesn't lose them.

const drafts = reactive({ shared: "", staff: "" });
const draftKey = (name) => `oc-note-draft:${user.value?.userId}:${props.parentKey}:${props.parentId}:${name}`;

const readDraft = (name) => {
  try {
    return sessionStorage.getItem(draftKey(name)) ?? "";
  } catch {
    return "";
  }
};

const writeDraft = (name, text) => {
  try {
    if (text.trim()) {
      sessionStorage.setItem(draftKey(name), text);
    } else {
      sessionStorage.removeItem(draftKey(name));
    }
  } catch {
    // Storage is blocked (private mode): the draft just isn't kept.
  }
};

const draft = computed({
  get: () => drafts[channelName.value],
  set: (text) => {
    drafts[channelName.value] = text;
  },
});

watch(
  () => drafts.shared,
  (text) => writeDraft("shared", text),
);
watch(
  () => drafts.staff,
  (text) => writeDraft("staff", text),
);

// ---- Composer

const composer = ref(null);
const posting = ref(false);
const postError = ref("");
const announcement = ref("");
const highlightId = ref(null);
let highlightTimer;

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
const modifierKey = isMac ? "⌘" : "Ctrl";

const composerLabel = computed(() => (inStaff.value ? "Write a staff-only note" : "Write a note"));
const composerHint = computed(() => {
  if (inStaff.value) return "Only staff will see this.";
  if (showChannels.value) return `The ${parent.value.audience} will see this.`;
  if (isStaff.value || !parent.value.audience) return `Everyone working on this ${parent.value.noun} will see this.`;
  return `Staff handling this ${parent.value.noun} will see this.`;
});

const emptyState = computed(() => {
  if (inStaff.value) {
    return {
      icon: "mdi-lock-outline",
      title: "No staff notes yet.",
      text: `Coordinate with other staff here. The ${parent.value.audience} won't see it.`,
    };
  }

  const text = showChannels.value
    ? `Ask the ${parent.value.audience} a question or post an update they'll see.`
    : isStaff.value || !parent.value.audience
      ? `Post an update for everyone working on this ${parent.value.noun}.`
      : `Ask a question or add details for the staff handling this ${parent.value.noun}.`;
  return { icon: "mdi-forum-outline", title: "No notes yet.", text };
});

const announce = (message) => {
  // Cleared first so the same message twice in a row is still read out.
  announcement.value = "";
  nextTick(() => {
    announcement.value = message;
  });
};

const focusComposer = () => composer.value?.focus();

const post = async () => {
  if (posting.value) {
    return;
  }

  const name = channelName.value;
  const text = drafts[name].trim();
  if (!text) {
    postError.value = "Write a note before posting.";
    focusComposer();
    return;
  }

  posting.value = true;
  postError.value = "";

  try {
    const { data } = await noteServices.createNote({
      [props.parentKey]: Number(props.parentId),
      content: text,
      // The channel decides visibility; only staff can be in the staff channel (the API checks too).
      isVisible: name !== "staff",
    });
    notes.value = [...notes.value, data];
    drafts[name] = "";
    announce(name === "staff" ? "Staff note posted." : "Note posted.");

    clearTimeout(highlightTimer);
    highlightId.value = data.id;
    highlightTimer = setTimeout(() => {
      highlightId.value = null;
    }, 2500);

    await nextTick();
    document.getElementById(`${uid}-note-${data.id}`)?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    focusComposer();
  } catch (err) {
    postError.value = Utils.errorMessage(err, "Failed to post note.");
  } finally {
    posting.value = false;
  }
};

/** Ctrl+Enter (⌘+Enter on a Mac) posts; plain Enter is a new line, since notes can run to a few paragraphs. */
const onKeydown = (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    post();
  }
};

const remove = async (note) => {
  const deleted = await confirm({
    title: "Delete note",
    message: `Delete ${isMine(note) ? "your" : `${authorName(note.author)}'s`} note from ${noteTimestamp(note.createdAt)}? This action is permanent.`,
    confirmText: "Delete Note",
    confirmColor: "error",
    onConfirm: () => noteServices.removeNote(note.id),
  });

  if (deleted) {
    notes.value = notes.value.filter(({ id }) => id !== note.id);
    announce("Note deleted.");
    // The delete button is gone; give focus somewhere useful instead of the page body.
    focusComposer();
  }
};

watch(
  () => [props.parentKey, props.parentId],
  () => {
    channel.value = "shared";
    drafts.shared = readDraft("shared");
    drafts.staff = readDraft("staff");
    postError.value = "";
    loadNotes();
  },
  { immediate: true },
);

// A channel's error belongs to that channel's draft.
watch(channel, () => {
  postError.value = "";
});

const countLabel = (count) => `${count} ${count === 1 ? "note" : "notes"}`;

onBeforeUnmount(() => {
  clearInterval(clock);
  clearTimeout(highlightTimer);
});
</script>

<template>
  <div class="notes" data-test="notes">
    <v-tabs
      v-if="showChannels"
      v-model="channel"
      :color="inStaff ? 'staff' : 'primary'"
      :grow="smAndDown"
      density="comfortable"
      class="notes-tabs"
      aria-label="Note channels"
    >
      <v-tab
        :id="`${uid}-tab-shared`"
        value="shared"
        :prepend-icon="smAndDown ? undefined : 'mdi-account-group-outline'"
        class="text-none notes-tab"
        :aria-label="`Everyone, ${countLabel(sharedNotes.length)}`"
        data-test="channel-shared"
      >
        Everyone
        <span class="notes-count" aria-hidden="true">{{ sharedNotes.length }}</span>
      </v-tab>
      <v-tab
        :id="`${uid}-tab-staff`"
        value="staff"
        prepend-icon="mdi-lock-outline"
        class="text-none notes-tab"
        :aria-label="`Staff only, ${countLabel(staffNotes.length)}`"
        data-test="channel-staff"
      >
        Staff only
        <span class="notes-count notes-count--staff" aria-hidden="true">{{ staffNotes.length }}</span>
      </v-tab>
    </v-tabs>

    <div
      :class="['notes-panel', { 'notes-panel--framed': showChannels, 'notes-panel--staff': inStaff }]"
      :role="showChannels ? 'tabpanel' : undefined"
      :aria-labelledby="showChannels ? `${uid}-tab-${channelName}` : undefined"
      :data-test="inStaff ? 'staff-thread' : 'shared-thread'"
    >
      <!-- Says who reads this channel, every time, in words as well as colour. -->
      <p v-if="showChannels" class="notes-audience text-body-medium" data-test="channel-audience">
        <v-icon :icon="inStaff ? 'mdi-lock-outline' : 'mdi-eye-outline'" size="18" class="flex-shrink-0" />
        <span v-if="inStaff">
          <strong>Hidden from the {{ parent.audience }}.</strong>
          Only admins, area admins, and maintenance staff can read these notes.
        </span>
        <span v-else>
          <strong>Shared with the {{ parent.audience }}.</strong>
          They see every note in this conversation.
        </span>
      </p>

      <div v-if="loading && !notes.length" aria-busy="true" aria-label="Loading notes">
        <v-skeleton-loader type="list-item-avatar-two-line" class="bg-transparent" />
      </div>

      <v-alert v-else-if="error && !notes.length" type="error" variant="tonal" data-test="notes-error">
        {{ error }}
        <template #append>
          <v-btn variant="text" size="small" class="text-none" @click="loadNotes">Try again</v-btn>
        </template>
      </v-alert>

      <div v-else-if="!shown.length" class="notes-empty" data-test="notes-empty">
        <div class="notes-empty__icon">
          <v-icon :icon="emptyState.icon" size="24" />
        </div>
        <div class="text-title-small font-weight-bold">{{ emptyState.title }}</div>
        <div class="text-body-medium text-medium-emphasis">{{ emptyState.text }}</div>
      </div>

      <ol v-else class="notes-list" :aria-label="inStaff ? 'Staff notes' : 'Notes'">
        <li
          v-for="note in shown"
          :id="`${uid}-note-${note.id}`"
          :key="note.id"
          :class="['note', { 'note--mine': isMine(note), 'note--new': note.id === highlightId }]"
          data-test="note"
        >
          <!-- Your own notes sit on the right without an avatar, like any messaging thread. -->
          <v-avatar
            v-if="!isMine(note)"
            color="primary-container"
            size="36"
            class="note__avatar text-label-large"
            aria-hidden="true"
          >
            {{ authorInitials(note.author) }}
          </v-avatar>

          <div class="note__main">
            <div class="note__meta">
              <span class="text-label-large font-weight-bold" :title="isMine(note) ? authorName(note.author) : undefined">
                {{ isMine(note) ? "You" : authorName(note.author) }}
              </span>
              <span
                v-if="showChannels && !note.isVisible"
                class="note__tag note__tag--staff"
                data-test="staff-only-chip"
              >
                <v-icon icon="mdi-lock-outline" size="12" />
                Staff only
              </span>
            </div>
            <div class="note__bubble">
              <p class="note-content text-body-medium">{{ note.content }}</p>
            </div>
            <!-- Time and Delete sit under the bubble, along its edge, like a comment's footer. -->
            <div class="note__footer">
              <time :datetime="note.createdAt" :title="noteTimestamp(note.createdAt)" class="note__time">
                {{ friendlyTimestamp(note.createdAt, now) }}
              </time>
              <template v-if="canDelete(note)">
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  class="note__delete"
                  :aria-label="`Delete ${isMine(note) ? 'your' : `${authorName(note.author)}'s`} note from ${noteTimestamp(note.createdAt)}`"
                  data-test="delete-note"
                  @click="remove(note)"
                >
                  Delete
                </button>
              </template>
            </div>
          </div>
        </li>
      </ol>

      <v-form v-if="!(error && !notes.length)" class="notes-composer" @submit.prevent="post">
        <v-textarea
          ref="composer"
          v-model="draft"
          :label="composerLabel"
          :color="inStaff ? 'staff' : 'primary'"
          :error-messages="postError"
          :readonly="posting"
          bg-color="background"
          rows="2"
          max-rows="10"
          auto-grow
          hide-details="auto"
          data-test="note-content"
          @keydown="onKeydown"
          @update:model-value="postError = ''"
        />
        <div class="notes-composer__bar">
          <span class="notes-composer__hint text-body-small" data-test="composer-hint">
            <v-icon :icon="inStaff ? 'mdi-lock-outline' : 'mdi-eye-outline'" size="16" />
            {{ composerHint }}
          </span>
          <span class="notes-composer__keys text-body-small d-none d-md-inline" aria-hidden="true">
            <kbd>{{ modifierKey }}</kbd> <kbd>Enter</kbd> to post
          </span>
          <v-btn
            type="submit"
            :color="inStaff ? 'staff' : 'primary'"
            variant="elevated"
            class="oc-cta"
            :prepend-icon="inStaff ? 'mdi-lock-outline' : 'mdi-send-outline'"
            :loading="posting"
            :disabled="!draft.trim()"
            :aria-keyshortcuts="isMac ? 'Meta+Enter' : 'Control+Enter'"
            data-test="post-note"
          >
            {{ inStaff ? "Post staff note" : "Post note" }}
          </v-btn>
        </div>
      </v-form>
    </div>

    <div class="d-sr-only" aria-live="polite" data-test="notes-announcer">{{ announcement }}</div>
  </div>
</template>

<style scoped>
/* ---- Channels */
.notes-tabs {
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.25);
  margin-bottom: 16px;
}

/* Phones: tighter tabs so both labels fit side by side. */
@media (max-width: 959.98px) {
  .notes-tab {
    padding: 0 6px;
    min-width: 0;
  }
}

.notes-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  margin-inline-start: 8px;
  padding: 0 6px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.8);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
}

.notes-count--staff {
  background: rgb(var(--v-theme-staff-container));
  color: rgb(var(--v-theme-staff));
}

/* Both channels share the same frame so switching tabs doesn't shift the layout; only staff gets colour. */
.notes-panel--framed {
  padding: 16px;
  border: 1px solid rgba(var(--v-theme-outline), 0.25);
  border-radius: 12px;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.notes-panel--staff {
  background: rgb(var(--v-theme-staff-container));
  border-color: rgba(var(--v-theme-staff), 0.45);
}

.notes-audience {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 0 16px;
  color: rgba(var(--v-theme-on-surface), 0.75);
}

.notes-panel--staff .notes-audience {
  color: rgb(var(--v-theme-staff));
}

/* ---- Empty */
.notes-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 16px 24px;
  text-align: center;
}

.notes-empty__icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-bottom: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary-container));
  color: rgb(var(--v-theme-primary));
}

.notes-panel--staff .notes-empty__icon {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-staff));
}

/* ---- Thread */
.notes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.note {
  display: flex;
  gap: 12px;
  margin: -4px;
  padding: 4px;
  border-radius: 12px;
}

.note--new {
  animation: note-arrive 2.5s ease-out;
}

@keyframes note-arrive {
  from {
    background: rgba(var(--v-theme-primary), 0.08);
  }
  to {
    background: transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .note--new {
    animation: none;
  }
}

.note__avatar {
  flex-shrink: 0;
}

/* Bubbles never run the full width, so whose side a note is on reads at a glance. */
.note__main {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 85%;
}

.note--mine {
  justify-content: flex-end;
}

.note--mine .note__main {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

/* Mirrored: "You" on the right, the time and delete button toward the middle. */
.note--mine .note__meta {
  flex-direction: row-reverse;
}

.note__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  column-gap: 8px;
  row-gap: 2px;
  min-height: 20px;
}

.note__footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
}

.note__time {
  color: inherit;
}

.note__tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0 6px;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.8);
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 18px;
  letter-spacing: 0.02em;
}

.note__tag--staff {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-staff));
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-staff), 0.4);
}

/* A quiet text action; padding grows the hit area without moving the text. */
.note__delete {
  appearance: none;
  margin: -4px -6px;
  padding: 4px 6px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.note__delete:hover,
.note__delete:focus-visible {
  color: rgb(var(--v-theme-error));
  text-decoration: underline;
}

.note__delete:focus-visible {
  outline: 2px solid rgb(var(--v-theme-error));
  outline-offset: 1px;
}

/* A speech bubble whose square corner points at the avatar. */
.note__bubble {
  display: inline-block;
  max-width: 100%;
  margin-top: 2px;
  padding: 8px 12px;
  border-radius: 4px 12px 12px 12px;
  background: rgba(var(--v-theme-surface-variant), 0.55);
}

.notes-panel--staff .note__bubble {
  background: rgb(var(--v-theme-surface));
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-staff), 0.25);
}

/* Your own bubble: solid brand colour with white text, square corner on the right. */
.note--mine .note__bubble {
  border-radius: 12px 4px 12px 12px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

/* In the staff channel your bubbles take the staff colour, so the channel still reads at a glance. */
.notes-panel--staff .note--mine .note__bubble {
  background: rgb(var(--v-theme-staff));
  color: rgb(var(--v-theme-on-staff));
  box-shadow: none;
}

.note-content {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* ---- Composer */
.notes-composer {
  margin-top: 24px;
}

.notes-composer__bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 8px;
}

.notes-composer__hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 200px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.notes-panel--staff .notes-composer__hint {
  color: rgb(var(--v-theme-staff));
  font-weight: 500;
}

.notes-composer__bar .v-btn {
  margin-inline-start: auto;
}

.notes-composer__keys {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

kbd {
  padding: 1px 5px;
  border: 1px solid rgba(var(--v-theme-outline), 0.4);
  border-bottom-width: 2px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.6875rem;
  font-weight: 600;
}
</style>
