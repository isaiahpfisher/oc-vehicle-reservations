/**
 * Feature 5 — Vehicles list, navigation, and access
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
const areaAdminRoles = [{ id: 3, role: "area_admin", areaId: 1, area: { id: 1, name: "Athletics" } }];
const maintenanceRoles = [{ id: 2, role: "maintenance", areaId: null, area: null }];

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

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const vehicle = {
  id: 1,
  areaId: 1,
  vehicleTypeId: 1,
  universityId: "ABCD12345EFG",
  make: "Toyota",
  model: "Sienna",
  year: 2015,
  identifier: "1HGCM82633A004352",
  purchasedAt: "2018-01-01",
  color: "gray",
  passengerCapacity: 8,
  licensePlate: "ABC123",
  licensePlateExpirationDate: null,
  status: "active",
};

let roles = adminRoles;
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

const signIn = (nextRoles = adminRoles) => {
  roles = nextRoles;
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

const expectVehicleFields = async () => {
  for (const label of ["Area", "Vehicle Type", "Status"]) {
    expect(await selectField(label)).toBeDefined();
  }
  for (const label of [
    "University Id",
    "Make",
    "Model",
    "Year",
    "Color",
    "Passenger Capacity",
    "Purchase Date",
    "License Plate",
    "License Plate Expiration Date",
  ]) {
    expect(await textField(label)).toBeDefined();
  }
  expect(await textField("VIN")).toBeDefined();
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
  vehicleServices.removeVehicle.mockResolvedValue({ status: 200, data: { message: "Vehicle deleted successfully." } });
  await router.push("/login");
  await router.isReady();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 5 — Vehicles", () => {
  describe("US-5.1 — Create vehicles", () => {
    const openCreate = async () => {
      const button = await waitFor(() => {
        const match = wrapper.findAllComponents({ name: "VBtn" }).find((component) => component.text().includes("+ New Vehicle"));
        expect(match).toBeDefined();
        return match;
      });
      await button.trigger("click");
      await waitFor(() => expect(router.currentRoute.value.path).toBe("/vehicles/new"));
    };

    it("Admin user creates a vehicle", async () => {
      signIn();
      await mountAppAt("/vehicles");
      await openCreate();
      await expectVehicleFields();
    });

    it("Area admin user creates a vehicle", async () => {
      signIn(areaAdminRoles);
      await mountAppAt("/vehicles");
      await openCreate();
      await expectVehicleFields();
      const area = await selectField("Area");
      expect(area.props("items")).toEqual([{ title: "Athletics", value: 1 }]);
    });
  });

  describe("US-5.2 — View vehicles", () => {
    it("Vehicles view lists vehicles for admin", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle] });
      await mountAppAt("/vehicles");

      await waitFor(() => {
        const row = document.body.querySelector(".v-data-table tbody tr");
        expect(row.textContent).toContain("Toyota");
        expect(row.textContent).toContain("Sienna");
        expect(row.textContent).toContain("gray");
        expect(row.textContent).toContain("active");
      });
    });

    it("Vehicles view lists vehicles for area admin", async () => {
      signIn(areaAdminRoles);
      vehicleServices.getVehicles.mockResolvedValue({
        data: [vehicle, { ...vehicle, id: 2, areaId: 2, make: "Honda", model: "Accord" }],
      });
      await mountAppAt("/vehicles");

      await waitFor(() => {
        const text = document.body.textContent;
        expect(text).toContain("Toyota");
        expect(text).toContain("Sienna");
        expect(text).not.toContain("Honda");
      });
    });

    it("Vehicles empty state", async () => {
      signIn();
      await mountAppAt("/vehicles");

      await waitFor(() => {
        expect(document.body.textContent).toContain("No vehicles yet. Create your first vehicle.");
      });
    });
  });

  describe("US-5.3 — Manage vehicle rows", () => {
    it("Vehicle rows have view and delete actions", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle] });
      await mountAppAt("/vehicles");

      await waitFor(() => {
        expect(document.body.querySelector('[aria-label="View vehicle"]')).toBeTruthy();
        expect(document.body.querySelector('[aria-label="Delete vehicle"]')).toBeTruthy();
      });
    });

    it("Vehicle rows with green chip", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({
        data: [
          vehicle,
          { ...vehicle, id: 2, make: "Honda", licensePlateExpirationDate: today() },
        ],
      });
      await mountAppAt("/vehicles");

      await waitFor(() => {
        expect(document.body.querySelectorAll(".vehicle-chip-green")).toHaveLength(2);
      });
    });

    it("Vehicle rows with yellow chip", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({
        data: [{ ...vehicle, licensePlateExpirationDate: "2000-01-01" }],
      });
      await mountAppAt("/vehicles");

      await waitFor(() => {
        expect(document.body.querySelector(".vehicle-chip-yellow")).toBeTruthy();
      });
    });

    it("Vehicle rows with red chip", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({
        data: [{ ...vehicle, status: "retired", licensePlateExpirationDate: "2000-01-01" }],
      });
      await mountAppAt("/vehicles");

      await waitFor(() => {
        expect(document.body.querySelector(".vehicle-chip-red")).toBeTruthy();
      });
    });
  });

  describe("US-5.4 — Edit and delete vehicles", () => {
    it("Admin user opens the vehicle page", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle] });
      await mountAppAt("/vehicles");

      await waitFor(() => expect(document.body.querySelector('[aria-label="View vehicle"]')).toBeTruthy());
      document.body.querySelector('[aria-label="View vehicle"]').click();
      await settle();

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/vehicles/1"));
      await expectVehicleFields();
    });

    it("Area admin user opens the vehicle page", async () => {
      signIn(areaAdminRoles);
      vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle] });
      await mountAppAt("/vehicles");

      await waitFor(() => expect(document.body.querySelector('[aria-label="View vehicle"]')).toBeTruthy());
      document.body.querySelector('[aria-label="View vehicle"]').click();
      await settle();

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/vehicles/1"));
      await expectVehicleFields();
      const area = await selectField("Area");
      expect(area.props("items")).toEqual([{ title: "Athletics", value: 1 }]);
    });

    it("Admin user deletes a vehicle", async () => {
      signIn();
      const response = { status: 200, data: { message: "Vehicle deleted successfully." } };
      vehicleServices.removeVehicle.mockResolvedValue(response);
      vehicleServices.getVehicles.mockResolvedValueOnce({ data: [vehicle] }).mockResolvedValue({ data: [] });
      await mountAppAt("/vehicles");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Delete vehicle"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Delete vehicle"]').click();
      await settle();
      await clickNamed("Delete");

      await waitFor(() => expect(vehicleServices.removeVehicle).toHaveBeenCalledWith(1));
      expect(response.status).toBe(200);
      await waitFor(() => {
        expect(document.body.textContent).toContain("No vehicles yet. Create your first vehicle.");
      });
    });
  });

  describe("US-5.5 — Access", () => {
    it("Un-signed-in user accesses vehicles page", async () => {
      await mountAppAt("/vehicles");
      expect(router.currentRoute.value.path).toBe("/login");
    });

    it("Un-signed-in user accesses the new vehicle page", async () => {
      await mountAppAt("/vehicles/new");
      expect(router.currentRoute.value.path).toBe("/login");
    });

    it("Un-signed-in user accesses a vehicle page", async () => {
      await mountAppAt("/vehicles/1");
      expect(router.currentRoute.value.path).toBe("/login");
    });

    it("Signed-in user without admin or area admin role accesses vehicles page", async () => {
      signIn(maintenanceRoles);
      await mountAppAt("/vehicles");
      expect(router.currentRoute.value.path).toBe("/");
    });

    it("Signed-in user without admin or area admin role accesses the new vehicle page", async () => {
      signIn(maintenanceRoles);
      await mountAppAt("/vehicles/new");
      expect(router.currentRoute.value.path).toBe("/");
    });

    it("Signed-in user without admin or area admin role accesses a vehicle page", async () => {
      signIn(maintenanceRoles);
      await mountAppAt("/vehicles/1");
      expect(router.currentRoute.value.path).toBe("/");
    });

    it("Area admin user accesses a vehicle outside their areas", async () => {
      signIn(areaAdminRoles);
      vehicleServices.getVehicle.mockResolvedValue({ data: { ...vehicle, id: 2, areaId: 2 } });
      await mountAppAt("/vehicles/2");

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/"));
    });
  });
});
