/**
 * Feature 9 — Mileage Log
 * Spec: features/feature-9-mileage-log.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import mileageLogServices from "../src/services/mileageLogServices.js";
import { signInAs, vuetify } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/mileageLogServices.js", () => ({
  default: {
    getMileageLogs: vi.fn(),
    getMileageLog: vi.fn(),
    createMileageLog: vi.fn(),
    updateMileageLog: vi.fn(),
    removeMileageLog: vi.fn(),
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

const janeLog = {
  id: 1,
  vehicleId: 3,
  userId: 2,
  odometerReading: 12050,
  recordedAt: "2026-10-23",
  user: { id: 2, firstName: "Jane", lastName: "Doe" },
  vehicle: { id: 3, universityId: "V-100" },
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

const signIn = (roles = signedInUser.roles) => {
  signInAs({ ...signedInUser, roles });
};

const namedButton = (text) =>
  [...document.body.querySelectorAll("button, a")].find((el) => el.textContent.trim() === text);

const textField = async (label) =>
  waitFor(() => {
    const field = wrapper
      .findAllComponents({ name: "VTextField" })
      .find((component) => component.props("label") === label);
    expect(field).toBeDefined();
    return field;
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
  await clickNamed("+ New Mileage Log");
  await waitFor(() => {
    expect(document.body.textContent).toContain("Odometer reading");
  });
};

const openEdit = async () => {
  await waitFor(() => expect(document.body.querySelector('[aria-label="Edit mileage log"]')).toBeTruthy());
  document.body.querySelector('[aria-label="Edit mileage log"]').click();
  await settle();
};

beforeEach(async () => {
  signInAs(null);
  vi.resetAllMocks();
  apiClient.get.mockResolvedValue({ data: { roles: signedInUser.roles } });
  mileageLogServices.getMileageLogs.mockResolvedValue({ data: [] });
  mileageLogServices.createMileageLog.mockResolvedValue({ status: 201, data: janeLog });
  mileageLogServices.updateMileageLog.mockResolvedValue({ status: 200, data: janeLog });
  mileageLogServices.removeMileageLog.mockResolvedValue({ status: 200, data: { message: "Mileage log deleted successfully." } });
  await router.push("/login");
  await router.isReady();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 9 — Mileage Log", () => {
  describe("US-9.1 — Create mileage logs", () => {
    it("Admin creates mileage log", async () => {
      signIn();
      await mountAppAt("/vehicles/3/mileage-logs");

      await openCreate();

      const fields = wrapper.findAllComponents({ name: "VTextField" });
      const labels = fields.map((field) => field.props("label"));
      const recordedDate = fields.find((field) => field.props("label") === "Recorded date");
      expect(labels).toContain("Odometer reading");
      expect(labels).toContain("Recorded date");
      expect(recordedDate.props("type")).toBe("date");
      expect(labels).not.toContain("Vehicle");
      expect(labels).not.toContain("User");
    });

    it("Admin saves mileage log", async () => {
      signIn();
      const saved = { status: 201, data: janeLog };
      mileageLogServices.createMileageLog.mockResolvedValue(saved);
      mileageLogServices.getMileageLogs.mockResolvedValueOnce({ data: [] }).mockResolvedValue({ data: [janeLog] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await openCreate();
      await (await textField("Odometer reading")).setValue("12050");
      await (await textField("Recorded date")).setValue("2026-10-23");
      await clickNamed("Create");

      await waitFor(() => expect(mileageLogServices.createMileageLog).toHaveBeenCalledTimes(1));
      expect(mileageLogServices.createMileageLog).toHaveBeenCalledWith({
        vehicleId: 3,
        odometerReading: 12050,
        recordedAt: "2026-10-23",
      });
      expect(saved.status).toBe(201);
      await waitFor(() => {
        expect(wrapper.text()).toContain("12050");
        expect(wrapper.text()).toContain("2026-10-23");
        expect(wrapper.text()).toContain("Jane Doe");
      });
    });

    it("Admin saves mileage log with an odometer reading of zero", async () => {
      signIn();
      const saved = { status: 201, data: { ...janeLog, odometerReading: 0 } };
      mileageLogServices.createMileageLog.mockResolvedValue(saved);
      await mountAppAt("/vehicles/3/mileage-logs");

      await openCreate();
      await (await textField("Odometer reading")).setValue("0");
      await (await textField("Recorded date")).setValue("2026-10-23");
      await clickNamed("Create");

      await waitFor(() => expect(mileageLogServices.createMileageLog).toHaveBeenCalledTimes(1));
      expect(mileageLogServices.createMileageLog).toHaveBeenCalledWith({
        vehicleId: 3,
        odometerReading: 0,
        recordedAt: "2026-10-23",
      });
      expect(saved.status).toBe(201);
      expect(saved.data.odometerReading).toBe(0);
    });

    it("Admin creates mileage log with missing odometer reading", async () => {
      signIn();
      await mountAppAt("/vehicles/3/mileage-logs");

      await openCreate();
      await (await textField("Recorded date")).setValue("2026-10-23");
      await clickNamed("Create");

      expect(mileageLogServices.createMileageLog).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin creates mileage log with missing recorded date", async () => {
      signIn();
      await mountAppAt("/vehicles/3/mileage-logs");

      await openCreate();
      await (await textField("Odometer reading")).setValue("12050");
      await clickNamed("Create");

      expect(mileageLogServices.createMileageLog).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin creates mileage log with a non-whole-number odometer reading", async () => {
      signIn();
      await mountAppAt("/vehicles/3/mileage-logs");

      await openCreate();
      await (await textField("Odometer reading")).setValue("12050.5");
      await (await textField("Recorded date")).setValue("2026-10-23");
      await clickNamed("Create");

      expect(mileageLogServices.createMileageLog).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Odometer reading must be a whole number.");
    });

    it("Admin creates mileage log with a negative odometer reading", async () => {
      signIn();
      await mountAppAt("/vehicles/3/mileage-logs");

      await openCreate();
      await (await textField("Odometer reading")).setValue("-1");
      await (await textField("Recorded date")).setValue("2026-10-23");
      await clickNamed("Create");

      expect(mileageLogServices.createMileageLog).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Odometer reading must be zero or greater.");
    });

    it("Admin creates mileage log with an invalid recorded date", async () => {
      signIn();
      await mountAppAt("/vehicles/3/mileage-logs");

      await openCreate();
      await (await textField("Odometer reading")).setValue("12050");
      await (await textField("Recorded date")).setValue("not-a-date");
      await clickNamed("Create");

      expect(mileageLogServices.createMileageLog).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Invalid recorded date.");
    });
  });

  describe("US-9.2 — View mileage logs", () => {
    it("Admin mileage logs view lists that vehicle's mileage logs", async () => {
      signIn();
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [janeLog] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await waitFor(() => {
        expect(wrapper.text()).toContain("V-100");
        expect(wrapper.text()).toContain("12050");
        expect(wrapper.text()).toContain("2026-10-23");
        expect(wrapper.text()).toContain("Jane Doe");
      });
      expect(wrapper.text()).not.toContain("800");
    });

    it("Admin mileage logs empty state", async () => {
      signIn();
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await waitFor(() => {
        expect(document.body.textContent).toContain("No mileage logs yet for this vehicle.");
      });
    });
  });

  describe("US-9.3 — Manage mileage log rows", () => {
    it("Admin mileage log rows have edit and delete actions", async () => {
      signIn();
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [janeLog] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await waitFor(() => {
        expect(document.body.querySelector('[aria-label="Edit mileage log"]')).toBeTruthy();
        expect(document.body.querySelector('[aria-label="Delete mileage log"]')).toBeTruthy();
      });
    });

    it("Area admin mileage log rows have edit and delete actions", async () => {
      signIn(areaAdminRoles);
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [janeLog] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await waitFor(() => {
        expect(document.body.querySelector('[aria-label="Edit mileage log"]')).toBeTruthy();
        expect(document.body.querySelector('[aria-label="Delete mileage log"]')).toBeTruthy();
      });
    });
  });

  describe("US-9.4 — Edit and delete mileage logs", () => {
    it("Admin edits a mileage log odometer reading", async () => {
      signIn();
      const saved = { status: 200, data: { ...janeLog, odometerReading: 12100 } };
      mileageLogServices.getMileageLogs
        .mockResolvedValueOnce({ data: [janeLog] })
        .mockResolvedValue({ data: [{ ...janeLog, odometerReading: 12100 }] });
      mileageLogServices.updateMileageLog.mockResolvedValue(saved);
      await mountAppAt("/vehicles/3/mileage-logs");

      await openEdit();
      await (await textField("Odometer reading")).setValue("12100");
      await clickNamed("Save");

      await waitFor(() => expect(mileageLogServices.updateMileageLog).toHaveBeenCalledTimes(1));
      expect(mileageLogServices.updateMileageLog).toHaveBeenCalledWith(1, {
        vehicleId: 3,
        odometerReading: 12100,
        recordedAt: "2026-10-23",
      });
      expect(saved.status).toBe(200);
      await waitFor(() => expect(wrapper.text()).toContain("12100"));
    });

    it("Admin edits a mileage log recorded date", async () => {
      signIn();
      const saved = { status: 200, data: { ...janeLog, recordedAt: "2026-10-24" } };
      mileageLogServices.getMileageLogs
        .mockResolvedValueOnce({ data: [janeLog] })
        .mockResolvedValue({ data: [{ ...janeLog, recordedAt: "2026-10-24" }] });
      mileageLogServices.updateMileageLog.mockResolvedValue(saved);
      await mountAppAt("/vehicles/3/mileage-logs");

      await openEdit();
      await (await textField("Recorded date")).setValue("2026-10-24");
      await clickNamed("Save");

      await waitFor(() => expect(mileageLogServices.updateMileageLog).toHaveBeenCalledTimes(1));
      expect(saved.status).toBe(200);
      await waitFor(() => expect(wrapper.text()).toContain("2026-10-24"));
    });

    it("Admin edits a mileage log to have a missing odometer reading", async () => {
      signIn();
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [janeLog] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await openEdit();
      await (await textField("Odometer reading")).setValue("");
      await clickNamed("Save");

      expect(mileageLogServices.updateMileageLog).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin edits a mileage log to have a missing recorded date", async () => {
      signIn();
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [janeLog] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await openEdit();
      await (await textField("Recorded date")).setValue("");
      await clickNamed("Save");

      expect(mileageLogServices.updateMileageLog).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin edits a mileage log to have a non-whole-number odometer reading", async () => {
      signIn();
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [janeLog] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await openEdit();
      await (await textField("Odometer reading")).setValue("12050.5");
      await clickNamed("Save");

      expect(mileageLogServices.updateMileageLog).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Odometer reading must be a whole number.");
    });

    it("Admin edits a mileage log to have a negative odometer reading", async () => {
      signIn();
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [janeLog] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await openEdit();
      await (await textField("Odometer reading")).setValue("-1");
      await clickNamed("Save");

      expect(mileageLogServices.updateMileageLog).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Odometer reading must be zero or greater.");
    });

    it("Admin edits a mileage log to have an invalid recorded date", async () => {
      signIn();
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [janeLog] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await openEdit();
      await (await textField("Recorded date")).setValue("not-a-date");
      await clickNamed("Save");

      expect(mileageLogServices.updateMileageLog).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Invalid recorded date.");
    });

    it("Admin deletes a mileage log", async () => {
      signIn();
      mileageLogServices.getMileageLogs.mockResolvedValueOnce({ data: [janeLog] }).mockResolvedValue({ data: [] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Delete mileage log"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Delete mileage log"]').click();
      await settle();
      await clickNamed("Delete");

      await waitFor(() => expect(mileageLogServices.removeMileageLog).toHaveBeenCalledWith(1));
      await expect(mileageLogServices.removeMileageLog.mock.results[0].value).resolves.toMatchObject({ status: 200 });
      await waitFor(() => {
        expect(document.body.textContent).toContain("No mileage logs yet for this vehicle.");
      });
    });
  });

  describe("US-9.5 — Session and role access", () => {
    it("Un-signed-in user accesses mileage logs page", async () => {
      await mountAppAt("/vehicles/3/mileage-logs");

      expect(router.currentRoute.value.path).toBe("/login");
    });
  });
});
