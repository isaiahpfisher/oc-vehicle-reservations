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
import noteServices from "../src/services/noteServices.js";
import { todayInput } from "../src/models/issueReports.js";
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
    getAssignees: vi.fn(),
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

vi.mock("../src/services/noteServices.js", () => ({
  default: { getNotes: vi.fn(), getNote: vi.fn(), createNote: vi.fn(), removeNote: vi.fn() },
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

// Feature 14 (US-14.6): create and edit moved from dialogs to the issue report page; these helpers drive that page.
const openCreate = async () => {
  await clickNamed("+ New Issue Report");
  await waitFor(() => expect(router.currentRoute.value.name).toBe("issueReportCreate"));
  await waitFor(() => expect(document.body.querySelector('[data-test="submit"]')).toBeTruthy());
};

const openEdit = async () => {
  await waitFor(() => expect(document.body.querySelector('[aria-label="Edit issue report"]')).toBeTruthy());
  document.body.querySelector('[aria-label="Edit issue report"]').click();
  await settle();
  await waitFor(() => expect(router.currentRoute.value.name).toBe("issueReport"));
  await waitFor(() => expect(document.body.querySelector('[data-test="issue-report-form"]')).toBeTruthy());
};

const byTest = (name) => document.body.querySelector(`[data-test="${name}"]`);

const clickTest = async (name) => {
  byTest(name).click();
  await settle();
};

const fillRequired = async (overrides = {}) => {
  await (await field("VAutocomplete", "Vehicle")).setValue(overrides.vehicleId ?? 3);
  await clickTest(`type-${overrides.type ?? "low_gas"}`);
  await (await field("VTextarea", "Description")).setValue(overrides.description ?? "Tank is on empty.");
  if (overrides.status) {
    await clickTest(`status-${overrides.status}`);
  }
};

const submit = () => clickTest("submit");

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
  // Feature 14 (US-14.6): the report page loads the report (with its vehicle's area) and its notes.
  issueReportServices.getIssueReport.mockResolvedValue({ data: { ...janeReport, vehicle: { ...janeReport.vehicle, areaId: 1 } } });
  noteServices.getNotes.mockResolvedValue({ data: [] });
  issueReportServices.getAssignees.mockResolvedValue({ data: [{ ...alex, roles: ["maintenance"] }] });
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
        ...wrapper.findAllComponents({ name: "VAutocomplete" }),
        ...wrapper.findAllComponents({ name: "VTextarea" }),
      ].map((item) => item.props("label"));
      expect(labels).toEqual(expect.arrayContaining(["Vehicle", "Trip (optional)", "Description", "Assignee (optional)"]));
      expect(labels).not.toContain("Author");
      expect(document.body.querySelector('[role="radiogroup"]').textContent).toContain("Low gas");
      expect(byTest("status-pending").getAttribute("aria-checked")).toBe("true");
      expect(wrapper.findAllComponents({ name: "VTextField" }).some((item) => item.props("label") === "Resolved on")).toBe(false);
    });

    it("User saves issue report", async () => {
      signIn();
      const saved = { status: 201, data: janeReport };
      issueReportServices.createIssueReport.mockResolvedValue(saved);
      await mountAppAt("/issue-reports");
      await openCreate();
      await fillRequired();
      await submit();

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
      // The new report opens on its page.
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe("/issue-reports/1"));
      await waitFor(() => {
        expect(document.body.querySelector("h2").textContent).toBe("Low gas · V-100");
        expect(byTest("status-chip").textContent).toContain("Pending");
        expect(document.body.textContent).toContain("Reported by Jane Doe");
      });
    });

    it("User saves issue report with a vehicle request and assignee", async () => {
      signIn();
      // Feature 14 (US-14.6): trips come from the request lists; picking one with a single vehicle fills it in.
      apiClient.get.mockImplementation((url) =>
        Promise.resolve({
          data: ["requests", "me/requests"].includes(url) ? [{ ...campusVisit, startAt: "2026-11-02", endAt: "2026-11-02", allDay: true, status: "reserved", vehicles: [vehicle] }] : { roles: signedInUser.roles },
        }),
      );
      const saved = {
        status: 201,
        data: { ...janeReport, vehicleRequestId: 12, assigneeId: 5, type: "dirty", description: "Interior needs cleaning.", assignee: alex, vehicleRequest: campusVisit },
      };
      issueReportServices.createIssueReport.mockResolvedValue(saved);
      await mountAppAt("/issue-reports");
      await openCreate();
      await (await field("VAutocomplete", "Trip (optional)")).setValue(12);
      expect((await field("VAutocomplete", "Vehicle")).props("modelValue")).toBe(3);
      await clickTest("type-dirty");
      await (await field("VTextarea", "Description")).setValue("Interior needs cleaning.");
      await (await field("VAutocomplete", "Assignee (optional)")).setValue(5);
      await submit();

      await waitFor(() => expect(issueReportServices.createIssueReport).toHaveBeenCalledTimes(1));
      expect(issueReportServices.createIssueReport.mock.calls[0][0].vehicleRequestId).toBe(12);
      expect(issueReportServices.createIssueReport.mock.calls[0][0].vehicleId).toBe(3);
      expect(issueReportServices.createIssueReport.mock.calls[0][0].assigneeId).toBe(5);
      expect(saved.status).toBe(201);
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
      await fillRequired({ type: "other", description: "Spare key is missing.", status: "resolved" });
      // Resolving starts the date at today; it can be changed.
      expect((await field("VTextField", "Resolved on")).props("modelValue")).toBe(todayInput());
      await (await field("VTextField", "Resolved on")).setValue("2026-10-23");
      await submit();

      await waitFor(() => expect(issueReportServices.createIssueReport).toHaveBeenCalledTimes(1));
      expect(issueReportServices.createIssueReport.mock.calls[0][0].status).toBe("resolved");
      expect(issueReportServices.createIssueReport.mock.calls[0][0].resolvedAt).toBe("2026-10-23");
      expect(saved.status).toBe(201);
    });

    it("User creates issue report with missing vehicle", async () => {
      signIn();
      await mountAppAt("/issue-reports");
      await openCreate();
      await clickTest("type-low_gas");
      await (await field("VTextarea", "Description")).setValue("Tank is on empty.");
      await submit();

      expect(issueReportServices.createIssueReport).not.toHaveBeenCalled();
      await waitFor(() => expect(byTest("section-vehicle").textContent).toContain("Choose the vehicle."));
    });

    it("User creates issue report with missing type", async () => {
      signIn();
      await mountAppAt("/issue-reports");
      await openCreate();
      await (await field("VAutocomplete", "Vehicle")).setValue(3);
      await (await field("VTextarea", "Description")).setValue("Tank is on empty.");
      await submit();

      expect(issueReportServices.createIssueReport).not.toHaveBeenCalled();
      await waitFor(() => expect(byTest("section-problem").textContent).toContain("Choose the kind of problem."));
    });

    it("User creates issue report with missing description", async () => {
      signIn();
      await mountAppAt("/issue-reports");
      await openCreate();
      await (await field("VAutocomplete", "Vehicle")).setValue(3);
      await clickTest("type-low_gas");
      await submit();

      expect(issueReportServices.createIssueReport).not.toHaveBeenCalled();
      await waitFor(() => expect(byTest("section-problem").textContent).toContain("Describe the problem."));
    });

    it("User creates issue report with a whitespace-only description", async () => {
      signIn();
      await mountAppAt("/issue-reports");
      await openCreate();
      await fillRequired({ description: " " });
      await submit();

      expect(issueReportServices.createIssueReport).not.toHaveBeenCalled();
      await waitFor(() => expect(byTest("section-problem").textContent).toContain("Describe the problem."));
    });

    it("User creates issue report with missing status", async () => {
      // Feature 14 (US-14.6): status is a toggle that always holds a value, so it can't be left empty.
      signIn();
      await mountAppAt("/issue-reports");
      await openCreate();
      await fillRequired();
      await clickTest("status-pending");
      expect(byTest("status-pending").getAttribute("aria-checked")).toBe("true");
      await submit();

      await waitFor(() => expect(issueReportServices.createIssueReport).toHaveBeenCalledTimes(1));
      expect(issueReportServices.createIssueReport.mock.calls[0][0].status).toBe("pending");
    });

    it("User creates a resolved issue report with missing resolved date", async () => {
      signIn();
      await mountAppAt("/issue-reports");
      await openCreate();
      await fillRequired({ status: "resolved" });
      await (await field("VTextField", "Resolved on")).setValue("");
      await submit();

      expect(issueReportServices.createIssueReport).not.toHaveBeenCalled();
      await waitFor(() => expect(byTest("section-status").textContent).toContain("Enter the date it was closed."));
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
      issueReportServices.getIssueReports.mockResolvedValue({ data: [janeReport] });
      issueReportServices.updateIssueReport.mockResolvedValue(saved);
      await mountAppAt("/issue-reports");
      await openEdit();
      await (await field("VTextarea", "Description")).setValue("Tank is below a quarter.");
      await submit();

      await waitFor(() => expect(issueReportServices.updateIssueReport).toHaveBeenCalledTimes(1));
      expect(issueReportServices.updateIssueReport.mock.calls[0][1].description).toBe("Tank is below a quarter.");
      expect(saved.status).toBe(200);
      await waitFor(() => expect(document.body.textContent).toContain("Changes saved."));
      expect((await field("VTextarea", "Description")).props("modelValue")).toBe("Tank is below a quarter.");
    });

    it("Admin edits an issue report type", async () => {
      signIn();
      const saved = { status: 200, data: { ...janeReport, type: "maintenance" } };
      issueReportServices.getIssueReports.mockResolvedValue({ data: [janeReport] });
      issueReportServices.updateIssueReport.mockResolvedValue(saved);
      await mountAppAt("/issue-reports");
      await openEdit();
      await clickTest("type-maintenance");
      await submit();

      await waitFor(() => expect(issueReportServices.updateIssueReport).toHaveBeenCalledTimes(1));
      expect(issueReportServices.updateIssueReport.mock.calls[0][1].type).toBe("maintenance");
      expect(saved.status).toBe(200);
      await waitFor(() => expect(document.body.querySelector("h2").textContent).toBe("Maintenance · V-100"));
    });

    it("Admin edits an issue report to resolved", async () => {
      signIn();
      const saved = { status: 200, data: { ...janeReport, status: "resolved", resolvedAt: "2026-10-24" } };
      issueReportServices.getIssueReports.mockResolvedValue({ data: [janeReport] });
      issueReportServices.updateIssueReport.mockResolvedValue(saved);
      await mountAppAt("/issue-reports");
      await openEdit();
      await clickTest("status-resolved");
      await (await field("VTextField", "Resolved on")).setValue("2026-10-24");
      await submit();

      await waitFor(() => expect(issueReportServices.updateIssueReport).toHaveBeenCalledTimes(1));
      expect(issueReportServices.updateIssueReport.mock.calls[0][1].status).toBe("resolved");
      expect(issueReportServices.updateIssueReport.mock.calls[0][1].resolvedAt).toBe("2026-10-24");
      expect(saved.status).toBe(200);
      await waitFor(() => expect(byTest("status-chip").textContent).toContain("Resolved"));
      expect((await field("VTextField", "Resolved on")).props("modelValue")).toBe("2026-10-24");
    });

    it("Admin clears an issue report assignee", async () => {
      signIn();
      const assigned = { ...janeReport, assigneeId: 5, assignee: alex, vehicle: { ...janeReport.vehicle, areaId: 1 } };
      const saved = { status: 200, data: { ...janeReport, assigneeId: null, assignee: null } };
      issueReportServices.getIssueReports.mockResolvedValue({ data: [assigned] });
      issueReportServices.getIssueReport.mockResolvedValue({ data: assigned });
      issueReportServices.updateIssueReport.mockResolvedValue(saved);
      await mountAppAt("/issue-reports");
      await openEdit();
      expect((await field("VAutocomplete", "Assignee (optional)")).props("modelValue")).toBe(5);
      await (await field("VAutocomplete", "Assignee (optional)")).setValue(null);
      await submit();

      await waitFor(() => expect(issueReportServices.updateIssueReport).toHaveBeenCalledTimes(1));
      expect(issueReportServices.updateIssueReport.mock.calls[0][1].assigneeId).toBeNull();
      expect(saved.status).toBe(200);
      await waitFor(() => expect((wrapper.findAllComponents({ name: "VAutocomplete" }).find((c) => c.props("label") === "Assignee (optional)")).props("modelValue")).toBeNull());
    });

    it("Admin edits an issue report to have a missing description", async () => {
      signIn();
      issueReportServices.getIssueReports.mockResolvedValue({ data: [janeReport] });
      await mountAppAt("/issue-reports");
      await openEdit();
      await (await field("VTextarea", "Description")).setValue("");
      await submit();

      expect(issueReportServices.updateIssueReport).not.toHaveBeenCalled();
      await waitFor(() => expect(byTest("section-problem").textContent).toContain("Describe the problem."));
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
      issueReportServices.getIssueReports.mockResolvedValue({ data: [janeReport] });
      issueReportServices.updateIssueReport.mockResolvedValue(saved);
      await mountAppAt("/issue-reports");
      await openEdit();
      await (await field("VTextarea", "Description")).setValue("Tank is below a quarter.");
      await submit();

      await waitFor(() => expect(issueReportServices.updateIssueReport).toHaveBeenCalledTimes(1));
      expect(saved.status).toBe(200);
      await waitFor(() => expect(document.body.textContent).toContain("Changes saved."));
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
  [...document.body.querySelectorAll('[aria-label="Create maintenance need"], [data-test="create-maintenance-need"]')];

// Feature 14 (US-14.7): Create Maintenance Need moved from the issue reports list to the issue report page.
// It opens the maintenance need form filled in from the report instead of creating the need right away.
const openReport = async (report, needs = []) => {
  issueReportServices.getIssueReport.mockResolvedValue({ data: { ...report, vehicle: { ...report.vehicle, areaId: 1 } } });
  maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: needs });
  await mountAppAt(`/issue-reports/${report.id}`);
  await waitFor(() => expect(byTest("issue-report-form")).toBeTruthy());
  await settle();
};

describe("Feature 11 — Maintenance Needs", () => {
  describe("US-11.2 — Create maintenance need from issue report", () => {
    it("Admin user sees Create Maintenance Need on a maintenance issue report", async () => {
      signIn();
      // Not on the list any more.
      issueReportServices.getIssueReports.mockResolvedValue({ data: [{ ...janeReport, type: "maintenance" }] });
      await mountAppAt("/issue-reports");
      await waitFor(() => expect(wrapper.text()).toContain("Tank is on empty."));
      expect(maintenanceButtons()).toHaveLength(0);
      wrapper.unmount();

      await openReport({ ...janeReport, id: 4, type: "maintenance" });
      await waitFor(() => expect(byTest("create-maintenance-need")).toBeTruthy());
      expect(byTest("create-maintenance-need").getAttribute("href")).toBe("/maintenance-needs/new?issueReportId=4");
    });

    it("Create Maintenance Need is unavailable when the issue type is not maintenance", async () => {
      signIn();
      await openReport({ ...janeReport, id: 4, type: "low_gas" });

      expect(byTest("maintenance")).toBeNull();
      expect(maintenanceButtons()).toHaveLength(0);
    });

    it("Create Maintenance Need is unavailable when that issue report already has a maintenance need", async () => {
      signIn();
      await openReport({ ...janeReport, id: 7, type: "maintenance" }, [
        { id: 1, issueReportId: 7, title: "Oil change", status: "Open", priority: "High" },
      ]);

      await waitFor(() => expect(byTest("view-maintenance-need")).toBeTruthy());
      expect(byTest("linked-need-title").textContent).toBe("Oil change");
      expect(byTest("view-maintenance-need").getAttribute("href")).toBe("/maintenance-needs/1");
      expect(maintenanceButtons()).toHaveLength(0);
    });

    it("Admin user creates a maintenance need from an issue report", async () => {
      signIn();
      const report = { ...janeReport, id: 4, type: "maintenance", vehicleId: 3, assigneeId: 5, assignee: alex, description: "Oil change needed." };
      maintenanceNeedServices.getMaintenanceNeedOptions.mockResolvedValue({
        data: {
          vehicles: [{ id: 3, color: "White", make: "Ford", model: "Transit", licensePlate: "ABC-123", areaId: 1 }],
          assignees: [alex],
        },
      });
      maintenanceNeedServices.createMaintenanceNeed.mockResolvedValue({ status: 201, data: { id: 9, issueReportId: 4 } });
      await openReport(report);

      await waitFor(() => expect(byTest("create-maintenance-need")).toBeTruthy());
      byTest("create-maintenance-need").click();
      await settle();
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe("/maintenance-needs/new?issueReportId=4"));

      // Filled in from the report, and still editable.
      await waitFor(() => expect(byTest("from-issue-report")?.textContent).toContain("Maintenance · V-100"));
      // Feature 14 (US-14.7): it says up front that the report will be closed.
      expect(byTest("from-issue-report").textContent).toContain("Moved to maintenance");
      expect(wrapper.findAllComponents({ name: "VTextField" }).find((c) => c.props("label") === "Title").props("modelValue")).toBe("Oil change needed.");
      expect((await field("VSelect", "Vehicle")).props("modelValue")).toBe(3);
      expect((await field("VSelect", "Assignee")).props("modelValue")).toBe(5);
      expect((await field("VTextarea", "Description")).props("modelValue")).toBe("Oil change needed.");
      await (await field("VSelect", "Priority")).setValue("High");
      await clickNamed("Create");

      await waitFor(() => expect(maintenanceNeedServices.createMaintenanceNeed).toHaveBeenCalledTimes(1));
      expect(maintenanceNeedServices.createMaintenanceNeed).toHaveBeenCalledWith({
        issueReportId: 4,
        vehicleId: 3,
        assigneeId: 5,
        description: "Oil change needed.",
        title: "Oil change needed.",
        outOfService: true,
        priority: "High",
        status: "Open",
        resolvedAt: null,
        authorId: 2,
      });
      // Back to the report, which now links to its need and says it was closed.
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe("/issue-reports/4"));
      await waitFor(() => expect(document.body.textContent).toContain("This report is now Moved to maintenance."));
    });

    it("Cancel on a need started from an issue report returns to the report", async () => {
      signIn();
      issueReportServices.getIssueReport.mockResolvedValue({ data: { ...janeReport, id: 4, type: "maintenance" } });
      maintenanceNeedServices.getMaintenanceNeedOptions.mockResolvedValue({ data: { vehicles: [], assignees: [] } });
      await mountAppAt("/maintenance-needs/new?issueReportId=4");
      await waitFor(() => expect(byTest("from-issue-report")).toBeTruthy());

      await clickNamed("Cancel");
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe("/issue-reports/4"));
      expect(maintenanceNeedServices.createMaintenanceNeed).not.toHaveBeenCalled();
    });
  });
});

describe("Feature 14 — Notes", () => {
  describe("US-14.6 — Issue report page", () => {
    it("Issue reports list opens the issue report page", async () => {
      // A requester can't manage reports, but can still open their own.
      signIn([], { userId: 2 });
      issueReportServices.getIssueReports.mockResolvedValue({ data: [janeReport] });
      issueReportServices.getIssueReport.mockResolvedValue({ data: { ...janeReport, vehicle: { ...janeReport.vehicle, areaId: 1 } } });
      apiClient.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith("/notes") ? [] : { roles: [] } }));
      await mountAppAt("/issue-reports");

      const view = await waitFor(() => {
        const match = document.body.querySelector('[aria-label="View issue report"]');
        expect(match).toBeTruthy();
        return match;
      });
      expect(document.body.querySelector('[aria-label="Edit issue report"]')).toBeNull();
      // The description links to the same page.
      const link = [...document.body.querySelectorAll("a")].find((el) => el.textContent.trim() === "Tank is on empty.");
      expect(link.getAttribute("href")).toBe("/issue-reports/1");

      view.click();
      await settle();

      await waitFor(() => expect(router.currentRoute.value.name).toBe("issueReport"));
      expect(router.currentRoute.value.params.issueReportId).toBe("1");
      await waitFor(() => expect(document.body.querySelector("h2")?.textContent).toBe("Low gas · V-100"));
      expect(issueReportServices.getIssueReport).toHaveBeenCalledWith("1");
    });
  });

  describe("US-14.8 — Find issue reports", () => {
    const reports = [
      { ...janeReport, id: 1, createdAt: "2026-11-01T12:00:00.000Z" },
      { ...musicReport, id: 2, type: "maintenance", createdAt: "2026-11-03T12:00:00.000Z" },
      {
        ...janeReport,
        id: 3,
        type: "dirty",
        status: "resolved",
        description: "Mud on the floor mats.",
        assigneeId: 5,
        assignee: alex,
        vehicle: { id: 5, universityId: "V-150" },
        vehicleRequest: campusVisit,
        createdAt: "2026-11-02T12:00:00.000Z",
      },
    ];

    const rowTexts = () => [...document.body.querySelectorAll(".v-data-table tbody tr")].map((row) => row.textContent);
    const descriptions = () => rowTexts().map((text) => reports.find((report) => text.includes(report.description))?.description);

    const mountList = async () => {
      signIn();
      issueReportServices.getIssueReports.mockResolvedValue({ data: reports });
      await mountAppAt("/issue-reports");
      await waitFor(() => expect(rowTexts()).toHaveLength(3));
    };

    it("Issue reports table shows only the key columns", async () => {
      await mountList();

      const headers = [...document.body.querySelectorAll(".v-data-table thead th")].map((th) => th.textContent.trim());
      expect(headers).toEqual(["Issue", "Vehicle", "Status", "Reported", "Actions"]);
      // Type and reporter ride along under the description instead of taking columns.
      expect(rowTexts()[0]).toContain("Maintenance · Jane Doe");
      expect(rowTexts()[0]).toContain("Pending");
      expect(rowTexts()[0]).toContain("Nov 3, 2026");
    });

    it("Issue reports table fits small screens without scrolling sideways", async () => {
      // Desktop: the short columns have fixed widths; Issue takes the rest and truncates.
      await mountList();
      const widths = [...document.body.querySelectorAll(".v-data-table thead th")].map((th) => th.style.width);
      expect(widths).toEqual(["", "120px", "136px", "136px", "104px"]);
      expect(document.body.querySelector('[data-test="issue-mobile-row"]')).toBeNull();
      wrapper.unmount();

      // Phones: one compact row per report with everything that matters.
      const width = window.innerWidth;
      window.innerWidth = 390;
      window.dispatchEvent(new Event("resize"));
      try {
        await mountList();
        await waitFor(() => expect(document.body.querySelectorAll('[data-test="issue-mobile-row"]')).toHaveLength(3));
        const first = document.body.querySelector('[data-test="issue-mobile-row"]');
        expect(first.querySelector("td").getAttribute("colspan")).toBe("5");
        for (const text of ["Music issue.", "Maintenance · Jane Doe", "Pending", "V-200", "Nov 3, 2026"]) {
          expect(first.textContent).toContain(text);
        }
        expect(first.querySelector('[aria-label="Edit issue report"]')).not.toBeNull();
      } finally {
        window.innerWidth = width;
        window.dispatchEvent(new Event("resize"));
      }
    });

    it("User searches issue reports", async () => {
      await mountList();
      const search = await field("VTextField", "Search");

      // Any of the report's details, any order, any case.
      for (const [text, expected] of [
        ["alex", ["Mud on the floor mats."]],
        ["v-200", ["Music issue."]],
        ["EMPTY tank", ["Tank is on empty."]],
        ["campus visit", ["Mud on the floor mats."]],
      ]) {
        await search.setValue(text);
        await settle();
        expect(descriptions()).toEqual(expected);
      }
      expect(byTest("result-count").textContent).toContain("Showing 1 of 3");

      await search.setValue("nothing like this");
      await settle();
      expect(document.body.textContent).toContain("No issue reports match");
      await clickTest("clear-filters");
      await waitFor(() => expect(rowTexts()).toHaveLength(3));
      expect(byTest("result-count")).toBeNull();
    });

    it("User filters issue reports by status and type", async () => {
      await mountList();

      await (await field("VSelect", "Status")).setValue("pending");
      await settle();
      expect(descriptions()).toEqual(["Music issue.", "Tank is on empty."]);

      await (await field("VSelect", "Type")).setValue("low_gas");
      await settle();
      expect(descriptions()).toEqual(["Tank is on empty."]);

      // Feature 14: the new closing status is a filter choice too.
      expect((await field("VSelect", "Status")).props("items").map(({ value }) => value)).toContain("moved_to_maintenance");
      await (await field("VSelect", "Status")).setValue(null);
      await (await field("VSelect", "Type")).setValue("dirty");
      await settle();
      expect(descriptions()).toEqual(["Mud on the floor mats."]);
    });

    it("User sorts issue reports", async () => {
      await mountList();
      // Newest first by default.
      expect(descriptions()).toEqual(["Music issue.", "Mud on the floor mats.", "Tank is on empty."]);

      const header = (title) => [...document.body.querySelectorAll(".v-data-table thead th")].find((th) => th.textContent.trim() === title);
      header("Vehicle").click();
      await settle();
      expect(descriptions()).toEqual(["Tank is on empty.", "Mud on the floor mats.", "Music issue."]);
      header("Vehicle").click();
      await settle();
      expect(descriptions()).toEqual(["Music issue.", "Mud on the floor mats.", "Tank is on empty."]);

      header("Status").click();
      await settle();
      // Pending before Resolved.
      expect(descriptions()[2]).toBe("Mud on the floor mats.");
    });
  });
});
