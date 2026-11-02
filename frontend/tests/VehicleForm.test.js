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

const field = async (name, label) =>
  waitFor(() => {
    const match = wrapper.findAllComponents({ name }).find((component) => component.props("label") === label);
    expect(match).toBeDefined();
    return match;
  });

const textField = (label) => field("VTextField", label);
const selectField = (label) => field("VSelect", label);

const identifierField = async () => {
  const match = await waitFor(() => {
    const found = wrapper
      .findAllComponents({ name: "VTextField" })
      .find((component) => ["VIN", "Serial"].includes(component.props("label")));
    expect(found).toBeDefined();
    return found;
  });
  return match;
};

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

const fill = async (overrides = {}) => {
  const values = { ...defaults, ...overrides };
  await (await selectField("Area")).setValue(values.areaId);
  await (await selectField("Vehicle Type")).setValue(values.vehicleTypeId);
  await (await textField("University Id")).setValue(values.universityId);
  await (await identifierField()).setValue(values.identifier);
  await (await textField("Make")).setValue(values.make);
  await (await textField("Model")).setValue(values.model);
  await (await textField("Year")).setValue(values.year);
  await (await textField("Color")).setValue(values.color);
  await (await textField("Passenger Capacity")).setValue(values.passengerCapacity);
  await (await textField("Purchase Date")).setValue(values.purchasedAt);
  await (await textField("License Plate")).setValue(values.licensePlate);
  await (await textField("License Plate Expiration Date")).setValue(values.licensePlateExpirationDate);
  await (await selectField("Status")).setValue(values.status);
  await settle();
};

const blocked = async (message) => {
  expect(document.body.textContent).toContain(message);
};

beforeEach(async () => {
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
    it("Admin user cancels vehicle edits", async () => {
      signIn();
      await mountAppAt("/vehicles/1");
      await (await textField("Color")).setValue("white");
      await clickNamed("Cancel");

      expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
      await waitFor(() => expect(router.currentRoute.value.path).toBe("/vehicles"));
    });

    for (const [title, overrides, key, expected] of editFields) {
      it(title, async () => {
        signIn();
        await mountAppAt("/vehicles/1");
        await fill(overrides);
        await clickNamed("Save");

        const response = await vehicleServices.updateVehicle.mock.results.at(-1).value;
        expect(response.status).toBe(200);
        expect(response.data[key]).toBe(expected);
        await waitFor(() => expect(router.currentRoute.value.path).toBe("/vehicles"));
      });
    }

    it("Admin user edits a vehicle type with identifier of 17 characters", async () => {
      signIn();
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [car, bus] });
      await mountAppAt("/vehicles/1");
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

      expect(await textField("VIN")).toBeDefined();
      await (await selectField("Vehicle Type")).setValue(1);
      await settle();
      expect(await textField("Serial")).toBeDefined();
    });

    for (const [title, overrides] of missingEdit) {
      it(title, async () => {
        signIn();
        await mountAppAt("/vehicles/1");
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
        await fill(overrides);
        await clickNamed("Save");

        expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
        await blocked("Required field.");
      });
    }

    it("Admin user edits a vehicle to have a whitespace only license plate", async () => {
      signIn();
      await mountAppAt("/vehicles/1");
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
      await fill({ vehicleTypeId: 2, identifier: "s".repeat(256) });
      await clickNamed("Save");

      expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
      await blocked("Serial number too long.");
    });

    it("Admin user edits a vehicle to have a non-unique university id", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle, otherVehicle] });
      await mountAppAt("/vehicles/1");
      await fill({ universityId: "TAKEN" });
      await clickNamed("Save");

      expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
      await blocked("University id already taken.");
    });

    it("Admin user edits a vehicle to have a non-unique identifier", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle, otherVehicle] });
      await mountAppAt("/vehicles/1");
      await fill({ identifier: "1HGCM82633A004353" });
      await clickNamed("Save");

      expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
      await blocked("Identifier already taken.");
    });

    it("Admin user edits a vehicle to have a non-unique license plate", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle, otherVehicle] });
      await mountAppAt("/vehicles/1");
      await fill({ licensePlate: "DEF456" });
      await clickNamed("Save");

      expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
      await blocked("License plate already taken.");
    });
  });
});
