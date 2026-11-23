/**
 * Feature 14 — Notes (US-14.6: issue report page)
 * Spec: features/feature-14-notes.md
 */
import { formatDay } from "../src/models/vehicles.js";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import issueReportServices from "../src/services/issueReportServices.js";
import requestServices from "../src/services/requestServices.js";
import userServices from "../src/services/userServices.js";
import vehicleServices from "../src/services/vehicleServices.js";
import noteServices from "../src/services/noteServices.js";
import maintenanceNeedServices from "../src/services/maintenanceNeedServices.js";
import { needTitleFrom, todayInput } from "../src/models/issueReports.js";
import { apiError, settle, signInAs, vuetify, waitFor } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/issueReportServices.js", () => ({
  default: {
    getIssueReports: vi.fn(),
    getIssueReport: vi.fn(),
    createIssueReport: vi.fn(),
    updateIssueReport: vi.fn(),
    removeIssueReport: vi.fn(),
    getAssignees: vi.fn(),
  },
}));

vi.mock("../src/services/requestServices.js", () => ({
  default: { getRequests: vi.fn(), getMyRequests: vi.fn(), getRequest: vi.fn() },
}));

vi.mock("../src/services/userServices.js", () => ({
  default: { getUsers: vi.fn(), getUser: vi.fn() },
}));

vi.mock("../src/services/vehicleServices.js", () => ({
  default: { getVehicles: vi.fn() },
}));

vi.mock("../src/services/noteServices.js", () => ({
  default: { getNotes: vi.fn(), getNote: vi.fn(), createNote: vi.fn(), removeNote: vi.fn() },
}));

vi.mock("../src/services/maintenanceNeedServices.js", () => ({
  default: { getMaintenanceNeeds: vi.fn(), getMaintenanceNeedOptions: vi.fn() },
}));

const account = (userId, roles, firstName) => ({
  userId,
  email: `${firstName.toLowerCase()}@oc.edu`,
  firstName,
  lastName: "Doe",
  roles,
  token: `token-${userId}`,
});

const admin = account(1, [{ id: 1, role: "admin", areaId: null }], "Ada");
const athleticsAdmin = account(3, [{ id: 2, role: "area_admin", areaId: 1 }], "Art");
const musicAdmin = account(4, [{ id: 3, role: "area_admin", areaId: 2 }], "Mo");
const requester = account(2, [], "Jane");

const v100 = { id: 3, universityId: "V-100", year: 2022, make: "Ford", model: "Transit", areaId: 1 };
const v101 = { id: 5, universityId: "V-101", year: 2020, make: "Toyota", model: "Sienna", areaId: 1 };
const v200 = { id: 4, universityId: "V-200", year: 2019, make: "Chevy", model: "Express", areaId: 2 };
const alex = { id: 5, firstName: "Alex", lastName: "Kim" };

const trip = (overrides = {}) => ({
  id: 12,
  purpose: "Campus visit",
  startAt: "2026-11-02",
  endAt: "2026-11-02",
  allDay: true,
  status: "reserved",
  vehicles: [v100],
  ...overrides,
});

const report = (overrides = {}) => ({
  id: 1,
  vehicleId: 3,
  vehicleRequestId: 12,
  authorId: 2,
  assigneeId: null,
  type: "low_gas",
  description: "Tank is on empty.",
  status: "pending",
  resolvedAt: null,
  author: { id: 2, firstName: "Jane", lastName: "Doe" },
  assignee: null,
  vehicle: { id: 3, universityId: "V-100", areaId: 1 },
  vehicleRequest: { id: 12, purpose: "Campus visit" },
  createdAt: "2026-11-04T12:00:00.000Z",
  updatedAt: "2026-11-04T12:00:00.000Z",
  ...overrides,
});

let wrapper;

const mountAt = async (path, user) => {
  signInAs(user);
  await router.push(path);
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

const unmount = () => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
};

const byTest = (name) => document.body.querySelector(`[data-test="${name}"]`);
const heading = () => document.body.querySelector("h2")?.textContent;
const bodyText = () => document.body.textContent;

const field = (name, label) =>
  waitFor(() => {
    const match = wrapper.findAllComponents({ name }).find((component) => component.props("label") === label);
    expect(match).toBeDefined();
    return match;
  });

const click = async (target) => {
  (typeof target === "string" ? byTest(target) : target).click();
  await settle();
};

const buttonNamed = (text) => [...document.body.querySelectorAll("button, a, .v-list-item")].find((el) => el.textContent.trim() === text);

beforeEach(async () => {
  unmount();
  signInAs(null);
  vi.resetAllMocks();
  userServices.getUser.mockResolvedValue({ data: { roles: [] } });
  issueReportServices.getIssueReport.mockResolvedValue({ data: report() });
  issueReportServices.getIssueReports.mockResolvedValue({ data: [] });
  vehicleServices.getVehicles.mockResolvedValue({ data: [v100, v101, v200] });
  requestServices.getMyRequests.mockResolvedValue({ data: [] });
  requestServices.getRequests.mockResolvedValue({ data: [trip(), trip({ id: 13, purpose: "Retreat", vehicles: [v100, v101] })] });
  userServices.getUsers.mockResolvedValue({ data: [alex] });
  noteServices.getNotes.mockResolvedValue({ data: [] });
  maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [] });
  issueReportServices.getAssignees.mockResolvedValue({
    data: [
      { id: 1, firstName: "Ada", lastName: "Doe", roles: ["admin"] },
      { ...alex, roles: ["maintenance"] },
    ],
  });
  await router.push("/login");
  await router.isReady();
});

afterEach(unmount);

describe("Feature 14 — Notes", () => {
  describe("US-14.6 — Issue report page", () => {
    it("Requester reports an issue from their trip", async () => {
      requestServices.getMyRequests.mockResolvedValue({
        data: [trip(), trip({ id: 14, purpose: "Old trip", status: "cancelled", vehicles: [v200] })],
      });
      issueReportServices.createIssueReport.mockResolvedValue({ status: 201, data: report({ id: 7 }) });
      issueReportServices.getIssueReport.mockResolvedValue({ data: report({ id: 7 }) });
      await mountAt("/issue-reports/new?vehicleRequestId=12", requester);

      await waitFor(() => expect(heading()).toBe("Report an issue"));
      // Requesters can't list vehicles or people; they never see triage fields.
      expect(vehicleServices.getVehicles).not.toHaveBeenCalled();
      expect(userServices.getUsers).not.toHaveBeenCalled();
      expect(byTest("section-status")).toBeNull();
      expect(bodyText()).not.toContain("Assignee");

      // Coming from the trip fills in the trip and its only vehicle.
      expect((await field("VAutocomplete", "Trip (optional)")).props("modelValue")).toBe(12);
      const vehicle = await field("VAutocomplete", "Vehicle");
      expect(vehicle.props("modelValue")).toBe(3);
      // Cancelled trips aren't offered; vehicles come from the requester's trips.
      expect((await field("VAutocomplete", "Trip (optional)")).props("items").map(({ id }) => id)).toEqual([12]);
      expect(vehicle.props("items").map(({ label }) => label)).toEqual(["V-100 · 2022 Ford Transit"]);
      // Cancel returns to the trip.
      expect(buttonNamed("Cancel").getAttribute("href")).toBe("/requests/12");

      await click("type-low_gas");
      expect(byTest("type-low_gas").getAttribute("aria-checked")).toBe("true");
      await (await field("VTextarea", "Description")).setValue("  Tank is on empty.  ");
      await click("submit");

      expect(issueReportServices.createIssueReport).toHaveBeenCalledTimes(1);
      expect(issueReportServices.createIssueReport).toHaveBeenCalledWith({
        vehicleId: 3,
        vehicleRequestId: 12,
        assigneeId: null,
        type: "low_gas",
        description: "Tank is on empty.",
        status: "pending",
        resolvedAt: null,
      });
      // Lands on the new report, no "unsaved changes" prompt in the way.
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe("/issue-reports/7"));
      await waitFor(() => expect(bodyText()).toContain("Issue report submitted."));
      expect(bodyText()).not.toContain("Discard changes?");
    });

    it("shows what is missing next to each field before submitting", async () => {
      requestServices.getMyRequests.mockResolvedValue({ data: [trip({ vehicles: [v100, v101] })] });
      await mountAt("/issue-reports/new", requester);
      await waitFor(() => expect(byTest("submit")).not.toBeNull());

      await click("submit");
      expect(issueReportServices.createIssueReport).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(byTest("section-vehicle").textContent).toContain("Choose the vehicle.");
        expect(byTest("section-problem").textContent).toContain("Choose the kind of problem.");
        expect(byTest("section-problem").textContent).toContain("Describe the problem.");
      });
      // Whitespace isn't a description.
      await (await field("VTextarea", "Description")).setValue("   ");
      await click("submit");
      expect(issueReportServices.createIssueReport).not.toHaveBeenCalled();

      // A trip with several vehicles narrows the choice without picking one.
      await (await field("VAutocomplete", "Trip (optional)")).setValue(12);
      const vehicle = await field("VAutocomplete", "Vehicle");
      expect(vehicle.props("modelValue")).toBeNull();
      expect(vehicle.props("items").map(({ id }) => id)).toEqual([3, 5]);
    });

    it("type tiles work as a radio group from the keyboard", async () => {
      await mountAt("/issue-reports/new", requester);
      await waitFor(() => expect(byTest("type-low_gas")).not.toBeNull());

      const group = document.body.querySelector('[role="radiogroup"]');
      expect(group.getAttribute("aria-label")).toBe("Problem type");
      // Only one tile is a tab stop.
      expect([...group.querySelectorAll('[role="radio"]')].map((tile) => tile.tabIndex)).toEqual([0, -1, -1, -1]);

      byTest("type-low_gas").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      await settle();
      expect(byTest("type-dirty").getAttribute("aria-checked")).toBe("true");
      expect(document.activeElement).toBe(byTest("type-dirty"));

      byTest("type-dirty").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      byTest("type-low_gas").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      await settle();
      expect(byTest("type-other").getAttribute("aria-checked")).toBe("true");
    });

    it("Admin or area admin creates a triaged issue report", async () => {
      issueReportServices.createIssueReport.mockResolvedValue({ status: 201, data: report({ id: 8 }) });
      await mountAt("/issue-reports/new", athleticsAdmin);
      await waitFor(() => expect(byTest("section-status")).not.toBeNull());

      // Managers may report on any vehicle.
      expect((await field("VAutocomplete", "Vehicle")).props("items").map(({ id }) => id)).toEqual([3, 5, 4]);
      // Who can be assigned depends on the vehicle, so the assignee waits for it.
      const assignee = await field("VAutocomplete", "Assignee (optional)");
      expect(assignee.props("disabled")).toBe(true);
      expect(byTest("section-status").textContent).toContain("Choose the vehicle first.");

      await (await field("VAutocomplete", "Vehicle")).setValue(4);
      await settle();
      expect(issueReportServices.getAssignees).toHaveBeenLastCalledWith(4);
      expect(assignee.props("disabled")).toBe(false);
      expect(assignee.props("items").map(({ label }) => label)).toEqual(["Ada Doe", "Alex Kim"]);
      await click("type-maintenance");
      await (await field("VTextarea", "Description")).setValue("Brakes squeak.");
      expect(byTest("status-meaning").textContent).toContain("Waiting for staff");

      // Resolving defaults the date to today.
      await click("status-resolved");
      // UI/UX backlog #62: the date is set, not typed.
      expect(byTest("resolved-at").textContent).toContain(`Resolved on ${formatDay(todayInput())}`);
      await (await field("VAutocomplete", "Assignee (optional)")).setValue(5);
      await click("submit");

      expect(issueReportServices.createIssueReport).toHaveBeenCalledWith({
        vehicleId: 4,
        vehicleRequestId: null,
        assigneeId: 5,
        type: "maintenance",
        description: "Brakes squeak.",
        status: "resolved",
        resolvedAt: todayInput(),
      });
    });

    // UI/UX backlog #18: the vehicle page's "Report an issue" fills in that vehicle, and Cancel goes back to it.
    it("starts with the vehicle filled in when opened from a vehicle page", async () => {
      await mountAt("/issue-reports/new?vehicleId=4", athleticsAdmin);
      await waitFor(() => expect(byTest("section-status")).not.toBeNull());

      expect((await field("VAutocomplete", "Vehicle")).props("modelValue")).toBe(4);
      await waitFor(() => expect(issueReportServices.getAssignees).toHaveBeenLastCalledWith(4));
      expect(byTest("action-bar").querySelector("a").getAttribute("href")).toBe("/vehicles/4");
    });

    it("removes an assignee who can't take reports on a newly chosen vehicle", async () => {
      issueReportServices.getIssueReport.mockResolvedValue({ data: report({ vehicleRequestId: null, vehicleRequest: null, assigneeId: 5, assignee: alex }) });
      await mountAt("/issue-reports/1", admin);
      await waitFor(() => expect(heading()).toBe("Low gas · V-100"));
      // Opening the report keeps its assignee, without counting as a change.
      expect((await field("VAutocomplete", "Assignee (optional)")).props("modelValue")).toBe(5);
      expect(byTest("action-bar")).toBeNull();

      // V-200's list doesn't include Alex.
      issueReportServices.getAssignees.mockResolvedValueOnce({ data: [{ id: 1, firstName: "Ada", lastName: "Doe", roles: ["admin"] }] });
      await (await field("VAutocomplete", "Vehicle")).setValue(4);
      await settle();
      expect((await field("VAutocomplete", "Assignee (optional)")).props("modelValue")).toBeNull();
      expect(byTest("assignee-notice").textContent).toContain("Alex Kim can't take reports on this vehicle");
    });

    it("says so when the assignee list can't load", async () => {
      issueReportServices.getAssignees.mockRejectedValue(apiError(400, "Invalid issue report id."));
      await mountAt("/issue-reports/new", admin);
      await waitFor(() => expect(byTest("submit")).not.toBeNull());
      await (await field("VAutocomplete", "Vehicle")).setValue(3);
      await settle();

      expect(byTest("assignees-error").textContent).toContain("Couldn't load who can be assigned. Invalid issue report id.");
      // It doesn't block the report.
      await click("type-dirty");
      await (await field("VTextarea", "Description")).setValue("Mud on the mats.");
      issueReportServices.createIssueReport.mockResolvedValue({ status: 201, data: report({ id: 9 }) });
      await click("submit");
      expect(issueReportServices.createIssueReport).toHaveBeenCalledTimes(1);
    });

    it("searches trips, vehicles, and assignees by all of their details", async () => {
      await mountAt("/issue-reports/new", admin);
      await waitFor(() => expect(byTest("submit")).not.toBeNull());

      const search = async (label, text) => {
        const input = (await field("VAutocomplete", label)).find("input");
        await input.trigger("focus");
        await input.setValue(text);
        await settle();
        const menus = document.body.querySelectorAll(".v-overlay--active:not(.v-snackbar)");
        return [...(menus[menus.length - 1]?.querySelectorAll(".v-list-item-title") ?? [])].map((el) => el.textContent.trim());
      };

      // By make and model, not just the university id.
      expect(await search("Vehicle", "sienna")).toEqual(["V-101 · 2020 Toyota Sienna"]);
      // By a vehicle on the trip.
      expect(await search("Trip (optional)", "V-101")).toEqual(["Retreat"]);
      await (await field("VAutocomplete", "Vehicle")).setValue(3);
      await settle();
      // By role.
      expect(await search("Assignee (optional)", "maint")).toEqual(["Alex Kim"]);
    });

    it("closes a report as moved to maintenance, like Resolved", async () => {
      issueReportServices.updateIssueReport.mockResolvedValue({ data: report({ status: "moved_to_maintenance", resolvedAt: todayInput() }) });
      await mountAt("/issue-reports/1", admin);
      await waitFor(() => expect(byTest("status-moved_to_maintenance")).not.toBeNull());
      expect(byTest("status-moved_to_maintenance").textContent.trim()).toBe("Moved to maintenance");

      await click("status-moved_to_maintenance");
      expect(byTest("status-meaning").textContent).toContain("tracked as a maintenance need");
      // The close date shows with its own label, starting at today.
      expect(byTest("resolved-at").textContent).toContain(`Moved on ${formatDay(todayInput())}`);
      await click("submit");

      expect(issueReportServices.updateIssueReport).toHaveBeenCalledWith(1, expect.objectContaining({ status: "moved_to_maintenance", resolvedAt: todayInput() }));
      await waitFor(() => expect(byTest("status-chip").textContent.trim()).toBe("Moved to maintenance"));
      unmount();

      // Read-only: the chip, what it means, and the date under its own label.
      issueReportServices.getIssueReport.mockResolvedValue({ data: report({ status: "moved_to_maintenance", resolvedAt: "2026-11-05" }) });
      await mountAt("/issue-reports/1", requester);
      await waitFor(() => expect(byTest("view-status")).not.toBeNull());
      expect(byTest("view-status").textContent).toContain("Moved to maintenance");
      expect(byTest("section-status").textContent).toContain("Moved on");
      expect(byTest("section-status").textContent).toContain("Nov 5, 2026");
    });

    it("Admin or area admin edits an issue report on its page", async () => {
      for (const user of [admin, athleticsAdmin]) {
        const saved = report({ description: "Filled up, still low.", assigneeId: 5, assignee: alex });
        issueReportServices.updateIssueReport.mockResolvedValueOnce({ data: saved });
        await mountAt("/issue-reports/1", user);

        await waitFor(() => expect(heading()).toBe("Low gas · V-100"));
        expect(issueReportServices.getIssueReport).toHaveBeenLastCalledWith("1");
        expect(bodyText()).toContain("Reported by Jane Doe");
        expect(byTest("status-chip").textContent.trim()).toBe("Pending");
        // Nothing to save until something changes.
        expect(byTest("action-bar")).toBeNull();

        // Tied to a trip, the vehicle choice is that trip's vehicles.
        const vehicleIds = async () => (await field("VAutocomplete", "Vehicle")).props("items").map(({ id }) => id);
        expect(await vehicleIds()).toEqual([3]);
        // Without the trip: area admins only move reports to vehicles in their areas.
        await (await field("VAutocomplete", "Trip (optional)")).setValue(null);
        expect(await vehicleIds()).toEqual(user === admin ? [3, 5, 4] : [3, 5]);
        await (await field("VAutocomplete", "Trip (optional)")).setValue(12);
        expect((await field("VAutocomplete", "Vehicle")).props("modelValue")).toBe(3);

        await (await field("VTextarea", "Description")).setValue("Filled up, still low.");
        await (await field("VAutocomplete", "Assignee (optional)")).setValue(5);
        expect(byTest("action-bar").textContent).toContain("Unsaved changes");
        await click("submit");

        expect(issueReportServices.updateIssueReport).toHaveBeenLastCalledWith(1, {
          vehicleId: 3,
          vehicleRequestId: 12,
          assigneeId: 5,
          type: "low_gas",
          description: "Filled up, still low.",
          status: "pending",
          resolvedAt: null,
        });
        expect(router.currentRoute.value.name).toBe("issueReport");
        await waitFor(() => expect(bodyText()).toContain("Changes saved."));
        expect(byTest("action-bar")).toBeNull();
        unmount();
      }
    });

    it("discards edits, and shows a failed save in the action bar", async () => {
      await mountAt("/issue-reports/1", admin);
      await waitFor(() => expect(heading()).toBe("Low gas · V-100"));

      await click("type-dirty");
      await click("status-cancelled");
      issueReportServices.updateIssueReport.mockRejectedValueOnce(apiError(403, "Forbidden."));
      await click("submit");
      await waitFor(() => expect(byTest("save-error").textContent).toContain("Forbidden."));

      await click("discard");
      expect(byTest("type-low_gas").getAttribute("aria-checked")).toBe("true");
      expect(byTest("status-pending").getAttribute("aria-checked")).toBe("true");
      expect(byTest("action-bar")).toBeNull();
    });

    it("asks before leaving with unsaved changes", async () => {
      await mountAt("/issue-reports/1", admin);
      await waitFor(() => expect(heading()).toBe("Low gas · V-100"));
      await (await field("VTextarea", "Description")).setValue("Half-written");

      router.push({ name: "issue-reports" });
      await waitFor(() => expect(bodyText()).toContain("Discard changes?"));
      await click(buttonNamed("Keep Editing"));
      expect(router.currentRoute.value.name).toBe("issueReport");

      router.push({ name: "issue-reports" });
      await waitFor(() => expect(buttonNamed("Discard Changes")).toBeDefined());
      await click(buttonNamed("Discard Changes"));
      await waitFor(() => expect(router.currentRoute.value.name).toBe("issue-reports"));
    });

    it("Author views their issue report read-only", async () => {
      issueReportServices.getIssueReport.mockResolvedValue({ data: report({ assigneeId: 5, assignee: alex }) });
      noteServices.getNotes.mockResolvedValue({
        data: [
          {
            id: 1,
            issueReportId: 1,
            authorId: 5,
            author: alex,
            content: "Filled it up this morning.",
            isVisible: true,
            createdAt: "2026-11-05T12:00:00.000Z",
          },
        ],
      });

      // The author, and an area admin of another area, only read it.
      for (const user of [requester, musicAdmin]) {
        await mountAt("/issue-reports/1", user);
        await waitFor(() => expect(heading()).toBe("Low gas · V-100"));

        const form = byTest("issue-report-form");
        expect(form.querySelector("input, textarea, [role='radio']")).toBeNull();
        expect(byTest("view-vehicle").textContent).toContain("V-100");
        expect(byTest("view-trip").textContent).toContain("Campus visit");
        expect(byTest("view-type").textContent).toContain("Low gas");
        expect(byTest("view-description").textContent).toBe("Tank is on empty.");
        expect(byTest("view-status").textContent).toContain("Waiting for staff to take care of it.");
        // The assignee is shown, never editable.
        expect(byTest("view-assignee").textContent).toContain("Alex Kim");
        expect(byTest("submit")).toBeNull();
        expect(byTest("more-actions")).toBeNull();
        expect(vehicleServices.getVehicles).not.toHaveBeenCalled();

        // US-14.2: the notes come last.
        await waitFor(() => expect(byTest("issue-report-notes").textContent).toContain("Filled it up this morning."));
        expect(form.compareDocumentPosition(byTest("issue-report-notes")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(noteServices.getNotes).toHaveBeenLastCalledWith("issueReportId", 1);
        unmount();
      }
    });

    it("Admin or area admin deletes an issue report from its page", async () => {
      issueReportServices.removeIssueReport.mockResolvedValue({ status: 200, data: { message: "Issue report deleted successfully." } });
      await mountAt("/issue-reports/1", athleticsAdmin);
      await waitFor(() => expect(byTest("more-actions")).not.toBeNull());

      await click("more-actions");
      await waitFor(() => expect(byTest("delete-report")).not.toBeNull());
      await click("delete-report");
      await waitFor(() => expect(bodyText()).toContain('Delete "Tank is on empty."? This action is permanent.'));
      await click(buttonNamed("Delete Issue Report"));

      expect(issueReportServices.removeIssueReport).toHaveBeenCalledWith(1);
      await waitFor(() => expect(router.currentRoute.value.name).toBe("issue-reports"));
    });

    it("User without access cannot open an issue report page", async () => {
      issueReportServices.getIssueReport.mockRejectedValue(apiError(403, "Forbidden."));
      await mountAt("/issue-reports/1", requester);

      await waitFor(() => expect(bodyText()).toContain("Forbidden."));
      expect(byTest("issue-report-form")).toBeNull();
      expect(byTest("issue-report-notes")).toBeNull();
      expect(noteServices.getNotes).not.toHaveBeenCalled();
      unmount();

      issueReportServices.getIssueReport.mockRejectedValue(apiError(404, "Issue report with id=99 not found."));
      await mountAt("/issue-reports/99", admin);
      await waitFor(() => expect(bodyText()).toContain("Issue report with id=99 not found."));
    });
  });

  describe("US-14.7 — Create maintenance need from the issue report", () => {
    it("titles a new need from the report's description", () => {
      expect(needTitleFrom("Oil change needed.")).toBe("Oil change needed.");
      expect(needTitleFrom("  Brakes squeak\nonly when cold  ")).toBe("Brakes squeak");
      expect(needTitleFrom("")).toBe("Maintenance Needed");
      const long = needTitleFrom("The rear passenger tire on the left side looks very low and might be leaking");
      expect(long.length).toBeLessThanOrEqual(50);
      expect(long).toBe("The rear passenger tire on the left side looks…");
    });
  });
});
