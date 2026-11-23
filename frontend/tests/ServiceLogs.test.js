/**
 * Feature 13 — Maintenance Log Management
 * Spec: features/feature-13-service-log.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import maintenanceNeedServices from "../src/services/maintenanceNeedServices.js";
import serviceLogServices from "../src/services/serviceLogServices.js";
import serviceTypeServices from "../src/services/serviceTypeServices.js";
import userServices from "../src/services/userServices.js";
import vehicleServices from "../src/services/vehicleServices.js";
import { apiError, settle, signInAs, vuetify, waitFor } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/maintenanceNeedServices.js", () => ({
  default: {
    getMaintenanceNeeds: vi.fn(),
    getMaintenanceNeedOptions: vi.fn(),
  },
}));

vi.mock("../src/services/serviceLogServices.js", () => ({
  default: {
    getServiceLogs: vi.fn(),
    getServiceLog: vi.fn(),
    getServiceLogsByVehicle: vi.fn(),
    createServiceLog: vi.fn(),
    updateServiceLog: vi.fn(),
    removeServiceLog: vi.fn(),
    updateServiceVisit: vi.fn(),
    removeServiceVisit: vi.fn(),
  },
}));

vi.mock("../src/services/serviceTypeServices.js", () => ({
  default: {
    getServiceTypes: vi.fn(),
  },
}));

vi.mock("../src/services/userServices.js", () => ({
  default: {
    getUsers: vi.fn(),
    getUser: vi.fn(),
  },
}));

vi.mock("../src/services/vehicleServices.js", () => ({
  default: {
    getVehicles: vi.fn(),
    getVehicle: vi.fn(),
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

const users = [
  { id: 2, firstName: "Jane", lastName: "Doe" },
  { id: 5, firstName: "Sam", lastName: "Tech" },
];

const vehicles = [
  { id: 3, universityId: "V-100", year: 2022, make: "Ford", model: "Transit" },
  { id: 4, universityId: "V-200" },
];

const oilChange = { id: 1, name: "Oil Change" };
const tireRotation = { id: 2, name: "Tire Rotation" };
const brakeNoise = { id: 9, vehicleId: 3, title: "Brake noise" };
const wornTires = { id: 4, vehicleId: 3, title: "Worn tires" };

const oilLog = {
  id: 1,
  userId: 2,
  vehicleId: 3,
  serviceTypeId: 1,
  mileageLogId: 8,
  maintenanceNeedId: 9,
  servicedAt: "2026-07-02",
  user: { id: 2, firstName: "Jane", lastName: "Doe" },
  vehicle: { id: 3, universityId: "V-100" },
  serviceType: { id: 1, name: "Oil Change" },
  mileageLog: { id: 8, odometerReading: 12050 },
  maintenanceNeed: { id: 9, title: "Brake noise" },
};

const savedPayload = {
  userId: 2,
  vehicleId: 3,
  serviceTypeId: 1,
  miles: 12050,
  maintenanceNeedId: null,
  servicedAt: "2026-07-02",
};

const editedPayload = { ...savedPayload, maintenanceNeedId: 9 };
// UI/UX backlog #54: the page edits a whole visit (the logs sharing reading 8), so the body lists its services.
const { serviceTypeId: _visitType, ...editedVisit } = editedPayload;
const visitPayload = { ...editedVisit, serviceTypeIds: [1] };
// UI/UX backlog #26: a new entry is a visit and sends `serviceTypeIds`; edits keep `serviceTypeId`.
const { serviceTypeId: _oneType, ...visitBase } = savedPayload;
const createdPayload = { ...visitBase, serviceTypeIds: [1] };

let wrapper;

const mountAppAt = async (path) => {
  await router.push(path);
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

const signIn = (roles = signedInUser.roles) => {
  signInAs({ ...signedInUser, roles });
};

const namedButton = (text) =>
  [...document.body.querySelectorAll("button, a")].find((el) => el.textContent.trim() === text);

const field = async (name, label) =>
  waitFor(() => {
    const match = wrapper.findAllComponents({ name }).find((component) => component.props("label") === label);
    expect(match).toBeDefined();
    return match;
  });

const openNewServiceLog = async () => {
  namedButton("+ New Service Log").click();
  await settle();
  await waitFor(() => {
    expect(document.body.textContent).toContain("New service log");
  });
};

const clickNamed = async (text) => {
  const button = await waitFor(() => {
    const match = namedButton(text);
    expect(match).toBeDefined();
    return match;
  });
  button.click();
  await settle();
};

const fillCreate = async (overrides = {}) => {
  const user = users.find((item) => item.id === (overrides.userId ?? 2));
  const serviceType = [oilChange, tireRotation].find((item) => item.id === (overrides.serviceTypeId ?? 1));
  // UI/UX backlog #24: User and Service Type are pickers (no free text), set by id.
  await (await field("VAutocomplete", "User")).setValue(user.id);
  await (await field("VAutocomplete", "Service Types")).setValue([serviceType.id]);
  await (await field("VTextField", "Mileage")).setValue(String(overrides.miles ?? 12050));
  await (await field("VTextField", "Serviced At")).setValue(overrides.servicedAt ?? "2026-07-02");
};

const editButton = () => document.body.querySelector('[aria-label="Edit service log"]');

const startEdit = async () => {
  await waitFor(() => expect(editButton()).toBeTruthy());
  editButton().click();
  await settle();
};

beforeEach(async () => {
  // The vehicle page remembers its last tab in this browser; every test starts without one.
  localStorage.removeItem("view:vehicle-work-tab");
  signInAs(null);
  vi.resetAllMocks();
  apiClient.get.mockResolvedValue({ data: [] });
  userServices.getUser.mockResolvedValue({ data: { roles: signedInUser.roles } });
  userServices.getUsers.mockResolvedValue({ data: users });
  vehicleServices.getVehicles.mockResolvedValue({ data: vehicles });
  vehicleServices.getVehicle.mockResolvedValue({
    data: {
      id: 3,
      areaId: 1,
      vehicleTypeId: 1,
      universityId: "V-100",
      make: "Toyota",
      model: "Sienna",
      year: 2015,
      identifier: "ID-1",
      purchasedAt: "2018-01-01",
      color: "gray",
      passengerCapacity: 8,
      status: "active",
    },
  });
  serviceTypeServices.getServiceTypes.mockResolvedValue({ data: [oilChange, tireRotation] });
  maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({
    data: [brakeNoise, wornTires, { id: 7, vehicleId: 4, title: "Other vehicle" }],
  });
  maintenanceNeedServices.getMaintenanceNeedOptions.mockResolvedValue({ data: { assignees: users, vehicles: [] } });
  serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [] });
  serviceLogServices.createServiceLog.mockResolvedValue({ status: 201, data: oilLog });
  serviceLogServices.updateServiceLog.mockResolvedValue({ status: 200, data: oilLog });
  serviceLogServices.removeServiceLog.mockResolvedValue({
    status: 200,
    data: { message: "Service log deleted successfully." },
  });
  serviceLogServices.removeServiceVisit.mockResolvedValue({
    status: 200,
    data: { message: "Service log deleted successfully." },
  });
  await router.push("/login");
  await router.isReady();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 13 — Maintenance Log Management", () => {
  describe("US-13.1 — Create service logs", () => {
    it("Admin user creates a service log", async () => {
      const roleSets = [
        signedInUser.roles,
        [{ id: 2, role: "maintenance", areaId: null, area: null }],
        [{ id: 3, role: "area_admin", areaId: 1, area: { id: 1, name: "Athletics" } }],
      ];

      for (const roles of roleSets) {
        signIn(roles);
        await mountAppAt("/service-logs/3");
        await openNewServiceLog();

        expect(await field("VAutocomplete", "User")).toBeDefined();
        expect(wrapper.findAllComponents({ name: "VSelect" }).some((item) => item.props("label") === "Vehicle")).toBe(false);
        expect(await field("VAutocomplete", "Service Types")).toBeDefined();
        expect(await field("VTextField", "Mileage")).toBeDefined();
        expect(await field("VSelect", "Maintenance Need")).toBeDefined();
        expect(await field("VTextField", "Serviced At")).toBeDefined();

        wrapper.unmount();
        wrapper = undefined;
        document.body.innerHTML = "";
        await router.push("/login");
        await router.isReady();
      }
    });

    // UI/UX backlog #26: one visit can log several services at one odometer reading.
    it("Admin user logs several services in one visit", async () => {
      signIn();
      serviceLogServices.createServiceLog.mockResolvedValue({ status: 201, data: [oilLog] });
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [] });
      await mountAppAt("/service-logs/3");

      await openNewServiceLog();
      await fillCreate();
      await (await field("VAutocomplete", "Service Types")).setValue([1, 2]);
      await clickNamed("Create");

      await waitFor(() => expect(serviceLogServices.createServiceLog).toHaveBeenCalledWith({ ...createdPayload, serviceTypeIds: [1, 2] }));
    });

    it("Admin user can't log a visit without a service type", async () => {
      signIn();
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [] });
      await mountAppAt("/service-logs/3");

      await openNewServiceLog();
      await fillCreate();
      await (await field("VAutocomplete", "Service Types")).setValue([]);
      await clickNamed("Create");

      await waitFor(() => expect(document.body.textContent).toContain("Required field."));
      expect(serviceLogServices.createServiceLog).not.toHaveBeenCalled();
    });

    it("Admin user saves service log", async () => {
      signIn();
      const saved = { status: 201, data: oilLog };
      serviceLogServices.createServiceLog.mockResolvedValue(saved);
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValueOnce({ data: [] }).mockResolvedValue({ data: [oilLog] });
      await mountAppAt("/service-logs/3");

      await openNewServiceLog();
      await fillCreate();
      await clickNamed("Create");

      await waitFor(() => expect(serviceLogServices.createServiceLog).toHaveBeenCalledTimes(1));
      expect(serviceLogServices.createServiceLog).toHaveBeenCalledWith(createdPayload);
      expect(saved.status).toBe(201);
      await waitFor(() => expect(wrapper.text()).toContain("Oil Change"));
    });

    it("Admin user creates a service log from the vehicle page", async () => {
      signIn();
      await mountAppAt("/vehicles/3");

      // Feature 18 (US-18.3), UI/UX backlog #20: the logs are tabs of the vehicle page's "Work and history" card, and
      // with no open needs it starts on Service visits.
      const serviceSection = await waitFor(() => wrapper.get('[data-test="recent-service-logs"]'));
      expect(serviceSection.text()).toContain("+ New Service Log");
      expect(wrapper.get('[data-test="vehicle-work-tab-service"]').text()).toContain("Service visits");
      expect(wrapper.get('[data-test="vehicle-work-tab-mileage"]').text()).toContain("Mileage");
      // Not inside the vehicle's details (which are edited in a dialog now).
      expect(wrapper.get('[data-test="vehicle-details"]').text()).not.toContain("Mileage log");
      expect(wrapper.get('[data-test="vehicle-details"]').text()).not.toContain("+ New Service Log");

      await clickNamed("+ New Service Log");
      await fillCreate();
      await clickNamed("Create");

      await waitFor(() => expect(serviceLogServices.createServiceLog).toHaveBeenCalledTimes(1));
      expect(serviceLogServices.createServiceLog).toHaveBeenCalledWith(createdPayload);
      expect(router.currentRoute.value.path).toBe("/vehicles/3");
      expect(document.body.textContent).toContain("Service log created.");
    });

    it("Admin user creates service log with missing field", async () => {
      signIn();
      await mountAppAt("/service-logs/3");

      await openNewServiceLog();
      await clickNamed("Create");

      expect(serviceLogServices.createServiceLog).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });
  });

  describe("US-13.2 — View service logs", () => {
    it("Service logs view lists service logs", async () => {
      signIn();
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [oilLog] });
      await mountAppAt("/service-logs/3");

      await waitFor(() => {
        // UI/UX backlog #54: date first, plain column names, no Vehicle column (the page is one vehicle's, named in
        // the subtitle), and formatted values (#40).
        const columns = [...document.body.querySelectorAll("thead th")].map((th) => th.textContent.trim());
        expect(columns).toEqual(["Serviced", "Services", "Odometer", "Serviced by", "Maintenance need", "Actions"]);
        // The subtitle names the vehicle the way people know it.
        expect(wrapper.text()).toContain("V-100 · 2022 Ford Transit");
        const row = [...document.body.querySelectorAll("tbody tr")].find((el) => el.textContent.includes("Oil Change"));
        expect(row?.textContent).toContain("Jane Doe");
        expect(row?.textContent).toContain("12,050 mi");
        expect(row?.textContent).toContain("Brake noise");
        expect(row?.textContent).not.toContain("Other vehicle");
        expect(row?.textContent).toContain("Jul 2, 2026");
        expect(row?.querySelector('a[href="/maintenance-needs/9"]')).not.toBeNull();
      });
    });

    it("Service logs empty state", async () => {
      signIn();
      await mountAppAt("/service-logs/3");

      await waitFor(() => {
        expect(document.body.textContent).toContain("No service logged yet");
      });
    });
  });

  describe("US-13.3 — Manage service log rows", () => {
    it("Service log rows have edit and delete actions", async () => {
      signIn();
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [oilLog] });
      await mountAppAt("/service-logs/3");

      await waitFor(() => {
        expect(document.body.querySelector('[aria-label="Edit service log"]')).toBeTruthy();
        expect(document.body.querySelector('[aria-label="Delete service log"]')).toBeTruthy();
      });
    });
  });

  // UI/UX backlog #54: rows are visits, so edit and delete act on the whole visit (PUT/DELETE /service-logs/visits/8).
  describe("US-13.4 — Edit and delete service logs", () => {
    const updatedLog = (overrides) => ({
      ...oilLog,
      ...overrides,
      serviceType: overrides.serviceType ?? oilLog.serviceType,
      vehicle: overrides.vehicle ?? oilLog.vehicle,
      mileageLog: overrides.mileageLog ?? oilLog.mileageLog,
    });

    const editAndSave = async (apply) => {
      signIn();
      await mountAppAt("/service-logs/3");
      await startEdit();
      await apply();
      await clickNamed("Save");
    };

    it("Admin user edits a service log Service Type", async () => {
      const next = updatedLog({ serviceTypeId: 2, serviceType: tireRotation });
      serviceLogServices.updateServiceVisit.mockResolvedValue({ status: 200, data: next });
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValueOnce({ data: [oilLog] }).mockResolvedValue({ data: [next] });
      await editAndSave(async () => {
        await (await field("VAutocomplete", "Service Types")).setValue([2]);
      });

      await waitFor(() => expect(serviceLogServices.updateServiceVisit).toHaveBeenCalledTimes(1));
      expect(serviceLogServices.updateServiceVisit).toHaveBeenCalledWith(8, { ...visitPayload, serviceTypeIds: [2] });
      await waitFor(() => expect(wrapper.text()).toContain("Tire Rotation"));
    });

    it("Admin user edits a service log Service Type to be empty", async () => {
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [oilLog] });
      await editAndSave(async () => {
        await (await field("VAutocomplete", "Service Types")).setValue([]);
      });

      expect(serviceLogServices.updateServiceVisit).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user edits a service log mileage_log_id", async () => {
      const next = updatedLog({ mileageLog: { id: 8, odometerReading: 15000 } });
      serviceLogServices.updateServiceVisit.mockResolvedValue({ status: 200, data: next });
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValueOnce({ data: [oilLog] }).mockResolvedValue({ data: [next] });
      await editAndSave(async () => {
        await (await field("VTextField", "Mileage")).setValue("15000");
      });

      await waitFor(() =>
        expect(serviceLogServices.updateServiceVisit).toHaveBeenCalledWith(8, { ...visitPayload, miles: 15000 }),
      );
      await waitFor(() => expect(wrapper.text()).toContain("15,000 mi"));
    });

    it("Admin user edits a service log mileage_log_id to be empty", async () => {
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [oilLog] });
      await editAndSave(async () => {
        await (await field("VTextField", "Mileage")).setValue("");
      });

      expect(serviceLogServices.updateServiceVisit).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user edits a service log maintenance_need_id", async () => {
      const next = updatedLog({ maintenanceNeedId: 4, maintenanceNeed: { id: 4, title: "Worn tires" } });
      serviceLogServices.updateServiceVisit.mockResolvedValue({ status: 200, data: next });
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValueOnce({ data: [oilLog] }).mockResolvedValue({ data: [next] });
      await editAndSave(async () => {
        await (await field("VSelect", "Maintenance Need")).setValue(4);
      });

      await waitFor(() =>
        expect(serviceLogServices.updateServiceVisit).toHaveBeenCalledWith(8, { ...visitPayload, maintenanceNeedId: 4 }),
      );
      await waitFor(() => expect(wrapper.text()).toContain("Worn tires"));
    });

    it("Admin user deletes a service log", async () => {
      signIn();
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValueOnce({ data: [oilLog] }).mockResolvedValue({ data: [] });
      await mountAppAt("/service-logs/3");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Delete service log"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Delete service log"]').click();
      await settle();
      // UI/UX backlog #56: the dialog says the visit's reading is kept.
      expect(document.body.textContent).toContain("The odometer reading of 12,050 mi stays on the mileage log.");
      await clickNamed("Delete");

      await waitFor(() => expect(serviceLogServices.removeServiceVisit).toHaveBeenCalledWith(8));
      await expect(serviceLogServices.removeServiceVisit.mock.results[0].value).resolves.toMatchObject({ status: 200 });
      await waitFor(() => {
        expect(document.body.textContent).toContain("No service logged yet");
      });
    });

    it("Admin user edits a service log serviced_at", async () => {
      const next = updatedLog({ servicedAt: "2026-08-01" });
      serviceLogServices.updateServiceVisit.mockResolvedValue({ status: 200, data: next });
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValueOnce({ data: [oilLog] }).mockResolvedValue({ data: [next] });
      await editAndSave(async () => {
        await (await field("VTextField", "Serviced At")).setValue("2026-08-01");
      });

      await waitFor(() =>
        expect(serviceLogServices.updateServiceVisit).toHaveBeenCalledWith(8, { ...visitPayload, servicedAt: "2026-08-01" }),
      );
      await waitFor(() => expect(wrapper.text()).toContain("Aug 1, 2026"));
    });

    it("Admin user edits a service log serviced_at to after current date", async () => {
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [oilLog] });
      serviceLogServices.updateServiceVisit.mockRejectedValue(
        apiError(400, "Serviced date can't be in the future."),
      );
      await editAndSave(async () => {
        await (await field("VTextField", "Serviced At")).setValue("2099-01-01");
      });

      await waitFor(() => expect(serviceLogServices.updateServiceVisit).toHaveBeenCalledTimes(1));
      expect(document.body.textContent).toContain("Serviced date can't be in the future.");
    });

    it("Admin user edits a service log serviced_at to be empty", async () => {
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [oilLog] });
      await editAndSave(async () => {
        await (await field("VTextField", "Serviced At")).setValue("");
      });

      expect(serviceLogServices.updateServiceVisit).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });
  });

  describe("US-13.5: Signed-in admin , area admin, or maintenance user access only", () => {
    it("Un-signed-in user accesses service logs page", async () => {
      await mountAppAt("/service-logs");

      expect(router.currentRoute.value.path).toBe("/login");
    });

    it("Signed-in user without admin , area admin, or maintenance role accesses service logs page", async () => {
      signIn([]);
      await mountAppAt("/service-logs/3");

      // The home route is `/` (name `home`). Feature 13's scenario text says `/home`.
      expect(router.currentRoute.value.name).toBe("home");
      expect(router.currentRoute.value.path).toBe("/");
    });
  });
});

// UI/UX backlog #54: the service logs that share one odometer reading are one visit.
describe("UI/UX backlog #54 — Service logs grouped by visit", () => {
  it("shows the services that share a reading as one row, and edits them together", async () => {
    signIn();
    const tiresLog = { ...oilLog, id: 2, serviceTypeId: 2, serviceType: tireRotation };
    const laterLog = { ...oilLog, id: 3, mileageLogId: 11, mileageLog: { id: 11, odometerReading: 15000 }, servicedAt: "2026-08-01", maintenanceNeedId: null, maintenanceNeed: null };
    serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [laterLog, oilLog, tiresLog] });
    serviceLogServices.updateServiceVisit.mockResolvedValue({ status: 200, data: [] });
    await mountAppAt("/service-logs/3");

    const rows = () => [...document.body.querySelectorAll("tbody tr")];
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(rows()[0].textContent).toContain("Aug 1, 2026");
    const chips = [...rows()[1].querySelectorAll('[data-test="visit-services"] .v-chip')].map((chip) => chip.textContent.trim());
    expect(chips).toEqual(["Oil Change", "Tire Rotation"]);

    rows()[1].querySelector('[aria-label="Edit service log"]').click();
    await settle();
    expect((await field("VAutocomplete", "Service Types")).props("modelValue")).toEqual([1, 2]);
    await clickNamed("Save");

    await waitFor(() => expect(serviceLogServices.updateServiceVisit).toHaveBeenCalledWith(8, { ...visitPayload, serviceTypeIds: [1, 2] }));
  });

  // A row never wraps past two lines: two chips, then "+N" naming the rest.
  it("shows at most two service chips in a row, then +N", async () => {
    signIn();
    const brakes = { id: 3, name: "Brake Check" };
    const logs = [
      oilLog,
      { ...oilLog, id: 2, serviceTypeId: 2, serviceType: tireRotation },
      { ...oilLog, id: 3, serviceTypeId: 3, serviceType: brakes },
    ];
    serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: logs });
    await mountAppAt("/service-logs/3");

    const cell = await waitFor(() => {
      const match = document.body.querySelector('[data-test="visit-services"]');
      expect(match).not.toBeNull();
      return match;
    });
    expect([...cell.querySelectorAll(".v-chip")].map((chip) => chip.textContent.trim())).toEqual(["Brake Check", "Oil Change", "+1"]);
    expect(cell.querySelector('[data-test="visit-services-more"]').getAttribute("aria-label")).toBe("1 more: Tire Rotation");
  });

  it("deletes the whole visit, naming its services", async () => {
    signIn();
    const tiresLog = { ...oilLog, id: 2, serviceTypeId: 2, serviceType: tireRotation };
    serviceLogServices.getServiceLogsByVehicle.mockResolvedValueOnce({ data: [oilLog, tiresLog] }).mockResolvedValue({ data: [] });
    serviceLogServices.removeServiceVisit.mockResolvedValue({ status: 200, data: {} });
    await mountAppAt("/service-logs/3");

    await waitFor(() => expect(document.body.querySelector('[aria-label="Delete service log"]')).toBeTruthy());
    document.body.querySelector('[aria-label="Delete service log"]').click();
    await settle();
    expect(document.body.textContent).toContain("Delete the Oil Change and Tire Rotation on Jul 2, 2026?");
    await clickNamed("Delete");

    await waitFor(() => expect(serviceLogServices.removeServiceVisit).toHaveBeenCalledWith(8));
    expect(serviceLogServices.removeServiceLog).not.toHaveBeenCalled();
  });
});

// Calendar views for service: visits on their day, plus services due by date. Whole days, so table or month only.
describe("Service calendars", () => {
  const today = () => {
    const date = new Date();
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  };
  const events = () => [...document.body.querySelectorAll(".v-calendar .v-event")].map((event) => event.textContent.trim());

  beforeEach(() => {
    for (const key of ["view:service-log"]) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Storage unavailable: the pages start on the table.
      }
    }
  });

  // Logging a service changes when it's due, so the calendar drops the old due date right after saving.
  it("a due date clicked and logged leaves the calendar without a reload", async () => {
    signIn();
    const due = { serviceType: { id: 1, name: "Oil Change" }, state: "overdue", dueDate: today() };
    vehicleServices.getVehicles.mockResolvedValue({ data: [{ ...vehicles[0], status: "active", condition: { services: [due] } }] });
    vehicleServices.getVehicle.mockResolvedValue({ data: { ...vehicles[0], status: "active", condition: { services: [{ ...due, state: "ok" }] } } });
    serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [] });
    serviceLogServices.createServiceLog.mockResolvedValue({ status: 201, data: [oilLog] });
    await mountAppAt("/service-logs/3");

    await waitFor(() => expect(document.body.querySelector('[data-test="view-month"]')).toBeTruthy());
    document.body.querySelector('[data-test="view-month"]').click();
    await settle();
    const event = await waitFor(() => {
      const match = document.body.querySelector(".v-calendar .v-event");
      expect(match?.textContent.trim()).toBe("Oil Change");
      return match;
    });
    event.click();
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain("New service log"));
    // US-21.11: the new log starts with the service whose due date was clicked.
    expect((await field("VAutocomplete", "Service Types")).props("modelValue")).toEqual([1]);
    await fillCreate();
    await clickNamed("Create");

    await waitFor(() => expect(serviceLogServices.createServiceLog).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(vehicleServices.getVehicle).toHaveBeenCalledWith("3"));
    await waitFor(() => expect(events()).toEqual([]));
  });

  it("+ New Service Log after a due date starts with no service picked", async () => {
    signIn();
    const due = { serviceType: { id: 1, name: "Oil Change" }, state: "overdue", dueDate: today() };
    vehicleServices.getVehicles.mockResolvedValue({ data: [{ ...vehicles[0], status: "active", condition: { services: [due] } }] });
    serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [] });
    await mountAppAt("/service-logs/3");

    await waitFor(() => expect(document.body.querySelector('[data-test="view-month"]')).toBeTruthy());
    document.body.querySelector('[data-test="view-month"]').click();
    await settle();
    const event = await waitFor(() => {
      const match = document.body.querySelector(".v-calendar .v-event");
      expect(match).toBeTruthy();
      return match;
    });
    event.click();
    await settle();
    await waitFor(() => expect(document.body.querySelector(".v-dialog.v-overlay--active")).toBeTruthy());
    await clickNamed("Cancel");
    await settle();

    await openNewServiceLog();
    expect((await field("VAutocomplete", "Service Types")).props("modelValue")).toEqual([]);
  });

  it("a vehicle's service log month opens a visit to edit it", async () => {
    signIn();
    const visit = { ...oilLog, servicedAt: today() };
    serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [visit] });
    await mountAppAt("/service-logs/3");

    await waitFor(() => expect(document.body.querySelector('[data-test="view-month"]')).toBeTruthy());
    expect(document.body.querySelector('[data-test="view-week"]')).toBeNull();
    document.body.querySelector('[data-test="view-month"]').click();
    await settle();

    const event = await waitFor(() => {
      const match = document.body.querySelector(".v-calendar .v-event");
      expect(match?.textContent.trim()).toBe("Oil Change");
      return match;
    });
    event.click();
    await settle();
    await waitFor(() => expect(document.body.querySelector(".v-dialog.v-overlay--active")?.textContent).toContain("Edit service log"));
  });
});
