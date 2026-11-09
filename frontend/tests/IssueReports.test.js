/**
 * Feature 10 — Issue Report
 * Spec: features/feature-10-issue-report.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import issueReportServices from "../src/services/issueReportServices.js";
import vehicleServices from "../src/services/vehicleServices.js";
import userServices from "../src/services/userServices.js";
import vehicleRequestServices from "../src/services/vehicleRequestServices.js";
import maintenanceNeedServices from "../src/services/maintenanceNeedServices.js";
import { signInAs, vuetify } from "./testUtils.js";

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
  },
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

const signedInUser = {
  userId: 2,
  email: "jane@oc.edu",
  firstName: "Jane",
  lastName: "Doe",
  roles: [{ id: 1, role: "admin", areaId: null, area: null }],
  token: "admin-token",
};

const areaAdminRoles = [{ id: 2, role: "area_admin", areaId: 1, area: { id: 1, name: "Athletics" } }];

const vehicle = { id: 3, universityId: "V-100", areaId: 1 };
const musicVehicle = { id: 4, universityId: "V-200", areaId: 2 };
const alex = { id: 5, firstName: "Alex", lastName: "Kim" };
const campusVisit = { id: 12, purpose: "Campus visit" };

const janeReport = {
  id: 1,
  vehicleId: 3,
  vehicleRequestId: null,
  authorId: 2,
  assigneeId: null,
  type: "low_gas",
  description: "Tank is on empty.",
  status: "pending",
  resolvedAt: null,
  author: { id: 2, firstName: "Jane", lastName: "Doe" },
  assignee: null,
  vehicle: { id: 3, universityId: "V-100" },
  vehicleRequest: null,
};

const musicReport = {
  ...janeReport,
  id: 2,
  vehicleId: 4,
  description: "Music issue.",
  vehicle: { id: 4, universityId: "V-200" },
};

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
      if (Date.now() - start > timeout) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
      await flushPromises();
    }
  }
};

let wrapper;

const mountAppAt = async (path) => {
  await router.push(path);
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

const signIn = (roles = signedInUser.roles, overrides = {}) => {
  signInAs({ ...signedInUser, roles, ...overrides });
};

const namedButton = (text) =>
  [...document.body.querySelectorAll("button, a")].find((el) => el.textContent.trim() === text);

const field = async (name, label) =>
  waitFor(() => {
    const match = wrapper.findAllComponents({ name }).find((component) => component.props("label") === label);
    expect(match).toBeDefined();
    return match;
  });

const clickNamed = async (text) => {
  const button = await waitFor(() => {
    const match = namedButton(text);
    expect(match).toBeDefined();
    return match;
  });
  button.click();
  await settle();
};

const openCreate = async () => {
  await clickNamed("+ New Issue Report");
  await waitFor(() => expect(document.body.textContent).toContain("New issue report"));
};

const openEdit = async () => {
  await waitFor(() => expect(document.body.querySelector('[aria-label="Edit issue report"]')).toBeTruthy());
  document.body.querySelector('[aria-label="Edit issue report"]').click();
  await settle();
};

const fillRequired = async (overrides = {}) => {
  await (await field("VSelect", "Vehicle")).setValue(overrides.vehicleId ?? 3);
  await (await field("VSelect", "Type")).setValue(overrides.type ?? "low_gas");
  await (await field("VTextarea", "Description")).setValue(overrides.description ?? "Tank is on empty.");
  if (overrides.status) {
    await (await field("VSelect", "Status")).setValue(overrides.status);
  }
};

beforeEach(async () => {
  signInAs(null);
  vi.resetAllMocks();
  apiClient.get.mockResolvedValue({ data: { roles: signedInUser.roles } });
  issueReportServices.getIssueReports.mockResolvedValue({ data: [] });
  issueReportServices.createIssueReport.mockResolvedValue({ status: 201, data: janeReport });
  issueReportServices.updateIssueReport.mockResolvedValue({ status: 200, data: janeReport });
  issueReportServices.removeIssueReport.mockResolvedValue({ status: 200, data: { message: "Issue report deleted successfully." } });
  vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle, musicVehicle] });
  userServices.getUsers.mockResolvedValue({ data: [alex, { id: 2, firstName: "Jane", lastName: "Doe" }] });
  vehicleRequestServices.getVehicleRequests.mockResolvedValue({ data: [campusVisit] });
  maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [] });
  maintenanceNeedServices.createMaintenanceNeed.mockResolvedValue({ status: 201, data: { id: 1, title: "Maintenance Needed" } });
  await router.push("/login");
  await router.isReady();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 10 — Issue Report", () => {
  describe("US-10.1 — Create issue reports", () => {
    it("User creates issue report", async () => {
      signIn();
      await mountAppAt("/issue-reports");
      await openCreate();

      const labels = [
        ...wrapper.findAllComponents({ name: "VSelect" }),
        ...wrapper.findAllComponents({ name: "VTextarea" }),
      ].map((item) => item.props("label"));
      expect(labels).toEqual(expect.arrayContaining(["Vehicle", "Vehicle request", "Type", "Description", "Status", "Assignee"]));
      expect(labels).not.toContain("Author");
      expect((await field("VSelect", "Status")).props("modelValue")).toBe("pending");
      expect(wrapper.findAllComponents({ name: "VTextField" }).some((item) => item.props("label") === "Resolved date")).toBe(false);
    });

    it("User saves issue report", async () => {
      signIn();
      const saved = { status: 201, data: janeReport };
      issueReportServices.createIssueReport.mockResolvedValue(saved);
      issueReportServices.getIssueReports.mockResolvedValueOnce({ data: [] }).mockResolvedValue({ data: [janeReport] });
      await mountAppAt("/issue-reports");
      await openCreate();
      await fillRequired();
      await clickNamed("Create");

      await waitFor(() => expect(issueReportServices.createIssueReport).toHaveBeenCalledTimes(1));
      expect(issueReportServices.createIssueReport).toHaveBeenCalledWith({
        vehicleId: 3,
        vehicleRequestId: null,
        assigneeId: null,
        type: "low_gas",
        description: "Tank is on empty.",
        status: "pending",
        resolvedAt: null,
      });
      expect(saved.status).toBe(201);
      await waitFor(() => {
        expect(wrapper.text()).toContain("V-100");
        expect(wrapper.text()).toContain("Low gas");
        expect(wrapper.text()).toContain("Pending");
        expect(wrapper.text()).toContain("Tank is on empty.");
        expect(wrapper.text()).toContain("Jane Doe");
      });
    });

    it("User saves issue report with a vehicle request and assignee", async () => {
      signIn();
      const saved = {
        status: 201,
        data: {
          ...janeReport,
          vehicleRequestId: 12,
          assigneeId: 5,
          type: "dirty",
          description: "Interior needs cleaning.",
          assignee: alex,
          vehicleRequest: campusVisit,
        },
      };
      issueReportServices.createIssueReport.mockResolvedValue(saved);
      issueReportServices.getIssueReports.mockResolvedValueOnce({ data: [] }).mockResolvedValue({ data: [saved.data] });
      await mountAppAt("/issue-reports");
      await openCreate();
      await fillRequired({ type: "dirty", description: "Interior needs cleaning." });
      await (await field("VSelect", "Vehicle request")).setValue(12);
      await (await field("VSelect", "Assignee")).setValue(5);
      await clickNamed("Create");

      await waitFor(() => expect(issueReportServices.createIssueReport).toHaveBeenCalledTimes(1));
      expect(issueReportServices.createIssueReport.mock.calls[0][0].vehicleRequestId).toBe(12);
      expect(issueReportServices.createIssueReport.mock.calls[0][0].assigneeId).toBe(5);
      expect(saved.status).toBe(201);
      await waitFor(() => {
        expect(wrapper.text()).toContain("Campus visit");
        expect(wrapper.text()).toContain("Alex Kim");
      });
    });

    it("User saves a resolved issue report", async () => {
      signIn();
      const saved = {
        status: 201,
        data: { ...janeReport, type: "other", description: "Spare key is missing.", status: "resolved", resolvedAt: "2026-10-23" },
      };
      issueReportServices.createIssueReport.mockResolvedValue(saved);
      await mountAppAt("/issue-reports");
      await openCreate();
      await (await field("VSelect", "Status")).setValue("resolved");
      await waitFor(() => expect(document.body.textContent).toContain("Resolved date"));
      await fillRequired({ type: "other", description: "Spare key is missing.", status: "resolved" });
      await (await field("VTextField", "Resolved date")).setValue("2026-10-23");
      await clickNamed("Create");

      await waitFor(() => expect(issueReportServices.createIssueReport).toHaveBeenCalledTimes(1));
      expect(issueReportServices.createIssueReport.mock.calls[0][0].status).toBe("resolved");
      expect(issueReportServices.createIssueReport.mock.calls[0][0].resolvedAt).toBe("2026-10-23");
      expect(saved.status).toBe(201);
    });

    it("User creates issue report with missing vehicle", async () => {
      signIn();
      await mountAppAt("/issue-reports");
      await openCreate();
      await (await field("VSelect", "Type")).setValue("low_gas");
      await (await field("VTextarea", "Description")).setValue("Tank is on empty.");
      await clickNamed("Create");

      expect(issueReportServices.createIssueReport).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("User creates issue report with missing type", async () => {
      signIn();
      await mountAppAt("/issue-reports");
      await openCreate();
      await (await field("VSelect", "Vehicle")).setValue(3);
      await (await field("VTextarea", "Description")).setValue("Tank is on empty.");
      await clickNamed("Create");

      expect(issueReportServices.createIssueReport).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("User creates issue report with missing description", async () => {
      signIn();
      await mountAppAt("/issue-reports");
      await openCreate();
      await (await field("VSelect", "Vehicle")).setValue(3);
      await (await field("VSelect", "Type")).setValue("low_gas");
      await clickNamed("Create");

      expect(issueReportServices.createIssueReport).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("User creates issue report with a whitespace-only description", async () => {
      signIn();
      await mountAppAt("/issue-reports");
      await openCreate();
      await fillRequired({ description: " " });
      await clickNamed("Create");

      expect(issueReportServices.createIssueReport).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("User creates issue report with missing status", async () => {
      signIn();
      await mountAppAt("/issue-reports");
      await openCreate();
      await (await field("VSelect", "Vehicle")).setValue(3);
      await (await field("VSelect", "Type")).setValue("low_gas");
      await (await field("VTextarea", "Description")).setValue("Tank is on empty.");
      await (await field("VSelect", "Status")).setValue(null);
      await clickNamed("Create");

      expect(issueReportServices.createIssueReport).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("User creates a resolved issue report with missing resolved date", async () => {
      signIn();
      await mountAppAt("/issue-reports");
      await openCreate();
      await fillRequired({ status: "resolved" });
      await clickNamed("Create");

      expect(issueReportServices.createIssueReport).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });
  });

  describe("US-10.2 — View all issue reports", () => {
    it("Admin issue reports view lists all issue reports", async () => {
      signIn();
      issueReportServices.getIssueReports.mockResolvedValue({ data: [janeReport, musicReport] });
      await mountAppAt("/issue-reports");

      await waitFor(() => {
        expect(wrapper.text()).toContain("V-100");
        expect(wrapper.text()).toContain("Low gas");
        expect(wrapper.text()).toContain("Pending");
        expect(wrapper.text()).toContain("Tank is on empty.");
        expect(wrapper.text()).toContain("Jane Doe");
        expect(wrapper.text()).toContain("V-200");
      });
    });

    it("Admin issue reports empty state", async () => {
      signIn();
      await mountAppAt("/issue-reports");

      await waitFor(() => {
        expect(document.body.textContent).toContain("No issue reports yet. Create your first issue report.");
      });
    });
  });

  describe("US-10.3 — View area issue reports", () => {
    it("Area admin issue reports view lists reports for their areas", async () => {
      signIn(areaAdminRoles);
      issueReportServices.getIssueReports.mockResolvedValue({ data: [janeReport] });
      await mountAppAt("/issue-reports");

      await waitFor(() => expect(wrapper.text()).toContain("V-100"));
      expect(wrapper.text()).not.toContain("V-200");
    });
  });

  describe("US-10.4 — Manage issue report rows", () => {
    it("Admin issue report rows have edit and delete actions", async () => {
      signIn();
      issueReportServices.getIssueReports.mockResolvedValue({ data: [janeReport] });
      await mountAppAt("/issue-reports");

      await waitFor(() => {
        expect(document.body.querySelector('[aria-label="Edit issue report"]')).toBeTruthy();
        expect(document.body.querySelector('[aria-label="Delete issue report"]')).toBeTruthy();
      });
    });

    it("Area admin issue report rows have edit and delete actions", async () => {
      signIn(areaAdminRoles);
      issueReportServices.getIssueReports.mockResolvedValue({ data: [janeReport] });
      await mountAppAt("/issue-reports");

      await waitFor(() => {
        expect(document.body.querySelector('[aria-label="Edit issue report"]')).toBeTruthy();
        expect(document.body.querySelector('[aria-label="Delete issue report"]')).toBeTruthy();
      });
    });

    it("Signed-in user without admin or area admin does not see edit and delete actions", async () => {
      signIn([]);
      issueReportServices.getIssueReports.mockResolvedValue({ data: [janeReport] });
      await mountAppAt("/issue-reports");

      await waitFor(() => expect(wrapper.text()).toContain("Tank is on empty."));
      expect(document.body.querySelector('[aria-label="Edit issue report"]')).toBeNull();
      expect(document.body.querySelector('[aria-label="Delete issue report"]')).toBeNull();
      expect(issueReportServices.getIssueReports).toHaveBeenCalledWith({ userId: 2 });
    });
  });

  describe("US-10.5 — Edit and delete issue reports", () => {
    it("Admin edits an issue report description", async () => {
      signIn();
      const saved = { status: 200, data: { ...janeReport, description: "Tank is below a quarter." } };
      issueReportServices.getIssueReports
        .mockResolvedValueOnce({ data: [janeReport] })
        .mockResolvedValue({ data: [saved.data] });
      issueReportServices.updateIssueReport.mockResolvedValue(saved);
      await mountAppAt("/issue-reports");
      await openEdit();
      await (await field("VTextarea", "Description")).setValue("Tank is below a quarter.");
      await clickNamed("Save");

      await waitFor(() => expect(issueReportServices.updateIssueReport).toHaveBeenCalledTimes(1));
      expect(saved.status).toBe(200);
      await waitFor(() => expect(wrapper.text()).toContain("Tank is below a quarter."));
    });

    it("Admin edits an issue report type", async () => {
      signIn();
      const saved = { status: 200, data: { ...janeReport, type: "maintenance" } };
      issueReportServices.getIssueReports.mockResolvedValueOnce({ data: [janeReport] }).mockResolvedValue({ data: [saved.data] });
      issueReportServices.updateIssueReport.mockResolvedValue(saved);
      await mountAppAt("/issue-reports");
      await openEdit();
      await (await field("VSelect", "Type")).setValue("maintenance");
      await clickNamed("Save");

      await waitFor(() => expect(issueReportServices.updateIssueReport).toHaveBeenCalledTimes(1));
      expect(issueReportServices.updateIssueReport.mock.calls[0][1].type).toBe("maintenance");
      expect(saved.status).toBe(200);
      await waitFor(() => expect(wrapper.text()).toContain("Maintenance"));
    });

    it("Admin edits an issue report to resolved", async () => {
      signIn();
      const saved = { status: 200, data: { ...janeReport, status: "resolved", resolvedAt: "2026-10-24" } };
      issueReportServices.getIssueReports.mockResolvedValueOnce({ data: [janeReport] }).mockResolvedValue({ data: [saved.data] });
      issueReportServices.updateIssueReport.mockResolvedValue(saved);
      await mountAppAt("/issue-reports");
      await openEdit();
      await (await field("VSelect", "Status")).setValue("resolved");
      await (await field("VTextField", "Resolved date")).setValue("2026-10-24");
      await clickNamed("Save");

      await waitFor(() => expect(issueReportServices.updateIssueReport).toHaveBeenCalledTimes(1));
      expect(issueReportServices.updateIssueReport.mock.calls[0][1].status).toBe("resolved");
      expect(issueReportServices.updateIssueReport.mock.calls[0][1].resolvedAt).toBe("2026-10-24");
      expect(saved.status).toBe(200);
      await waitFor(() => {
        expect(wrapper.text()).toContain("Resolved");
        expect(wrapper.text()).toContain("2026-10-24");
      });
    });

    it("Admin clears an issue report assignee", async () => {
      signIn();
      const assigned = { ...janeReport, assigneeId: 5, assignee: alex };
      const saved = { status: 200, data: { ...janeReport, assigneeId: null, assignee: null } };
      issueReportServices.getIssueReports.mockResolvedValueOnce({ data: [assigned] }).mockResolvedValue({ data: [saved.data] });
      issueReportServices.updateIssueReport.mockResolvedValue(saved);
      await mountAppAt("/issue-reports");
      await openEdit();
      await (await field("VSelect", "Assignee")).setValue(null);
      await clickNamed("Save");

      await waitFor(() => expect(issueReportServices.updateIssueReport).toHaveBeenCalledTimes(1));
      expect(issueReportServices.updateIssueReport.mock.calls[0][1].assigneeId).toBeNull();
      expect(saved.status).toBe(200);
      await waitFor(() => expect(wrapper.text()).not.toContain("Alex Kim"));
    });

    it("Admin edits an issue report to have a missing description", async () => {
      signIn();
      issueReportServices.getIssueReports.mockResolvedValue({ data: [janeReport] });
      await mountAppAt("/issue-reports");
      await openEdit();
      await (await field("VTextarea", "Description")).setValue("");
      await clickNamed("Save");

      expect(issueReportServices.updateIssueReport).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin deletes an issue report", async () => {
      signIn();
      issueReportServices.getIssueReports.mockResolvedValueOnce({ data: [janeReport] }).mockResolvedValue({ data: [] });
      await mountAppAt("/issue-reports");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Delete issue report"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Delete issue report"]').click();
      await settle();
      await clickNamed("Delete");

      await waitFor(() => expect(issueReportServices.removeIssueReport).toHaveBeenCalledWith(1));
      await expect(issueReportServices.removeIssueReport.mock.results[0].value).resolves.toMatchObject({ status: 200 });
      await waitFor(() => {
        expect(document.body.textContent).toContain("No issue reports yet. Create your first issue report.");
      });
    });

    it("Area admin edits an issue report in their area", async () => {
      signIn(areaAdminRoles);
      const saved = { status: 200, data: { ...janeReport, description: "Tank is below a quarter." } };
      issueReportServices.getIssueReports.mockResolvedValueOnce({ data: [janeReport] }).mockResolvedValue({ data: [saved.data] });
      issueReportServices.updateIssueReport.mockResolvedValue(saved);
      await mountAppAt("/issue-reports");
      await openEdit();
      await (await field("VTextarea", "Description")).setValue("Tank is below a quarter.");
      await clickNamed("Save");

      await waitFor(() => expect(issueReportServices.updateIssueReport).toHaveBeenCalledTimes(1));
      expect(saved.status).toBe(200);
      await waitFor(() => expect(wrapper.text()).toContain("Tank is below a quarter."));
    });
  });

  describe("US-10.6 — Session and role access", () => {
    it("Un-signed-in user accesses issue reports page", async () => {
      await mountAppAt("/issue-reports");

      expect(router.currentRoute.value.path).toBe("/login");
    });
  });
});

const maintenanceButtons = () =>
  [...document.body.querySelectorAll('button[aria-label="Create maintenance need"]')];

describe("Feature 11 — Maintenance Needs", () => {
  describe("US-11.2 — Create maintenance need from issue report", () => {
    it("Admin user sees Create Maintenance Need on a maintenance issue report", async () => {
      signIn();
      const reports = [
        { ...janeReport, id: 1, type: "maintenance" },
        { ...janeReport, id: 2, type: "maintenance", description: "Brakes." },
      ];
      issueReportServices.getIssueReports.mockResolvedValue({ data: reports });
      await mountAppAt("/issue-reports");

      await waitFor(() => expect(maintenanceButtons()).toHaveLength(2));
      const tooltips = wrapper.findAllComponents({ name: "VTooltip" }).filter((tooltip) => tooltip.props("text") === "Create maintenance need");
      expect(tooltips).toHaveLength(2);
    });

    it("Create Maintenance Need is unavailable when the issue type is not maintenance", async () => {
      signIn();
      issueReportServices.getIssueReports.mockResolvedValue({
        data: [
          { ...janeReport, id: 1, type: "low_gas" },
          { ...janeReport, id: 2, type: "dirty", description: "Muddy." },
        ],
      });
      await mountAppAt("/issue-reports");

      await waitFor(() => {
        const buttons = maintenanceButtons();
        expect(buttons).toHaveLength(2);
        expect(buttons.every((button) => button.disabled)).toBe(true);
      });
    });

    it("Create Maintenance Need is unavailable when that issue report already has a maintenance need", async () => {
      signIn();
      issueReportServices.getIssueReports.mockResolvedValue({
        data: [{ ...janeReport, id: 7, type: "maintenance" }],
      });
      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [{ id: 1, issueReportId: 7 }] });
      await mountAppAt("/issue-reports");

      await waitFor(() => {
        const buttons = maintenanceButtons();
        expect(buttons).toHaveLength(1);
        expect(buttons[0].disabled).toBe(true);
      });
    });

    it("Admin user creates a maintenance need from an issue report", async () => {
      signIn();
      const report = {
        ...janeReport,
        id: 4,
        type: "maintenance",
        vehicleId: 3,
        assigneeId: 5,
        description: "Oil change needed.",
      };
      const created = {
        id: 9,
        title: "Maintenance Needed",
        vehicleId: 3,
        assigneeId: 5,
        description: "Oil change needed.",
        status: "Open",
        priority: "None",
        outOfService: true,
        author: janeReport.author,
        assignee: alex,
        vehicle: { ...vehicle, areaId: 1 },
        createdAt: "2026-11-06T12:00:00.000Z",
      };
      issueReportServices.getIssueReports.mockResolvedValue({ data: [report] });
      maintenanceNeedServices.createMaintenanceNeed.mockResolvedValue({ status: 201, data: created });
      await mountAppAt("/issue-reports");

      await waitFor(() => expect(maintenanceButtons()[0]?.disabled).toBe(false));
      maintenanceButtons()[0].click();

      await waitFor(() => expect(maintenanceNeedServices.createMaintenanceNeed).toHaveBeenCalledTimes(1));
      expect(maintenanceNeedServices.createMaintenanceNeed).toHaveBeenCalledWith({
        issueReportId: 4,
        vehicleId: 3,
        assigneeId: 5,
        description: "Oil change needed.",
        title: "Maintenance Needed",
        outOfService: true,
        priority: "None",
        status: "Open",
        resolvedAt: null,
        authorId: 2,
      });
      await waitFor(() => expect(maintenanceButtons()[0].disabled).toBe(true));

      maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [created] });
      await router.push("/maintenance-needs");
      await settle();
      await waitFor(() => expect(document.body.textContent).toContain("Maintenance Needed"));
    });
  });
});
