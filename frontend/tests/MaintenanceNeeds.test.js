/**
 * Feature 11 — Maintenance Needs
 * Spec: features/feature-11-maintenance-needs.md
 */
import { formatDay } from "../src/models/vehicles.js";
import { formatTripDates } from "../src/models/requests.js";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import maintenanceNeedServices from "../src/services/maintenanceNeedServices.js";
import issueReportServices from "../src/services/issueReportServices.js";
import vehicleServices from "../src/services/vehicleServices.js";
import serviceLogServices from "../src/services/serviceLogServices.js";
import serviceTypeServices from "../src/services/serviceTypeServices.js";
import userServices from "../src/services/userServices.js";
import vehicleRequestServices from "../src/services/vehicleRequestServices.js";
import { chooseMoreAction, signInAs, vuetify } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/issueReportServices.js", () => ({
  default: { getIssueReports: vi.fn(), getIssueReport: vi.fn(), createIssueReport: vi.fn(), updateIssueReport: vi.fn(), removeIssueReport: vi.fn() },
}));

vi.mock("../src/services/vehicleServices.js", () => ({
  default: { getVehicles: vi.fn(), getVehicle: vi.fn() },
}));

vi.mock("../src/services/serviceLogServices.js", () => ({
  default: { createServiceLog: vi.fn(), getServiceLogsByVehicle: vi.fn() },
}));

vi.mock("../src/services/serviceTypeServices.js", () => ({
  default: { getServiceTypes: vi.fn() },
}));

vi.mock("../src/services/userServices.js", () => ({
  default: { getUsers: vi.fn(), getUser: vi.fn() },
}));

vi.mock("../src/services/vehicleRequestServices.js", () => ({
  default: { getVehicleRequests: vi.fn() },
}));

vi.mock("../src/services/maintenanceNeedServices.js", () => ({
  default: {
    getMaintenanceNeeds: vi.fn(),
    getMaintenanceNeed: vi.fn(),
    getMaintenanceNeedOptions: vi.fn(),
    createMaintenanceNeed: vi.fn(),
    updateMaintenanceNeed: vi.fn(),
    removeMaintenanceNeed: vi.fn(),
  },
}));

const adminRoles = [{ id: 1, role: "admin", areaId: null, area: null }];
const areaAdminRoles = [{ id: 2, role: "area_admin", areaId: 1, area: { id: 1, name: "Athletics" } }];
const maintenanceRoles = [{ id: 3, role: "maintenance", areaId: null, area: null }];

const sienna = { id: 1, universityId: "V-1", year: 2015, color: "Black", make: "Toyota", model: "Sienna", licensePlate: "ABC-123", areaId: 1 };
const otherVan = { id: 2, universityId: "V-2", year: 2015, color: "Black", make: "Toyota", model: "Sienna", licensePlate: "ABC-124", areaId: 2 };
const john = { id: 3, firstName: "John", lastName: "Doe" };
const jello = { id: 4, firstName: "Jane", lastName: "Jello" };

// UI/UX backlog #62: the resolve date is shown, not typed.
const resolvedOn = () => document.body.querySelector('[data-test="resolved-on"]');

const todayString = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const need = {
  id: 1,
  issueReportId: null,
  authorId: 2,
  author: { id: 2, firstName: "Jane", lastName: "Doe" },
  vehicleId: 1,
  vehicle: sienna,
  assigneeId: 3,
  assignee: john,
  title: "Oil Change",
  description: "The car is making weird rattling noises as it travels at high speeds",
  outOfService: false,
  priority: "None",
  status: "Open",
  resolvedAt: null,
  createdAt: "2026-11-06T12:00:00.000Z",
};

const options = {
  vehicles: [sienna, otherVan],
  assignees: [john, jello],
};

let wrapper;

const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await flushPromises();
  }
};

const waitFor = async (assertion, timeout = 1500) => {
  const start = Date.now();
  for (;;) {
    try {
      return assertion();
    } catch (error) {
      if (Date.now() - start > timeout) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10));
      await flushPromises();
    }
  }
};

const mountAppAt = async (path) => {
  await router.push(path);
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

const signIn = (roles = adminRoles, overrides = {}) => {
  signInAs({
    userId: 2,
    email: "jane@oc.edu",
    firstName: "Jane",
    lastName: "Doe",
    roles,
    token: "token",
    ...overrides,
  });
};

const namedButton = (text) =>
  [...document.body.querySelectorAll("button, a")].find((element) => element.textContent.trim() === text);

const clickNamed = async (text) => {
  const button = await waitFor(() => {
    const match = namedButton(text);
    expect(match).toBeDefined();
    return match;
  });
  button.click();
  await settle();
};

const field = async (name, label) =>
  waitFor(() => {
    const match = wrapper.findAllComponents({ name }).find((component) => component.props("label") === label);
    expect(match).toBeDefined();
    return match;
  });

const textField = (label) => field("VTextField", label);
const selectField = (label) => field("VSelect", label);

// Like a vehicle's page: an existing need reads as text, and its fields are in the "Edit details" dialog.
// A closed dialog's content stays in the page, so "open" means inside an active overlay.
const editDialogOpen = () => Boolean(document.body.querySelector('.v-overlay--active [data-test="edit-need-dialog"]'));
const openEditDialog = async () => {
  await clickNamed("Edit details");
  await waitFor(() => expect(editDialogOpen()).toBe(true));
};
// The list filters like the other lists: a Status dropdown and, for maintenance users, an "Assigned to me" button.
const statusFilter = () => field("VSelect", "Status");
const statusValue = async () => (await statusFilter()).props("modelValue");
const assignedButton = () => document.body.querySelector('[data-test="assigned-filter"]');

const rowText = () => document.body.textContent;

const expectMaintenanceNeedsInFleet = () => {
  const mainNav = document.body.querySelector('[aria-label="Main navigation"]');
  const headers = [...mainNav.querySelectorAll(".v-list-subheader")];
  const fleetHeader = headers.find((header) => header.textContent.trim() === "Fleet");
  const links = [...mainNav.querySelectorAll("a")];
  const link = links.find((anchor) => anchor.textContent.trim() === "Maintenance Needs");
  const serviceTypes = links.find((anchor) => anchor.textContent.trim() === "Service Types");
  expect(fleetHeader).toBeDefined();
  expect(link).toBeDefined();
  expect(serviceTypes).toBeDefined();
  expect(fleetHeader.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // UI/UX backlog #38: Service Types moved to the Setup section after Fleet, so Maintenance Needs now comes first.
  expect(link.compareDocumentPosition(serviceTypes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const nextHeader = headers.find(
    (header) => header !== fleetHeader && (fleetHeader.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING),
  );
  if (nextHeader) {
    expect(link.compareDocumentPosition(nextHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
};

beforeEach(async () => {
  signInAs(null);
  vi.resetAllMocks();
  apiClient.get.mockImplementation((url) => {
    if (String(url).includes("users")) {
      return Promise.resolve({ data: { roles: adminRoles } });
    }
    return Promise.resolve({ data: [] });
  });
  issueReportServices.getIssueReports.mockResolvedValue({ data: [] });
  vehicleServices.getVehicles.mockResolvedValue({ data: [] });
  userServices.getUsers.mockResolvedValue({ data: [] });
  serviceTypeServices.getServiceTypes.mockResolvedValue({ data: [] });
  serviceLogServices.createServiceLog.mockResolvedValue({ status: 201, data: { id: 1 } });
  serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [] });
  userServices.getUser.mockResolvedValue({ data: { roles: adminRoles } });
  vehicleRequestServices.getVehicleRequests.mockResolvedValue({ data: [] });
  maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [] });
  maintenanceNeedServices.getMaintenanceNeed.mockResolvedValue({ data: need });
  maintenanceNeedServices.getMaintenanceNeedOptions.mockResolvedValue({ data: options });
  maintenanceNeedServices.createMaintenanceNeed.mockResolvedValue({ status: 201, data: need });
  maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: need });
  maintenanceNeedServices.removeMaintenanceNeed.mockResolvedValue({ status: 200, data: { message: "Maintenance need deleted." } });
  await router.push("/login");
  await router.isReady();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 11 — Maintenance Needs", () => {
  describe("US-11.1 — Create maintenance need from maintenance needs page", () => {
    it("Admin user creates a maintenance need", async () => {
      signIn();
      await mountAppAt("/maintenance-needs");
      await clickNamed("+ New Maintenance Need");

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs/new"));
      for (const label of ["Title", "Assignee", "Out of Service", "Priority", "Status", "Vehicle", "Description"]) {
        expect(await field(label === "Description" ? "VTextarea" : label === "Title" ? "VTextField" : "VSelect", label)).toBeDefined();
      }
      expect(resolvedOn()).toBeNull();
      expect((await selectField("Vehicle")).props("items").map((item) => item.title)).toEqual([
        // UI/UX backlog #37: the same vehicle label as everywhere else.
        "V-1 · 2015 Toyota Sienna",
        "V-2 · 2015 Toyota Sienna",
      ]);

      await (await selectField("Status")).setValue("Completed");
      await waitFor(() => expect(resolvedOn()?.textContent).toContain(formatDay(todayString())));
    });

    it("Area admin user creates a maintenance need", async () => {
      signIn(areaAdminRoles);
      await mountAppAt("/maintenance-needs/new");

      expect((await selectField("Vehicle")).props("items").map((item) => item.value)).toEqual([1]);
      await (await selectField("Status")).setValue("Canceled");
      await waitFor(() => expect(resolvedOn()).not.toBeNull());
    });

    it("Maintenance user creates a maintenance need", async () => {
      signIn(maintenanceRoles, { userId: 8, firstName: "Mia", lastName: "Mechanic" });
      maintenanceNeedServices.getMaintenanceNeedOptions.mockResolvedValue({
        data: { ...options, assignees: [...options.assignees, { id: 8, firstName: "Mia", lastName: "Mechanic" }] },
      });
      await mountAppAt("/maintenance-needs/new");

      const assignee = await selectField("Assignee");
      expect(assignee.props("items").map((item) => item.title)).toContain("Mia Mechanic");
      expect(assignee.props("modelValue")).toBe(8);
      expect((await selectField("Vehicle")).props("items")).toHaveLength(2);
      await (await selectField("Status")).setValue("Completed");
      await waitFor(() => expect(resolvedOn()).not.toBeNull());
    });

    it("Admin user saves maintenance need", async () => {
      signIn();
      const created = { ...need, id: 9, title: "Oil Change" };
      maintenanceNeedServices.createMaintenanceNeed.mockResolvedValue({ status: 201, data: created });
      await mountAppAt("/maintenance-needs/new");
      await (await textField("Title")).setValue("Oil Change");
      await (await selectField("Vehicle")).setValue(1);
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [created] });
      await clickNamed("Create");

      await waitFor(() => expect(maintenanceNeedServices.createMaintenanceNeed).toHaveBeenCalledTimes(1));
      await expect(maintenanceNeedServices.createMaintenanceNeed.mock.results[0].value).resolves.toMatchObject({ status: 201 });
      await waitFor(() => {
        expect(router.currentRoute.value.path).toBe("/maintenance-needs");
        expect(rowText()).toContain("Oil Change");
      });
      // Feature 21, US-21.3: the success message is still showing on the list.
      expect(document.body.querySelector('[data-test="app-notice"]')?.textContent).toContain("Maintenance need created.");
    });

    // UI/UX backlog #18: the vehicle page's "New Maintenance Need" fills in that vehicle and returns to it.
    it("Admin user creates a maintenance need from a vehicle page", async () => {
      signIn();
      maintenanceNeedServices.createMaintenanceNeed.mockResolvedValue({ status: 201, data: { ...need, id: 9 } });
      await mountAppAt(`/maintenance-needs/new?vehicleId=${otherVan.id}`);

      expect((await selectField("Vehicle")).props("modelValue")).toBe(otherVan.id);
      await (await textField("Title")).setValue("Wipers");
      await clickNamed("Create");

      await waitFor(() => expect(maintenanceNeedServices.createMaintenanceNeed).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: otherVan.id })));
      await waitFor(() => expect(router.currentRoute.value.path).toBe(`/vehicles/${otherVan.id}`));
    });

    it("Area admin user saves maintenance need", async () => {
      signIn(areaAdminRoles);
      const created = { ...need, title: "Area brakes" };
      maintenanceNeedServices.createMaintenanceNeed.mockResolvedValue({ status: 201, data: created });
      await mountAppAt("/maintenance-needs/new");
      await (await textField("Title")).setValue("Area brakes");
      await (await selectField("Vehicle")).setValue(1);
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [created] });
      await clickNamed("Create");

      await waitFor(() => expect(maintenanceNeedServices.createMaintenanceNeed).toHaveBeenCalledTimes(1));
      await expect(maintenanceNeedServices.createMaintenanceNeed.mock.results[0].value).resolves.toMatchObject({ status: 201 });
      await waitFor(() => expect(rowText()).toContain("Area brakes"));
    });

    it("Maintenance user saves maintenance need", async () => {
      signIn(maintenanceRoles, { userId: 8, firstName: "Mia", lastName: "Mechanic" });
      const created = { ...need, title: "My task", assigneeId: 8 };
      maintenanceNeedServices.createMaintenanceNeed.mockResolvedValue({ status: 201, data: created });
      await mountAppAt("/maintenance-needs/new");
      await (await textField("Title")).setValue("My task");
      await (await selectField("Vehicle")).setValue(1);
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [created] });
      await clickNamed("Create");

      await waitFor(() => expect(maintenanceNeedServices.createMaintenanceNeed).toHaveBeenCalledTimes(1));
      expect(maintenanceNeedServices.createMaintenanceNeed.mock.calls[0][0].assigneeId).toBe(8);
      await expect(maintenanceNeedServices.createMaintenanceNeed.mock.results[0].value).resolves.toMatchObject({ status: 201 });
      await waitFor(() => expect(rowText()).toContain("My task"));
    });

    it("Admin user cancels creating maintenance need", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/new");
      await clickNamed("Cancel");

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs"));
      expect(maintenanceNeedServices.createMaintenanceNeed).not.toHaveBeenCalled();
    });

    it("Admin user creates a maintenance need with a missing title", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/new");
      await clickNamed("Create");

      expect(rowText()).toContain("Required field.");
      expect(maintenanceNeedServices.createMaintenanceNeed).not.toHaveBeenCalled();
    });

    it("Admin user creates a maintenance need with a whitespace-only title", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/new");
      await (await textField("Title")).setValue(" ");
      await clickNamed("Create");

      expect(rowText()).toContain("Required field.");
      expect(maintenanceNeedServices.createMaintenanceNeed).not.toHaveBeenCalled();
    });

    it("Title input accepts at most 50 characters", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/new");
      await (await textField("Title")).setValue("x".repeat(51));

      expect((await textField("Title")).props("modelValue")).toHaveLength(50);
    });

    it("Resolve date is hidden unless status is Completed or Canceled", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/new");
      expect(resolvedOn()).toBeNull();

      await (await selectField("Status")).setValue("Completed");
      await waitFor(() => expect(resolvedOn()?.textContent).toContain(formatDay(todayString())));

      await (await selectField("Status")).setValue("Open");
      expect(resolvedOn()).toBeNull();

      await (await selectField("Status")).setValue("Canceled");
      await waitFor(() => expect(resolvedOn()?.textContent).toContain(formatDay(todayString())));
    });

    it("New maintenance need defaults are Out of Service Yes, Priority None, and Status Open", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/new");

      expect((await selectField("Out of Service")).props("modelValue")).toBe(true);
      expect((await selectField("Priority")).props("modelValue")).toBe("None");
      expect((await selectField("Status")).props("modelValue")).toBe("Open");
    });
  });

  describe("US-11.3 — View maintenance need list", () => {
    const openNeed = {
      ...need,
      id: 2,
      title: "Brake pads",
      status: "Open",
      priority: "High",
      createdAt: "2026-11-06T15:00:00.000Z",
    };
    const progressNeed = {
      ...need,
      id: 3,
      title: "Rotate tires",
      status: "In Progress",
      createdAt: "2026-11-05T15:00:00.000Z",
    };
    const doneNeed = {
      ...need,
      id: 4,
      title: "Already done",
      status: "Completed",
      resolvedAt: "2026-11-01",
      createdAt: "2026-11-04T15:00:00.000Z",
    };
    const canceledNeed = {
      ...need,
      id: 5,
      title: "Called off",
      status: "Canceled",
      createdAt: "2026-11-03T15:00:00.000Z",
    };
    const outsideNeed = {
      ...need,
      id: 6,
      title: "Other area",
      vehicleId: 2,
      vehicle: otherVan,
      createdAt: "2026-11-02T15:00:00.000Z",
    };

    it("Maintenance needs view lists maintenance needs for admin", async () => {
      signIn();
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [openNeed] });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("Brake pads"));
      for (const column of ["Title", "Priority", "Assignee", "Status", "Actions"]) {
        expect(rowText()).toContain(column);
      }
    });

    it("Maintenance needs view lists maintenance needs for area admin", async () => {
      signIn(areaAdminRoles);
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [openNeed, outsideNeed] });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("Brake pads"));
      expect(rowText()).not.toContain("Other area");
      for (const column of ["Title", "Priority", "Assignee", "Status", "Actions"]) {
        expect(rowText()).toContain(column);
      }
    });

    it("Maintenance needs view lists maintenance needs for a maintenance user", async () => {
      signIn(maintenanceRoles);
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({
        data: [{ ...openNeed, assigneeId: 2, assignee: { id: 2, firstName: "Jane", lastName: "Doe" } }],
      });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("Brake pads"));
      for (const column of ["Title", "Priority", "Assignee", "Status", "Actions"]) {
        expect(rowText()).toContain(column);
      }
    });

    // UI/UX backlog #27: search, the vehicle, an out-of-service flag, priority by urgency, and an empty tab message.
    it("Maintenance needs list search, vehicle, out-of-service flag, and priority order", async () => {
      signIn();
      const urgent = {
        ...openNeed,
        id: 21,
        title: "Urgent brakes",
        priority: "High",
        outOfService: true,
        vehicle: { ...sienna, universityId: "VAN-7" },
        createdAt: "2026-11-01T00:00:00.000Z",
      };
      const minor = { ...openNeed, id: 22, title: "Minor squeak", priority: "Low", outOfService: false, createdAt: "2026-11-07T00:00:00.000Z" };
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [urgent, minor] });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("Urgent brakes"));
      expect(rowText()).toContain("VAN-7");
      expect(document.body.querySelectorAll('[data-test="out-of-service"]')).toHaveLength(1);

      [...document.body.querySelectorAll(".v-data-table thead th")].find((th) => th.textContent.includes("Priority")).click();
      await settle();
      expect(rowText().indexOf("Urgent brakes")).toBeLessThan(rowText().indexOf("Minor squeak"));

      await (await field("VTextField", undefined)).setValue("squeak");
      await settle();
      expect(rowText()).toContain("Minor squeak");
      expect(rowText()).not.toContain("Urgent brakes");

      await (await field("VTextField", undefined)).setValue("nothing like this");
      await settle();
      expect(rowText()).toContain("No maintenance needs match your search.");
    });

    it("Maintenance needs empty state", async () => {
      signIn();
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("No maintenance needs yet"));
    });

    it("Maintenance needs list starts on open needs for admins", async () => {
      signIn();
      await mountAppAt("/maintenance-needs");

      await waitFor(async () => expect(await statusValue()).toEqual(["Open", "In Progress"]));
      expect(assignedButton()).toBeNull();
      expect(document.body.querySelector(".v-tab")).toBeNull();
    });

    it("Maintenance needs area admins only see their areas, whatever the status", async () => {
      signIn(areaAdminRoles);
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [openNeed, outsideNeed, doneNeed] });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("Brake pads"));
      expect(assignedButton()).toBeNull();
      expect(rowText()).not.toContain("Other area");
      await (await statusFilter()).setValue([]);
      await settle();
      expect(rowText()).toContain("Already done");
      expect(rowText()).not.toContain("Other area");
    });

    it("Maintenance users start on the open needs assigned to them", async () => {
      signIn(maintenanceRoles);
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(assignedButton()).not.toBeNull());
      expect(assignedButton().getAttribute("aria-pressed")).toBe("true");
      expect(await statusValue()).toEqual(["Open", "In Progress"]);
    });

    it("Maintenance needs list shows open and in-progress needs first", async () => {
      signIn();
      const unassigned = { ...openNeed, assigneeId: null, assignee: null };
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [doneNeed, progressNeed, unassigned] });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("Brake pads"));
      // Feature 21, US-21.13: a need nobody is assigned to says so.
      const row = [...document.body.querySelectorAll("tbody tr")].find((tr) => tr.textContent.includes("Brake pads"));
      expect(row.textContent).toContain("Unassigned");
      expect(rowText()).toContain("Rotate tires");
      expect(rowText()).not.toContain("Already done");
      expect(rowText().indexOf("Brake pads")).toBeLessThan(rowText().indexOf("Rotate tires"));
    });

    it("Assigned to me shows only my open and in-progress needs", async () => {
      signIn(maintenanceRoles, { userId: 8 });
      const mine = { ...openNeed, id: 11, title: "My newer", assigneeId: 8, createdAt: "2026-11-06T18:00:00.000Z" };
      const mineOlder = { ...openNeed, id: 12, title: "My older", assigneeId: 8, createdAt: "2026-11-01T18:00:00.000Z" };
      const someone = { ...openNeed, id: 13, title: "Not mine", assigneeId: 3 };
      const mineProgress = { ...progressNeed, id: 14, title: "My progress", assigneeId: 8 };
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [mineOlder, someone, mineProgress, mine] });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("My newer"));
      expect(rowText()).toContain("My older");
      expect(rowText()).not.toContain("Not mine");
      // UI/UX backlog #27 changed this: work you've started (In Progress) stays in your queue.
      expect(rowText()).toContain("My progress");
      expect(rowText().indexOf("My newer")).toBeLessThan(rowText().indexOf("My older"));
      expect(assignedButton().textContent).toContain("3");

      // Turning it off shows everyone's.
      assignedButton().click();
      await settle();
      expect(rowText()).toContain("Not mine");
    });

    it("Maintenance needs Assigned to me empty state", async () => {
      signIn(maintenanceRoles);
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("Nothing to do. Enjoy your day!"));
    });

    it("Clearing the status filter shows every status", async () => {
      signIn();
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [doneNeed, openNeed] });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("Brake pads"));
      expect(rowText()).not.toContain("Already done");
      expect(document.body.querySelector('[data-test="result-count"]').textContent).toContain("Showing 1 of 2");
      document.body.querySelector('[data-test="clear-filters"]').click();
      await settle();

      expect(rowText()).toContain("Brake pads");
      expect(rowText()).toContain("Already done");
      expect(rowText().indexOf("Brake pads")).toBeLessThan(rowText().indexOf("Already done"));
      expect(document.body.querySelector('[data-test="result-count"]')).toBeNull();
    });

    it("Filtering to completed and cancelled needs", async () => {
      signIn();
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [openNeed, canceledNeed, doneNeed] });
      await mountAppAt("/maintenance-needs");
      await waitFor(() => expect(rowText()).toContain("Brake pads"));
      await (await statusFilter()).setValue(["Completed", "Canceled"]);
      await settle();

      expect(rowText()).toContain("Already done");
      expect(rowText()).toContain("Called off");
      expect(rowText()).not.toContain("Brake pads");
      expect(rowText().indexOf("Already done")).toBeLessThan(rowText().indexOf("Called off"));
      // UI/UX backlog #41: shown as "Cancelled", the spelling the rest of the app uses (the stored value is unchanged).
      const calledOff = [...document.body.querySelectorAll("tbody tr")].find((row) => row.textContent.includes("Called off"));
      expect(calledOff.textContent).toContain("Cancelled");
      expect(calledOff.textContent).not.toContain("Canceled");
    });

    it("Maintenance needs table shows 10 rows per page", async () => {
      signIn();
      const rows = Array.from({ length: 11 }, (_, index) => {
        const day = String(index + 1).padStart(2, "0");
        return {
          ...openNeed,
          id: index + 1,
          title: `Need ${day}`,
          status: index === 0 ? "In Progress" : "Open",
          createdAt: `2026-11-${day}T12:00:00.000Z`,
        };
      });
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: rows });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("Need 11"));
      expect(rowText()).not.toContain("Need 01");
      const next = document.body.querySelector("[aria-label='Next page']");
      expect(next).toBeTruthy();
      next.click();
      await settle();
      await waitFor(() => expect(rowText()).toContain("Need 01"));
    });
  });

  // UI/UX backlog #21, #23, #24, #25, #37: the need's page.
  describe("UI/UX backlog — Maintenance need page", () => {
    it("shows who created the need, with breadcrumbs back to the list", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/1");

      await waitFor(() => expect(document.body.textContent).toContain("Created by Jane Doe on Nov 6, 2026"));
      expect(document.body.querySelector(".v-breadcrumbs").textContent).toContain("Maintenance Needs");
    });

    it("shows the date of the vehicle's next trip, linked to it", async () => {
      signIn();
      const trip = { id: 7, purpose: "Choir tour", startAt: "2026-12-04", endAt: "2026-12-05", allDay: true, status: "reserved", area: { id: 1, name: "Music" } };
      const later = { ...trip, id: 8, purpose: "Retreat", startAt: "2027-01-10", endAt: "2027-01-12" };
      vehicleServices.getVehicle.mockResolvedValue({ data: { id: 1, upcomingTrips: [trip, later] } });
      await mountAppAt("/maintenance-needs/1");

      const row = await waitFor(() => {
        const match = document.body.querySelector('[data-test="need-next-trip"]');
        expect(match).not.toBeNull();
        return match;
      });
      expect(vehicleServices.getVehicle).toHaveBeenCalledWith(1);
      expect(row.textContent.trim()).toBe(formatTripDates(trip));
      expect(row.querySelector("a").getAttribute("href")).toBe("/requests/7");
    });

    it("says there are no upcoming trips when the vehicle has none", async () => {
      signIn();
      vehicleServices.getVehicle.mockResolvedValue({ data: { id: 1, upcomingTrips: [] } });
      await mountAppAt("/maintenance-needs/1");

      const row = await waitFor(() => {
        const match = document.body.querySelector('[data-test="need-next-trip"]');
        expect(match).not.toBeNull();
        return match;
      });
      await waitFor(() => expect(vehicleServices.getVehicle).toHaveBeenCalled());
      expect(row.textContent.trim()).toBe("No upcoming trips");
      expect(row.querySelector("a")).toBeNull();
    });

    it("logs service from the need's page, can close the need, and stays on the need", async () => {
      // A maintenance user (John) logging the work is filled in as who did it.
      signIn(maintenanceRoles, { userId: john.id, firstName: "John", lastName: "Doe" });
      serviceTypeServices.getServiceTypes.mockResolvedValue({ data: [{ id: 1, name: "Brakes" }] });
      serviceLogServices.createServiceLog.mockResolvedValue({ status: 201, data: { id: 5 } });
      maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: { ...need, status: "Completed" } });
      await mountAppAt("/maintenance-needs/1");

      await clickNamed("+ New Service Log");
      expect((await field("VAutocomplete", "User")).props("modelValue")).toBe(john.id);
      expect((await textField("Serviced At")).props("modelValue")).toBe(todayString());
      expect(document.body.querySelector('[data-test="complete-need"]')).not.toBeNull();
      await (await field("VAutocomplete", "Service Types")).setValue([1]);
      await (await textField("Mileage")).setValue("12050");
      await clickNamed("Create");

      await waitFor(() =>
        expect(serviceLogServices.createServiceLog).toHaveBeenCalledWith(expect.objectContaining({ maintenanceNeedId: 1, vehicleId: 1, userId: john.id })),
      );
      await waitFor(() => expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalledWith("1", expect.objectContaining({ status: "Completed" })));
      // Your call: no jump to the vehicle's service log; the need's Service logs card reloads instead.
      await waitFor(() => expect(serviceLogServices.getServiceLogsByVehicle).toHaveBeenCalledTimes(2));
      expect(router.currentRoute.value.path).toBe("/maintenance-needs/1");
    });
  });

  describe("US-11.4 — Maintenance need actions", () => {
    it("Admin user creates a service log from a maintenance need", async () => {
      // Feature 13: a maintenance need row can record the service performed for that need.
      signIn();
      serviceTypeServices.getServiceTypes.mockResolvedValue({ data: [{ id: 1, name: "Oil Change" }] });
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [need] });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Create service log"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Create service log"]').click();
      await settle();

      const userField = await field("VAutocomplete", "User");
      expect(userField.props("items").map((person) => person.id)).toEqual([john.id, jello.id]);
      await userField.setValue(john.id);
      await (await field("VAutocomplete", "Service Types")).setValue([1]);
      await (await textField("Mileage")).setValue("12050");
      await (await textField("Serviced At")).setValue("2026-07-02");
      const needField = await selectField("Maintenance Need");
      expect(needField.props("disabled")).toBe(true);
      expect(needField.props("modelValue")).toBe(1);
      await clickNamed("Create");

      await waitFor(() => expect(serviceLogServices.createServiceLog).toHaveBeenCalledTimes(1));
      expect(serviceLogServices.createServiceLog).toHaveBeenCalledWith({
        userId: 3,
        serviceTypeIds: [1],
        miles: 12050,
        maintenanceNeedId: 1,
        servicedAt: "2026-07-02",
        vehicleId: 1,
      });
      expect(router.currentRoute.value.path).toBe("/maintenance-needs");
      expect(document.body.textContent).toContain("Service log created.");
    });

    // UI/UX backlog #36: rows keep edit; delete moved to the need page's ⋮ menu.
    it("Maintenance need rows have an edit action, and no delete", async () => {
      signIn();
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [need] });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Edit maintenance need"]')).toBeTruthy());
      expect(document.body.querySelector('[aria-label="Delete maintenance need"]')).toBeNull();
    });
  });

  describe("US-11.5 — Edit and delete maintenance needs", () => {
    const expectFields = async () => {
      for (const label of ["Title", "Assignee", "Out of Service", "Priority", "Status", "Vehicle", "Description"]) {
        expect(await field(label === "Description" ? "VTextarea" : label === "Title" ? "VTextField" : "VSelect", label)).toBeDefined();
      }
    };

    const openEdit = async (roles = adminRoles) => {
      signIn(roles);
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [need] });
      maintenanceNeedServices.getMaintenanceNeed.mockResolvedValue({ data: need });
      await mountAppAt("/maintenance-needs");
      if (roles.some((role) => role.role === "maintenance")) {
        // The need isn't assigned to them, so turn off "Assigned to me".
        await waitFor(() => expect(assignedButton()).not.toBeNull());
        assignedButton().click();
        await settle();
      }
      await waitFor(() => expect(document.body.querySelector('[aria-label="Edit maintenance need"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Edit maintenance need"]').click();
      await settle();
    };

    it("Admin user opens the maintenance needs page", async () => {
      await openEdit();

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs/1"));
      await openEditDialog();
      await expectFields();
      expect((await textField("Title")).props("modelValue")).toBe("Oil Change");
      expect((await selectField("Vehicle")).props("items")).toHaveLength(2);
      expect(resolvedOn()).toBeNull();
      await (await selectField("Status")).setValue("Completed");
      await waitFor(() => expect(resolvedOn()).not.toBeNull());
    });

    it("Area admin user opens the maintenance needs page", async () => {
      await openEdit(areaAdminRoles);

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs/1"));
      await openEditDialog();
      await expectFields();
      expect((await textField("Title")).props("modelValue")).toBe("Oil Change");
      expect((await selectField("Vehicle")).props("items").map((item) => item.value)).toEqual([1]);
      await (await selectField("Status")).setValue("Canceled");
      await waitFor(() => expect(resolvedOn()).not.toBeNull());
    });

    it("Maintenance user opens the maintenance needs page", async () => {
      await openEdit(maintenanceRoles);

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs/1"));
      await openEditDialog();
      await expectFields();
      expect((await selectField("Vehicle")).props("items")).toHaveLength(2);
      expect((await textField("Title")).props("modelValue")).toBe(need.title);
      await (await selectField("Status")).setValue("Completed");
      await waitFor(() => expect(resolvedOn()).not.toBeNull());
    });

    // Your call: hidden, not disabled, when the need didn't come from an issue report.
    it("View issue report is hidden when there is no issue report", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/1");

      await waitFor(() => expect(namedButton("Mark in progress")).toBeDefined());
      expect(namedButton("View issue report")).toBeUndefined();
    });

    it("View issue report opens the issue report when issueReportId is set", async () => {
      signIn();
      maintenanceNeedServices.getMaintenanceNeed.mockResolvedValue({ data: { ...need, issueReportId: 4 } });
      await mountAppAt("/maintenance-needs/1");
      await clickNamed("View issue report");

      // Feature 14 (US-14.6): the placeholder redirect is gone; the issue report page opens.
      await waitFor(() => {
        expect(router.currentRoute.value.path).toBe("/issue-reports/4");
        expect(router.currentRoute.value.name).toBe("issueReport");
      });
      await waitFor(() => expect(issueReportServices.getIssueReport).toHaveBeenCalledWith("4"));
    });

    it("Mark in progress shows when status is Open", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/1");

      const button = await waitFor(() => {
        const match = namedButton("Mark in progress");
        expect(match).toBeDefined();
        return match;
      });
      expect(button.disabled).toBe(false);
    });

    it("Mark in progress sets status to In Progress", async () => {
      signIn();
      const updated = { ...need, status: "In Progress" };
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [updated] });
      maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: updated });
      await mountAppAt("/maintenance-needs/1");
      await clickNamed("Mark in progress");

      // UI/UX backlog #22: saving stays on the need's page and says so.
      await waitFor(() => expect(document.body.textContent).toContain("Marked in progress."));
      expect(router.currentRoute.value.path).toBe("/maintenance-needs/1");
      expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalledWith("1", expect.objectContaining({ status: "In Progress" }));
      expect(rowText()).toContain("Oil Change");
      expect(namedButton("Mark completed")).toBeDefined();
    });

    it("Mark completed shows when status is In Progress", async () => {
      signIn();
      maintenanceNeedServices.getMaintenanceNeed.mockResolvedValue({ data: { ...need, status: "In Progress" } });
      await mountAppAt("/maintenance-needs/1");

      const button = await waitFor(() => {
        const match = namedButton("Mark completed");
        expect(match).toBeDefined();
        return match;
      });
      expect(button.disabled).toBe(false);
    });

    it("Mark completed sets status to Completed", async () => {
      signIn();
      const updated = { ...need, status: "Completed", resolvedAt: "2026-11-09" };
      maintenanceNeedServices.getMaintenanceNeed.mockResolvedValue({ data: { ...need, status: "In Progress" } });
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [updated] });
      maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: updated });
      await mountAppAt("/maintenance-needs/1");
      await clickNamed("Mark completed");

      // UI/UX backlog #22: saving stays on the need's page and says so.
      await waitFor(() => expect(document.body.textContent).toContain("Marked completed."));
      expect(router.currentRoute.value.path).toBe("/maintenance-needs/1");
      expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalledWith("1", expect.objectContaining({ status: "Completed" }));
      expect(rowText()).toContain("Oil Change");
    });

    it("Mark completed is grayed out when status is Completed or Canceled", async () => {
      signIn();
      for (const status of ["Completed", "Canceled"]) {
        maintenanceNeedServices.getMaintenanceNeed.mockResolvedValue({ data: { ...need, status, resolvedAt: "2026-11-01" } });
        wrapper?.unmount();
        await mountAppAt("/maintenance-needs/1");
        const button = await waitFor(() => {
          const match = namedButton("Mark completed");
          expect(match).toBeDefined();
          return match;
        });
        expect(button.disabled).toBe(true);
      }
    });

    it("The page's status button follows the saved status, not unsaved edits", async () => {
      signIn();
      const updated = { ...need, status: "In Progress" };
      maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: updated });
      await mountAppAt("/maintenance-needs/1");
      await openEditDialog();
      await (await selectField("Status")).setValue("In Progress");
      expect(namedButton("Mark in progress")).toBeDefined();
      expect(maintenanceNeedServices.updateMaintenanceNeed).not.toHaveBeenCalled();

      await clickNamed("Save");
      await waitFor(() => expect(namedButton("Mark completed")?.disabled).toBe(false));
      await waitFor(() => expect(editDialogOpen()).toBe(false));
    });

    it("shows the need as text, with the vehicle, assignee, and description", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/1");

      const details = await waitFor(() => {
        const card = document.body.querySelector('[data-test="need-details"]');
        expect(card).not.toBeNull();
        return card;
      });
      expect(details.textContent).toContain("V-1 · 2015 Toyota Sienna");
      expect(details.textContent).toContain("John Doe");
      expect(details.textContent).toContain(need.description);
      expect(document.body.querySelector('[data-test="need-out-of-service"]').textContent.trim()).toBe("No");
      expect(wrapper.findAllComponents({ name: "VTextField" }).find((component) => component.props("label") === "Title")).toBeUndefined();
    });

    const saveEdit = async (apply, updated) => {
      signIn();
      maintenanceNeedServices.getMaintenanceNeed.mockResolvedValue({ data: need });
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [updated] });
      maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: updated });
      await mountAppAt("/maintenance-needs/1");
      await openEditDialog();
      await apply();
      await clickNamed("Save");
      await waitFor(() => expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalled());
      // UI/UX backlog #22: saving stays on the need's page and says so.
      await waitFor(() => expect(document.body.textContent).toContain("Changes saved."));
      expect(router.currentRoute.value.path).toBe("/maintenance-needs/1");
    };

    it("Admin user edits a maintenance need title", async () => {
      const updated = { ...need, title: "Oil Filter Change" };
      await saveEdit(async () => {
        await (await textField("Title")).setValue("Oil Filter Change");
      }, updated);

      expect(rowText()).toContain("Oil Filter Change");
    });

    it("Admin user edits a maintenance need vehicle", async () => {
      const updated = { ...need, vehicleId: 2, vehicle: otherVan };
      await saveEdit(async () => {
        await (await selectField("Vehicle")).setValue(2);
      }, updated);

      expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalledWith("1", expect.objectContaining({ vehicleId: 2 }));
      expect(rowText()).toContain("Oil Change");
    });

    it("Admin user edits a maintenance need assignee", async () => {
      const updated = { ...need, assigneeId: 4, assignee: jello };
      await saveEdit(async () => {
        await (await selectField("Assignee")).setValue(4);
      }, updated);

      expect(rowText()).toContain("Jane Jello");
    });

    it("Admin user edits a maintenance need description", async () => {
      const updated = { ...need, description: "Tires need balancing" };
      await saveEdit(async () => {
        await (await field("VTextarea", "Description")).setValue("Tires need balancing");
      }, updated);

      expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({ description: "Tires need balancing" }),
      );
      expect(rowText()).toContain("Oil Change");
    });

    it("Admin user edits a maintenance need out of service", async () => {
      const updated = { ...need, outOfService: true };
      await saveEdit(async () => {
        await (await selectField("Out of Service")).setValue(true);
      }, updated);

      expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalledWith("1", expect.objectContaining({ outOfService: true }));
      expect(rowText()).toContain("Oil Change");
    });

    it("Admin user edits a maintenance need priority", async () => {
      const updated = { ...need, priority: "Medium" };
      await saveEdit(async () => {
        await (await selectField("Priority")).setValue("Medium");
      }, updated);

      expect(rowText()).toContain("Medium");
    });

    it("Admin user edits a maintenance need status", async () => {
      const updated = { ...need, status: "In Progress" };
      await saveEdit(async () => {
        await (await selectField("Status")).setValue("In Progress");
      }, updated);

      expect(rowText()).toContain("In Progress");
    });

    // UI/UX backlog #62 replaced the editable resolve date: a closed need keeps the date it closed on, and
    // reopening it clears the date.
    it("Admin user saves a closed maintenance need without touching its resolve date", async () => {
      const current = { ...need, status: "Completed", resolvedAt: "2026-11-01" };
      signIn();
      maintenanceNeedServices.getMaintenanceNeed.mockResolvedValue({ data: current });
      maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: current });
      await mountAppAt("/maintenance-needs/1");

      await waitFor(() => expect(document.body.querySelector('[data-test="need-resolved"]')?.textContent).toContain("Resolved Nov 1, 2026"));
      await openEditDialog();
      expect(resolvedOn()?.textContent).toContain("Resolved Nov 1, 2026");
      await clickNamed("Save");
      await waitFor(() =>
        expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalledWith("1", expect.objectContaining({ resolvedAt: "2026-11-01" })),
      );

      await openEditDialog();
      await (await selectField("Status")).setValue("Open");
      await settle();
      expect(resolvedOn()).toBeNull();
      await (await selectField("Status")).setValue("Completed");
      await settle();
      expect(resolvedOn()?.textContent).toContain(formatDay(todayString()));
    });

    it("Admin user cancels editing a maintenance need", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/1");
      await openEditDialog();
      await (await textField("Title")).setValue("Not saved");
      document.body.querySelector('[data-test="edit-need-cancel"]').click();
      await settle();

      await waitFor(() => expect(editDialogOpen()).toBe(false));
      expect(router.currentRoute.value.path).toBe("/maintenance-needs/1");
      expect(maintenanceNeedServices.updateMaintenanceNeed).not.toHaveBeenCalled();
      expect(rowText()).not.toContain("Not saved");
    });

    it("Area admin user edits a maintenance need in their area", async () => {
      signIn(areaAdminRoles);
      const updated = { ...need, title: "Area title" };
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [updated] });
      maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: updated });
      await mountAppAt("/maintenance-needs/1");
      await openEditDialog();
      await (await textField("Title")).setValue("Area title");
      await clickNamed("Save");

      // UI/UX backlog #22: saving stays on the need's page and says so.
      await waitFor(() => expect(document.body.textContent).toContain("Changes saved."));
      expect(router.currentRoute.value.path).toBe("/maintenance-needs/1");
      expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalled();
      expect(rowText()).toContain("Area title");
    });

    it("Maintenance user edits a maintenance need", async () => {
      signIn(maintenanceRoles);
      const updated = { ...need, title: "Shop title" };
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [updated] });
      maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: updated });
      await mountAppAt("/maintenance-needs/1");
      await openEditDialog();
      await (await textField("Title")).setValue("Shop title");
      await clickNamed("Save");

      // UI/UX backlog #22: saving stays on the need's page and says so.
      await waitFor(() => expect(document.body.textContent).toContain("Changes saved."));
      expect(router.currentRoute.value.path).toBe("/maintenance-needs/1");
      expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalled();
      expect(rowText()).toContain("Shop title");
    });

    it("Admin user edits a maintenance need with a missing title", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/1");
      await openEditDialog();
      await (await textField("Title")).setValue("");
      await clickNamed("Save");

      expect(rowText()).toContain("Required field.");
      expect(maintenanceNeedServices.updateMaintenanceNeed).not.toHaveBeenCalled();
    });

    it("Admin user edits a maintenance need with a whitespace-only title", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/1");
      await openEditDialog();
      await (await textField("Title")).setValue(" ");
      await clickNamed("Save");

      expect(rowText()).toContain("Required field.");
      expect(maintenanceNeedServices.updateMaintenanceNeed).not.toHaveBeenCalled();
    });

    // UI/UX backlog #36: from the need page's ⋮ menu, then back to the list.
    it("Admin user deletes a maintenance need", async () => {
      await openEdit();
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [] });

      await chooseMoreAction("delete-need");
      expect(document.body.textContent).toContain('Delete "Oil Change"? This action is permanent.');
      await clickNamed("Delete");

      await waitFor(() => expect(maintenanceNeedServices.removeMaintenanceNeed).toHaveBeenCalledWith("1"));
      await waitFor(() => expect(router.currentRoute.value.name).toBe("maintenance-needs"));
      await expect(maintenanceNeedServices.removeMaintenanceNeed.mock.results[0].value).resolves.toMatchObject({ status: 200 });
      await waitFor(() => expect(rowText()).toContain("No maintenance needs yet"));
    });
  });

  describe("US-11.6 — Signed-in admin, area admin, or maintenance user access only", () => {
    const requester = [{ id: 9, role: "requester", areaId: null, area: null }];

    it("Signed-out user opens /maintenance-needs and is sent to /login", async () => {
      await mountAppAt("/maintenance-needs");
      expect(router.currentRoute.value.path).toBe("/login");
    });

    it("Signed-out user opens /maintenance-needs/new and is sent to /login", async () => {
      await mountAppAt("/maintenance-needs/new");
      expect(router.currentRoute.value.path).toBe("/login");
    });

    it("Signed-out user opens /maintenance-needs/:id and is sent to /login", async () => {
      await mountAppAt("/maintenance-needs/1");
      expect(router.currentRoute.value.path).toBe("/login");
    });

    it("Signed-in user without admin, area admin, or maintenance role opens /maintenance-needs and is sent to /", async () => {
      signIn(requester);
      await mountAppAt("/maintenance-needs");
      expect(router.currentRoute.value.path).toBe("/");
    });

    it("Signed-in user without those roles opens /maintenance-needs/new and is sent to /", async () => {
      signIn(requester);
      await mountAppAt("/maintenance-needs/new");
      expect(router.currentRoute.value.path).toBe("/");
    });

    it("Signed-in user without those roles opens /maintenance-needs/:id and is sent to /", async () => {
      signIn(requester);
      await mountAppAt("/maintenance-needs/1");
      expect(router.currentRoute.value.path).toBe("/");
    });

    it("Signed-in admin user sees the Maintenance Needs nav link", async () => {
      signIn();
      await mountAppAt("/");
      await waitFor(expectMaintenanceNeedsInFleet);
    });

    it("Signed-in area admin user sees the Maintenance Needs nav link", async () => {
      signIn(areaAdminRoles);
      await mountAppAt("/");
      await waitFor(expectMaintenanceNeedsInFleet);
    });

    it("Signed-in maintenance user sees the Maintenance Needs nav link", async () => {
      signIn(maintenanceRoles);
      await mountAppAt("/");
      await waitFor(expectMaintenanceNeedsInFleet);
    });

    it("Signed-in user without those roles does not see the Maintenance Needs nav link", async () => {
      signIn(requester);
      await mountAppAt("/");
      await settle();
      expect(rowText()).not.toContain("Maintenance Needs");
    });
  });
});

describe("Feature 14 — Notes", () => {
  describe("US-14.2 — View notes on entities", () => {
    it("Users can view notes on requests, issue reports, maintenance needs", async () => {
      signIn();
      const note = {
        id: 1,
        maintenanceNeedId: 1,
        authorId: 7,
        author: { id: 7, firstName: "Max", lastName: "Fix" },
        content: "Parts arrive Tuesday.",
        isVisible: false,
        createdAt: "2026-11-04T12:00:00.000Z",
      };
      apiClient.get.mockImplementation((url) => {
        if (url === "maintenance-needs/1/notes") return Promise.resolve({ data: [note] });
        if (String(url).includes("users")) return Promise.resolve({ data: { roles: adminRoles } });
        return Promise.resolve({ data: [] });
      });
      await mountAppAt("/maintenance-needs/1");

      await waitFor(() => expect(document.body.querySelector('[data-test="maintenance-need-notes"]')?.textContent).toContain("Parts arrive Tuesday."));
      const section = document.body.querySelector('[data-test="maintenance-need-notes"]');
      expect(section.textContent).toContain("Max Fix");
      // Feature 14 (US-14.3): every reader of a maintenance need is staff, so its notes form one thread with no
      // Staff only channel or label.
      expect(section.textContent).not.toContain("Staff only");
      expect(apiClient.get).toHaveBeenCalledWith("maintenance-needs/1/notes");
    });

    it("has no notes section while creating a maintenance need", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/new");
      await waitFor(() => expect(document.body.textContent).toContain("New Maintenance Need"));
      expect(document.body.querySelector('[data-test="maintenance-need-notes"]')).toBeNull();
    });
  });
});

// The needs keeping a vehicle off trips, at the press of a button (like the vehicle list's "Needs attention").
describe("Maintenance needs — out-of-service filter", () => {
  it("shows only out-of-service needs, with a count for the current tab", async () => {
    signIn();
    maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({
      data: [
        { ...need, id: 1, title: "Brakes grinding", outOfService: true },
        { ...need, id: 2, title: "Wiper blades", outOfService: false },
        { ...need, id: 3, title: "Old axle", outOfService: true, status: "Completed" },
      ],
    });
    await mountAppAt("/maintenance-needs");

    const button = await waitFor(() => {
      const match = document.body.querySelector('[data-test="out-of-service-filter"]');
      expect(match?.textContent).toContain("Out of service");
      return match;
    });
    // The Open tab has one out-of-service need; the completed one isn't counted here.
    expect(button.textContent.replace(/\s+/g, " ").trim()).toBe("Out of service 1");
    expect(button.getAttribute("aria-pressed")).toBe("false");

    button.click();
    await settle();
    await waitFor(() => {
      expect(rowText()).toContain("Brakes grinding");
      expect(rowText()).not.toContain("Wiper blades");
    });
    expect(button.getAttribute("aria-pressed")).toBe("true");

    button.click();
    await settle();
    await waitFor(() => expect(rowText()).toContain("Wiper blades"));
  });
});

// The work logged against a need, on the need's page.
describe("Maintenance need — service logs", () => {
  it("lists the visits logged for this need, not other work on the vehicle", async () => {
    signIn();
    const log = (id, needId, service, mileageLogId, servicedAt) => ({
      id,
      vehicleId: 1,
      maintenanceNeedId: needId,
      mileageLogId,
      servicedAt,
      userId: 3,
      user: { id: 3, firstName: "John", lastName: "Smith" },
      serviceType: { id: id, name: service },
      serviceTypeId: id,
      mileageLog: { id: mileageLogId, odometerReading: 12000 + id },
    });
    serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({
      data: [log(1, 1, "Oil Change", 7, "2026-11-10"), log(2, 1, "Tire Rotation", 7, "2026-11-10"), log(3, 9, "Brakes", 8, "2026-11-12")],
    });
    await mountAppAt("/maintenance-needs/1");

    const card = await waitFor(() => {
      const match = document.body.querySelector('[data-test="need-service-logs"]');
      expect(match?.querySelectorAll('[data-test="need-visit"]').length).toBe(1);
      return match;
    });
    expect(serviceLogServices.getServiceLogsByVehicle).toHaveBeenCalledWith(1);
    expect(card.textContent).toContain("1 visit logged for this need");
    const visit = card.querySelector('[data-test="need-visit"]');
    expect(visit.textContent).toContain("Oil Change");
    expect(visit.textContent).toContain("Tire Rotation");
    expect(visit.textContent).toContain("by John Smith");
    expect(card.textContent).not.toContain("Brakes");
    expect(visit.querySelector("a").getAttribute("href")).toBe("/service-logs/1");
  });

  it("says when nothing has been logged yet", async () => {
    signIn();
    await mountAppAt("/maintenance-needs/1");

    await waitFor(() => expect(document.body.querySelector('[data-test="need-service-logs-empty"]')?.textContent).toContain("No service logged for this need yet."));
  });
});
