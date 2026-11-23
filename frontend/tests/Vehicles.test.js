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
import { chooseMoreAction, signInAs, vuetify } from "./testUtils.js";

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
const requesterRoles = [];

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
  // Feature 18: the list shows the status the API works out (FR-002).
  condition: {
    status: "available",
    reasons: [],
    mileage: { miles: 0, reading: null, tripMiles: 0, tripCount: 0, unknownTripCount: 0 },
    services: [],
    outOfServiceNeeds: [],
  },
  upcomingTrips: [],
};

const withStatus = (status, overrides = {}) => ({ ...vehicle, ...overrides, condition: { ...vehicle.condition, status } });

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

const navLabels = () =>
  [...document.body.querySelectorAll('[aria-label="Main navigation"] a')].map((link) => link.textContent.trim());

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
        // Feature 18 (US-18.1): the six statuses replace `active` / `retired`.
        expect(row.textContent).toContain("Available");
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

    // UI/UX backlog #46: the empty state offers to create a vehicle only to people who can.
    it("Vehicles empty state offers to create a vehicle, but not to maintenance", async () => {
      signIn();
      await mountAppAt("/vehicles");
      const emptyState = () => document.body.querySelector('[data-test="list-empty"]');
      await waitFor(() => expect(emptyState()?.textContent).toContain("+ New Vehicle"));
      expect(emptyState().textContent).toContain("Add a vehicle and it's ready to assign to trips.");
      wrapper.unmount();
      document.body.innerHTML = "";

      roles = [{ id: 3, role: "maintenance", areaId: null, area: null }];
      signInAs({ ...signedInUser, roles });
      await mountAppAt("/vehicles");
      await waitFor(() => expect(emptyState()?.textContent).toContain("Vehicles in your areas will show here."));
      expect(emptyState().textContent).not.toContain("+ New Vehicle");
    });

    it("Vehicles empty state", async () => {
      signIn();
      await mountAppAt("/vehicles");

      await waitFor(() => {
        expect(document.body.textContent).toContain("No vehicles yet");
      });
    });
  });

  describe("US-5.3 — Manage vehicle rows", () => {
    // UI/UX backlog #36: rows keep edit; delete moved to the vehicle page's ⋮ menu.
    it("Vehicle rows have an edit action, and no delete", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle] });
      await mountAppAt("/vehicles");

      await waitFor(() => {
        expect(document.body.querySelector('[aria-label="Edit vehicle"]')).toBeTruthy();
        expect(document.body.querySelector('[aria-label="Delete vehicle"]')).toBeNull();
        // UI/UX backlog #35/#37: the University ID leads the row and opens the vehicle.
        expect(document.body.querySelector(`tbody a[href="/vehicles/${vehicle.id}"]`)?.textContent.trim()).toBe(vehicle.universityId);
      });
    });

    // Feature 18 (US-18.1): green / yellow / red become the six statuses' colors (success / warning / error).
    const chips = (color) => document.body.querySelectorAll(`.vehicle-status-chip.text-${color}`);

    it("Vehicle rows with green chip", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({
        data: [withStatus("available", { licensePlateExpirationDate: today() }), withStatus("available", { id: 2, make: "Honda" })],
      });
      await mountAppAt("/vehicles");

      await waitFor(() => {
        expect(chips("success")).toHaveLength(2);
        expect(chips("success")[0].textContent).toContain("Available");
      });
    });

    it("Vehicle rows with yellow chip", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({
        data: [
          withStatus("service_due_soon"),
          withStatus("plate_expired", { id: 2, make: "Honda", licensePlateExpirationDate: "2000-01-01" }),
        ],
      });
      await mountAppAt("/vehicles");

      await waitFor(() => {
        expect(chips("warning")).toHaveLength(2);
        expect(document.body.textContent).toContain("Plate Expired");
      });
    });

    // A plate that runs out within 30 days needs renewing before it lapses, so it's flagged and counted.
    it("A plate expiring soon gets a yellow chip and counts as needing attention", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({
        data: [withStatus("plate_expiring", { licensePlateExpirationDate: "2099-01-01" }), withStatus("available", { id: 2, make: "Honda" })],
      });
      await mountAppAt("/vehicles");

      await waitFor(() => expect(document.body.textContent).toContain("Plate Expiring"));
      expect(chips("warning")).toHaveLength(1);
      const attention = document.body.querySelector('[data-test="needs-attention"]');
      expect(attention.textContent).toContain("1");
      attention.click();
      await settle();
      await waitFor(() => expect(document.body.querySelectorAll(".v-data-table tbody tr")).toHaveLength(1));
      expect(document.body.querySelector(".v-data-table tbody").textContent).toContain("Plate Expiring");
    });

    it("Vehicle rows with red chip", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({
        data: [withStatus("out_of_service"), withStatus("service_overdue", { id: 2, make: "Honda" })],
      });
      await mountAppAt("/vehicles");

      await waitFor(() => {
        expect(chips("error")).toHaveLength(2);
        expect(document.body.textContent).toContain("Out of Service");
      });
    });
  });

  describe("US-5.4 — Edit and delete vehicles", () => {
    it("Admin user opens the vehicle page", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle] });
      await mountAppAt("/vehicles");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Edit vehicle"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Edit vehicle"]').click();
      await settle();

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/vehicles/1"));
      // The page shows the details; their fields are in the "Edit details" dialog.
      await waitFor(() => expect(document.body.querySelector('[data-test="vehicle-details"]')).not.toBeNull());
      document.body.querySelector('[data-test="edit-vehicle"]').click();
      await settle();
      await expectVehicleFields();
    });

    it("Area admin user opens the vehicle page", async () => {
      signIn(areaAdminRoles);
      vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle] });
      await mountAppAt("/vehicles");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Edit vehicle"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Edit vehicle"]').click();
      await settle();

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/vehicles/1"));
      // The page shows the details; their fields are in the "Edit details" dialog.
      await waitFor(() => expect(document.body.querySelector('[data-test="vehicle-details"]')).not.toBeNull());
      document.body.querySelector('[data-test="edit-vehicle"]').click();
      await settle();
      await expectVehicleFields();
      const area = await selectField("Area");
      expect(area.props("items")).toEqual([{ title: "Athletics", value: 1 }]);
    });

    // UI/UX backlog #36: from the vehicle page's ⋮ menu, then back to the list.
    it("Admin user deletes a vehicle", async () => {
      signIn();
      const response = { status: 200, data: { message: "Vehicle deleted successfully." } };
      vehicleServices.removeVehicle.mockResolvedValue(response);
      vehicleServices.getVehicles.mockResolvedValue({ data: [] });
      await mountAppAt(`/vehicles/${vehicle.id}`);

      await chooseMoreAction("delete-vehicle");
      await clickNamed("Delete");

      await waitFor(() => expect(vehicleServices.removeVehicle).toHaveBeenCalledWith("1"));
      expect(response.status).toBe(200);
      await waitFor(() => {
        expect(router.currentRoute.value.name).toBe("vehicles");
        expect(document.body.textContent).toContain("No vehicles yet");
      });
      // UI/UX backlog #48: the app-wide toast says it happened.
      await waitFor(() => expect(document.body.querySelector('[data-test="app-notice"]')?.textContent).toContain("Vehicle deleted."));
    });
  });

  // An area's card on the Areas page links to `/vehicles?area=<name>`, which starts the list filtered to that area.
  describe("Areas link — vehicles filtered by area", () => {
    it("starts filtered to the area in the link, with the filter shown", async () => {
      signIn();
      vehicleServices.getVehicles.mockResolvedValue({
        data: [vehicle, { ...vehicle, id: 2, areaId: areas[1].id, universityId: "V-200" }],
      });
      await mountAppAt(`/vehicles?area=${encodeURIComponent(areas[1].name)}`);

      await waitFor(() => {
        const ids = [...document.body.querySelectorAll("tbody tr")].map((row) => row.textContent);
        expect(ids).toHaveLength(1);
        expect(ids[0]).toContain("V-200");
      });
      const areaFilter = wrapper.findAllComponents({ name: "VSelect" }).find((field) => field.props("label") === "Area");
      expect(areaFilter.props("modelValue")).toBe(areas[1].name);
      // The panel stays closed; the Filters button's count says one is on.
      expect(document.body.querySelector('[data-test="toggle-filters"]').getAttribute("aria-expanded")).toBe("false");
      expect(document.body.querySelector('[data-test="toggle-filters"]').textContent).toContain("1");
    });
  });

  // Service Types links its "overdue" counts here as `?service=<name>&due=overdue`.
  describe("Service Types link — vehicles due for a service", () => {
    it("lists only the vehicles due for that service, with a chip to clear it", async () => {
      signIn();
      const oil = (state) => ({ ...vehicle.condition, services: [{ serviceType: { id: 1, name: "Oil Change" }, state }] });
      vehicleServices.getVehicles.mockResolvedValue({
        data: [
          { ...vehicle, condition: oil("overdue") },
          { ...vehicle, id: 2, universityId: "V-200", condition: oil("ok") },
          { ...vehicle, id: 3, universityId: "V-300", status: "retired", condition: oil("overdue") },
        ],
      });
      await mountAppAt("/vehicles?service=Oil%20Change&due=overdue");

      await waitFor(() => expect(document.body.querySelectorAll("tbody tr")).toHaveLength(1));
      expect(document.body.querySelector("tbody tr").textContent).toContain(vehicle.universityId);
      const chip = document.body.querySelector('[data-test="service-due-filter"]');
      expect(chip.textContent).toContain("Overdue: Oil Change");

      chip.querySelector("button, .v-chip__close").click();
      await settle();
      await waitFor(() => expect(document.body.querySelectorAll("tbody tr")).toHaveLength(3));
      await waitFor(() => expect(router.currentRoute.value.query.service).toBeUndefined());
    });
  });

  describe("US-5.5 — Access", () => {
    it("Signed-in admin user sees nav link", async () => {
      signIn();
      await mountAppAt("/");

      await waitFor(() => expect(navLabels()).toContain("Vehicles"));
    });

    it("Signed-in area admin user sees nav link", async () => {
      signIn(areaAdminRoles);
      await mountAppAt("/");

      await waitFor(() => expect(navLabels()).toContain("Vehicles"));
    });

    const clickVehiclesLink = async () => {
      const item = await waitFor(() => {
        const match = wrapper.findAllComponents({ name: "VListItem" }).find((component) => component.props("title") === "Vehicles");
        expect(match).toBeDefined();
        return match;
      });
      await item.trigger("click");
      await waitFor(() => expect(router.currentRoute.value.path).toBe("/vehicles"));
    };

    it("Signed-in admin user clicks on nav link", async () => {
      signIn();
      await mountAppAt("/");
      await clickVehiclesLink();
    });

    it("Signed-in area admin user clicks on nav link", async () => {
      signIn(areaAdminRoles);
      await mountAppAt("/");
      await clickVehiclesLink();
    });

    it("Signed-in user without admin or area admin role does not see nav link", async () => {
      signIn(requesterRoles);
      await mountAppAt("/");

      await waitFor(() => expect(navLabels()).not.toContain("Vehicles"));
    });

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
      signIn(requesterRoles);
      await mountAppAt("/vehicles");
      expect(router.currentRoute.value.path).toBe("/");
    });

    it("Signed-in user without admin or area admin role accesses the new vehicle page", async () => {
      signIn(maintenanceRoles);
      await mountAppAt("/vehicles/new");
      expect(router.currentRoute.value.path).toBe("/");
    });

    it("Signed-in user without admin or area admin role accesses a vehicle page", async () => {
      signIn(requesterRoles);
      await mountAppAt("/vehicles/1");
      expect(router.currentRoute.value.path).toBe("/");
    });

    it("Maintenance user sees vehicles but cannot edit them", async () => {
      // Feature 13: maintenance opens a vehicle to record mileage, service, and maintenance needs.
      signIn(maintenanceRoles);
      vehicleServices.getVehicles.mockResolvedValue({ data: [vehicle] });
      await mountAppAt("/vehicles");

      await waitFor(() => expect(navLabels()).toContain("Vehicles"));
      expect(document.body.textContent).not.toContain("+ New Vehicle");
      expect(document.body.querySelector('[aria-label="Edit vehicle"]')).toBeNull();
      expect(document.body.querySelector('[aria-label="Delete vehicle"]')).toBeNull();
      document.body.querySelector('[aria-label="View vehicle"]').click();
      await settle();

      await waitFor(() => {
        expect(router.currentRoute.value.path).toBe("/vehicles/1");
        // UI/UX backlog #63: read-only details are text, not disabled inputs.
        expect(document.body.querySelector('[data-test="vehicle-details"]')?.textContent).toContain(vehicle.universityId);
      });
      expect(wrapper.findAllComponents({ name: "VTextField" }).some((field) => field.props("label") === "Make")).toBe(false);
      expect(document.body.querySelector("button.vehicle-form__save")).toBeNull();
      // UI/UX backlog #36: no ⋮ menu (and so no delete) for someone who can't edit the vehicle.
      expect(document.body.querySelector('[data-test="more-actions"]')).toBeNull();
      // The logs are tabs of the Work and history card, and maintenance users can still add to them.
      await waitFor(() => expect(document.body.querySelector('[data-test="vehicle-work-tab-mileage"]')).not.toBeNull());
      expect(document.body.querySelector('[data-test="vehicle-work-tab-service"]').textContent).toContain("Service visits");
      expect(document.body.textContent).toContain("+ New Service Log");
    });

    it("Area admin user accesses a vehicle outside their areas", async () => {
      signIn(areaAdminRoles);
      vehicleServices.getVehicle.mockResolvedValue({ data: { ...vehicle, id: 2, areaId: 2 } });
      await mountAppAt("/vehicles/2");

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/"));
    });
  });
});
