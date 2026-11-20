/**
 * Feature 14 — Notes
 * Spec: features/feature-14-notes.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import { VApp } from "vuetify/components";
import NotesThread from "../src/components/notes/NotesThread.vue";
import ConfirmProvider from "../src/components/common/ConfirmProvider.vue";
import noteServices from "../src/services/noteServices.js";
import apiClient from "../src/services/services.js";
import { canDeleteNote, friendlyTimestamp, hasStaffChannel } from "../src/models/notes.js";
import { apiError, mountWithPlugins, settle, signInAs, waitFor } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/noteServices.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    default: {
      getNotes: vi.fn(),
      getNote: vi.fn(),
      createNote: vi.fn(),
      removeNote: vi.fn(),
      actual: actual.default,
    },
  };
});

const user = (userId, roles = [], firstName = "Rae") => ({
  userId,
  email: `user${userId}@oc.edu`,
  firstName,
  lastName: "Quest",
  roles,
  token: `token-${userId}`,
});

const requester = user(1);
const areaAdmin = user(2, [{ id: 1, role: "area_admin", areaId: 1 }], "Art");
const maintenance = user(3, [{ id: 2, role: "maintenance", areaId: null }], "Max");
const admin = user(4, [{ id: 3, role: "admin", areaId: null }], "Ada");

const note = (id, authorId, overrides = {}) => ({
  id,
  vehicleRequestId: 12,
  issueReportId: null,
  maintenanceNeedId: null,
  authorId,
  author: { id: authorId, firstName: ["", "Rae", "Art", "Max", "Ada"][authorId], lastName: "Quest" },
  content: `Note ${id}`,
  isVisible: true,
  includeInEmail: false,
  createdAt: `2026-11-0${id}T12:00:00.000Z`,
  updatedAt: `2026-11-0${id}T12:00:00.000Z`,
  ...overrides,
});

let wrapper;

const mountThread = async (props = { parentKey: "vehicleRequestId", parentId: 12 }) => {
  const Host = defineComponent({
    setup: () => () => h(VApp, null, () => [h(NotesThread, props), h(ConfirmProvider)]),
  });
  ({ wrapper } = await mountWithPlugins(Host, { attachTo: document.body }));
  await settle();
  return wrapper;
};

const contents = () => wrapper.findAll('[data-test="note"] .note-content').map((el) => el.text());
const deleteButtons = () => wrapper.findAll('[data-test="note"]').map((row) => row.find('[data-test="delete-note"]').exists());

const typeNote = async (text) => {
  await wrapper.find('[data-test="note-content"] textarea').setValue(text);
};

const post = async () => {
  await wrapper.find("form").trigger("submit");
  await settle();
};

const channel = async (name) => {
  await wrapper.find(`[data-test="channel-${name}"]`).trigger("click");
  await settle();
};

const composerText = () => wrapper.find('[data-test="note-content"] textarea').element.value;

const confirmButton = (text) => [...document.body.querySelectorAll("button")].find((el) => el.textContent.trim() === text);

beforeEach(() => {
  vi.clearAllMocks();
  noteServices.getNotes.mockResolvedValue({ data: [] });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
  sessionStorage.clear();
  signInAs(null);
});

describe("Feature 14 — Notes", () => {
  describe("US-14.1 — Add notes to entities", () => {
    it("posts a trimmed note and adds it to the thread", async () => {
      signInAs(requester);
      noteServices.createNote.mockResolvedValue({ data: note(1, 1, { content: "Can we leave at 7am?" }) });
      await mountThread();

      await typeNote("  Can we leave at 7am?  ");
      await post();

      expect(noteServices.createNote).toHaveBeenCalledTimes(1);
      expect(noteServices.createNote).toHaveBeenCalledWith({ vehicleRequestId: 12, content: "Can we leave at 7am?", isVisible: true });
      expect(contents()).toEqual(["Can we leave at 7am?"]);
      expect(wrapper.find('[data-test="note-content"] textarea').element.value).toBe("");
    });

    it("blocks an empty note before calling the API", async () => {
      signInAs(requester);
      await mountThread();

      await typeNote("   \n  ");
      await post();

      expect(noteServices.createNote).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain("Write a note before posting.");
    });

    it("shows the API error when posting fails", async () => {
      signInAs(requester);
      noteServices.createNote.mockRejectedValue(apiError(403, "You do not have access to this record."));
      await mountThread();

      await typeNote("Hello");
      await post();

      expect(wrapper.text()).toContain("You do not have access to this record.");
      expect(contents()).toEqual([]);
    });

    it("posts with Ctrl+Enter or Cmd+Enter, keeps plain Enter for new lines, and announces the post", async () => {
      signInAs(requester);
      noteServices.createNote.mockResolvedValue({ data: note(1, 1, { content: "Line one" }) });
      await mountThread();

      const textarea = wrapper.find('[data-test="note-content"] textarea');
      expect(wrapper.find('[data-test="post-note"]').attributes("disabled")).toBeDefined();
      await typeNote("Line one");
      expect(wrapper.find('[data-test="post-note"]').attributes("disabled")).toBeUndefined();

      await textarea.trigger("keydown", { key: "Enter" });
      await settle();
      expect(noteServices.createNote).not.toHaveBeenCalled();

      await textarea.trigger("keydown", { key: "Enter", metaKey: true });
      await settle();
      expect(noteServices.createNote).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(wrapper.find('[data-test="notes-announcer"]').text()).toBe("Note posted."));
      expect(composerText()).toBe("");
    });

    it("keeps the draft when posting fails", async () => {
      signInAs(requester);
      noteServices.createNote.mockRejectedValue(apiError(500, "Server error."));
      await mountThread();

      await typeNote("Don't lose me");
      await post();
      expect(composerText()).toBe("Don't lose me");
      expect(wrapper.text()).toContain("Server error.");
    });
  });

  describe("US-14.2 — View notes on entities", () => {
    it("Users can view notes on requests, issue reports, maintenance needs", async () => {
      signInAs(requester);
      for (const [parentKey, parentId] of [
        ["vehicleRequestId", 12],
        ["issueReportId", 7],
        ["maintenanceNeedId", "9"],
      ]) {
        noteServices.getNotes.mockResolvedValueOnce({ data: [note(1, 1), note(2, 2, { content: "Line one\nLine two" })] });
        await mountThread({ parentKey, parentId });

        expect(noteServices.getNotes).toHaveBeenLastCalledWith(parentKey, parentId);
        expect(contents()).toEqual(["Note 1", "Line one\nLine two"]);
        expect(wrapper.text()).toContain("Art Quest");
        expect(wrapper.text()).toContain("AQ");
        // Your own notes sit on the right as "You", without an avatar; everyone else's on the left.
        const [mine, theirs] = wrapper.findAll('[data-test="note"]');
        expect(mine.classes()).toContain("note--mine");
        expect(mine.find(".note__meta").text()).toContain("You");
        expect(mine.find(".v-avatar").exists()).toBe(false);
        expect(theirs.classes()).not.toContain("note--mine");
        expect(theirs.find(".v-avatar").text()).toBe("AQ");
        wrapper.unmount();
      }
    });

    it("shows loading, empty, and error states", async () => {
      signInAs(requester);
      let resolve;
      noteServices.getNotes.mockReturnValueOnce(new Promise((r) => (resolve = r)));
      await mountThread();
      expect(wrapper.find(".v-skeleton-loader").exists()).toBe(true);
      resolve({ data: [] });
      await settle();
      expect(wrapper.text()).toContain("No notes yet.");
      wrapper.unmount();

      noteServices.getNotes.mockRejectedValueOnce(apiError(500, "Failed to fetch notes."));
      await mountThread();
      expect(wrapper.text()).toContain("Failed to fetch notes.");
      expect(wrapper.find('[data-test="note-content"]').exists()).toBe(false);

      // Try again reloads.
      noteServices.getNotes.mockResolvedValueOnce({ data: [note(1, 1)] });
      const retry = wrapper.findAll("button").find((button) => button.text() === "Try again");
      await retry.trigger("click");
      await settle();
      expect(contents()).toEqual(["Note 1"]);
    });

    it("shows friendly times with the full date on hover", () => {
      const now = new Date(2026, 10, 16, 15, 0);
      const at = (day, hour = 9) => new Date(2026, 10, day, hour, 5).toISOString();
      expect(friendlyTimestamp(at(16), now)).toMatch(/^Today at /);
      expect(friendlyTimestamp(at(15), now)).toMatch(/^Yesterday at /);
      expect(friendlyTimestamp(at(12), now)).toMatch(/^Thursday at /);
      expect(friendlyTimestamp(at(2), now)).toMatch(/^Nov 2 at /);
      expect(friendlyTimestamp(new Date(2025, 0, 4).toISOString(), now)).toMatch(/^Jan 4, 2025 at /);
      expect(friendlyTimestamp(null, now)).toBe("");
    });

    it("calls the matching parent endpoint", async () => {
      const { actual } = noteServices;
      apiClient.get.mockResolvedValue({ data: [] });

      actual.getNotes("vehicleRequestId", 12);
      actual.getNotes("issueReportId", 7);
      actual.getNotes("maintenanceNeedId", 9);
      actual.getNote(3);
      actual.createNote({ issueReportId: 7, content: "Hi" });
      actual.removeNote(3);

      expect(apiClient.get.mock.calls.map(([url]) => url)).toEqual([
        "requests/12/notes",
        "issue-reports/7/notes",
        "maintenance-needs/9/notes",
        "notes/3",
      ]);
      expect(apiClient.post).toHaveBeenCalledWith("notes", { issueReportId: 7, content: "Hi" });
      expect(apiClient.delete).toHaveBeenCalledWith("notes/3");
    });
  });

  describe("US-14.3 — Toggle visibility", () => {
    it("Admin, area_admins, maintenance users can toggle visibility", async () => {
      // Staff choose who reads a note by the channel they post in: Everyone (shared) or Staff only (hidden).
      for (const staff of [admin, areaAdmin, maintenance]) {
        signInAs(staff);
        noteServices.getNotes.mockResolvedValueOnce({
          data: [note(1, 1, { content: "When is pickup?" }), note(2, 2, { isVisible: false, content: "Staff chat" })],
        });
        noteServices.createNote
          .mockResolvedValueOnce({ data: note(3, staff.userId, { isVisible: false, content: "Private" }) })
          .mockResolvedValueOnce({ data: note(4, staff.userId, { content: "Public" }) });
        await mountThread();

        // The conversation never mixes in staff notes; each tab counts its own.
        expect(wrapper.find('[data-test="channel-shared"]').text()).toContain("Everyone");
        expect(wrapper.find('[data-test="channel-shared"]').attributes("aria-label")).toBe("Everyone, 1 note");
        expect(wrapper.find('[data-test="channel-staff"]').attributes("aria-label")).toBe("Staff only, 1 note");
        expect(contents()).toEqual(["When is pickup?"]);
        expect(wrapper.find('[data-test="channel-audience"]').text()).toContain("Shared with the requester.");
        expect(wrapper.find('[data-test="post-note"]').text()).toBe("Post note");

        await channel("staff");
        expect(contents()).toEqual(["Staff chat"]);
        expect(wrapper.find('[data-test="staff-thread"]').exists()).toBe(true);
        expect(wrapper.find('[data-test="channel-audience"]').text()).toContain("Hidden from the requester.");
        expect(wrapper.find('[data-test="staff-only-chip"]').exists()).toBe(true);
        expect(wrapper.find('[data-test="post-note"]').text()).toBe("Post staff note");
        expect(wrapper.find('[data-test="composer-hint"]').text()).toBe("Only staff will see this.");

        await typeNote("Private");
        await post();
        expect(noteServices.createNote).toHaveBeenLastCalledWith({ vehicleRequestId: 12, content: "Private", isVisible: false });
        expect(contents()).toEqual(["Staff chat", "Private"]);

        await channel("shared");
        expect(contents()).toEqual(["When is pickup?"]);
        await typeNote("Public");
        await post();
        expect(noteServices.createNote).toHaveBeenLastCalledWith({ vehicleRequestId: 12, content: "Public", isVisible: true });
        expect(contents()).toEqual(["When is pickup?", "Public"]);
        wrapper.unmount();
      }
    });

    it("keeps a separate draft in each channel, and keeps drafts after leaving the page", async () => {
      signInAs(admin);
      await mountThread();

      await typeNote("For the requester");
      await channel("staff");
      // Text typed for the requester never follows the user into the staff channel, or back.
      expect(composerText()).toBe("");
      await typeNote("Just for staff");
      await channel("shared");
      expect(composerText()).toBe("For the requester");
      wrapper.unmount();

      await mountThread();
      expect(composerText()).toBe("For the requester");
      await channel("staff");
      expect(composerText()).toBe("Just for staff");
    });

    it("shows one thread with no staff channel on a maintenance need", async () => {
      // Everyone who can read a maintenance need is staff, so there is no one to hide a note from.
      signInAs(maintenance);
      noteServices.getNotes.mockResolvedValue({ data: [note(1, 2, { maintenanceNeedId: 9, isVisible: false }), note(2, 3)] });
      noteServices.createNote.mockResolvedValue({ data: note(3, 3) });
      await mountThread({ parentKey: "maintenanceNeedId", parentId: 9 });

      expect(wrapper.find('[data-test="channel-staff"]').exists()).toBe(false);
      expect(contents()).toEqual(["Note 1", "Note 2"]);
      expect(wrapper.find('[data-test="composer-hint"]').text()).toBe("Everyone working on this need will see this.");

      await typeNote("Parts ordered");
      await post();
      expect(noteServices.createNote).toHaveBeenCalledWith({ maintenanceNeedId: 9, content: "Parts ordered", isVisible: true });
    });

    it("Standard user cannot toggle note visibility", async () => {
      signInAs(requester);
      noteServices.createNote.mockResolvedValue({ data: note(1, 1) });
      await mountThread();

      // No channels, and nothing that hints a staff channel exists.
      expect(wrapper.find('[data-test="channel-staff"]').exists()).toBe(false);
      expect(wrapper.text()).not.toContain("Staff only");
      expect(wrapper.find('[data-test="composer-hint"]').text()).toBe("Staff handling this request will see this.");

      await typeNote("Hello");
      await post();
      expect(noteServices.createNote).toHaveBeenCalledWith({ vehicleRequestId: 12, content: "Hello", isVisible: true });
    });

    it("hasStaffChannel is true only where someone who isn't staff reads the notes", () => {
      expect(hasStaffChannel("vehicleRequestId")).toBe(true);
      expect(hasStaffChannel("issueReportId")).toBe(true);
      expect(hasStaffChannel("maintenanceNeedId")).toBe(false);
    });
  });

  describe("US-14.4 — Admin can delete notes", () => {
    it("Admin can delete all notes", async () => {
      signInAs(admin);
      noteServices.getNotes.mockResolvedValue({ data: [note(1, 1), note(2, 2, { isVisible: false }), note(3, 3)] });
      noteServices.removeNote.mockResolvedValue({ status: 204 });
      await mountThread();

      // Feature 14 (US-14.3 channels): the hidden note sits in the Staff only channel, deletable there too.
      expect(deleteButtons()).toEqual([true, true]);
      await channel("staff");
      expect(deleteButtons()).toEqual([true]);
      await channel("shared");

      await wrapper.findAll('[data-test="delete-note"]')[0].trigger("click");
      await waitFor(() => expect(document.body.textContent).toContain("Delete note"));
      expect(document.body.textContent).toContain("Delete Rae Quest's note from");
      confirmButton("Delete Note").click();
      await settle();

      expect(noteServices.removeNote).toHaveBeenCalledWith(1);
      await waitFor(() => expect(contents()).toEqual(["Note 3"]));
      expect(wrapper.find('[data-test="notes-announcer"]').text()).toBe("Note deleted.");
    });

    it("keeps the note and shows the error when the delete fails", async () => {
      signInAs(admin);
      noteServices.getNotes.mockResolvedValue({ data: [note(1, 1)] });
      noteServices.removeNote.mockRejectedValue(apiError(400, "Notes can only be deleted before someone replies."));
      await mountThread();

      await wrapper.find('[data-test="delete-note"]').trigger("click");
      await waitFor(() => expect(confirmButton("Delete Note")).toBeDefined());
      confirmButton("Delete Note").click();
      await settle();

      await waitFor(() => expect(document.body.textContent).toContain("Notes can only be deleted before someone replies."));
      expect(contents()).toEqual(["Note 1"]);
    });
  });

  describe("US-14.5 — Users can delete their own notes if no one has responded", () => {
    it("All sign-in users can delete their own notes if no one has responded", async () => {
      // Rae's first note has a reply from Art; Rae's own follow-ups don't count as replies.
      const thread = [note(1, 1), note(2, 2), note(3, 1), note(4, 1)];

      for (const [viewer, expected] of [
        [requester, [false, false, true, true]],
        [areaAdmin, [false, false, false, false]],
        [maintenance, [false, false, false, false]],
      ]) {
        signInAs(viewer);
        noteServices.getNotes.mockResolvedValueOnce({ data: thread });
        await mountThread();
        expect(deleteButtons()).toEqual(expected);
        wrapper.unmount();
      }

      // The area admin's note is deletable once it is the newest note by anyone else.
      signInAs(areaAdmin);
      noteServices.getNotes.mockResolvedValueOnce({ data: [note(1, 1), note(2, 2), note(3, 2)] });
      noteServices.removeNote.mockResolvedValue({ status: 204 });
      await mountThread();
      expect(deleteButtons()).toEqual([false, true, true]);

      await wrapper.findAll('[data-test="delete-note"]')[1].trigger("click");
      await waitFor(() => expect(confirmButton("Delete Note")).toBeDefined());
      confirmButton("Delete Note").click();
      await settle();
      expect(noteServices.removeNote).toHaveBeenCalledWith(3);
    });

    it("canDeleteNote follows FR-004", () => {
      const thread = [note(1, 1), note(2, 2), note(3, 1)];
      expect(canDeleteNote(thread[0], thread, { userId: 1, isAdmin: false })).toBe(false);
      expect(canDeleteNote(thread[1], thread, { userId: 2, isAdmin: false })).toBe(false);
      expect(canDeleteNote(thread[2], thread, { userId: 1, isAdmin: false })).toBe(true);
      expect(canDeleteNote(thread[1], thread, { userId: 1, isAdmin: false })).toBe(false);
      expect(canDeleteNote(thread[0], thread, { userId: 9, isAdmin: true })).toBe(true);
    });
  });
});
