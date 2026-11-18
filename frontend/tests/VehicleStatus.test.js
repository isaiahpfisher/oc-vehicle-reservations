/**
 * Feature 18 — Vehicle Status
 * Spec: features/feature-18-vehicle-status.md
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import areaServices from "../src/services/areaServices.js";
import destinationServices from "../src/services/destinationServices.js";
import driverServices from "../src/services/driverServices.js";
import maintenanceNeedServices from "../src/services/maintenanceNeedServices.js";
import mileageLogServices from "../src/services/mileageLogServices.js";
import requestServices from "../src/services/requestServices.js";
import serviceLogServices from "../src/services/serviceLogServices.js";
import serviceTypeServices from "../src/services/serviceTypeServices.js";
import vehicleServices from "../src/services/vehicleServices.js";
import vehicleTypeServices from "../src/services/vehicleTypeServices.js";
import { toDateInput } from "../src/models/requests.js";
import { useConfirmState } from "../src/composables/useConfirm.js";
import { apiError, settle, signInAs, vuetify, waitFor } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock("../src/services/areaServices.js", () => ({ default: { getAreas: vi.fn() } }));
vi.mock("../src/services/vehicleTypeServices.js", () => ({ default: { getVehicleTypes: vi.fn() } }));
vi.mock("../src/services/vehicleServices.js", () => ({
  default: { getVehicles: vi.fn(), getVehicle: vi.fn(), createVehicle: vi.fn(), updateVehicle: vi.fn(), removeVehicle: vi.fn() },
}));
vi.mock("../src/services/mileageLogServices.js", () => ({
  default: { getMileageLogs: vi.fn(), createMileageLog: vi.fn() },
}));
vi.mock("../src/services/serviceLogServices.js", () => ({
  default: { getServiceLogsByVehicle: vi.fn(), createServiceLog: vi.fn() },
}));
vi.mock("../src/services/serviceTypeServices.js", () => ({ default: { getServiceTypes: vi.fn() } }));
vi.mock("../src/services/maintenanceNeedServices.js", () => ({
  default: {
    getMaintenanceNeeds: vi.fn(),
    getMaintenanceNeed: vi.fn(),
    getMaintenanceNeedOptions: vi.fn(),
    createMaintenanceNeed: vi.fn(),
    updateMaintenanceNeed: vi.fn(),
  },
}));
vi.mock("../src/services/requestServices.js", () => ({
  default: {
    getMyRequests: vi.fn(),
    getRequests: vi.fn(),
    getRequest: vi.fn(),
    updateRequest: vi.fn(),
    getVehicleOptions: vi.fn(),
  },
}));
vi.mock("../src/services/driverServices.js", () => ({ default: { getSelectableDrivers: vi.fn() } }));
vi.mock("../src/services/destinationServices.js", () => ({ default: { getSelectableDestinations: vi.fn() } }));

const user = (roles) => ({ userId: 9, email: "pat@oc.edu", firstName: "Pat", lastName: "Lee", roles, token: "t" });
const admin = user([{ id: 1, role: "admin", areaId: null }]);
const areaAdmin = user([{ id: 2, role: "area_admin", areaId: 1, area: { id: 1, name: "Athletics" } }]);
const maintenance = user([{ id: 3, role: "maintenance", areaId: null }]);
const requester = { ...user([]), userId: 2 };

const day = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toDateInput(date);
};

const athletics = { id: 1, name: "Athletics" };
const car = { id: 1, name: "Car", identifier: "VIN" };
const van = { id: 2, name: "Van", identifier: "VIN" };

const condition = (status = "available", overrides = {}) => ({
  status,
  reasons: [],
  mileage: { miles: 0, reading: null, tripMiles: 0, tripCount: 0, unknownTripCount: 0 },
  services: [],
  outOfServiceNeeds: [],
  ...overrides,
});

const vehicle = (id, overrides = {}) => ({
  id,
  areaId: 1,
  vehicleTypeId: 1,
  vehicleType: car,
  universityId: `V-${id}`,
  make: "Toyota",
  model: "Sienna",
  year: 2015,
  identifier: `1HGCM82633A00435${id}`.slice(0, 17),
  purchasedAt: "2018-01-01",
  color: "Gray",
  passengerCapacity: 8,
  licensePlate: `ABC${id}`,
  licensePlateExpirationDate: "2099-01-01",
  status: "active",
  condition: condition(),
  upcomingTrips: [],
  ...overrides,
});

const oilChange = (overrides = {}) => ({
  serviceType: { id: 1, name: "Oil Change", frequencyDays: 180, frequencyMiles: 5000 },
  lastServicedAt: day(-30),
  lastServiceMiles: 10000,
  dueDate: day(150),
  dueMiles: 15000,
  milesLeft: 2660,
  daysLeft: 150,
  state: "ok",
  ...overrides,
});

const upcomingTrip = (overrides = {}) => ({
  id: 7,
  purpose: "Away game",
  startAt: day(5),
  endAt: day(6),
  allDay: true,
  status: "reserved",
  area: athletics,
  ...overrides,
});

let wrapper;
let roles = admin.roles;

const mountAppAt = async (path, signedIn = admin) => {
  roles = signedIn.roles;
  signInAs(signedIn);
  await router.push(path);
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

const byTest = (id) => document.body.querySelector(`[data-test="${id}"]`);
const allByTest = (id) => [...document.body.querySelectorAll(`[data-test="${id}"]`)];
const text = () => document.body.textContent.replace(/\s+/g, " ");
const rowTexts = () => [...document.body.querySelectorAll(".v-data-table tbody tr")].map((row) => row.textContent);
const activeOverlay = () => document.body.querySelector(".v-overlay--active");

const component = (label, name = "VSelect") =>
  waitFor(() => {
    const match = wrapper.findAllComponents({ name }).find((found) => found.props("label") === label);
    expect(match).toBeDefined();
    return match;
  });

const choose = async (label, value, name = "VSelect") => {
  (await component(label, name)).vm.$emit("update:modelValue", value);
  await settle();
};

const clickText = async (label, root = document.body) => {
  const element = await waitFor(() => {
    const match = [...root.querySelectorAll("button, a, .v-chip, .v-list-item")].find((el) => el.textContent.trim() === label);
    expect(match).toBeDefined();
    return match;
  });
  element.click();
  await settle();
};

beforeAll(async () => {
  await Promise.all([
    import("../src/views/Vehicles.vue"),
    import("../src/views/VehicleForm.vue"),
    import("../src/views/Request.vue"),
    import("../src/views/Admin/Requests.vue"),
    import("../src/views/MaintenanceNeedsForm.vue"),
  ]);
});

beforeEach(async () => {
  signInAs(null);
  vi.resetAllMocks();
  apiClient.get.mockImplementation(async (url) => (String(url).startsWith("users/") ? { data: { roles } } : { data: [] }));
  areaServices.getAreas.mockResolvedValue({ data: [athletics] });
  vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [car, van] });
  vehicleServices.getVehicles.mockResolvedValue({ data: [] });
  vehicleServices.updateVehicle.mockImplementation(async (_id, body) => ({ status: 200, data: body }));
  mileageLogServices.getMileageLogs.mockResolvedValue({ data: [] });
  mileageLogServices.createMileageLog.mockResolvedValue({ status: 201, data: {} });
  serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({ data: [] });
  serviceTypeServices.getServiceTypes.mockResolvedValue({ data: [] });
  maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [] });
  maintenanceNeedServices.getMaintenanceNeedOptions.mockResolvedValue({ data: { vehicles: [], assignees: [] } });
  requestServices.getMyRequests.mockResolvedValue({ data: [] });
  requestServices.getRequests.mockResolvedValue({ data: [] });
  driverServices.getSelectableDrivers.mockResolvedValue({ data: [] });
  destinationServices.getSelectableDestinations.mockResolvedValue({ data: [] });
  await router.push("/login");
  await router.isReady();
});

afterEach(() => {
  // The confirm dialog's state is shared app-wide; don't let one test's open dialog leak into the next.
  useConfirmState().cancel();
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

// ---------- Vehicle list ----------

const fleet = [
  vehicle(1, { make: "Toyota", model: "Sienna", color: "Gray", year: 2015 }),
  vehicle(2, { make: "Ford", model: "Transit", color: "White", year: 2022, vehicleType: van, condition: condition("out_of_service") }),
  vehicle(3, { make: "Ford", model: "Transit", color: "Blue", year: 2020, vehicleType: van, condition: condition("service_overdue") }),
  vehicle(4, { make: "Honda", model: "Odyssey", color: "White", year: 2022, condition: condition("service_due_soon") }),
  vehicle(5, { make: "Chevy", model: "Express", color: "Red", year: 2010, vehicleType: van, condition: condition("plate_expired") }),
  vehicle(6, { make: "Dodge", model: "Caravan", color: "Tan", year: 2005, status: "retired", condition: condition("retired") }),
];

const listedMakes = () => rowTexts().map((row) => row.split(/\s+/)[0]);
const listedIds = () => {
  const seen = rowTexts();
  return fleet.filter((v) => seen.some((row) => row.startsWith(`${v.make}${v.model}${v.year}${v.color}`))).map(({ id }) => id);
};

const openList = async (signedIn = admin) => {
  vehicleServices.getVehicles.mockResolvedValue({ data: fleet });
  await mountAppAt("/vehicles", signedIn);
  await waitFor(() => expect(rowTexts()).toHaveLength(6));
};

describe("Feature 18 — Vehicle Status", () => {
  describe("US-18.1 — See vehicle status on the vehicle list", () => {
    it("Vehicle list displays in-depth status of each vehicle", async () => {
      await openList();

      const labels = rowTexts().map((row) =>
        ["Available", "Out of Service", "Service Overdue", "Service Due Soon", "Plate Expired", "Retired"].find((label) =>
          row.includes(label),
        ),
      );
      expect(labels).toEqual(["Available", "Out of Service", "Service Overdue", "Service Due Soon", "Plate Expired", "Retired"]);
      // Each row shows its vehicle type (US-18.2 filters by it).
      const typeCells = [...document.body.querySelectorAll(".v-data-table tbody tr")].map((row) => row.children[4].textContent.trim());
      expect(typeCells).toEqual(["Car", "Van", "Van", "Car", "Van", "Car"]);
      expect(text()).not.toContain("active");
    });

    it("Vehicle with an open out-of-service maintenance need shows Out of Service", async () => {
      vehicleServices.getVehicles.mockResolvedValue({ data: [fleet[1]] });
      await mountAppAt("/vehicles");

      const chip = await waitFor(() => {
        const found = document.body.querySelector('.vehicle-status-chip[data-status="out_of_service"]');
        expect(found).not.toBeNull();
        return found;
      });
      expect(chip.textContent).toContain("Out of Service");
      expect(chip.className).toContain("text-error");
    });
  });

  describe("US-18.2 — Filter vehicles by status", () => {
    it("Vehicle list can be filtered", async () => {
      await openList();
      // Type, make, model, color, and year sit behind "Filters", like the request list.
      expect(byTest("vehicle-filters").style.display).toBe("none");
      byTest("toggle-filters").click();
      await settle();
      expect(byTest("vehicle-filters").style.display).not.toBe("none");

      await choose("Type", "Van");

      expect(listedIds()).toEqual([2, 3, 5]);
      expect(byTest("toggle-filters").textContent).toContain("1");
    });

    it("Filtering by status shows only vehicles with that status", async () => {
      await openList();

      await choose("Status", "out_of_service");
      expect(listedIds()).toEqual([2]);

      await choose("Status", "retired");
      expect(listedIds()).toEqual([6]);
    });

    it("Filtering by make, model, color, and year narrows the list", async () => {
      await openList();

      await choose("Make", "Ford");
      expect(listedIds()).toEqual([2, 3]);
      await choose("Make", null);

      await choose("Model", "Odyssey");
      expect(listedIds()).toEqual([4]);
      await choose("Model", null);

      await choose("Color", "White");
      expect(listedIds()).toEqual([2, 4]);
      await choose("Color", null);

      await choose("Year", 2022);
      expect(listedIds()).toEqual([2, 4]);
      // Options come from the vehicles themselves.
      expect((await component("Make")).props("items")).toEqual(["Chevy", "Dodge", "Ford", "Honda", "Toyota"]);
    });

    it("Combined filters show only vehicles matching all of them", async () => {
      await openList();

      await choose("Make", "Ford");
      await choose("Color", "White");
      expect(listedIds()).toEqual([2]);

      await choose("Status", "service_overdue");
      expect(rowTexts()).toHaveLength(0);
    });

    it("Clearing filters shows every vehicle again", async () => {
      await openList();
      await choose("Make", "Ford");
      await choose("Year", 2022);
      byTest("needs-attention").click();
      await settle();
      expect(listedIds()).toEqual([2]);

      byTest("clear-filters").click();
      await settle();

      expect(listedIds()).toEqual([1, 2, 3, 4, 5, 6]);
      expect(byTest("clear-filters").disabled).toBe(true);
    });

    it("Filters that match no vehicles show the empty state", async () => {
      await openList();

      await choose("Make", "Toyota");
      await choose("Status", "retired");

      await waitFor(() => expect(text()).toContain("No vehicles match these filters"));
      expect(document.body.querySelector(".v-data-table")).toBeNull();
    });
  });

  // ---------- Vehicle page ----------

  const fullVehicle = (overrides = {}) =>
    vehicle(1, {
      condition: condition("service_overdue", {
        reasons: [
          { status: "service_overdue", message: "Tire Rotation is overdue by 120 mi." },
          { status: "plate_expired", message: "License plate expired Oct 1, 2026." },
        ],
        mileage: {
          miles: 12340,
          reading: { odometerReading: 12000, recordedAt: "2026-10-01" },
          tripMiles: 340,
          tripCount: 2,
          unknownTripCount: 0,
        },
        services: [
          oilChange(),
          oilChange({
            serviceType: { id: 2, name: "Tire Rotation", frequencyDays: null, frequencyMiles: 6000 },
            lastServicedAt: null,
            lastServiceMiles: null,
            dueDate: null,
            daysLeft: null,
            dueMiles: 6000,
            milesLeft: -120,
            state: "overdue",
          }),
          oilChange({
            serviceType: { id: 3, name: "Inspection", frequencyDays: 365, frequencyMiles: null },
            dueMiles: null,
            milesLeft: null,
            dueDate: day(10),
            daysLeft: 10,
            state: "due_soon",
          }),
        ],
        outOfServiceNeeds: [],
      }),
      upcomingTrips: [upcomingTrip()],
      licensePlateExpirationDate: "2026-10-01",
      ...overrides,
    });

  const openVehicle = async (data = fullVehicle(), signedIn = admin) => {
    vehicleServices.getVehicle.mockResolvedValue({ data });
    await mountAppAt(`/vehicles/${data.id}`, signedIn);
    await waitFor(() => expect(byTest("vehicle-status")).not.toBeNull());
  };

  const serviceRow = (name) => document.body.querySelector(`[data-service="${name}"]`)?.textContent.replace(/\s+/g, " ");

  describe("US-18.3 — See why a vehicle has its status", () => {
    it("Vehicle page has explanation of status", async () => {
      await openVehicle();

      const status = byTest("vehicle-status").textContent;
      expect(status).toContain("Service Overdue");
      expect(byTest("estimated-mileage").textContent).toContain("12,340 mi");
      expect(byTest("next-service").textContent).toContain("Tire Rotation");
      expect(byTest("trip-count").textContent).toContain("1");
      // Empty sections are left out rather than saying "None".
      expect(byTest("out-of-service-needs")).toBeNull();
      expect(byTest("service-schedule").textContent).toContain("Oil Change");
      expect(byTest("service-schedule").textContent).toContain("Tire Rotation");
    });

    it("Vehicle page lists the reasons for the vehicle's status", async () => {
      await openVehicle();

      // Each reason shows where it lives on the card rather than in a separate summary.
      expect(byTest("status-reasons")).toBeNull();
      expect(byTest("vehicle-status").querySelector(".vehicle-status-chip").textContent).toContain("Service Overdue");
      expect(serviceRow("Tire Rotation")).toContain("Overdue");
      expect(serviceRow("Inspection")).toContain("Due soon");
      // The plate isn't the status here (service overdue outranks it), so its own tile says it expired.
      const plate = byTest("license-plate");
      expect(plate.textContent).toContain("ABC1");
      expect(plate.querySelector(".status-tile__detail").textContent).toBe("Expired Oct 1, 2026");
      expect(plate.querySelector(".status-tile__detail").className).toContain("text-error");
    });

    it("Vehicle page shows upcoming trips", async () => {
      await openVehicle();

      const trips = byTest("upcoming-trips");
      expect(trips.textContent).toContain("Away game");
      expect(trips.textContent).toContain("Athletics");
      expect(trips.textContent).toContain("Reserved");
      // Admins manage the trip, so it links to the request.
      expect(trips.querySelector('a[href="/requests/7"]')).not.toBeNull();
    });

    it("Vehicle page shows upcoming trips when there are many", async () => {
      const many = Array.from({ length: 8 }, (_, i) => upcomingTrip({ id: 20 + i, purpose: `Trip ${i + 1}` }));
      await openVehicle(fullVehicle({ upcomingTrips: many }));

      const items = () => byTest("upcoming-trips").querySelectorAll(".v-list-item");
      expect(items()).toHaveLength(3);
      expect(byTest("trip-count").textContent).toContain("8");
      byTest("toggle-trips").click();
      await settle();
      expect(items()).toHaveLength(8);
    });

    it("Vehicle page shows recent mileage and service logs with links to the full pages", async () => {
      mileageLogServices.getMileageLogs.mockResolvedValue({
        data: Array.from({ length: 7 }, (_, i) => ({ id: i + 1, odometerReading: 1000 * (i + 1), recordedAt: day(-10 + i) })),
      });
      serviceLogServices.getServiceLogsByVehicle.mockResolvedValue({
        data: [
          { id: 1, servicedAt: day(-40), serviceType: { name: "Tire Rotation" }, mileageLog: { odometerReading: 9000 } },
          { id: 2, servicedAt: day(-2), serviceType: { name: "Oil Change" }, mileageLog: { odometerReading: 11900 }, user: { firstName: "Max", lastName: "Fix" } },
        ],
      });
      await openVehicle();

      const mileage = await waitFor(() => {
        const items = byTest("recent-mileage-logs").querySelectorAll(".v-list-item");
        expect(items).toHaveLength(5);
        return items;
      });
      expect(mileage[0].textContent).toContain("7,000 mi");
      expect(byTest("recent-mileage-logs").textContent).not.toContain("1,000 mi");
      expect(byTest("recent-mileage-logs").querySelector('a[href="/vehicles/1/mileage-logs"]').textContent).toContain("View all");

      const services = byTest("recent-service-logs").querySelectorAll(".v-list-item");
      expect(services).toHaveLength(2);
      expect(services[0].textContent).toContain("Oil Change");
      expect(services[0].textContent).toContain("11,900 mi");
      expect(services[0].textContent).toContain("Max Fix");
      expect(byTest("recent-service-logs").querySelector('a[href="/service-logs/1"]')).not.toBeNull();
      expect(mileageLogServices.getMileageLogs).toHaveBeenCalledWith(1);
      expect(serviceLogServices.getServiceLogsByVehicle).toHaveBeenCalledWith(1);
    });

    it("Maintenance user sees the vehicle page read-only but can add mileage and service logs", async () => {
      await openVehicle(fullVehicle(), maintenance);

      expect(wrapper.findAllComponents({ name: "VTextField" }).every((field) => field.props("disabled"))).toBe(true);
      expect(document.body.querySelector(".vehicle-form__save")).toBeNull();
      // Maintenance can't open requests, so trips aren't links.
      expect(byTest("upcoming-trips").querySelector("a")).toBeNull();

      await clickText("+ New Mileage Log");
      const odometer = await component("Odometer reading", "VTextField");
      await odometer.setValue("12500");
      await (await component("Recorded date", "VTextField")).setValue(day(0));
      await clickText("Create", activeOverlay());

      await waitFor(() =>
        expect(mileageLogServices.createMileageLog).toHaveBeenCalledWith({ odometerReading: 12500, recordedAt: day(0), vehicleId: 1 }),
      );
      await waitFor(() => expect(text()).toContain("Mileage log created."));
      // Status and logs reload so the new reading shows.
      expect(vehicleServices.getVehicle).toHaveBeenCalledTimes(2);
      expect(mileageLogServices.getMileageLogs).toHaveBeenCalledTimes(2);

      await clickText("+ New Service Log");
      await waitFor(() => expect(activeOverlay()?.textContent).toContain("Service Type"));
    });

    it("Vehicle page shows an error when status fails to load", async () => {
      vehicleServices.getVehicle.mockRejectedValue(apiError(500, "Failed to fetch vehicle."));
      await mountAppAt("/vehicles/1");

      await waitFor(() => expect(document.body.querySelector(".v-alert")?.textContent).toContain("Failed to fetch vehicle."));
      expect(byTest("vehicle-status")).toBeNull();
    });
  });

  describe("US-18.4 — Vehicles go out of service from maintenance needs", () => {
    it("Maintenance needs take vehicle out of service", async () => {
      await openVehicle(
        vehicle(1, {
          condition: condition("out_of_service", {
            reasons: [{ status: "out_of_service", message: "Out of service: Brakes." }],
            outOfServiceNeeds: [{ id: 4, title: "Brakes", status: "In Progress", priority: "High" }],
          }),
        }),
      );

      expect(byTest("vehicle-status").textContent).toContain("Out of Service");
      const needs = byTest("out-of-service-needs");
      expect(needs.textContent).toContain("In Progress · High priority");
      expect(needs.querySelector('a[href="/maintenance-needs/4"]').textContent).toContain("Brakes");
      expect(byTest("vehicle-status").querySelector(".vehicle-status-chip").textContent).toContain("Out of Service");
    });
  });

  describe("US-18.5 — Track when service is due", () => {
    it("Vehicles show when service is next due", async () => {
      await openVehicle();

      const oil = serviceRow("Oil Change");
      expect(oil).toContain("10,000 mi");
      expect(oil).toContain("15,000 mi");
      expect(oil).toContain("in 2,660 mi · in 150 days");
    });

    it("Vehicle page marks each service type overdue, due soon, or never serviced", async () => {
      await openVehicle();

      expect(serviceRow("Oil Change")).toContain("OK");
      expect(serviceRow("Tire Rotation")).toContain("Overdue");
      expect(serviceRow("Tire Rotation")).toContain("Never");
      expect(serviceRow("Tire Rotation")).toContain("Counted from purchase");
      expect(serviceRow("Tire Rotation")).toContain("120 mi overdue");
      expect(serviceRow("Inspection")).toContain("Due soon");
      expect(serviceRow("Inspection")).toContain("in 10 days");

      // Most urgent first, and services that are fine stay hidden until asked for.
      const rows = () => [...byTest("service-schedule").querySelectorAll("tbody tr")];
      expect(rows().map((row) => row.dataset.service)).toEqual(["Tire Rotation", "Inspection", "Oil Change"]);
      expect(rows().filter((row) => row.style.display !== "none")).toHaveLength(2);
      byTest("toggle-services").click();
      await settle();
      expect(rows().filter((row) => row.style.display !== "none")).toHaveLength(3);
    });
  });

  // ---------- Assign dialog and request page ----------

  const dana = { id: 1, firstName: "Dana", lastName: "Reyes" };
  const tulsa = { id: 2, name: "BOK Center", city: "Tulsa", state: "OK", isSaved: true };
  const assignedVan = { id: 5, universityId: "VAN-5", year: 2022, make: "Ford", model: "Transit", passengerCapacity: 8 };

  const tripRequest = (overrides = {}) => ({
    id: 1,
    userId: requester.userId,
    areaId: athletics.id,
    purpose: "Away game",
    startAt: day(5),
    endAt: day(7),
    allDay: true,
    numberOfPeople: 4,
    estimatedMiles: 300,
    status: "awaiting_vehicle",
    approverId: admin.userId,
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    area: athletics,
    user: { id: requester.userId, firstName: "Jane", lastName: "Doe", email: "jane@oc.edu" },
    approver: null,
    drivers: [dana],
    destinations: [tulsa],
    vehicles: [],
    vehicleProblems: {},
    driverProblems: {},
    ...overrides,
  });

  const option = (id, problems = [], overrides = {}) => ({
    vehicle: { ...assignedVan, id, universityId: `V-${id}`, vehicleType: { name: "Van" } },
    conflictingRequestIds: problems.some(({ type }) => type === "booked") ? [9] : [],
    status: "available",
    problems,
    nextService: { milesLeft: null, dueDate: null },
    ...overrides,
  });

  const problem = (type, message, blocking = ["retired", "out_of_service", "booked"].includes(type)) => ({ type, blocking, message });

  const openAssign = async (options, request = tripRequest()) => {
    requestServices.getRequest.mockResolvedValue({ data: request });
    requestServices.getVehicleOptions.mockResolvedValue({ data: options });
    await mountAppAt("/requests/1");
    await waitFor(() => expect(byTest("assign-vehicles")).not.toBeNull());
    byTest("assign-vehicles").click();
    await settle();
    await waitFor(() => expect(allByTest("vehicle-option").length).toBeGreaterThan(0));
  };

  const optionRow = (universityId) => document.body.querySelector(`[data-test="vehicle-option"][data-vehicle="${universityId}"]`);

  describe("US-18.6 — Only assign available vehicles", () => {
    it("Unavailable vehicles cannot be assigned", async () => {
      await openAssign([option(1, [problem("out_of_service", "Out of service: Brakes.")]), option(2)]);
      await clickText("Available on these dates");
      await waitFor(() => expect(allByTest("vehicle-option")).toHaveLength(2));

      optionRow("V-1").click();
      optionRow("V-2").click();
      await settle();
      byTest("save-vehicles").click();
      await settle();

      expect(requestServices.updateRequest).toHaveBeenCalledWith(1, { vehicles: [2] });
    });

    it("Out-of-service, retired, and booked vehicles are shown disabled with the reason", async () => {
      await openAssign([
        option(1, [problem("out_of_service", "Out of service: Brakes.")]),
        option(2, [problem("retired", "Retired.")]),
        option(3, [problem("booked", "Booked for another trip at the same time.")]),
        option(4),
      ]);
      // Hidden by the default "Available on these dates" filter until it's cleared.
      expect(allByTest("vehicle-option")).toHaveLength(1);
      expect(text()).toContain("3 hidden by filters");
      await clickText("Available on these dates");

      await waitFor(() => expect(allByTest("vehicle-option")).toHaveLength(4));
      for (const [id, reason] of [
        ["V-1", "Out of service: Brakes."],
        ["V-2", "Retired."],
        ["V-3", "Booked for another trip at the same time."],
      ]) {
        expect(optionRow(id).className).toContain("v-list-item--disabled");
        expect(optionRow(id).textContent).toContain(reason);
      }
      expect(optionRow("V-4").className).not.toContain("v-list-item--disabled");
    });

    it("Already-assigned vehicle that became unavailable shows a warning in the assign dialog", async () => {
      await openAssign(
        [option(5, [problem("out_of_service", "Out of service: Brakes.")])],
        tripRequest({ status: "reserved", vehicles: [{ ...assignedVan, universityId: "V-5" }] }),
      );

      const row = optionRow("V-5");
      expect(row.textContent).toContain("Assigned, but now unavailable: Out of service: Brakes.");
      // It stays selectable so it can be removed.
      expect(row.className).not.toContain("v-list-item--disabled");
      row.click();
      await settle();
      byTest("save-vehicles").click();
      await settle();
      expect(requestServices.updateRequest).toHaveBeenCalledWith(1, { vehicles: [] });
    });

    it("Assign dialog shows the error when assignment is rejected", async () => {
      requestServices.updateRequest.mockRejectedValue(apiError(400, "Vehicle V-2 can't be assigned. Booked for another trip at the same time."));
      await openAssign([option(2)]);

      optionRow("V-2").click();
      await settle();
      byTest("save-vehicles").click();
      await settle();

      await waitFor(() =>
        expect(activeOverlay().textContent).toContain("Vehicle V-2 can't be assigned. Booked for another trip at the same time."),
      );
      expect(byTest("save-vehicles")).not.toBeNull();
    });
  });

  describe("US-18.7 — Warn when service will be due during a trip", () => {
    it("Vehicles that will have service due during a request show a warning", async () => {
      const many = ["Oil change", "Tire rotation", "Battery check"].map((service) => ({
        ...problem("service_due", `${service} is overdue.`),
        service,
        due: "overdue",
      }));
      await openAssign([option(1, [problem("service_due", "Oil Change is due in 200 mi, and this trip is about 300 mi.")]), option(2, many)]);

      const row = optionRow("V-1");
      expect(row.textContent).toContain("Service due");
      expect(row.textContent).toContain("Oil Change is due in 200 mi, and this trip is about 300 mi.");
      expect(row.className).not.toContain("v-list-item--disabled");

      // Several services due are one chip and one line, not one each.
      const crowded = optionRow("V-2");
      expect(crowded.querySelectorAll(".v-chip")).toHaveLength(1);
      expect(crowded.querySelectorAll('[data-test="problem-line"]')).toHaveLength(1);
      expect(crowded.textContent).toContain("Overdue for service: Oil change, Tire rotation and Battery check.");
    });

    it("Assign dialog subtitle shows the service due date and miles", async () => {
      await openAssign([
        option(1, [], { nextService: { milesLeft: 1200, dueDate: "2030-12-03" } }),
        option(2, [], { nextService: { milesLeft: null, dueDate: null } }),
      ]);

      expect(optionRow("V-1").textContent).toContain("service in 1,200 mi or by Dec 3, 2030");
      expect(optionRow("V-2").textContent).not.toContain("service");
    });

    it("Service filter includes vehicles due between the trip's start and end dates", async () => {
      await openAssign([
        option(1, [problem("service_due", "Inspection is due Dec 6, 2030, before the trip ends.")]),
        option(2, [problem("plate_expires", "License plate expires Dec 6, 2030, before the trip ends.")]),
        option(3),
      ]);
      expect(allByTest("vehicle-option")).toHaveLength(3);

      await clickText("Not due for service");

      await waitFor(() => expect(allByTest("vehicle-option")).toHaveLength(2));
      expect(optionRow("V-1")).toBeNull();
      expect(text()).toContain("1 hidden by filters");
    });
  });

  describe("US-18.8 — Warn when a license plate expires before a trip ends", () => {
    it("License plate expiring before end of trip gives warning", async () => {
      await openAssign([option(1, [problem("plate_expires", "License plate expires Dec 6, 2030, before the trip ends.")])]);

      const row = optionRow("V-1");
      expect(row.textContent).toContain("Plate expires");
      expect(row.textContent).toContain("License plate expires Dec 6, 2030, before the trip ends.");
      optionRow("V-1").click();
      await settle();
      byTest("save-vehicles").click();
      await settle();
      expect(requestServices.updateRequest).toHaveBeenCalledWith(1, { vehicles: [1] });
    });
  });

  const openRequest = async (request, signedIn = admin) => {
    requestServices.getRequest.mockResolvedValue({ data: request });
    await mountAppAt("/requests/1", signedIn);
    await waitFor(() => expect(byTest("vehicles") ?? byTest("drivers")).not.toBeNull());
  };

  const problemRequest = (overrides = {}) =>
    tripRequest({
      status: "reserved",
      vehicles: [assignedVan, { ...assignedVan, id: 6, universityId: "VAN-6" }],
      vehicleProblems: {
        5: [problem("out_of_service", "Out of service: Brakes."), problem("plate_expires", "License plate expired Oct 1, 2026.")],
      },
      ...overrides,
    });

  describe("US-18.9 — See problems with vehicles already assigned to a request", () => {
    it("Vehicles that have new problems arise after a request has been created handled get surfaced", async () => {
      await openRequest(problemRequest());

      const alerts = allByTest("vehicle-problems");
      expect(alerts).toHaveLength(1);
      const lines = [...alerts[0].querySelectorAll('[data-test="problem-line"]')].map((line) => line.textContent.trim());
      expect(lines).toEqual(["Out of service: Brakes.", "License plate expired Oct 1, 2026."]);
    });

    it("Each problem shows as a warning on its vehicle in the request's Vehicles section", async () => {
      const services = ["Oil change", "Brake inspection", "DOT bus inspection", "Battery check"];
      await openRequest(
        problemRequest({
          vehicleProblems: {
            5: [problem("out_of_service", "Out of service: Brakes.")],
            6: services.map((service) => ({ ...problem("service_due", `${service} is overdue.`), service, due: "overdue" })),
          },
        }),
      );

      const section = byTest("vehicles");
      // One warning per vehicle, right under it, styled like the capacity warning.
      const alerts = [...section.querySelectorAll('[data-test="vehicle-problems"]')];
      expect(alerts).toHaveLength(2);
      alerts.forEach((alert) => expect(alert.className).toContain("text-warning"));
      expect(alerts[0].previousElementSibling.textContent).toContain("VAN-5");
      // Many services due collapse into one line instead of a stack of warnings.
      const vanSix = [...alerts[1].querySelectorAll('[data-test="problem-line"]')];
      expect(vanSix).toHaveLength(1);
      expect(vanSix[0].textContent.trim()).toBe("Overdue for service: Oil change, Brake inspection, DOT bus inspection and 1 more.");
      expect(vanSix[0].getAttribute("title")).toContain("Battery check is overdue.");
    });

    it("Several services due before the trip ends read as one sentence", async () => {
      const dueOn = (service, dueDate) => ({
        ...problem("service_due", `${service} is due ${dueDate}, before the trip ends.`),
        service,
        due: "date",
        dueDate,
      });
      await openRequest(
        problemRequest({
          vehicleProblems: {
            5: [dueOn("DOT bus inspection", "2027-01-19"), dueOn("Golf cart battery service", "2027-01-19")],
            6: [dueOn("Oil change", "2027-01-19"), dueOn("Battery check", "2027-01-22")],
          },
        }),
      );

      const lines = allByTest("problem-line").map((line) => line.textContent.trim());
      expect(lines).toEqual([
        "Service due Jan 19, 2027, before the trip ends: DOT bus inspection and Golf cart battery service.",
        "Service due before the trip ends: Oil change (Jan 19) and Battery check (Jan 22).",
      ]);
    });

    it("Past, cancelled, denied, and returned requests do not show vehicle warnings", async () => {
      for (const overrides of [
        { startAt: day(-5), endAt: day(-3) },
        { status: "cancelled" },
        { status: "denied" },
        { status: "returned" },
      ]) {
        await openRequest(problemRequest({ ...overrides, driverProblems: { 1: [problem("license_expires", "License expired Oct 1, 2026.")] } }));
        await waitFor(() => expect(byTest("vehicles")?.textContent).toContain("VAN-5"));
        expect(allByTest("vehicle-problems")).toHaveLength(0);
        expect(allByTest("driver-problem")).toHaveLength(0);
        wrapper.unmount();
        document.body.innerHTML = "";
      }
      wrapper = undefined;
    });

    it("Driver license problems show as a warning on that driver in the request's Drivers section", async () => {
      await openRequest(
        tripRequest({
          drivers: [dana, { id: 2, firstName: "Sam", lastName: "Okafor" }],
          driverProblems: { 1: [problem("license_expires", "License expires Dec 6, 2030, before the trip ends.")] },
        }),
      );

      const warnings = await waitFor(() => {
        const found = allByTest("driver-problem");
        expect(found).toHaveLength(1);
        return found;
      });
      expect(warnings[0].textContent.trim()).toBe("Dana Reyes: License expires Dec 6, 2030, before the trip ends.");
    });
  });

  describe("US-18.10 — Find requests whose vehicles have problems", () => {
    const listRequests = async () => {
      requestServices.getRequests.mockResolvedValue({
        data: [
          problemRequest({ id: 1, purpose: "Flagged trip" }),
          tripRequest({ id: 2, purpose: "Clean trip", status: "reserved", vehicles: [assignedVan], vehicleProblems: {} }),
          tripRequest({ id: 3, purpose: "Pending trip", status: "pending" }),
        ],
      });
      await mountAppAt("/requests");
      await clickText("Table");
      await waitFor(() => expect(rowTexts()).toHaveLength(3));
    };

    it("Vehicle Request list shows requests with problematic vehicles", async () => {
      await listRequests();

      const flags = allByTest("vehicle-problem-flag");
      expect(flags).toHaveLength(1);
      expect(flags[0].closest("tr").textContent).toContain("Flagged trip");
      expect(flags[0].getAttribute("aria-label")).toContain("VAN-5: Out of service: Brakes.");
      expect(byTest("vehicle-problems-filter").textContent).toContain("1");
    });

    it("Filtering to requests with vehicle problems shows only flagged requests", async () => {
      await listRequests();

      byTest("vehicle-problems-filter").click();
      await settle();

      await waitFor(() => expect(rowTexts()).toHaveLength(1));
      expect(rowTexts()[0]).toContain("Flagged trip");

      byTest("vehicle-problems-filter").click();
      await settle();
      await waitFor(() => expect(rowTexts()).toHaveLength(3));
    });
  });

  // ---------- Maintenance need form ----------

  const needOptions = {
    vehicles: [
      { id: 1, color: "Gray", make: "Toyota", model: "Sienna", licensePlate: "ABC1", areaId: 1, condition: { status: "available" } },
      { id: 2, color: "White", make: "Ford", model: "Transit", licensePlate: "ABC2", areaId: 1, condition: { status: "service_overdue" } },
    ],
    assignees: [],
  };

  const openNeedForm = async () => {
    maintenanceNeedServices.getMaintenanceNeedOptions.mockResolvedValue({ data: needOptions });
    vehicleServices.getVehicle.mockImplementation(async (id) => ({
      data: vehicle(id, { upcomingTrips: id === 1 ? [upcomingTrip(), upcomingTrip({ id: 8, purpose: "Choir tour" })] : [] }),
    }));
    await mountAppAt("/maintenance-needs/new", maintenance);
    await component("Vehicle");
  };

  const affected = () => byTest("affected-trips");

  describe("US-18.11 — Warn when taking a booked vehicle out of service", () => {
    it("When a maintenance person (or area admin) takes a vehicle out of service, they're warned about affected requests", async () => {
      await openNeedForm();

      await choose("Vehicle", 1);

      await waitFor(() => expect(affected()).not.toBeNull());
      expect(affected().textContent).toContain("Away game");
      expect(affected().textContent).toContain("Choir tour");
      expect(affected().textContent).toContain("Athletics");
      expect(vehicleServices.getVehicle).toHaveBeenCalledWith(1);
      // Maintenance users can't open requests, so the trips aren't links for them.
      expect(affected().querySelector('[data-test="affected-trip-link"]')).toBeNull();
    });

    it("Affected trips link to their requests for admins and area admins", async () => {
      vehicleServices.getVehicle.mockResolvedValue({
        data: vehicle(1, { upcomingTrips: [upcomingTrip(), upcomingTrip({ id: 8, purpose: "Music trip", area: { id: 2, name: "Music" } })] }),
      });
      maintenanceNeedServices.getMaintenanceNeedOptions.mockResolvedValue({ data: needOptions });
      await mountAppAt("/maintenance-needs/new", areaAdmin);

      await choose("Vehicle", 1);
      await waitFor(() => expect(affected()).not.toBeNull());

      // The area admin manages Athletics, not Music.
      const links = [...affected().querySelectorAll('[data-test="affected-trip-link"]')];
      expect(links.map((link) => link.getAttribute("href"))).toEqual(["/requests/7"]);
      expect(links[0].getAttribute("target")).toBe("_blank");
      expect(affected().textContent).toContain("Music trip");
    });

    it("Upcoming trips are not shown when out of service is off", async () => {
      await openNeedForm();
      await choose("Vehicle", 1);
      await waitFor(() => expect(affected()).not.toBeNull());

      await choose("Out of Service", false);

      expect(affected()).toBeNull();
    });

    it("Upcoming trips are not shown for a completed or canceled need", async () => {
      await openNeedForm();
      await choose("Vehicle", 1);
      await waitFor(() => expect(affected()).not.toBeNull());

      for (const status of ["Completed", "Canceled"]) {
        await choose("Status", status);
        expect(affected()).toBeNull();
      }

      await choose("Status", "In Progress");
      expect(affected()).not.toBeNull();
    });

    it("Changing the selected vehicle updates the upcoming trips shown", async () => {
      vehicleServices.getVehicle.mockImplementation(async (id) => ({
        data: vehicle(id, { upcomingTrips: [upcomingTrip({ id, purpose: id === 1 ? "Away game" : "Band camp" })] }),
      }));
      maintenanceNeedServices.getMaintenanceNeedOptions.mockResolvedValue({ data: needOptions });
      await mountAppAt("/maintenance-needs/new", areaAdmin);

      await choose("Vehicle", 1);
      await waitFor(() => expect(affected()?.textContent).toContain("Away game"));

      await choose("Vehicle", 2);
      await waitFor(() => expect(affected()?.textContent).toContain("Band camp"));
      expect(affected().textContent).not.toContain("Away game");
    });

    it("Vehicle with no upcoming trips shows no warning", async () => {
      await openNeedForm();

      await choose("Vehicle", 2);
      await waitFor(() => expect(vehicleServices.getVehicle).toHaveBeenCalledWith(2));
      await settle();

      expect(affected()).toBeNull();
    });

    it("Maintenance need vehicle dropdown shows each vehicle's status", async () => {
      await openNeedForm();

      const select = await component("Vehicle");
      expect(select.props("items").map(({ title, status }) => [title, status])).toEqual([
        ["Gray Toyota Sienna (ABC1)", "available"],
        ["White Ford Transit (ABC2)", "service_overdue"],
      ]);

      select.find(".v-field").trigger("mousedown");
      select.find(".v-field").trigger("click");
      await settle();
      const choices = await waitFor(() => {
        const found = allByTest("vehicle-choice");
        expect(found).toHaveLength(2);
        return found;
      });
      expect(choices[0].textContent).toContain("Available");
      expect(choices[1].textContent).toContain("Service Overdue");
    });
  });

  // ---------- Retiring ----------

  const retire = async (data) => {
    vehicleServices.getVehicle.mockResolvedValue({ data });
    await mountAppAt(`/vehicles/${data.id}`);
    await waitFor(() => expect(document.body.querySelector(".vehicle-form__save")).not.toBeNull());
    await choose("Status", "retired");
    document.body.querySelector(".vehicle-form__save").click();
    await settle();
  };

  const confirmDialog = () =>
    [...document.body.querySelectorAll(".v-overlay--active")].find((overlay) => overlay.textContent.includes("Retire vehicle"));

  describe("US-18.12 — Warn before retiring a booked vehicle", () => {
    it("When a user retires a vehicle, they're warned about affected requests", async () => {
      await retire(vehicle(1, { upcomingTrips: [upcomingTrip(), upcomingTrip({ id: 8, purpose: "Choir tour" })] }));

      const dialog = await waitFor(() => {
        expect(confirmDialog()).toBeDefined();
        return confirmDialog();
      });
      expect(dialog.textContent).toContain("2015 Toyota Sienna is assigned to 2 upcoming trips.");
      const items = [...dialog.querySelectorAll('[data-test="confirm-items"] li')].map((li) => li.textContent);
      expect(items).toHaveLength(2);
      expect(items[0]).toContain("Away game");
      expect(items[1]).toContain("Choir tour");
      expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
    });

    it("Retiring a vehicle with no upcoming trips saves without confirmation", async () => {
      await retire(vehicle(1, { upcomingTrips: [] }));

      await waitFor(() => expect(vehicleServices.updateVehicle).toHaveBeenCalledWith("1", expect.objectContaining({ status: "retired" })));
      expect(confirmDialog()).toBeUndefined();
    });

    it("Canceling the retire confirmation does not save", async () => {
      await retire(vehicle(1, { upcomingTrips: [upcomingTrip()] }));
      await waitFor(() => expect(confirmDialog()).toBeDefined());

      await clickText("Cancel", confirmDialog());

      await waitFor(() => expect(confirmDialog()).toBeUndefined());
      expect(vehicleServices.updateVehicle).not.toHaveBeenCalled();
      expect(router.currentRoute.value.path).toBe("/vehicles/1");
    });

    it("Confirming the retire confirmation saves the vehicle", async () => {
      await retire(vehicle(1, { upcomingTrips: [upcomingTrip()] }));
      await waitFor(() => expect(confirmDialog()).toBeDefined());

      await clickText("Retire Vehicle", confirmDialog());

      await waitFor(() => expect(vehicleServices.updateVehicle).toHaveBeenCalledWith("1", expect.objectContaining({ status: "retired" })));
      await waitFor(() => expect(router.currentRoute.value.path).toBe("/vehicles"));
    });
  });

  describe("US-18.13 — Maintenance users see vehicles needing attention", () => {
    it("Vehicle list can be filtered to vehicles that need attention", async () => {
      await openList(maintenance);

      byTest("needs-attention").click();
      await settle();

      expect(byTest("needs-attention").getAttribute("aria-pressed")).toBe("true");
      expect(byTest("needs-attention").textContent).toContain("4");
      expect(listedIds()).toEqual([2, 3, 4, 5]);
    });

    it("Needs Attention includes out-of-service, overdue, due-soon, and plate-expired vehicles", async () => {
      await openList();
      byTest("needs-attention").click();
      await settle();

      const rows = rowTexts();
      for (const label of ["Out of Service", "Service Overdue", "Service Due Soon", "Plate Expired"]) {
        expect(rows.some((row) => row.includes(label))).toBe(true);
      }
    });

    it("Needs Attention excludes available and retired vehicles", async () => {
      await openList();
      byTest("needs-attention").click();
      await settle();

      expect(rowTexts().some((row) => row.includes("Available"))).toBe(false);
      expect(rowTexts().some((row) => row.includes("Retired"))).toBe(false);
      expect(listedMakes()).not.toContain("Dodge");
    });

    it("Maintenance user can open a vehicle's status page from the list", async () => {
      vehicleServices.getVehicles.mockResolvedValue({ data: [fleet[2]] });
      vehicleServices.getVehicle.mockResolvedValue({ data: fullVehicle({ id: 3 }) });
      await mountAppAt("/vehicles", maintenance);

      await waitFor(() => expect(document.body.querySelector('[aria-label="View vehicle"]')).not.toBeNull());
      document.body.querySelector('[aria-label="View vehicle"]').click();
      await settle();

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/vehicles/3"));
      await waitFor(() => expect(byTest("vehicle-status")?.textContent).toContain("Service Overdue"));
    });

    it("Maintenance user sees no create, edit, or delete actions on the vehicle list", async () => {
      await openList(maintenance);

      expect(text()).not.toContain("+ New Vehicle");
      expect(document.body.querySelector('[aria-label="Edit vehicle"]')).toBeNull();
      expect(document.body.querySelector('[aria-label="Delete vehicle"]')).toBeNull();
      expect(document.body.querySelectorAll('[aria-label="View vehicle"]')).toHaveLength(6);
    });
  });

  describe("US-18.14 — Estimate current mileage from trips", () => {
    it("Vehicle Current Mileage calculated from trip estimates", async () => {
      await openVehicle();

      expect(byTest("estimated-mileage").querySelector(".status-tile__value").textContent).toBe("12,340 mi");
      expect(byTest("estimated-mileage").querySelector(".status-tile__detail").textContent).toBe(
        "12,000 logged Oct 1, 2026 + ~340 from 2 trips",
      );
    });

    it("Vehicle page explains how current mileage was estimated", async () => {
      await openVehicle(
        vehicle(1, {
          condition: condition("available", {
            mileage: { miles: 80, reading: null, tripMiles: 80, tripCount: 3, unknownTripCount: 1 },
          }),
        }),
      );

      expect(byTest("estimated-mileage").querySelector(".status-tile__value").textContent).toBe("80 mi");
      expect(byTest("estimated-mileage").querySelector(".status-tile__detail").textContent).toBe(
        "0 at purchase + ~80 from 3 trips; 1 trip with unknown miles; no mileage logs yet",
      );
    });
  });
});
