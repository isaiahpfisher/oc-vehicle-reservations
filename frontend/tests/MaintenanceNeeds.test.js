/**
 * Feature 11 — Maintenance Needs
 * Spec: features/feature-11-maintenance-needs.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import maintenanceNeedServices from "../src/services/maintenanceNeedServices.js";
import issueReportServices from "../src/services/issueReportServices.js";
import vehicleServices from "../src/services/vehicleServices.js";
import userServices from "../src/services/userServices.js";
import vehicleRequestServices from "../src/services/vehicleRequestServices.js";
import { signInAs, vuetify } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/issueReportServices.js", () => ({
  default: { getIssueReports: vi.fn(), getIssueReport: vi.fn(), createIssueReport: vi.fn(), updateIssueReport: vi.fn(), removeIssueReport: vi.fn() },
}));

vi.mock("../src/services/vehicleServices.js", () => ({
  default: { getVehicles: vi.fn(), getVehicle: vi.fn() },
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

const sienna = { id: 1, color: "Black", make: "Toyota", model: "Sienna", licensePlate: "ABC-123", areaId: 1 };
const otherVan = { id: 2, color: "Black", make: "Toyota", model: "Sienna", licensePlate: "ABC-124", areaId: 2 };
const john = { id: 3, firstName: "John", lastName: "Doe" };
const jello = { id: 4, firstName: "Jane", lastName: "Jello" };

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

const selectedTab = () => document.body.querySelector(".v-tab--selected, [aria-selected='true']")?.textContent.trim();

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
  expect(serviceTypes.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
      expect(wrapper.findAllComponents({ name: "VTextField" }).some((item) => item.props("label") === "Resolve Date")).toBe(false);
      expect((await selectField("Vehicle")).props("items").map((item) => item.title)).toEqual([
        "Black Toyota Sienna (ABC-123)",
        "Black Toyota Sienna (ABC-124)",
      ]);

      await (await selectField("Status")).setValue("Completed");
      expect((await textField("Resolve Date")).props("modelValue")).toBe(todayString());
    });

    it("Area admin user creates a maintenance need", async () => {
      signIn(areaAdminRoles);
      await mountAppAt("/maintenance-needs/new");

      expect((await selectField("Vehicle")).props("items").map((item) => item.value)).toEqual([1]);
      await (await selectField("Status")).setValue("Canceled");
      expect(await textField("Resolve Date")).toBeDefined();
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
      expect(await textField("Resolve Date")).toBeDefined();
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
      expect(wrapper.findAllComponents({ name: "VTextField" }).some((item) => item.props("label") === "Resolve Date")).toBe(false);

      await (await selectField("Status")).setValue("Completed");
      expect((await textField("Resolve Date")).props("modelValue")).toBe(todayString());

      await (await selectField("Status")).setValue("Open");
      expect(wrapper.findAllComponents({ name: "VTextField" }).some((item) => item.props("label") === "Resolve Date")).toBe(false);

      await (await selectField("Status")).setValue("Canceled");
      expect((await textField("Resolve Date")).props("modelValue")).toBe(todayString());
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

    it("Maintenance needs empty state", async () => {
      signIn();
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("No maintenance needs yet. Create a maintenance need."));
    });

    it("Maintenance needs admin tabs", async () => {
      signIn();
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(namedButton("Open")).toBeDefined());
      expect(namedButton("Resolved")).toBeDefined();
      expect(namedButton("All")).toBeDefined();
      expect(namedButton("Assigned to Me")).toBeUndefined();
      expect(selectedTab()).toBe("Open");
    });

    it("Maintenance needs area admin tabs", async () => {
      signIn(areaAdminRoles);
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [openNeed, outsideNeed, doneNeed] });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(selectedTab()).toBe("Open"));
      expect(namedButton("Assigned to Me")).toBeUndefined();
      expect(rowText()).not.toContain("Other area");
      await clickNamed("All");
      expect(rowText()).not.toContain("Other area");
      await clickNamed("Resolved");
      expect(rowText()).toContain("Already done");
      expect(rowText()).not.toContain("Other area");
    });

    it("Maintenance needs maintenance tabs", async () => {
      signIn(maintenanceRoles);
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(namedButton("Assigned to Me")).toBeDefined());
      expect(namedButton("Open")).toBeDefined();
      expect(namedButton("Resolved")).toBeDefined();
      expect(namedButton("All")).toBeDefined();
      expect(selectedTab()).toBe("Assigned to Me");
    });

    it("Maintenance needs table Open tab", async () => {
      signIn();
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [doneNeed, progressNeed, openNeed] });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("Brake pads"));
      expect(selectedTab()).toBe("Open");
      expect(rowText()).toContain("Rotate tires");
      expect(rowText()).not.toContain("Already done");
      expect(rowText().indexOf("Brake pads")).toBeLessThan(rowText().indexOf("Rotate tires"));
    });

    it("Maintenance needs table Assigned to Me tab", async () => {
      signIn(maintenanceRoles, { userId: 8 });
      const mine = { ...openNeed, id: 11, title: "My newer", assigneeId: 8, createdAt: "2026-11-06T18:00:00.000Z" };
      const mineOlder = { ...openNeed, id: 12, title: "My older", assigneeId: 8, createdAt: "2026-11-01T18:00:00.000Z" };
      const someone = { ...openNeed, id: 13, title: "Not mine", assigneeId: 3 };
      const mineProgress = { ...progressNeed, id: 14, title: "My progress", assigneeId: 8 };
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [mineOlder, someone, mineProgress, mine] });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("My newer"));
      expect(selectedTab()).toBe("Assigned to Me");
      expect(rowText()).toContain("My older");
      expect(rowText()).not.toContain("Not mine");
      expect(rowText()).not.toContain("My progress");
      expect(rowText().indexOf("My newer")).toBeLessThan(rowText().indexOf("My older"));
    });

    it("Maintenance needs table Assigned to Me empty state", async () => {
      signIn(maintenanceRoles);
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(rowText()).toContain("Nothing to do. Enjoy your day!"));
    });

    it("Maintenance needs table All tab", async () => {
      signIn();
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [doneNeed, openNeed] });
      await mountAppAt("/maintenance-needs");
      await clickNamed("All");

      expect(rowText()).toContain("Brake pads");
      expect(rowText()).toContain("Already done");
      expect(rowText().indexOf("Brake pads")).toBeLessThan(rowText().indexOf("Already done"));
    });

    it("Maintenance needs table Resolved tab", async () => {
      signIn();
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [openNeed, canceledNeed, doneNeed] });
      await mountAppAt("/maintenance-needs");
      await clickNamed("Resolved");

      expect(rowText()).toContain("Already done");
      expect(rowText()).toContain("Called off");
      expect(rowText()).not.toContain("Brake pads");
      expect(rowText().indexOf("Already done")).toBeLessThan(rowText().indexOf("Called off"));
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

  describe("US-11.4 — Maintenance need actions", () => {
    it("Maintenance need rows have edit and delete actions", async () => {
      signIn();
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [need] });
      await mountAppAt("/maintenance-needs");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Edit maintenance need"]')).toBeTruthy());
      expect(document.body.querySelector('[aria-label="Delete maintenance need"]')).toBeTruthy();
    });
  });

  describe("US-11.6 — Edit and delete maintenance needs", () => {
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
        await clickNamed("Open");
      }
      await waitFor(() => expect(document.body.querySelector('[aria-label="Edit maintenance need"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Edit maintenance need"]').click();
      await settle();
    };

    it("Admin user opens the maintenance needs page", async () => {
      await openEdit();

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs/1"));
      await expectFields();
      expect((await textField("Title")).props("modelValue")).toBe("Oil Change");
      expect((await selectField("Vehicle")).props("items")).toHaveLength(2);
      expect(wrapper.findAllComponents({ name: "VTextField" }).some((item) => item.props("label") === "Resolve Date")).toBe(false);
      await (await selectField("Status")).setValue("Completed");
      expect(await textField("Resolve Date")).toBeDefined();
    });

    it("Area admin user opens the maintenance needs page", async () => {
      await openEdit(areaAdminRoles);

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs/1"));
      await expectFields();
      expect((await textField("Title")).props("modelValue")).toBe("Oil Change");
      expect((await selectField("Vehicle")).props("items").map((item) => item.value)).toEqual([1]);
      await (await selectField("Status")).setValue("Canceled");
      expect(await textField("Resolve Date")).toBeDefined();
    });

    it("Maintenance user opens the maintenance needs page", async () => {
      await openEdit(maintenanceRoles);

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs/1"));
      await expectFields();
      expect((await selectField("Vehicle")).props("items")).toHaveLength(2);
      expect((await textField("Title")).props("modelValue")).toBe(need.title);
      await (await selectField("Status")).setValue("Completed");
      expect(await textField("Resolve Date")).toBeDefined();
    });

    it("View issue report is not clickable when there is no issue report", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/1");

      const button = await waitFor(() => {
        const match = namedButton("View issue report");
        expect(match).toBeDefined();
        return match;
      });
      expect(button.disabled).toBe(true);
    });

    it("View issue report opens the issue report when issueReportId is set", async () => {
      signIn();
      maintenanceNeedServices.getMaintenanceNeed.mockResolvedValue({ data: { ...need, issueReportId: 4 } });
      await mountAppAt("/maintenance-needs/1");
      await clickNamed("View issue report");

      await waitFor(() => {
        expect(router.currentRoute.value.path).toBe("/issue-reports");
        expect(rowText()).toContain(
          "There is no page for /issue-reports/4. This is a placeholder for when such a page comes into existence.",
        );
      });
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
      expect(namedButton("View issue report")).toBeDefined();
    });

    it("Mark in progress sets status to In Progress", async () => {
      signIn();
      const updated = { ...need, status: "In Progress" };
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [updated] });
      maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: updated });
      await mountAppAt("/maintenance-needs/1");
      await clickNamed("Mark in progress");

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs"));
      expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalledWith("1", expect.objectContaining({ status: "In Progress" }));
      expect(rowText()).toContain("Oil Change");
      expect(rowText()).toContain("In Progress");
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
      expect(namedButton("View issue report")).toBeDefined();
    });

    it("Mark completed sets status to Completed", async () => {
      signIn();
      const updated = { ...need, status: "Completed", resolvedAt: "2026-11-09" };
      maintenanceNeedServices.getMaintenanceNeed.mockResolvedValue({ data: { ...need, status: "In Progress" } });
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [updated] });
      maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: updated });
      await mountAppAt("/maintenance-needs/1");
      await clickNamed("Mark completed");

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs"));
      expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalledWith("1", expect.objectContaining({ status: "Completed" }));
      await clickNamed("Resolved");
      expect(rowText()).toContain("Oil Change");
      expect(rowText()).toContain("Completed");
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

    it("The button updates when status changes before saving", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/1");
      await (await selectField("Status")).setValue("In Progress");
      expect(namedButton("Mark completed")?.disabled).toBe(false);

      await (await selectField("Status")).setValue("Completed");
      expect(namedButton("Mark completed")?.disabled).toBe(true);

      await (await selectField("Status")).setValue("Canceled");
      expect(namedButton("Mark completed")?.disabled).toBe(true);

      await (await selectField("Status")).setValue("Open");
      expect(namedButton("Mark in progress")?.disabled).toBe(false);
      expect(maintenanceNeedServices.updateMaintenanceNeed).not.toHaveBeenCalled();
    });

    const saveEdit = async (apply, updated) => {
      signIn();
      maintenanceNeedServices.getMaintenanceNeed.mockResolvedValue({ data: need });
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [updated] });
      maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: updated });
      await mountAppAt("/maintenance-needs/1");
      await apply();
      await clickNamed("Save");
      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs"));
      await waitFor(() => expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalled());
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

    it("Admin user edits a maintenance need resolve date", async () => {
      const current = { ...need, status: "Completed", resolvedAt: "2026-11-01" };
      const updated = { ...current, resolvedAt: "2026-11-03" };
      signIn();
      maintenanceNeedServices.getMaintenanceNeed.mockResolvedValue({ data: current });
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [updated] });
      await mountAppAt("/maintenance-needs/1");
      await (await textField("Resolve Date")).setValue("2026-11-03");
      maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: updated });
      await clickNamed("Save");

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs"));
      expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalledWith("1", expect.objectContaining({ resolvedAt: "2026-11-03" }));
      await clickNamed("Resolved");
      expect(rowText()).toContain("Oil Change");
      expect(rowText()).toContain("Completed");
    });

    it("Admin user cancels editing a maintenance need", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/1");
      await clickNamed("Cancel");

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs"));
      expect(maintenanceNeedServices.updateMaintenanceNeed).not.toHaveBeenCalled();
    });

    it("Area admin user edits a maintenance need in their area", async () => {
      signIn(areaAdminRoles);
      const updated = { ...need, title: "Area title" };
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [updated] });
      maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: updated });
      await mountAppAt("/maintenance-needs/1");
      await (await textField("Title")).setValue("Area title");
      await clickNamed("Save");

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs"));
      expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalled();
      expect(rowText()).toContain("Area title");
    });

    it("Maintenance user edits a maintenance need", async () => {
      signIn(maintenanceRoles);
      const updated = { ...need, title: "Shop title" };
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [updated] });
      maintenanceNeedServices.updateMaintenanceNeed.mockResolvedValue({ status: 200, data: updated });
      await mountAppAt("/maintenance-needs/1");
      await (await textField("Title")).setValue("Shop title");
      await clickNamed("Save");

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/maintenance-needs"));
      expect(maintenanceNeedServices.updateMaintenanceNeed).toHaveBeenCalled();
      await clickNamed("Open");
      expect(rowText()).toContain("Shop title");
    });

    it("Admin user edits a maintenance need with a missing title", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/1");
      await (await textField("Title")).setValue("");
      await clickNamed("Save");

      expect(rowText()).toContain("Required field.");
      expect(maintenanceNeedServices.updateMaintenanceNeed).not.toHaveBeenCalled();
    });

    it("Admin user edits a maintenance need with a whitespace-only title", async () => {
      signIn();
      await mountAppAt("/maintenance-needs/1");
      await (await textField("Title")).setValue(" ");
      await clickNamed("Save");

      expect(rowText()).toContain("Required field.");
      expect(maintenanceNeedServices.updateMaintenanceNeed).not.toHaveBeenCalled();
    });

    it("Admin user deletes a maintenance need", async () => {
      signIn();
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValueOnce({ data: [need] }).mockResolvedValue({ data: [] });
      await mountAppAt("/maintenance-needs");
      await waitFor(() => expect(document.body.querySelector('[aria-label="Delete maintenance need"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Delete maintenance need"]').click();
      await settle();
      await clickNamed("Delete");

      await waitFor(() => expect(maintenanceNeedServices.removeMaintenanceNeed).toHaveBeenCalledWith(1));
      await expect(maintenanceNeedServices.removeMaintenanceNeed.mock.results[0].value).resolves.toMatchObject({ status: 200 });
      await waitFor(() => expect(rowText()).toContain("No maintenance needs yet. Create a maintenance need."));
    });
  });

  describe("US-11.7 — Signed-in admin, area admin, or maintenance user access only", () => {
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
