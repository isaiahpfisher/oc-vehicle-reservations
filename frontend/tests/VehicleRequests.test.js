/**
 * Feature 8 — Vehicle Request Management
 * Spec: features/feature-8-vehicle-requests.md
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import areaServices from "../src/services/areaServices.js";
import requestServices from "../src/services/requestServices.js";
import placeServices from "../src/services/placeServices.js";
import { toDateInput } from "../src/models/requests.js";
import { signInAs, vuetify } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/areaServices.js", () => ({
  default: { getAreas: vi.fn() },
}));

vi.mock("../src/services/requestServices.js", () => ({
  default: {
    getMyRequests: vi.fn(),
    getRequests: vi.fn(),
    getRequest: vi.fn(),
    createRequest: vi.fn(),
    updateRequest: vi.fn(),
    getVehicleOptions: vi.fn(),
    getDrivers: vi.fn(),
    getDestinations: vi.fn(),
  },
}));

vi.mock("../src/services/placeServices.js", () => ({
  default: { searchAddresses: vi.fn(), getAddress: vi.fn() },
}));

const requester = { userId: 2, email: "jane@oc.edu", firstName: "Jane", lastName: "Doe", roles: [], token: "t" };
const admin = { ...requester, userId: 9, firstName: "Ada", lastName: "Admin", roles: [{ id: 1, role: "admin", areaId: null }] };

const athletics = { id: 1, name: "Athletics" };
const music = { id: 2, name: "Music" };
const dana = { id: 1, firstName: "Dana", lastName: "Reyes", licenseExpirationDate: "2035-01-01", hasCdl: false };
const sam = { id: 2, firstName: "Sam", lastName: "Okafor", licenseExpirationDate: "2035-01-01", hasCdl: true };
const okc = { id: 1, name: "Paycom Center", city: "Oklahoma City", state: "OK", isSaved: true };
const tulsa = { id: 2, name: "BOK Center", city: "Tulsa", state: "OK", isSaved: true };
const van = { id: 5, universityId: "VAN-101", year: 2022, make: "Ford", model: "Transit", passengerCapacity: 8, vehicleType: { name: "Van" } };

const day = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toDateInput(date);
};

const tripRequest = (overrides = {}) => ({
  id: 1,
  userId: requester.userId,
  areaId: athletics.id,
  purpose: "Away game",
  startAt: day(0),
  endAt: day(0),
  allDay: true,
  numberOfPeople: 9,
  estimatedMiles: 210,
  status: "pending",
  approverId: null,
  approvedAt: null,
  createdAt: new Date().toISOString(),
  area: athletics,
  user: { id: requester.userId, firstName: "Jane", lastName: "Doe", email: requester.email },
  approver: null,
  drivers: [dana],
  destinations: [tulsa],
  vehicles: [],
  ...overrides,
});

const farTrip = tripRequest({
  id: 2,
  purpose: "Spring retreat",
  startAt: day(400),
  endAt: day(401),
  status: "reserved",
  areaId: music.id,
  area: music,
  destinations: [okc],
  drivers: [sam],
});

const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await flushPromises();
  }
};

const waitFor = async (assertion, timeout = 2000) => {
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

const mountAppAt = async (path, user = requester) => {
  signInAs(user);
  await router.push(path);
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

const named = (text) =>
  [...document.body.querySelectorAll("button, a, .v-chip")].find((el) => el.textContent.trim() === text);

const click = async (text) => {
  const element = await waitFor(() => {
    const match = named(text);
    expect(match).toBeDefined();
    return match;
  });
  element.click();
  await settle();
};

const byTest = (id) => document.body.querySelector(`[data-test="${id}"]`);
const rowTexts = () => [...document.body.querySelectorAll(".v-data-table tbody tr")].map((row) => row.textContent);
const field = (label, name = "VTextField") =>
  wrapper.findAllComponents({ name }).find((component) => component.props("label") === label);
const stopNames = () =>
  [...document.body.querySelectorAll('[data-test="stop"] .route-title')].map((el) => el.textContent.replace(/\s+/g, " ").trim());

/** Fill every required field on the new request form except drivers and destinations. */
const fillBasics = async () => {
  field("Area", "VSelect").vm.$emit("update:modelValue", athletics.id);
  await field("Number of people").setValue("9");
  await field("Purpose", "VTextarea").setValue("Away game");
  await field("Start date").setValue("2030-12-18");
  await field("End date").setValue("2030-12-21");
  await settle();
};

const addSavedDestination = async (destination) => {
  const picker = wrapper
    .findAllComponents({ name: "VAutocomplete" })
    .find((component) => component.props("placeholder") === "Add a saved destination");
  picker.vm.$emit("update:modelValue", destination);
  await settle();
};

const selectDrivers = async (ids) => {
  field("Drivers", "VAutocomplete").vm.$emit("update:modelValue", ids);
  await settle();
};

// The request views are lazy-loaded routes; compile them once up front so no single test pays for it.
beforeAll(async () => {
  await Promise.all([import("../src/views/Request.vue"), import("../src/views/Admin/Requests.vue")]);
});

beforeEach(async () => {
  signInAs(null);
  vi.resetAllMocks();
  areaServices.getAreas.mockResolvedValue({ data: [athletics, music] });
  requestServices.getDrivers.mockResolvedValue({ data: [dana, sam] });
  requestServices.getDestinations.mockResolvedValue({ data: [okc, tulsa] });
  requestServices.getMyRequests.mockResolvedValue({ data: [] });
  requestServices.getRequests.mockResolvedValue({ data: [] });
  await router.push("/login");
  await router.isReady();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 8 — Vehicle Request Management", () => {
  describe("US-8.1 — Create vehicle request", () => {
    it("Authenticated user creates a request", async () => {
      const created = tripRequest({ id: 7, startAt: "2030-12-18", endAt: "2030-12-21" });
      requestServices.createRequest.mockResolvedValue({ status: 201, data: created });
      requestServices.getRequest.mockResolvedValue({ data: created });
      await mountAppAt("/");

      await click("+ New Request");
      await waitFor(() => expect(router.currentRoute.value.name).toBe("createRequest"));
      await fillBasics();
      await selectDrivers([dana.id]);
      await addSavedDestination(tulsa);
      await click("Submit request");

      await waitFor(() => expect(requestServices.createRequest).toHaveBeenCalledTimes(1));
      expect(requestServices.createRequest).toHaveBeenCalledWith({
        areaId: athletics.id,
        purpose: "Away game",
        numberOfPeople: 9,
        allDay: true,
        startAt: "2030-12-18",
        endAt: "2030-12-21",
        drivers: [dana.id],
        destinations: [{ id: tulsa.id }],
      });
      await waitFor(() => expect(router.currentRoute.value.params.requestId).toBe("7"));
    });

    it("User adds drivers to a new request", async () => {
      requestServices.createRequest.mockResolvedValue({ status: 201, data: tripRequest() });
      requestServices.getRequest.mockResolvedValue({ data: tripRequest() });
      await mountAppAt("/requests/new");

      await fillBasics();
      await selectDrivers([dana.id, sam.id]);
      await addSavedDestination(okc);

      const chips = [...byTest("drivers").querySelectorAll(".v-chip")].map((chip) => chip.textContent.trim());
      expect(chips).toEqual(["Dana Reyes", "Sam Okafor"]);

      await click("Submit request");
      await waitFor(() => expect(requestServices.createRequest).toHaveBeenCalledTimes(1));
      expect(requestServices.createRequest.mock.calls[0][0].drivers).toEqual([dana.id, sam.id]);
    });

    it("User adds destinations to a new request", async () => {
      requestServices.createRequest.mockResolvedValue({ status: 201, data: tripRequest() });
      requestServices.getRequest.mockResolvedValue({ data: tripRequest() });
      await mountAppAt("/requests/new");

      await fillBasics();
      await selectDrivers([dana.id]);
      await addSavedDestination(okc);
      await addSavedDestination(tulsa);
      await click("Custom address");
      await field("Place name").setValue("Grandma's House");
      await field("City").setValue("Guthrie");
      await field("State").setValue("OK");
      byTest("add-custom-destination").click();
      await settle();

      await waitFor(() => expect(stopNames()).toEqual(["Paycom Center", "BOK Center", "Grandma's House New"]));

      await click("Submit request");
      await waitFor(() => expect(requestServices.createRequest).toHaveBeenCalledTimes(1));
      expect(requestServices.createRequest.mock.calls[0][0].destinations).toEqual([
        { id: okc.id },
        { id: tulsa.id },
        { name: "Grandma's House", addressLine1: "", addressLine2: "", city: "Guthrie", state: "OK", zipCode: "" },
      ]);
    });

    it("User searches for a custom address", async () => {
      requestServices.createRequest.mockResolvedValue({ status: 201, data: tripRequest() });
      requestServices.getRequest.mockResolvedValue({ data: tripRequest() });
      const suggestion = { placeId: "place-1", name: "202 E Oklahoma Ave", description: "Guthrie, OK, USA" };
      placeServices.searchAddresses.mockResolvedValue({ data: [suggestion] });
      placeServices.getAddress.mockResolvedValue({
        data: { addressLine1: "202 East Oklahoma Avenue", addressLine2: "", city: "Guthrie", state: "OK", zipCode: "73044" },
      });
      await mountAppAt("/requests/new");
      await fillBasics();
      await selectDrivers([dana.id]);
      await click("Custom address");
      const search = await waitFor(() => {
        const match = field("Search for an address", "VAutocomplete");
        expect(match).toBeDefined();
        return match;
      });

      // Too short to search; then one search after typing pauses, not one per keystroke.
      search.vm.$emit("update:search", "20");
      search.vm.$emit("update:search", "202 E");
      search.vm.$emit("update:search", "202 E Okla");
      await waitFor(() => expect(placeServices.searchAddresses).toHaveBeenCalledTimes(1));
      const [input, sessionToken] = placeServices.searchAddresses.mock.calls[0];
      expect(input).toBe("202 E Okla");

      search.vm.$emit("update:modelValue", suggestion);
      await waitFor(() => expect(field("City").props("modelValue")).toBe("Guthrie"));
      // Same session token for the lookup, so Google bills one session.
      expect(placeServices.getAddress).toHaveBeenCalledWith("place-1", sessionToken);
      expect(field("Place name").props("modelValue")).toBe("202 E Oklahoma Ave");
      expect(field("Street address").props("modelValue")).toBe("202 East Oklahoma Avenue");

      // The filled fields stay editable.
      await field("Place name").setValue("First Baptist Church");
      byTest("add-custom-destination").click();
      await settle();
      await click("Submit request");
      await waitFor(() => expect(requestServices.createRequest).toHaveBeenCalledTimes(1));
      expect(requestServices.createRequest.mock.calls[0][0].destinations).toEqual([
        { name: "First Baptist Church", addressLine1: "202 East Oklahoma Avenue", addressLine2: "", city: "Guthrie", state: "OK", zipCode: "73044" },
      ]);
    });

    it("User adds more than ten destinations", async () => {
      await mountAppAt("/requests/new");

      for (let i = 0; i < 10; i += 1) {
        await addSavedDestination(i % 2 ? okc : tulsa);
      }

      expect(stopNames()).toHaveLength(10);
      expect(byTest("stops-full").textContent).toContain("up to 10 stops");
      expect(named("Custom address").disabled).toBe(true);
      const picker = wrapper
        .findAllComponents({ name: "VAutocomplete" })
        .find((component) => component.props("placeholder") === "Add a saved destination");
      expect(picker.props("disabled")).toBe(true);
    });

    it("User reorders destinations on a new request", async () => {
      requestServices.createRequest.mockResolvedValue({ status: 201, data: tripRequest() });
      requestServices.getRequest.mockResolvedValue({ data: tripRequest() });
      await mountAppAt("/requests/new");

      await fillBasics();
      await selectDrivers([dana.id]);
      await addSavedDestination(okc);
      await addSavedDestination(tulsa);
      document.body.querySelector('[aria-label="Move Paycom Center down"]').click();
      await settle();

      expect(stopNames()).toEqual(["BOK Center", "Paycom Center"]);

      await click("Submit request");
      await waitFor(() => expect(requestServices.createRequest).toHaveBeenCalledTimes(1));
      expect(requestServices.createRequest.mock.calls[0][0].destinations).toEqual([{ id: tulsa.id }, { id: okc.id }]);
    });

    it("Vehicle assignment is hidden during creation", async () => {
      await mountAppAt("/requests/new", admin);

      await waitFor(() => expect(document.body.textContent).toContain("New Request"));
      expect(byTest("vehicles")).toBeNull();
      expect(byTest("review")).toBeNull();
    });

    it("lists approved drivers and saved destinations in their dropdowns", async () => {
      await mountAppAt("/requests/new");
      const menuItems = () => [...document.body.querySelectorAll(".v-overlay--active .v-list-item")].map((el) => el.textContent);
      const openMenu = async (component) => {
        await component.find(".v-field").trigger("mousedown");
        await settle();
      };

      await openMenu(field("Drivers", "VAutocomplete"));
      await waitFor(() => expect(menuItems()).toHaveLength(2));
      expect(menuItems()[0]).toContain("Dana Reyes");
      expect(menuItems()[1]).toContain("Sam Okafor");
      expect(menuItems()[1]).toContain("CDL");

      await openMenu(
        wrapper.findAllComponents({ name: "VAutocomplete" }).find((c) => c.props("placeholder") === "Add a saved destination"),
      );
      await waitFor(() => expect(menuItems().join()).toContain("Paycom Center"));
      expect(menuItems().join()).toContain("Oklahoma City, OK");
    });

    it("blocks submitting a request with missing required fields", async () => {
      await mountAppAt("/requests/new");

      await click("Submit request");

      expect(requestServices.createRequest).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
      expect(document.body.textContent).toContain("Add at least one driver.");
      expect(byTest("destinations-error").textContent).toContain("Add at least one destination.");
    });

    it("shows the API error when saving fails", async () => {
      requestServices.createRequest.mockRejectedValue({ response: { data: { message: "Dana Reyes's license has expired." } } });
      await mountAppAt("/requests/new");

      await fillBasics();
      await selectDrivers([dana.id]);
      await addSavedDestination(okc);
      await click("Submit request");

      await waitFor(() => expect(document.body.querySelector(".v-alert").textContent).toContain("license has expired"));
    });
  });

  describe("US-8.2 — View list of my vehicle requests", () => {
    it("User views requests as a table", async () => {
      requestServices.getMyRequests.mockResolvedValue({ data: [tripRequest(), farTrip] });
      await mountAppAt("/");

      await waitFor(() => expect(rowTexts()).toHaveLength(2));
      expect(document.body.textContent).toContain("My Requests");
      expect(rowTexts().join()).toContain("Away game");
      expect(rowTexts().join()).toContain("BOK Center");
    });

    it("User views requests as a weekly calendar", async () => {
      requestServices.getMyRequests.mockResolvedValue({ data: [tripRequest(), farTrip] });
      await mountAppAt("/");

      await click("Week");

      const calendar = await waitFor(() => {
        const element = document.body.querySelector(".v-calendar");
        expect(element).not.toBeNull();
        return element;
      });
      await waitFor(() => expect(calendar.textContent).toContain("Away game"));
      expect(calendar.textContent).not.toContain("Spring retreat");
    });

    it("User views requests as a monthly calendar", async () => {
      requestServices.getMyRequests.mockResolvedValue({ data: [tripRequest(), farTrip] });
      await mountAppAt("/");

      await click("Month");

      await waitFor(() => expect(document.body.querySelector(".v-calendar")?.textContent).toContain("Away game"));
      expect(document.body.querySelector(".v-calendar").textContent).not.toContain("Spring retreat");
    });

    it("User searches and filters requests", async () => {
      requestServices.getMyRequests.mockResolvedValue({ data: [tripRequest(), farTrip] });
      await mountAppAt("/");
      await waitFor(() => expect(rowTexts()).toHaveLength(2));

      const search = wrapper
        .findAllComponents({ name: "VTextField" })
        .find((component) => component.props("placeholder")?.startsWith("Search"));
      await search.setValue("tulsa");
      await settle();
      expect(rowTexts()).toHaveLength(1);
      expect(rowTexts()[0]).toContain("Away game");

      await search.setValue("");
      field("Status", "VSelect").vm.$emit("update:modelValue", ["reserved"]);
      await settle();
      expect(rowTexts()).toHaveLength(1);
      expect(rowTexts()[0]).toContain("Spring retreat");
    });

    it("shows the empty state when the user has no requests", async () => {
      await mountAppAt("/");

      await waitFor(() => expect(document.body.textContent).toContain("You have not submitted any requests."));
    });

    it("shows an error alert when requests fail to load", async () => {
      requestServices.getMyRequests.mockRejectedValue({ response: { data: { message: "Server down." } } });
      await mountAppAt("/");

      await waitFor(() => expect(document.body.querySelector(".v-alert")?.textContent).toContain("Server down."));
    });
  });

  describe("US-8.3 — View my single vehicle request", () => {
    it("User views the details of their own request", async () => {
      requestServices.getMyRequests.mockResolvedValue({ data: [tripRequest()] });
      requestServices.getRequest.mockResolvedValue({ data: tripRequest() });
      await mountAppAt("/");
      await waitFor(() => expect(rowTexts()).toHaveLength(1));

      document.body.querySelector(".v-data-table tbody tr").click();
      await settle();

      await waitFor(() => expect(router.currentRoute.value.name).toBe("request"));
      expect(requestServices.getRequest).toHaveBeenCalledWith("1");
      await waitFor(() => expect(stopNames()).toEqual(["BOK Center"]));
      expect(document.body.querySelector('[data-test="purpose"] textarea').value).toBe("Away game");
      // The request number stays in the URL only.
      expect(document.body.textContent).not.toContain("#1");
      expect(document.body.textContent).toContain("Submitted by");
      expect(byTest("drivers").textContent).toContain("Dana Reyes");
      expect(byTest("review")).toBeNull();
    });

    it("locks the form once the request is no longer pending", async () => {
      requestServices.getRequest.mockResolvedValue({ data: tripRequest({ status: "reserved" }) });
      await mountAppAt("/requests/1");

      await waitFor(() => expect(byTest("locked")).not.toBeNull());
      expect(document.body.querySelector('[data-test^="save-"]')).toBeNull();
      expect(byTest("cancel-request")).not.toBeNull();
    });
  });

  describe("US-8.4 — List vehicle requests for admins", () => {
    it("Admin sees all requests", async () => {
      requestServices.getRequests.mockResolvedValue({ data: [tripRequest(), farTrip] });
      await mountAppAt("/requests", admin);

      await waitFor(() => expect(rowTexts()).toHaveLength(2));
      expect(document.body.textContent).toContain("Requests");
      expect(rowTexts().join()).toContain("Athletics");
      expect(rowTexts().join()).toContain("Music");
      expect(rowTexts().join()).toContain("Jane Doe");
      // My Requests is pinned above the Sidebar profile.
      const navLabels = [
        ...document.body.querySelectorAll('[aria-label="Main navigation"] a, [aria-label="Pinned navigation"] a'),
      ].map((link) => link.textContent.trim());
      expect(navLabels).toEqual(expect.arrayContaining(["My Requests", "Requests"]));
      for (const view of ["Table", "Week", "Month"]) {
        expect(named(view)).toBeDefined();
      }
    });

    it("keeps requesters out of the admin requests view", async () => {
      await mountAppAt("/requests");

      await waitFor(() => expect(router.currentRoute.value.name).toBe("home"));
      expect(requestServices.getRequests).not.toHaveBeenCalled();
    });

    it("shows the admin empty state", async () => {
      await mountAppAt("/requests", admin);

      await waitFor(() => expect(document.body.textContent).toContain("No one has any submitted requests."));
    });
  });

  describe("US-8.5 — Search and filter vehicle requests", () => {
    it("Admin searches and filters requests", async () => {
      requestServices.getRequests.mockResolvedValue({ data: [tripRequest(), farTrip] });
      await mountAppAt("/requests", admin);
      await waitFor(() => expect(rowTexts()).toHaveLength(2));

      byTest("toggle-filters").click();
      await settle();
      field("Driver", "VAutocomplete").vm.$emit("update:modelValue", sam.id);
      await settle();

      expect(rowTexts()).toHaveLength(1);
      expect(rowTexts()[0]).toContain("Spring retreat");

      field("Driver", "VAutocomplete").vm.$emit("update:modelValue", null);
      field("Area", "VAutocomplete").vm.$emit("update:modelValue", athletics.id);
      await settle();
      expect(rowTexts()).toHaveLength(1);
      expect(rowTexts()[0]).toContain("Away game");
    });

    it("Admin filters to requests awaiting their action", async () => {
      const awaiting = tripRequest({ id: 3, purpose: "Choir tour", status: "awaiting_vehicle" });
      const cancelled = tripRequest({ id: 4, purpose: "Old trip", status: "cancelled" });
      requestServices.getRequests.mockResolvedValue({ data: [tripRequest(), awaiting, cancelled, farTrip] });
      await mountAppAt("/requests", admin);
      await waitFor(() => expect(rowTexts()).toHaveLength(4));

      byTest("needs-action").click();
      await settle();

      const rows = rowTexts().join();
      expect(rowTexts()).toHaveLength(2);
      expect(rows).toContain("Away game");
      expect(rows).toContain("Choir tour");
    });
  });

  describe("US-8.6 — Admin views single vehicle request", () => {
    it("Admin views the details of a request", async () => {
      requestServices.getRequests.mockResolvedValue({ data: [tripRequest()] });
      requestServices.getRequest.mockResolvedValue({ data: tripRequest() });
      await mountAppAt("/requests", admin);
      await waitFor(() => expect(rowTexts()).toHaveLength(1));

      document.body.querySelector(".v-data-table tbody tr").click();
      await settle();

      await waitFor(() => expect(byTest("review")).not.toBeNull());
      expect(document.body.textContent).toContain("Submitted by Jane Doe");
      expect(byTest("vehicles")).not.toBeNull();
      expect(document.body.querySelector(".v-breadcrumbs").textContent).toContain("Requests");
    });
  });

  describe("US-8.7 — Admin edits vehicle request", () => {
    it("Admin changes a request's status", async () => {
      requestServices.getRequest.mockResolvedValue({ data: tripRequest() });
      requestServices.updateRequest.mockResolvedValue({
        data: tripRequest({ status: "awaiting_vehicle", approvedAt: new Date().toISOString(), approver: admin }),
      });
      await mountAppAt("/requests/1", admin);

      await click("Approve");

      expect(requestServices.updateRequest).toHaveBeenCalledWith(1, { status: "awaiting_vehicle" });
      await waitFor(() => expect(document.body.textContent).toContain("Awaiting vehicle"));
      expect(named("Approve")).toBeUndefined();
    });

    it("warns admins that editing an approved request resets it to pending", async () => {
      requestServices.getRequest.mockResolvedValue({
        data: tripRequest({ status: "awaiting_vehicle", approvedAt: new Date().toISOString() }),
      });
      await mountAppAt("/requests/1", admin);
      await waitFor(() => expect(field("Number of people")).toBeDefined());

      await field("Number of people").setValue("14");
      await settle();

      expect(document.body.textContent).toContain("send this request back to pending");
    });
  });

  describe("US-8.8 — Assign vehicles to requests", () => {
    it("Admin assigns vehicles to a request", async () => {
      requestServices.getRequest.mockResolvedValue({ data: tripRequest({ status: "awaiting_vehicle" }) });
      requestServices.getVehicleOptions.mockResolvedValue({
        data: [{ vehicle: van, cdlOk: true, conflictingRequestIds: [], outOfService: false, milesUntilService: null }],
      });
      requestServices.updateRequest.mockResolvedValue({ data: tripRequest({ status: "reserved", vehicles: [van] }) });
      await mountAppAt("/requests/1", admin);

      await waitFor(() => expect(byTest("assign-vehicles")).not.toBeNull());
      byTest("assign-vehicles").click();
      await settle();
      const option = await waitFor(() => {
        const element = byTest("vehicle-option");
        expect(element).not.toBeNull();
        return element;
      });
      option.click();
      await settle();

      // 8 seats for 9 people: flagged but still saveable (FR-004).
      expect(byTest("capacity-warning").textContent).toContain("8 seats selected for 9 people");
      byTest("save-vehicles").click();
      await settle();

      expect(requestServices.updateRequest).toHaveBeenCalledWith(1, { vehicles: [van.id] });
      await waitFor(() => expect(byTest("vehicles").textContent).toContain("2022 Ford Transit"));
      expect(document.body.textContent).toContain("Reserved");
      expect(byTest("vehicles").querySelector('[data-test="capacity-warning"]')).not.toBeNull();
    });

    it("hides reserved and CDL-only vehicles until the admin clears those filters", async () => {
      requestServices.getRequest.mockResolvedValue({ data: tripRequest() });
      requestServices.getVehicleOptions.mockResolvedValue({
        data: [
          { vehicle: van, cdlOk: true, conflictingRequestIds: [4], outOfService: false, milesUntilService: null },
          {
            vehicle: { ...van, id: 6, universityId: "BUS-1", vehicleType: { name: "Bus" } },
            cdlOk: false,
            conflictingRequestIds: [],
            outOfService: false,
            milesUntilService: null,
          },
        ],
      });
      await mountAppAt("/requests/1", admin);

      await waitFor(() => expect(byTest("assign-vehicles")).not.toBeNull());
      byTest("assign-vehicles").click();
      await settle();

      await waitFor(() => expect(document.body.textContent).toContain("2 hidden by filters"));
      expect(document.body.querySelectorAll('[data-test="vehicle-option"]')).toHaveLength(0);

      await click("Available on these dates");
      await click("Drivable by these drivers");
      await waitFor(() => expect(document.body.querySelectorAll('[data-test="vehicle-option"]')).toHaveLength(2));
      expect(document.body.textContent).toContain("Reserved");
      expect(document.body.textContent).not.toContain("#4");
      expect(document.body.textContent).toContain("Needs CDL driver");
    });
  });

  describe("US-8.9 — View estimated mileage of trip", () => {
    it("Estimated mileage is added when a request is created", async () => {
      requestServices.getRequest.mockResolvedValue({ data: tripRequest({ estimatedMiles: 1210 }) });
      await mountAppAt("/requests/1");

      await waitFor(() => expect(byTest("estimated-miles")?.textContent).toContain("1,210 mi"));
    });

    it("Estimated mileage updates when destinations change", async () => {
      requestServices.getRequest.mockResolvedValue({ data: tripRequest() });
      requestServices.updateRequest.mockResolvedValue({ data: tripRequest({ destinations: [okc, tulsa], estimatedMiles: 230 }) });
      await mountAppAt("/requests/1");
      await waitFor(() => expect(byTest("estimated-miles")?.textContent).toContain("210 mi"));

      await addSavedDestination(okc);
      byTest("save-stops").click();
      await settle();

      expect(requestServices.updateRequest.mock.calls[0][1].destinations).toEqual([{ id: tulsa.id }, { id: okc.id }]);
      await waitFor(() => expect(byTest("estimated-miles").textContent).toContain("230 mi"));
    });

    it("shows unknown mileage when the trip couldn't be estimated", async () => {
      requestServices.getRequest.mockResolvedValue({ data: tripRequest({ estimatedMiles: null }) });
      await mountAppAt("/requests/1");

      await waitFor(() => expect(byTest("estimated-miles")?.textContent).toContain("Unknown"));
      expect(document.body.textContent).toContain("mileage couldn't be estimated");
    });
  });
});
