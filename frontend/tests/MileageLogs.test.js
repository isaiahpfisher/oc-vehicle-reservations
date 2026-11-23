/**
 * Feature 9 — Mileage Log
 * Spec: features/feature-9-mileage-log.md
 */
import { todayInput } from "../src/models/issueReports.js";
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

// UI/UX backlog #34: edit opens the same dialog as create.
const openEdit = async () => {
  await waitFor(() => expect(document.body.querySelector('[aria-label="Edit mileage log"]')).toBeTruthy());
  document.body.querySelector('[aria-label="Edit mileage log"]').click();
  await settle();
  await waitFor(() => expect(document.body.textContent).toContain("Edit mileage log"));
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

// UI/UX backlog #40/#55: readings and dates are shown formatted ("12,050 mi", "Oct 23, 2026"), so the
// assertions below look for those instead of the raw API values.
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

    // UI/UX backlog #30: pressing Enter in the dialog saves, like clicking Create.
    it("Admin saves mileage log by pressing Enter", async () => {
      signIn();
      mileageLogServices.createMileageLog.mockResolvedValue({ status: 201, data: janeLog });
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await openCreate();
      await (await textField("Odometer reading")).setValue("12050");
      const date = await textField("Recorded date");
      await date.setValue("2026-10-23");
      date.find("input").element.form.requestSubmit();
      await settle();

      await waitFor(() =>
        expect(mileageLogServices.createMileageLog).toHaveBeenCalledWith({ vehicleId: 3, odometerReading: 12050, recordedAt: "2026-10-23" }),
      );
    });

    // UI/UX backlog #29: a bad reading shows on its own field and blocks saving.
    it("Admin sees a non-number odometer reading on the field itself", async () => {
      signIn();
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await openCreate();
      const reading = await textField("Odometer reading");
      await reading.setValue("12.5");
      await (await textField("Recorded date")).setValue("2026-10-23");
      await clickNamed("Create");

      await waitFor(() => expect(reading.text()).toContain("Odometer reading must be a whole number."));
      expect(mileageLogServices.createMileageLog).not.toHaveBeenCalled();
    });

    // UI/UX backlog #31: once something's typed, clicking outside doesn't close the dialog (Cancel still does).
    it("Keeps the dialog open on an outside click once something is typed", async () => {
      signIn();
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await openCreate();
      const dialog = wrapper.findAllComponents({ name: "VDialog" }).find((item) => item.props("modelValue"));
      expect(dialog.props("persistent")).toBe(false);
      await (await textField("Odometer reading")).setValue("12050");
      await settle();
      expect(dialog.props("persistent")).toBe(true);
    });

    // UI/UX backlog #55: each reading's change from the previous one, and where the mileage stands now.
    it("Shows each reading's change and the current estimate", async () => {
      signIn();
      apiClient.get.mockImplementation(async (url) => {
        if (String(url).startsWith("users/")) return { data: { roles: JSON.parse(localStorage.getItem("user"))?.roles ?? [] } };
        if (url === "vehicles/3") {
          return {
            data: {
              id: 3,
              universityId: "V-100",
              condition: { mileage: { miles: 12400, reading: { odometerReading: 12050, recordedAt: "2026-10-23" }, tripMiles: 350, tripCount: 1, unknownTripCount: 0 } },
            },
          };
        }
        return { data: [] };
      });
      mileageLogServices.getMileageLogs.mockResolvedValue({
        data: [
          { id: 2, vehicleId: 3, odometerReading: 12050, recordedAt: "2026-10-23", user: null },
          { id: 1, vehicleId: 3, odometerReading: 11800, recordedAt: "2026-10-01", user: null },
        ],
      });
      await mountAppAt("/vehicles/3/mileage-logs");

      await waitFor(() => expect(document.body.querySelector('[data-test="mileage-estimate"]')?.textContent).toContain("12,400 mi"));
      const rows = [...document.body.querySelectorAll("tbody tr")].map((row) => row.textContent);
      expect(rows.find((row) => row.includes("12,050 mi"))).toContain("+250 mi");
      expect(rows.find((row) => row.includes("11,800 mi"))).toContain("First reading");

      // UI/UX backlog #57: a new reading's dialog shows the last one.
      await openCreate();
      await waitFor(() => expect(document.body.textContent).toContain("Last reading: 12,050 mi"));
    });

    // UI/UX backlog #39: the crumb and subtitle name the vehicle even before it has any logs.
    it("Names the vehicle in the breadcrumb when it has no logs", async () => {
      signIn();
      apiClient.get.mockImplementation(async (url) => {
        if (String(url).startsWith("users/")) return { data: { roles: JSON.parse(localStorage.getItem("user"))?.roles ?? [] } };
        if (url === "vehicles/3") return { data: { id: 3, universityId: "V-100", year: 2022, make: "Ford", model: "Transit" } };
        return { data: [] };
      });
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await waitFor(() => expect(document.body.querySelector(".v-breadcrumbs").textContent).toContain("V-100"));
      // The subtitle names the vehicle the way people know it.
      expect(document.body.textContent).toContain("V-100 · 2022 Ford Transit");
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
        expect(wrapper.text()).toContain("12,050 mi");
        expect(wrapper.text()).toContain("Oct 23, 2026");
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
      // UI/UX backlog #57: the date starts as today, so clear it to leave it missing.
      expect((await textField("Recorded date")).props("modelValue")).toBe(todayInput());
      await (await textField("Odometer reading")).setValue("12050");
      await (await textField("Recorded date")).setValue("");
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
        expect(wrapper.text()).toContain("12,050 mi");
        expect(wrapper.text()).toContain("Oct 23, 2026");
        expect(wrapper.text()).toContain("Jane Doe");
      });
      expect(wrapper.text()).not.toContain("800");
    });

    it("Admin mileage logs empty state", async () => {
      signIn();
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [] });
      await mountAppAt("/vehicles/3/mileage-logs");

      await waitFor(() => {
        expect(document.body.textContent).toContain("No mileage logged yet");
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
      await waitFor(() => expect(wrapper.text()).toContain("12,100 mi"));
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
      await waitFor(() => expect(wrapper.text()).toContain("Oct 24, 2026"));
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
        expect(document.body.textContent).toContain("No mileage logged yet");
      });
    });
  });

  // UI/UX backlog #56: a reading taken at a service visit says so, links to the service log, and can't be deleted here.
  describe("UI/UX backlog #56 — Readings from service visits", () => {
    it("labels each reading's source and only lets hand-entered readings be deleted", async () => {
      signIn();
      mileageLogServices.getMileageLogs.mockResolvedValue({
        data: [
          { ...janeLog, id: 2, odometerReading: 12500, recordedAt: "2026-10-30", services: ["Oil Change", "Tire Rotation"] },
          { ...janeLog, services: [] },
        ],
      });
      await mountAppAt("/vehicles/3/mileage-logs");

      await waitFor(() => expect(document.body.querySelector('[data-test="mileage-source-service"]')).toBeTruthy());
      const link = document.body.querySelector('[data-test="mileage-source-service"]');
      expect(link.textContent).toContain("Service: Oil Change, Tire Rotation");
      expect(link.getAttribute("href")).toBe("/service-logs/3");
      expect(document.body.textContent).toContain("Entered here");

      const deletes = [...document.body.querySelectorAll('[data-test="mileage-delete"]')];
      expect(deletes.map((button) => button.disabled)).toEqual([true, false]);
    });
  });

  // UI/UX backlog #34: every edit happens in a dialog, prefilled from the reading.
  describe("UI/UX backlog #34 — Edit readings in the dialog", () => {
    it("opens the dialog with the reading and shows the API's problem there", async () => {
      signIn();
      mileageLogServices.getMileageLogs.mockResolvedValue({ data: [janeLog] });
      mileageLogServices.updateMileageLog.mockRejectedValue(
        Object.assign(new Error("Bad"), {
          response: { status: 400, data: { message: "Odometer reading can't be lower than 12,000 mi, recorded Oct 1, 2026." } },
        }),
      );
      await mountAppAt("/vehicles/3/mileage-logs");

      await openEdit();
      expect((await textField("Odometer reading")).props("modelValue")).toBe("12050");
      expect((await textField("Recorded date")).props("modelValue")).toBe("2026-10-23");
      await (await textField("Odometer reading")).setValue("11000");
      await clickNamed("Save");

      await waitFor(() => expect(mileageLogServices.updateMileageLog).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(document.body.querySelector(".v-dialog.v-overlay--active").textContent).toContain(
          "Odometer reading can't be lower than 12,000 mi, recorded Oct 1, 2026.",
        ),
      );
    });
  });

  describe("US-9.5 — Session and role access", () => {
    it("Un-signed-in user accesses mileage logs page", async () => {
      await mountAppAt("/vehicles/3/mileage-logs");

      expect(router.currentRoute.value.path).toBe("/login");
    });
  });
});
