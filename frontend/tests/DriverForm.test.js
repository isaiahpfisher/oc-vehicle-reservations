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
  email: "john.doe@gmail.com",
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
    Email: "john@oc.edu",
    "Phone Number": "405-425-1234",
    "License Expiration Date": "2027-09-01",
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    // `undefined` leaves the field as it is.
    if (value === undefined) continue;
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

      // Linking a user fills in their email.
      await (await userField()).setValue(freeUser.id);
      await settle();
      expect((await textField("Email")).props("modelValue")).toBe("fay@oc.edu");
      await fillRequired({ "First Name": "  John ", "Last Name": " Doe  ", Email: undefined, "Phone Number": " 405-425-1234 " });
      await clickSave();

      expect(driverServices.createDriver).toHaveBeenCalledWith({
        userId: freeUser.id,
        firstName: "John",
        lastName: "Doe",
        email: "fay@oc.edu",
        phoneNumber: "405-425-1234",
        licenseState: "OK",
        licenseExpirationDate: "2027-09-01",
        status: "pending",
      });
      expect(driverServices.updateDriver).not.toHaveBeenCalled();
      await waitFor(() => expect(router.currentRoute.value.name).toBe("drivers"));
    });

    // UI/UX backlog #65: a phone number typed any common way is saved as 405-425-1234.
    it("Driver phone number is accepted in any common format", async () => {
      await mountAppAt("/drivers/new");
      await fillRequired({ "Phone Number": "(405) 425-1234" });
      await clickSave();

      expect(driverServices.createDriver).toHaveBeenCalledWith(expect.objectContaining({ phoneNumber: "405-425-1234" }));
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
      await waitFor(() => expect(document.body.querySelector(".v-overlay--active:not(.v-snackbar)").textContent).toContain("No matching users."));

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
        [{ Email: "" }, "Required"],
        [{ Email: "john@oc" }, "Enter an email address, like name@oc.edu."],
        [{ Email: "john doe@oc.edu" }, "Enter an email address, like name@oc.edu."],
        [{ "Phone Number": "" }, "Required"],
        // UI/UX backlog #65: any common format is accepted; only a number that isn't 10 digits is refused.
        [{ "Phone Number": "425-1234" }, "Enter a 10-digit phone number, like 405-425-1234."],
        [{ "Phone Number": "40542512345" }, "Enter a 10-digit phone number, like 405-425-1234."],
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
      expect((await textField("Email")).props("modelValue")).toBe("john.doe@gmail.com");
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
        email: "john.doe@gmail.com",
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

// Feature 21 (features/feature-21-ui-consistency.md): forms behave the same everywhere, shown here on the driver form.
describe("Feature 21 — UI consistency", () => {
  describe("US-21.3 — Forms behave the same everywhere", () => {
    it("Pressing Enter saves a form", async () => {
      await mountAppAt("/drivers/1");

      const phone = await textField("Phone Number");
      await phone.setValue("405-425-9999");
      phone.find("input").element.form.requestSubmit();
      await settle();

      await waitFor(() =>
        expect(driverServices.updateDriver).toHaveBeenCalledWith("1", expect.objectContaining({ phoneNumber: "405-425-9999" })),
      );
    });

    it("Leaving a changed form asks first", async () => {
      await mountAppAt("/drivers/1");

      await (await textField("Phone Number")).setValue("405-425-9999");
      const leaving = router.push({ name: "drivers" });
      await waitFor(() => expect(document.body.textContent).toContain("Discard changes?"));
      button("Keep Editing").click();
      await leaving;
      await settle();

      expect(router.currentRoute.value.name).toBe("driverDetails");
      expect((await textField("Phone Number")).props("modelValue")).toBe("405-425-9999");
      expect(driverServices.updateDriver).not.toHaveBeenCalled();
    });
  });
});
