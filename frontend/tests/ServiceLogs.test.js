/**
 * Feature 13 — Maintenance Log Management
 * Spec: features/feature-13-service-log.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import serviceLogServices from "../src/services/serviceLogServices.js";
import serviceTypeServices from "../src/services/serviceTypeServices.js";
import userServices from "../src/services/userServices.js";
import vehicleServices from "../src/services/vehicleServices.js";
import { apiError, settle, signInAs, vuetify, waitFor } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/serviceLogServices.js", () => ({
  default: {
    getServiceLogs: vi.fn(),
    getServiceLog: vi.fn(),
    getServiceLogsByVehicle: vi.fn(),
    createServiceLog: vi.fn(),
    updateServiceLog: vi.fn(),
    removeServiceLog: vi.fn(),
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
  { id: 3, universityId: "V-100" },
  { id: 4, universityId: "V-200" },
];

const oilChange = { id: 1, name: "Oil Change" };
const tireRotation = { id: 2, name: "Tire Rotation" };

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
  await (await field("VSelect", "User")).setValue(overrides.userId ?? 2);
  await (await field("VSelect", "Service Type")).setValue(overrides.serviceTypeId ?? 1);
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
  serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [] });
  serviceLogServices.createServiceLog.mockResolvedValue({ status: 201, data: oilLog });
  serviceLogServices.updateServiceLog.mockResolvedValue({ status: 200, data: oilLog });
  serviceLogServices.removeServiceLog.mockResolvedValue({
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

        expect(await field("VSelect", "User")).toBeDefined();
        expect(wrapper.findAllComponents({ name: "VSelect" }).some((item) => item.props("label") === "Vehicle")).toBe(false);
        expect(await field("VSelect", "Service Type")).toBeDefined();
        expect(await field("VTextField", "Mileage")).toBeDefined();
        expect(await field("VTextField", "Maintenance Need")).toBeDefined();
        expect(await field("VTextField", "Serviced At")).toBeDefined();

        wrapper.unmount();
        wrapper = undefined;
        document.body.innerHTML = "";
        await router.push("/login");
        await router.isReady();
      }
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
      expect(serviceLogServices.createServiceLog).toHaveBeenCalledWith(savedPayload);
      expect(saved.status).toBe(201);
      await waitFor(() => expect(wrapper.text()).toContain("Oil Change"));
    });

    it("Admin user creates a service log from the vehicle page", async () => {
      signIn();
      await mountAppAt("/vehicles/3");

      const header = wrapper.get("h2").element.parentElement.parentElement;
      expect(header.textContent).toContain("Mileage log");
      expect(header.textContent).toContain("Service log");
      expect(header.textContent).toContain("+ New Service Log");
      expect(wrapper.get("form").text()).not.toContain("Mileage log");
      expect(wrapper.get("form").text()).not.toContain("+ New Service Log");

      await clickNamed("+ New Service Log");
      await fillCreate();
      await clickNamed("Create");

      await waitFor(() => expect(serviceLogServices.createServiceLog).toHaveBeenCalledTimes(1));
      expect(serviceLogServices.createServiceLog).toHaveBeenCalledWith(savedPayload);
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
        expect(wrapper.text()).toContain("User");
        expect(wrapper.text()).toContain("Vehicle");
        expect(wrapper.text()).toContain("Service Type");
        expect(wrapper.text()).toContain("Mileage");
        expect(wrapper.text()).toContain("Maintenance Need");
        expect(wrapper.text()).toContain("Serviced At");
        const row = [...document.body.querySelectorAll("tbody tr")].find((el) => el.textContent.includes("Oil Change"));
        expect(row?.textContent).toContain("Jane Doe");
        expect(row?.textContent).toContain("V-100");
        expect(row?.textContent).toContain("12050");
        expect(row?.textContent).toContain("9");
        expect(row?.textContent).toContain("2026-07-02");
      });
    });

    it("Service logs empty state", async () => {
      signIn();
      await mountAppAt("/service-logs/3");

      await waitFor(() => {
        expect(document.body.textContent).toContain("No service logs yet. Create your first service log.");
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
      serviceLogServices.updateServiceLog.mockResolvedValue({ status: 200, data: next });
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValueOnce({ data: [oilLog] }).mockResolvedValue({ data: [next] });
      await editAndSave(async () => {
        await (await field("VSelect", "Service Type")).setValue(2);
      });

      await waitFor(() => expect(serviceLogServices.updateServiceLog).toHaveBeenCalledTimes(1));
      expect(serviceLogServices.updateServiceLog).toHaveBeenCalledWith(1, { ...editedPayload, serviceTypeId: 2 });
      await waitFor(() => expect(wrapper.text()).toContain("Tire Rotation"));
    });

    it("Admin user edits a service log Service Type to be empty", async () => {
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [oilLog] });
      await editAndSave(async () => {
        await (await field("VSelect", "Service Type")).setValue(null);
      });

      expect(serviceLogServices.updateServiceLog).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user edits a service log mileage_log_id", async () => {
      const next = updatedLog({ mileageLog: { id: 8, odometerReading: 15000 } });
      serviceLogServices.updateServiceLog.mockResolvedValue({ status: 200, data: next });
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValueOnce({ data: [oilLog] }).mockResolvedValue({ data: [next] });
      await editAndSave(async () => {
        await (await field("VTextField", "Mileage")).setValue("15000");
      });

      await waitFor(() =>
        expect(serviceLogServices.updateServiceLog).toHaveBeenCalledWith(1, { ...editedPayload, miles: 15000 }),
      );
      await waitFor(() => expect(wrapper.text()).toContain("15000"));
    });

    it("Admin user edits a service log mileage_log_id to be empty", async () => {
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [oilLog] });
      await editAndSave(async () => {
        await (await field("VTextField", "Mileage")).setValue("");
      });

      expect(serviceLogServices.updateServiceLog).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user edits a service log maintenance_need_id", async () => {
      const next = updatedLog({ maintenanceNeedId: 4 });
      serviceLogServices.updateServiceLog.mockResolvedValue({ status: 200, data: next });
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValueOnce({ data: [oilLog] }).mockResolvedValue({ data: [next] });
      await editAndSave(async () => {
        await (await field("VTextField", "Maintenance Need")).setValue("4");
      });

      await waitFor(() =>
        expect(serviceLogServices.updateServiceLog).toHaveBeenCalledWith(1, { ...editedPayload, maintenanceNeedId: 4 }),
      );
      await waitFor(() => expect(wrapper.text()).toContain("4"));
    });

    it("Admin user deletes a service log", async () => {
      signIn();
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValueOnce({ data: [oilLog] }).mockResolvedValue({ data: [] });
      await mountAppAt("/service-logs/3");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Delete service log"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Delete service log"]').click();
      await settle();
      await clickNamed("Delete");

      await waitFor(() => expect(serviceLogServices.removeServiceLog).toHaveBeenCalledWith(1));
      await expect(serviceLogServices.removeServiceLog.mock.results[0].value).resolves.toMatchObject({ status: 200 });
      await waitFor(() => {
        expect(document.body.textContent).toContain("No service logs yet. Create your first service log.");
      });
    });

    it("Admin user edits a service log serviced_at", async () => {
      const next = updatedLog({ servicedAt: "2026-08-01" });
      serviceLogServices.updateServiceLog.mockResolvedValue({ status: 200, data: next });
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValueOnce({ data: [oilLog] }).mockResolvedValue({ data: [next] });
      await editAndSave(async () => {
        await (await field("VTextField", "Serviced At")).setValue("2026-08-01");
      });

      await waitFor(() =>
        expect(serviceLogServices.updateServiceLog).toHaveBeenCalledWith(1, { ...editedPayload, servicedAt: "2026-08-01" }),
      );
      await waitFor(() => expect(wrapper.text()).toContain("2026-08-01"));
    });

    it("Admin user edits a service log serviced_at to after current date", async () => {
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [oilLog] });
      serviceLogServices.updateServiceLog.mockRejectedValue(
        apiError(400, "serviced_at cannot be after current date."),
      );
      await editAndSave(async () => {
        await (await field("VTextField", "Serviced At")).setValue("2099-01-01");
      });

      await waitFor(() => expect(serviceLogServices.updateServiceLog).toHaveBeenCalledTimes(1));
      expect(document.body.textContent).toContain("serviced_at cannot be after current date.");
    });

    it("Admin user edits a service log serviced_at to be empty", async () => {
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [oilLog] });
      await editAndSave(async () => {
        await (await field("VTextField", "Serviced At")).setValue("");
      });

      expect(serviceLogServices.updateServiceLog).not.toHaveBeenCalled();
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
