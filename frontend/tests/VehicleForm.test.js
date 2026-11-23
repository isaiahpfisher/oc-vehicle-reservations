/**
 * Feature 5 — Vehicle create and edit pages
 * Spec: features/feature-5-vehicles.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import areaServices from "../src/services/areaServices.js";
import vehicleServices from "../src/services/vehicleServices.js";
import vehicleTypeServices from "../src/services/vehicleTypeServices.js";
import { signInAs, vuetify } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/areaServices.js", () => ({
  default: { getAreas: vi.fn(), getAreaById: vi.fn(), createArea: vi.fn(), updateArea: vi.fn(), removeArea: vi.fn() },
}));

vi.mock("../src/services/vehicleTypeServices.js", () => ({
  default: {
    getVehicleTypes: vi.fn(),
    getVehicleTypeById: vi.fn(),
    createVehicleType: vi.fn(),
    updateVehicleType: vi.fn(),
    removeVehicleType: vi.fn(),
  },
}));

vi.mock("../src/services/vehicleServices.js", () => ({
  default: {
    getVehicles: vi.fn(),
    getVehicle: vi.fn(),
    createVehicle: vi.fn(),
    updateVehicle: vi.fn(),
    removeVehicle: vi.fn(),
  },
}));

const adminRoles = [{ id: 1, role: "admin", areaId: null, area: null }];
const signedInUser = {
  userId: 2,
  email: "jane@oc.edu",
  firstName: "Jane",
  lastName: "Doe",
  roles: adminRoles,
  token: "admin-token",
};

const areas = [
  { id: 1, name: "Athletics", logo: "" },
  { id: 2, name: "Maintenance", logo: "" },
];
const car = { id: 1, name: "Car", identifier: "VIN" };
const golf = { id: 2, name: "Golf Cart", identifier: "Serial" };
const bus = { id: 2, name: "Bus", identifier: "VIN" };
const golfFirst = { id: 1, name: "Golf Cart", identifier: "Serial" };

const vehicle = {
  id: 1,
  areaId: 1,
  vehicleTypeId: 1,
  universityId: "123456",
  make: "Toyota",
  model: "Sienna",
  year: 2015,
  identifier: "1HGCM82633A004352",
  purchasedAt: "2018-01-01",
  color: "gray",
  passengerCapacity: 4,
  licensePlate: "ABC123",
  licensePlateExpirationDate: "2027-09-01",
  status: "active",
};

const otherVehicle = {
  id: 2,
  areaId: 1,
  vehicleTypeId: 1,
  universityId: "TAKEN",
  make: "Honda",
  model: "Accord",
  year: 2016,
  identifier: "1HGCM82633A004353",
  licensePlate: "DEF456",
  status: "active",
};

let roles = adminRoles;
let wrapper;

const settle = async () => {
  for (let i = 0; i < 5; i += 1) await flushPromises();
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

const signIn = () => {
  roles = adminRoles;
  signInAs({ ...signedInUser, roles });
};

const namedButton = (text) =>
  [...document.body.querySelectorAll("button, a")].find((el) => el.textContent.trim() === text);

const clickNamed = async (text) => {
  const button = await waitFor(() => {
    const match = namedButton(text);
    expect(match).toBeDefined();
    return match;
  });
  button.click();
  await settle();
};

// An existing vehicle's page is read-only; its fields are in the "Edit details" dialog.
const openEditDialog = async () => {
  const button = await waitFor(() => {
    const match = document.body.querySelector('[data-test="edit-vehicle"]');
    expect(match).not.toBeNull();
    return match;
  });
  button.click();
  await settle();
  await waitFor(() => expect(document.body.querySelector('[data-test="edit-vehicle-dialog"]')).not.toBeNull());
};

const field = async (name, label) =>
  waitFor(() => {
    const match = wrapper.findAllComponents({ name }).find((component) => component.props("label") === label);
    expect(match).toBeDefined();
    return match;
  });

const textField = (label) => field("VTextField", label);
const selectField = (label) => field("VSelect", label);

const defaults = {
  areaId: 1,
  vehicleTypeId: 1,
  universityId: "ABCD12345EFG",
  identifier: "1HGCM82633A004352",
  make: "Toyota",
  model: "Sienna",
  year: "2015",
  color: "gray",
  passengerCapacity: "8",
  purchasedAt: "2018-01-01",
  licensePlate: "ABC123",
  licensePlateExpirationDate: "2027-09-01",
  status: "active",
};

/**
 * Every field of one kind, by label. `findAllComponents` wraps each match (and the wrapper listens for every DOM
 * event), so `fill` looks each kind up once instead of once per field.
 */
const fieldsByLabel = (name) => new Map(wrapper.findAllComponents({ name }).map((component) => [component.props("label"), component]));

const fill = async (overrides = {}) => {
  const values = { ...defaults, ...overrides };
  const selects = await waitFor(() => {
    const found = fieldsByLabel("VSelect");
    expect(found.has("Vehicle Type")).toBe(true);
    return found;
  });
  await selects.get("Area").setValue(values.areaId);
  await selects.get("Vehicle Type").setValue(values.vehicleTypeId);

  // The identifier is labelled VIN or Serial once a vehicle type is chosen, so text fields are found after that.
  const texts = await waitFor(() => {
    const found = fieldsByLabel("VTextField");
    expect(found.has("VIN") || found.has("Serial")).toBe(true);
    return found;
  });
  await texts.get("University Id").setValue(values.universityId);
  await (texts.get("VIN") ?? texts.get("Serial")).setValue(values.identifier);
  await texts.get("Make").setValue(values.make);
  await texts.get("Model").setValue(values.model);
  await texts.get("Year").setValue(values.year);
  await texts.get("Color").setValue(values.color);
  await texts.get("Passenger Capacity").setValue(values.passengerCapacity);
  await texts.get("Purchase Date").setValue(values.purchasedAt);
  await texts.get("License Plate").setValue(values.licensePlate);
  await texts.get("License Plate Expiration Date").setValue(values.licensePlateExpirationDate);
  await selects.get("Status").setValue(values.status);
  await settle();
};

const blocked = async (message) => {
  expect(document.body.textContent).toContain(message);
};

beforeEach(async () => {
  // The vehicle page remembers its last tab in this browser; every test starts without one.
  localStorage.removeItem("view:vehicle-work-tab");
  roles = adminRoles;
  signInAs(null);
  vi.resetAllMocks();
  apiClient.get.mockImplementation(async (url) => {
    if (String(url).startsWith("users/")) return { data: { roles } };
    return { data: [] };
  });
  areaServices.getAreas.mockResolvedValue({ data: areas });
  vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [car, golf] });
  vehicleServices.getVehicles.mockResolvedValue({ data: [] });
  vehicleServices.getVehicle.mockResolvedValue({ data: vehicle });
  vehicleServices.createVehicle.mockResolvedValue({ status: 201, data: { ...vehicle, make: "Toyota" } });
  vehicleServices.updateVehicle.mockImplementation(async (_id, body) => ({
    status: 200,
    data: { ...vehicle, ...body },
  }));
  await router.push("/login");
  await router.isReady();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

const missingCreate = [
  ["Admin user creates vehicle with missing area", { areaId: null }],
  ["Admin user creates vehicle with missing vehicle type", { vehicleTypeId: null }],
  ["Admin user creates vehicle with missing university id", { universityId: "" }],
  ["Admin user creates vehicle with missing identifier", { identifier: "" }],
  ["Admin user creates vehicle with missing make", { make: "" }],
  ["Admin user creates vehicle with missing model", { model: "" }],
  ["Admin user creates vehicle with missing year", { year: "" }],
  ["Admin user creates vehicle with missing purchase date", { purchasedAt: "" }],
  ["Admin user creates vehicle with missing color", { color: "" }],
  ["Admin user creates vehicle with missing passenger capacity", { passengerCapacity: "" }],
  ["Admin user creates vehicle with missing status", { status: null }],
];

const whitespaceCreate = [
  ["Admin user creates vehicle with a whitespace only university id", { universityId: " " }],
  ["Admin user creates vehicle with a whitespace only make", { make: " " }],
  ["Admin user creates vehicle with a whitespace only model", { model: " " }],
  ["Admin user creates vehicle with a whitespace only identifier", { identifier: " " }],
  ["Admin user creates vehicle with a whitespace only color", { color: " " }],
];

const tooLongCreate = [
  ["Admin user creates vehicle with university id longer than 255 characters", { universityId: "u".repeat(256) }, "University id too long."],
  ["Admin user creates vehicle with make longer than 255 characters", { make: "m".repeat(256) }, "Make too long."],
  ["Admin user creates vehicle with model longer than 255 characters", { model: "m".repeat(256) }, "Model too long."],
  ["Admin user creates vehicle with VIN identifier less than 17 characters", { identifier: "SHORT" }, "VIN must be 17 characters."],
  ["Admin user creates vehicle with VIN identifier more than 17 characters", { identifier: "1".repeat(18) }, "VIN must be 17 characters."],
  // UI/UX backlog: VIN characters and purchase date vs. model year (the API checks the same).
  ["Admin user creates vehicle with a VIN containing an O", { identifier: "1HGCM82633A0O4352" }, "VIN can only use letters and numbers, and never I, O, or Q."],
  ["Admin user creates vehicle with a VIN containing a dash", { identifier: "1HGCM82633-004352" }, "VIN can only use letters and numbers, and never I, O, or Q."],
  ["Admin user creates vehicle bought before the year before its model year", { year: 2015, purchasedAt: "2013-06-01" }, "Purchase date must be in 2014 or later for a 2015 vehicle."],
  ["Admin user creates vehicle with color longer than 255 characters", { color: "c".repeat(256) }, "Color too long."],
  ["Admin user creates vehicle with license plate longer than 8 characters", { licensePlate: "PLATE1234" }, "License plate too long."],
];

const missingEdit = [
  ["Admin user edits a vehicle to have a missing area", { areaId: null }],
  ["Admin user edits a vehicle to have a missing vehicle type", { vehicleTypeId: null }],
  ["Admin user edits a vehicle to have a missing university id", { universityId: "" }],
  ["Admin user edits a vehicle to have a missing identifier", { identifier: "" }],
  ["Admin user edits a vehicle to have a missing make", { make: "" }],
  ["Admin user edits a vehicle to have a missing model", { model: "" }],
  ["Admin user edits a vehicle to have a missing year", { year: "" }],
  ["Admin user edits a vehicle to have a missing purchase date", { purchasedAt: "" }],
  ["Admin user edits a vehicle to have a missing color", { color: "" }],
  ["Admin user edits a vehicle to have a missing passenger capacity", { passengerCapacity: "" }],
  ["Admin user edits a vehicle to have a missing status", { status: null }],
];

const whitespaceEdit = [
  ["Admin user edits a vehicle to have a whitespace only university id", { universityId: " " }],
  ["Admin user edits a vehicle to have a whitespace only make", { make: " " }],
  ["Admin user edits a vehicle to have a whitespace only model", { model: " " }],
  ["Admin user edits a vehicle to have a whitespace only identifier", { identifier: " " }],
  ["Admin user edits a vehicle to have a whitespace only color", { color: " " }],
];

const tooLongEdit = [
  ["Admin user edits a vehicle to have a university id longer than 255 characters", { universityId: "u".repeat(256) }, "University id too long."],
  ["Admin user edits a vehicle to have a make longer than 255 characters", { make: "m".repeat(256) }, "Make too long."],
  ["Admin user edits a vehicle to have a model longer than 255 characters", { model: "m".repeat(256) }, "Model too long."],
  ["Admin user edits a vehicle to have a VIN identifier less than 17 characters", { identifier: "SHORT" }, "VIN must be 17 characters."],
  ["Admin user edits a vehicle to have a VIN identifier more than 17 characters", { identifier: "1".repeat(18) }, "VIN must be 17 characters."],
  ["Admin user edits a vehicle to have a color longer than 255 characters", { color: "c".repeat(256) }, "Color too long."],
  ["Admin user edits a vehicle to have a license plate longer than 8 characters", { licensePlate: "PLATE1234" }, "License plate too long."],
];

const editFields = [
  ["Admin user edits a vehicle area", { areaId: 2 }, "areaId", 2],
  ["Admin user edits a vehicle university id", { universityId: "987654" }, "universityId", "987654"],
  ["Admin user edits a vehicle make", { make: "Honda" }, "make", "Honda"],
  ["Admin user edits a vehicle model", { model: "Accord" }, "model", "Accord"],
  ["Admin user edits a vehicle year", { year: "2016" }, "year", 2016],
  ["Admin user edits a vehicle identifier", { identifier: "1HGCM82633A004353" }, "identifier", "1HGCM82633A004353"],
  ["Admin user edits a vehicle purchase date", { purchasedAt: "2026-09-14" }, "purchasedAt", "2026-09-14"],
  ["Admin user edits a vehicle color", { color: "white" }, "color", "white"],
  ["Admin user edits a vehicle passenger capacity", { passengerCapacity: "8" }, "passengerCapacity", 8],
  ["Admin user edits a vehicle license plate", { licensePlate: "DEF456" }, "licensePlate", "DEF456"],
  ["Admin user edits a vehicle license plate expiration date", { licensePlateExpirationDate: "2026-09-14" }, "licensePlateExpirationDate", "2026-09-14"],
  ["Admin user edits a vehicle status", { status: "retired" }, "status", "retired"],
];

describe("Feature 5 — Vehicle form", () => {
  describe("US-5.1 — Create vehicles", () => {
    it("Year input accepts at most four characters", async () => {
      signIn();
      await mountAppAt("/vehicles/new");
      const year = await textField("Year");
      expect(year.props("type")).toBe("number");
      await year.setValue("12345");
      await settle();

      expect((await textField("Year")).props("modelValue")).toBe("1234");
    });

    it("Admin user saves vehicle", async () => {
      signIn();
      const created = { ...vehicle, id: 3, make: "Toyota", model: "Sienna", color: "gray", status: "active" };
      const response = { status: 201, data: created };
      let saved = false;
      vehicleServices.createVehicle.mockImplementation(async () => {
        saved = true;
        return response;
      });
      vehicleServices.getVehicles.mockImplementation(async () => ({ data: saved ? [created] : [] }));
      await mountAppAt("/vehicles/new");
      await fill();
      await clickNamed("Create");

      expect(response.status).toBe(201);
      expect(response.data.make).toBe("Toyota");
      await waitFor(() => expect(router.currentRoute.value.path).toBe("/vehicles"));
      await waitFor(() => expect(document.body.textContent).toContain("Toyota"));
    });

    it("Admin user selects vehicle type to be one with a serial number on create", async () => {
      signIn();
      await mountAppAt("/vehicles/new");
      expect(await textField("VIN")).toBeDefined();
      await (await selectField("Vehicle Type")).setValue(2);
      await settle();

      expect(await textField("Serial")).toBeDefined();
      await fill({ vehicleTypeId: 2, identifier: "ABC" });
      await clickNamed("Create");

      expect(vehicleServices.createVehicle).toHaveBeenCalled();
      expect(document.body.textContent).not.toContain("VIN must be 17 characters.");
    });

    for (const [title, overrides] of missingCreate) {
      it(title, async () => {
        signIn();
        await mountAppAt("/vehicles/new");
        await fill(overrides);
        await clickNamed("Create");

        expect(vehicleServices.createVehicle).not.toHaveBeenCalled();
        await blocked("Required field.");
      });
    }

    for (const [title, overrides] of whitespaceCreate) {
      it(title, async () => {
        signIn();
        await mountAppAt("/vehicles/new");
        await fill(overrides);
        await clickNamed("Create");

        expect(vehicleServices.createVehicle).not.toHaveBeenCalled();
        await blocked("Required field.");
      });
    }

    it("Admin user creates vehicle with a whitespace only license plate", async () => {
      signIn();
      const response = { status: 201, data: { ...vehicle, licensePlate: null } };
      vehicleServices.createVehicle.mockResolvedValue(response);
      await mountAppAt("/vehicles/new");
      await fill({ licensePlate: " " });
      await clickNamed("Create");

      expect(vehicleServices.createVehicle).toHaveBeenCalledWith(expect.objectContaining({ licensePlate: null }));
      expect(response.data.licensePlate).toBeNull();
    });

    // UI/UX backlog #29: each problem shows on its own field, and fixing the field clears it.
    it("Admin user sees each vehicle problem on its own field", async () => {
      signIn();
      await mountAppAt("/vehicles/new");
      await fill({ make: "", identifier: "SHORT" });
      await clickNamed("Create");

      const make = await textField("Make");
      const vin = await textField("VIN");
      const messages = (field) => [field.props("errorMessages")].flat().filter(Boolean);
      await waitFor(() => expect(messages(make)).toEqual(["Required field."]));
      expect(messages(vin)).toEqual(["VIN must be 17 characters."]);
      expect(messages(await textField("Model"))).toEqual([]);
      expect(vehicleServices.createVehicle).not.toHaveBeenCalled();

      await make.setValue("Toyota");
      await settle();
      expect(messages(make)).toEqual([]);
      expect(messages(vin)).toEqual(["VIN must be 17 characters."]);
    });

    // UI/UX backlog #19: the optional starting odometer goes to the API, which logs it as the first reading.
    it("Admin user creates a vehicle with a starting odometer reading", async () => {
      signIn();
      vehicleServices.createVehicle.mockResolvedValue({ status: 201, data: vehicle });
      await mountAppAt("/vehicles/new");
      await fill();
      await (await textField("Current odometer")).setValue("45210");
      await clickNamed("Create");

      expect(vehicleServices.createVehicle).toHaveBeenCalledWith(expect.objectContaining({ odometerReading: "45210" }));
    });

    it("Admin user creates a vehicle with a starting odometer that isn't a whole number", async () => {
      signIn();
      await mountAppAt("/vehicles/new");
      await fill();
      await (await textField("Current odometer")).setValue("12.5");
      await clickNamed("Create");

      expect(vehicleServices.createVehicle).not.toHaveBeenCalled();
      await blocked("Starting odometer reading must be a whole number of 0 or more.");
    });

    it("The starting odometer only appears when creating", async () => {
      signIn();
      await mountAppAt("/vehicles/1");
      await openEditDialog();
      await waitFor(() => expect(namedButton("Save")).toBeDefined());

      expect(document.body.querySelector('[data-test="starting-odometer"]')).toBeNull();
    });

    for (const [title, overrides, message] of tooLongCreate) {
      it(title, async () => {
        signIn();
        await mountAppAt("/vehicles/new");
        await fill(overrides);
        await clickNamed("Create");

        expect(vehicleServices.createVehicle).not.toHaveBeenCalled();
        await blocked(message);
      });
    }

    it("Admin user creates vehicle with serial identifier longer than 255 characters", async () => {
      signIn();
      await mountAppAt("/vehicles/new");
      await fill({ vehicleTypeId: 2, identifier: "s".repeat(256) });
      await clickNamed("Create");

      expect(vehicleServices.createVehicle).not.toHaveBeenCalled();
      await blocked("Serial number too long.");
    });

    it("Admin user creates a vehicle with a non-unique university id", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({ data: [otherVehicle] });
      await mountAppAt("/vehicles/new");
      await fill({ universityId: "TAKEN" });
      await clickNamed("Create");

      expect(vehicleServices.createVehicle).not.toHaveBeenCalled();
      await blocked("University id already taken.");
    });

    it("Admin user creates a vehicle with a non-unique identifier", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({ data: [otherVehicle] });
      await mountAppAt("/vehicles/new");
      await fill({ identifier: "1HGCM82633A004353" });
      await clickNamed("Create");

      expect(vehicleServices.createVehicle).not.toHaveBeenCalled();
      await blocked("Identifier already taken.");
    });

    it("Admin user creates a vehicle with a non-unique license plate", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({ data: [otherVehicle] });
      await mountAppAt("/vehicles/new");
      await fill({ licensePlate: "DEF456" });
      await clickNamed("Create");

      expect(vehicleServices.createVehicle).not.toHaveBeenCalled();
      await blocked("License plate already taken.");
    });
  });

  describe("US-5.4 — Edit vehicles", () => {
    // Your call: the vehicle page reads as a dashboard (a Details card); editing happens in a dialog that stays on it.
    it("The vehicle page shows details as text and edits them in a dialog that stays on the page", async () => {
      signIn();
      vehicleServices.getVehicle.mockResolvedValueOnce({ data: vehicle }).mockResolvedValue({ data: { ...vehicle, color: "white" } });
      await mountAppAt("/vehicles/1");

      const details = await waitFor(() => {
        const match = document.body.querySelector('[data-test="vehicle-details"]');
        expect(match?.textContent).toContain("gray");
        return match;
      });
      expect(details.textContent).toContain("ABC123");
      expect(wrapper.findAllComponents({ name: "VTextField" }).some((component) => component.props("label") === "Make")).toBe(false);

      await openEditDialog();
      expect((await textField("Make")).props("modelValue")).toBe("Toyota");
      await (await textField("Color")).setValue("white");
      await clickNamed("Save");

      await waitFor(() => expect(vehicleServices.updateVehicle).toHaveBeenCalledWith("1", expect.objectContaining({ color: "white" })));
      await waitFor(() => expect(document.body.querySelector('.v-overlay--active [data-test="edit-vehicle-dialog"]')).toBeNull());
      expect(router.currentRoute.value.path).toBe("/vehicles/1");
      await waitFor(() => expect(document.body.querySelector('[data-test="vehicle-details"]').textContent).toContain("white"));
    });

    it("People who can't edit the vehicle get the details without an Edit button", async () => {
      roles = [{ id: 2, role: "maintenance", areaId: null, area: null }];
      signInAs({ ...signedInUser, roles });
      await mountAppAt("/vehicles/1");

      await waitFor(() => expect(document.body.querySelector('[data-test="vehicle-details"]')).not.toBeNull());
      expect(document.body.querySelector('[data-test="edit-vehicle"]')).toBeNull();
    });

    // UI/UX backlog #18: report a problem or plan work straight from the vehicle; the forms start with it filled in.
    it("Vehicle page links to a new issue report and a new maintenance need for that vehicle", async () => {
      signIn();
      await mountAppAt("/vehicles/1");

      const link = (id) => waitFor(() => {
        const element = document.body.querySelector(`[data-test="${id}"]`);
        expect(element).not.toBeNull();
        return element;
      });
      expect((await link("vehicle-report-issue")).getAttribute("href")).toBe("/issue-reports/new?vehicleId=1");
      expect((await link("vehicle-new-need")).getAttribute("href")).toBe("/maintenance-needs/new?vehicleId=1");
    });

    // UI/UX backlog #20: the vehicle page shows its maintenance needs, open issue reports, and recent trips.
    it("Vehicle page shows its maintenance needs, open issue reports, and recent trips", async () => {
      signIn();
      apiClient.get.mockImplementation(async (url, config) => {
        if (String(url).startsWith("users/")) return { data: { roles } };
        if (url === "maintenance-needs") {
          return {
            data: [
              { id: 1, vehicleId: 1, title: "Done long ago", status: "Completed", priority: "Low", createdAt: "2026-01-01T00:00:00Z" },
              { id: 2, vehicleId: 1, title: "Wipers", status: "Open", priority: "High", createdAt: "2026-02-01T00:00:00Z" },
              { id: 3, vehicleId: 9, title: "Another vehicle", status: "Open", priority: "High", createdAt: "2026-02-01T00:00:00Z" },
            ],
          };
        }
        if (url === "issue-reports") {
          expect(config.params).toEqual({ vehicleId: "1" });
          return {
            data: [
              { id: 5, vehicleId: 1, type: "dirty", status: "pending", description: "Mud inside", createdAt: "2026-02-03T00:00:00Z" },
              { id: 6, vehicleId: 1, type: "dirty", status: "resolved", description: "Old mess", createdAt: "2026-01-03T00:00:00Z" },
            ],
          };
        }
        return { data: [] };
      });
      vehicleServices.getVehicle.mockResolvedValue({
        data: {
          ...vehicle,
          recentTrips: [
            { id: 7, purpose: "Away game", allDay: true, startAt: "2026-10-01", endAt: "2026-10-02", status: "returned", area: { id: 1, name: "Athletics" } },
          ],
        },
      });
      await mountAppAt("/vehicles/1");

      const card = await waitFor(() => {
        const element = document.body.querySelector('[data-test="vehicle-work"]');
        expect(element?.textContent).toContain("Wipers");
        return element;
      });
      // UI/UX backlog #20: service visits and mileage are tabs here too; with open needs, it starts on those.
      const tabs = [...card.querySelectorAll('[data-test^="vehicle-work-tab-"]')].map((tab) => tab.dataset.test.replace("vehicle-work-tab-", ""));
      expect(tabs).toEqual(["service", "mileage", "needs", "issues", "trips"]);
      expect(card.querySelector('[data-test="vehicle-work-tab-needs"]').getAttribute("aria-selected")).toBe("true");
      // Open first; other vehicles left out.
      expect(card.textContent.indexOf("Wipers")).toBeLessThan(card.textContent.indexOf("Done long ago"));
      expect(card.textContent).not.toContain("Another vehicle");

      card.querySelector('[data-test="vehicle-work-tab-issues"]').click();
      await settle();
      await waitFor(() => expect(card.textContent).toContain("Mud inside"));
      expect(card.textContent).not.toContain("Old mess");

      card.querySelector('[data-test="vehicle-work-tab-trips"]').click();
      await settle();
      await waitFor(() => expect(card.textContent).toContain("Away game"));
      // The last tab picked is where the next vehicle page opens.
      expect(localStorage.getItem("view:vehicle-work-tab")).toBe("trips");
    });

    it("The vehicle page opens on the tab last picked", async () => {
      localStorage.setItem("view:vehicle-work-tab", "mileage");
      signIn();
      await mountAppAt("/vehicles/1");

      await waitFor(() => expect(document.body.querySelector('[data-test="vehicle-work-tab-mileage"]')?.getAttribute("aria-selected")).toBe("true"));
      expect(document.body.querySelector('[data-test="recent-mileage-logs"]')).not.toBeNull();
    });

    it("Maintenance-only users get New maintenance need but not Report an issue", async () => {
      roles = [{ id: 2, role: "maintenance", areaId: null, area: null }];
      signInAs({ ...signedInUser, roles });
      await mountAppAt("/vehicles/1");

      await waitFor(() => expect(document.body.querySelector('[data-test="vehicle-new-need"]')).not.toBeNull());
      expect(document.body.querySelector('[data-test="vehicle-report-issue"]')).toBeNull();
    });

    // The dialog's Cancel closes it and keeps you on the vehicle's page.
    it("Admin user cancels vehicle edits", async () => {
      signIn();
      await mountAppAt("/vehicles/1");
      await openEditDialog();
      await (await textField("Color")).setValue("white");
      await clickNamed("Cancel");

      expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
      await waitFor(() => expect(router.currentRoute.value.path).toBe("/vehicles/1"));
    });

    for (const [title, overrides, key, expected] of editFields) {
      it(title, async () => {
        signIn();
        await mountAppAt("/vehicles/1");
      await openEditDialog();
        await fill(overrides);
        await clickNamed("Save");

        const response = await vehicleServices.updateVehicle.mock.results.at(-1).value;
        expect(response.status).toBe(200);
        expect(response.data[key]).toBe(expected);
        await waitFor(() => expect(router.currentRoute.value.path).toBe("/vehicles/1"));
      });
    }

    it("Admin user edits a vehicle type with identifier of 17 characters", async () => {
      signIn();
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [car, bus] });
      await mountAppAt("/vehicles/1");
      await openEditDialog();
      await fill({ vehicleTypeId: 2 });
      await clickNamed("Save");

      const response = await vehicleServices.updateVehicle.mock.results.at(-1).value;
      expect(response.status).toBe(200);
      expect(response.data.vehicleTypeId).toBe(2);
    });

    it("Admin user edits a vehicle type with identifier other than 17 characters while current vehicle type has identifier Serial", async () => {
      signIn();
      vehicleServices.getVehicle.mockResolvedValue({
        data: { ...vehicle, vehicleTypeId: 1, identifier: "SHORT" },
      });
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [golfFirst, bus] });
      await mountAppAt("/vehicles/1");
      await openEditDialog();
      await (await selectField("Vehicle Type")).setValue(2);
      await clickNamed("Save");

      expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
      await blocked("VIN must be 17 characters.");
    });

    it("Admin user selects vehicle type to be one with a VIN number", async () => {
      signIn();
      vehicleServices.getVehicle.mockResolvedValue({ data: { ...vehicle, vehicleTypeId: 1 } });
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [golfFirst, bus] });
      await mountAppAt("/vehicles/1");
      await openEditDialog();

      expect(await textField("Serial")).toBeDefined();
      await (await selectField("Vehicle Type")).setValue(2);
      await settle();
      expect(await textField("VIN")).toBeDefined();
    });

    it("Admin user selects vehicle type to be one with a serial number on edit", async () => {
      signIn();
      vehicleServices.getVehicle.mockResolvedValue({ data: { ...vehicle, vehicleTypeId: 2 } });
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [golfFirst, bus] });
      await mountAppAt("/vehicles/1");
      await openEditDialog();

      expect(await textField("VIN")).toBeDefined();
      await (await selectField("Vehicle Type")).setValue(1);
      await settle();
      expect(await textField("Serial")).toBeDefined();
    });

    for (const [title, overrides] of missingEdit) {
      it(title, async () => {
        signIn();
        await mountAppAt("/vehicles/1");
      await openEditDialog();
        await fill(overrides);
        await clickNamed("Save");

        expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
        await blocked("Required field.");
      });
    }

    for (const [title, overrides] of whitespaceEdit) {
      it(title, async () => {
        signIn();
        await mountAppAt("/vehicles/1");
      await openEditDialog();
        await fill(overrides);
        await clickNamed("Save");

        expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
        await blocked("Required field.");
      });
    }

    it("Admin user edits a vehicle to have a whitespace only license plate", async () => {
      signIn();
      await mountAppAt("/vehicles/1");
      await openEditDialog();
      await fill({ licensePlate: " " });
      await clickNamed("Save");

      const response = await vehicleServices.updateVehicle.mock.results.at(-1).value;
      expect(vehicleServices.updateVehicle).toHaveBeenCalledWith("1", expect.objectContaining({ licensePlate: null }));
      expect(response.status).toBe(200);
      expect(response.data.licensePlate).toBeNull();
    });

    for (const [title, overrides, message] of tooLongEdit) {
      it(title, async () => {
        signIn();
        await mountAppAt("/vehicles/1");
      await openEditDialog();
        await fill(overrides);
        await clickNamed("Save");

        expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
        await blocked(message);
      });
    }

    it("Admin user edits a vehicle to have a serial identifier longer than 255 characters", async () => {
      signIn();
      vehicleServices.getVehicle.mockResolvedValue({ data: { ...vehicle, vehicleTypeId: 2 } });
      await mountAppAt("/vehicles/1");
      await openEditDialog();
      await fill({ vehicleTypeId: 2, identifier: "s".repeat(256) });
      await clickNamed("Save");

      expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
      await blocked("Serial number too long.");
    });

    it("Admin user edits a vehicle to have a non-unique university id", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle, otherVehicle] });
      await mountAppAt("/vehicles/1");
      await openEditDialog();
      await fill({ universityId: "TAKEN" });
      await clickNamed("Save");

      expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
      await blocked("University id already taken.");
    });

    it("Admin user edits a vehicle to have a non-unique identifier", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle, otherVehicle] });
      await mountAppAt("/vehicles/1");
      await openEditDialog();
      await fill({ identifier: "1HGCM82633A004353" });
      await clickNamed("Save");

      expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
      await blocked("Identifier already taken.");
    });

    it("Admin user edits a vehicle to have a non-unique license plate", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle, otherVehicle] });
      await mountAppAt("/vehicles/1");
      await openEditDialog();
      await fill({ licensePlate: "DEF456" });
      await clickNamed("Save");

      expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
      await blocked("License plate already taken.");
    });
  });
});
