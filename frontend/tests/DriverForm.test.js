/**
 * Feature 7 — Driver create and edit page
 * Spec: features/feature-7-drivers.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import driverServices from "../src/services/driverServices.js";
import { apiError, settle, signInAs, vuetify, waitFor } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/driverServices.js", () => ({
  default: {
    getDrivers: vi.fn(),
    getDriver: vi.fn(),
    getAvailableUsers: vi.fn(),
    createDriver: vi.fn(),
    updateDriver: vi.fn(),
    removeDriver: vi.fn(),
  },
}));

const roles = [{ id: 1, role: "admin", areaId: null, area: null }];
const freeUser = { id: 7, firstName: "Fay", lastName: "Free", email: "fay@oc.edu" };
const linkedUser = { id: 8, firstName: "Lin", lastName: "Linked", email: "lin@oc.edu" };

const driver = {
  id: 1,
  userId: linkedUser.id,
  firstName: "John",
  lastName: "Doe",
  phoneNumber: "405-425-1234",
  licenseState: "TX",
  licenseExpirationDate: "2027-09-01",
  status: "approved",
  approvedAt: "2026-07-02T12:00:00.000Z",
};

let wrapper;

const mountAppAt = async (path) => {
  await router.push(path);
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
};

const field = (name, label) =>
  waitFor(() => {
    const match = wrapper.findAllComponents({ name }).find((component) => component.props("label") === label);
    expect(match).toBeDefined();
    return match;
  });

const textField = (label) => field("VTextField", label);
const selectField = (label) => field("VSelect", label);
const userField = () => field("VAutocomplete", "User");

const listedOptions = () =>
  [...document.body.querySelectorAll(".v-overlay--active .v-list-item")].map((el) => el.textContent.trim());

const button = (text) => [...document.body.querySelectorAll("button")].find((el) => el.textContent.trim() === text);

const clickSave = async () => {
  button("Save").click();
  await settle();
};

const fillRequired = async (overrides = {}) => {
  const values = {
    "First Name": "John",
    "Last Name": "Doe",
    "Phone Number": "405-425-1234",
    "License Expiration Date": "2027-09-01",
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    await (await textField(label)).setValue(value);
  }
  await settle();
};

beforeEach(async () => {
  signInAs(null);
  vi.resetAllMocks();
  apiClient.get.mockImplementation(async () => ({ data: { roles } }));
  driverServices.getDrivers.mockResolvedValue({ data: [] });
  driverServices.getDriver.mockResolvedValue({ data: driver });
  driverServices.getAvailableUsers.mockResolvedValue({ data: [freeUser] });
  driverServices.createDriver.mockResolvedValue({ status: 201, data: driver });
  driverServices.updateDriver.mockResolvedValue({ status: 200, data: driver });
  await router.push("/login");
  await router.isReady();
  signInAs({ userId: 2, email: "jane@oc.edu", firstName: "Jane", lastName: "Doe", roles, token: "token" });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 7 — Driver form", () => {
  describe("US-7.1 — Create drivers", () => {
    it("Driver is created", async () => {
      await mountAppAt("/drivers/new");

      expect(wrapper.find("h2").text()).toBe("New Driver");
      expect(document.body.querySelector(".v-breadcrumbs").textContent).toContain("Drivers");
      expect((await selectField("License State")).props("modelValue")).toBe("OK");
      expect((await selectField("Status")).props("modelValue")).toBe("pending");

      await (await userField()).setValue(freeUser.id);
      await fillRequired({ "First Name": "  John ", "Last Name": " Doe  ", "Phone Number": " 405-425-1234 " });
      await clickSave();

      expect(driverServices.createDriver).toHaveBeenCalledWith({
        userId: freeUser.id,
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "405-425-1234",
        licenseState: "OK",
        licenseExpirationDate: "2027-09-01",
        status: "pending",
      });
      expect(driverServices.updateDriver).not.toHaveBeenCalled();
      await waitFor(() => expect(router.currentRoute.value.name).toBe("drivers"));
    });

    it("User field on driver form shows available users", async () => {
      await mountAppAt("/drivers/new");

      expect(driverServices.getAvailableUsers).toHaveBeenCalledWith(undefined);
      expect((await userField()).props("items")).toEqual([freeUser]);
      expect((await userField()).props("modelValue")).toBeNull();

      wrapper.unmount();
      await router.push("/");
      driverServices.getAvailableUsers.mockResolvedValue({ data: [freeUser, linkedUser] });
      await mountAppAt("/drivers/1");

      expect(driverServices.getAvailableUsers).toHaveBeenLastCalledWith("1");
      expect((await userField()).props("items")).toEqual([freeUser, linkedUser]);
      expect((await userField()).props("modelValue")).toBe(linkedUser.id);
    });

    it("Search users in the user field", async () => {
      driverServices.getAvailableUsers.mockResolvedValue({ data: [freeUser, linkedUser] });
      await mountAppAt("/drivers/new");

      const input = (await userField()).find("input");
      await input.trigger("focus");
      for (const [query, expected] of [
        ["LIN", ["Lin Linked (lin@oc.edu)"]],
        ["fay@", ["Fay Free (fay@oc.edu)"]],
        ["oc.edu", ["Fay Free (fay@oc.edu)", "Lin Linked (lin@oc.edu)"]],
      ]) {
        await input.setValue(query);
        await settle();
        await waitFor(() => expect(listedOptions()).toEqual(expected));
      }

      await input.setValue("nobody");
      await settle();
      await waitFor(() => expect(document.body.querySelector(".v-overlay--active").textContent).toContain("No matching users."));

      await input.setValue("lin");
      await settle();
      await waitFor(() => expect(listedOptions()).toHaveLength(1));
      document.body.querySelector(".v-overlay--active .v-list-item").click();
      await settle();
      expect((await userField()).props("modelValue")).toBe(linkedUser.id);
    });

    it("Client validation blocks submit before the API call", async () => {
      await mountAppAt("/drivers/new");

      const cases = [
        [{ "First Name": "   " }, "Required"],
        [{ "First Name": "f".repeat(256) }, "Must be 255 characters or fewer."],
        [{ "Last Name": "" }, "Required"],
        [{ "Last Name": "l".repeat(256) }, "Must be 255 characters or fewer."],
        [{ "Phone Number": "" }, "Required"],
        [{ "Phone Number": "(405)425-1234" }, "Phone number must be in format xxx-xxx-xxxx."],
        [{ "Phone Number": "4054251234" }, "Phone number must be in format xxx-xxx-xxxx."],
        [{ "License Expiration Date": "" }, "Required"],
      ];

      for (const [overrides, message] of cases) {
        await fillRequired(overrides);
        await clickSave();

        await waitFor(() => expect(document.body.querySelector(".v-input--error .v-messages__message")?.textContent).toContain(message));
        expect(driverServices.createDriver).not.toHaveBeenCalled();
        expect(router.currentRoute.value.name).toBe("driverCreate");
      }

      // A blank state is blocked the same way.
      await fillRequired();
      await (await selectField("License State")).setValue(null);
      await settle();
      await clickSave();
      expect(driverServices.createDriver).not.toHaveBeenCalled();
    });

    it("Failed save shows the API message and stays on the page", async () => {
      driverServices.createDriver.mockRejectedValue(apiError(400, "User is already linked to a driver."));
      await mountAppAt("/drivers/new");
      await fillRequired();
      await clickSave();

      await waitFor(() => expect(document.body.querySelector(".v-alert").textContent).toContain("User is already linked to a driver."));
      expect(router.currentRoute.value.name).toBe("driverCreate");
    });
  });

  describe("US-7.3 — Manage driver rows", () => {
    it("Edit driver row", async () => {
      await mountAppAt("/drivers/1");

      expect(wrapper.find("h2").text()).toBe("John Doe");
      expect((await textField("First Name")).props("modelValue")).toBe("John");
      expect((await textField("Last Name")).props("modelValue")).toBe("Doe");
      expect((await textField("Phone Number")).props("modelValue")).toBe("405-425-1234");
      expect((await textField("License Expiration Date")).props("modelValue")).toBe("2027-09-01");
      expect((await selectField("License State")).props("modelValue")).toBe("TX");
      expect((await selectField("Status")).props("modelValue")).toBe("approved");
    });

    it("Failed load shows the API message", async () => {
      driverServices.getDriver.mockRejectedValue(apiError(404, "Driver with id=1 not found."));
      await mountAppAt("/drivers/1");

      await waitFor(() => expect(document.body.querySelector(".v-alert").textContent).toContain("Driver with id=1 not found."));
      expect(button("Save")).toBeUndefined();
    });
  });

  describe("US-7.4 — Edit and delete drivers", () => {
    it("Saving edits returns to the drivers view", async () => {
      await mountAppAt("/drivers/1");

      await (await textField("First Name")).setValue("Johnny");
      await (await selectField("Status")).setValue("former");
      await (await userField()).setValue(null);
      await settle();
      await clickSave();

      expect(driverServices.updateDriver).toHaveBeenCalledWith("1", {
        userId: null,
        firstName: "Johnny",
        lastName: "Doe",
        phoneNumber: "405-425-1234",
        licenseState: "TX",
        licenseExpirationDate: "2027-09-01",
        status: "former",
      });
      expect(driverServices.createDriver).not.toHaveBeenCalled();
      await waitFor(() => expect(router.currentRoute.value.name).toBe("drivers"));
    });

    it("Cancel returns to the drivers view without saving", async () => {
      await mountAppAt("/drivers/1");

      await (await textField("First Name")).setValue("Johnny");
      button("Cancel").click();
      await settle();

      expect(driverServices.updateDriver).not.toHaveBeenCalled();
      await waitFor(() => expect(router.currentRoute.value.name).toBe("drivers"));
    });
  });
});
