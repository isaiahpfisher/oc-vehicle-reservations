/**
 * Feature 7 — Drivers list, row actions, and access
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

const adminRoles = [{ id: 1, role: "admin", areaId: null, area: null }];
const areaAdminRoles = [{ id: 3, role: "area_admin", areaId: 1, area: { id: 1, name: "Athletics" } }];
const maintenanceRoles = [{ id: 2, role: "maintenance", areaId: null, area: null }];

const dateString = (daysFromToday) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const john = {
  id: 1,
  userId: null,
  firstName: "John",
  lastName: "Doe",
  phoneNumber: "405-425-1234",
  licenseState: "OK",
  licenseExpirationDate: "2999-09-01",
  status: "pending",
  approvedAt: null,
};
const mary = { ...john, id: 2, firstName: "Mary", lastName: "Smith", phoneNumber: "918-555-0000", status: "approved" };
const ruth = { ...john, id: 3, firstName: "Ruth", lastName: "Adams", phoneNumber: "214-777-9999", status: "revoked" };

let roles = adminRoles;
let wrapper;

const signIn = (nextRoles = adminRoles) => {
  roles = nextRoles;
  signInAs({ userId: 2, email: "jane@oc.edu", firstName: "Jane", lastName: "Doe", roles, token: "token" });
};

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

const rows = () => [...document.body.querySelectorAll(".v-data-table tbody tr")];
const rowTexts = () => rows().map((row) => row.textContent);
// Feature 8 (US-8.2): home is My Requests, pinned at the bottom of the Sidebar.
const navLabels = () =>
  [...document.body.querySelectorAll('[aria-label="Main navigation"] a, [aria-label="Pinned navigation"] a')].map((link) =>
    link.textContent.trim(),
  );

const search = async (text) => {
  await wrapper.find('input[aria-label="Search drivers"]').setValue(text);
  await settle();
};

const clickLabeled = async (label, index = 0) => {
  const button = await waitFor(() => {
    const match = document.body.querySelectorAll(`[aria-label="${label}"]`)[index];
    expect(match).toBeDefined();
    return match;
  });
  button.click();
  await settle();
};

const dialogButton = (text) =>
  waitFor(() => {
    const match = [...document.body.querySelectorAll(".v-overlay--active button")].find((el) => el.textContent.trim() === text);
    expect(match).toBeDefined();
    return match;
  });

beforeEach(async () => {
  roles = adminRoles;
  signInAs(null);
  vi.resetAllMocks();
  // Feature 8 (US-8.2): home loads `me/requests`, so only the role refresh gets a user back.
  apiClient.get.mockImplementation(async (url) => (String(url).startsWith("users/") ? { data: { roles } } : { data: [] }));
  driverServices.getDrivers.mockResolvedValue({ data: [] });
  driverServices.getDriver.mockResolvedValue({ data: john });
  driverServices.getAvailableUsers.mockResolvedValue({ data: [] });
  driverServices.removeDriver.mockResolvedValue({ status: 200, data: { message: "Driver deleted successfully." } });
  await router.push("/login");
  await router.isReady();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 7 — Drivers", () => {
  describe("US-7.1 — Create drivers", () => {
    it("Admin or area admin clicks to creates driver", async () => {
      for (const nextRoles of [adminRoles, areaAdminRoles]) {
        signIn(nextRoles);
        await mountAppAt("/drivers");
        expect(wrapper.find("h2").text()).toBe("Driver Management");

        const create = wrapper.findAllComponents({ name: "VBtn" }).find((button) => button.text() === "+ New Driver");
        await create.trigger("click");
        await waitFor(() => expect(router.currentRoute.value.name).toBe("driverCreate"));
        await settle();

        expect(await field("VAutocomplete", "User")).toBeDefined();
        for (const label of ["License State", "Status"]) {
          expect(await field("VSelect", label)).toBeDefined();
        }
        for (const label of ["First Name", "Last Name", "Phone Number", "License Expiration Date"]) {
          expect(await field("VTextField", label)).toBeDefined();
        }

        // Fields are grouped into sections, each holding its own fields.
        const sections = [...document.body.querySelectorAll("form section")];
        expect(sections.map((section) => section.querySelector("h3").textContent.trim())).toEqual([
          "Name",
          "Contact",
          "User account",
          "License",
          "Approval",
        ]);
        expect(sections[0].textContent).toContain("First Name");
        expect(sections[0].textContent).toContain("Last Name");
        expect(sections[3].textContent).toContain("License Expiration Date");
        expect(sections[4].textContent).toContain("Status");

        wrapper.unmount();
        await router.push("/");
      }
    });
  });

  describe("US-7.2 — View drivers", () => {
    it("Empty State", async () => {
      signIn();
      await mountAppAt("/drivers");

      await waitFor(() => expect(document.body.textContent).toContain("No drivers yet. Create your first driver."));
      expect(document.body.querySelector(".v-data-table")).toBeNull();
    });

    it("Normal State", async () => {
      signIn();
      const many = Array.from({ length: 11 }, (_, i) => ({ ...john, id: i + 10, firstName: `Driver${i}` }));
      driverServices.getDrivers.mockResolvedValue({ data: [mary, ...many] });
      await mountAppAt("/drivers");

      await waitFor(() => expect(rows()).toHaveLength(10));
      const headers = [...document.body.querySelectorAll(".v-data-table thead th")].map((th) => th.textContent.trim());
      expect(headers).toEqual(["Name", "Status", "Phone Number", "License Expiration", "Actions"]);
      const name = rows()[0].querySelector("td a");
      expect(name.textContent.trim()).toBe("Mary Smith");
      expect(name.getAttribute("href")).toBe("/drivers/2");
      expect(rows()[0].textContent).toContain("Approved");
      expect(rows()[0].textContent).toContain("918-555-0000");
      expect(rows()[0].textContent).toContain("2999-09-01");

      // The 12th driver is on page 2.
      expect(document.body.querySelector(".v-data-table-footer").textContent).toContain("1-10 of 12");
      document.body.querySelector(".v-data-table-footer .v-pagination__next button").click();
      await settle();
      await waitFor(() => expect(rows()).toHaveLength(2));
    });

    it("License Expiration", async () => {
      signIn();
      driverServices.getDrivers.mockResolvedValue({
        data: [
          { ...john, licenseExpirationDate: dateString(-1) },
          { ...mary, licenseExpirationDate: dateString(0) },
          { ...ruth, licenseExpirationDate: dateString(1) },
        ],
      });
      await mountAppAt("/drivers");

      await waitFor(() => expect(rows()).toHaveLength(3));
      const highlighted = (row) => row.querySelector(".license-expired");
      expect(highlighted(rows()[0]).textContent).toContain(dateString(-1));
      expect(highlighted(rows()[1])).toBeNull();
      expect(rows()[1].textContent).toContain(dateString(0));
      expect(highlighted(rows()[2])).toBeNull();
    });

    it("Search drivers", async () => {
      signIn();
      driverServices.getDrivers.mockResolvedValue({ data: [john, mary, ruth] });
      await mountAppAt("/drivers");
      await waitFor(() => expect(rows()).toHaveLength(3));

      for (const [text, name] of [
        ["JOHN", "John"],
        ["smith", "Mary"],
        ["214-777", "Ruth"],
        ["  mary   smith ", "Mary"],
      ]) {
        await search(text);
        await waitFor(() => expect(rows()).toHaveLength(1));
        expect(rows()[0].textContent).toContain(name);
      }

      await search("nobody");
      await waitFor(() => expect(document.body.textContent).toContain("No drivers match your search."));

      await search("");
      await waitFor(() => expect(rows()).toHaveLength(3));
    });

    it("Search drivers returns to page 1", async () => {
      signIn();
      const many = Array.from({ length: 21 }, (_, i) => ({ ...john, id: i + 10, firstName: `Driver${i}` }));
      driverServices.getDrivers.mockResolvedValue({ data: many });
      await mountAppAt("/drivers");
      await waitFor(() => expect(rows()).toHaveLength(10));

      document.body.querySelector(".v-data-table-footer .v-pagination__next button").click();
      await settle();
      await waitFor(() => expect(document.body.querySelector(".v-data-table-footer").textContent).toContain("11-20 of 21"));

      await search("Driver");
      await waitFor(() => expect(document.body.querySelector(".v-data-table-footer").textContent).toContain("1-10 of 21"));
    });

    it("Filter drivers by status", async () => {
      signIn();
      driverServices.getDrivers.mockResolvedValue({ data: [john, mary, ruth] });
      await mountAppAt("/drivers");
      await waitFor(() => expect(rows()).toHaveLength(3));

      const filter = await field("VSelect", "Filter by status");
      expect(filter.props("items").map(({ value }) => value)).toEqual(["pending", "approved", "denied", "revoked", "former"]);

      await filter.setValue("revoked");
      await settle();
      await waitFor(() => expect(rows()).toHaveLength(1));
      expect(rows()[0].textContent).toContain("Ruth");

      await search("john");
      await waitFor(() => expect(document.body.textContent).toContain("No drivers match your search."));
      await search("");

      await filter.setValue(null);
      await settle();
      await waitFor(() => expect(rows()).toHaveLength(3));
    });

    it("Failed load shows the API message", async () => {
      signIn();
      driverServices.getDrivers.mockRejectedValue(apiError(500, "Failed to fetch drivers."));
      await mountAppAt("/drivers");

      await waitFor(() => expect(document.body.querySelector(".v-alert").textContent).toContain("Failed to fetch drivers."));
    });
  });

  describe("US-7.3 — Manage driver rows", () => {
    it("Edit driver row", async () => {
      signIn();
      driverServices.getDrivers.mockResolvedValue({ data: [john, mary] });
      driverServices.getDriver.mockResolvedValue({ data: mary });
      await mountAppAt("/drivers");

      await clickLabeled("Edit driver", 1);

      await waitFor(() => expect(router.currentRoute.value.path).toBe("/drivers/2"));
      await settle();
      expect(driverServices.getDriver).toHaveBeenCalledWith("2");
      expect((await field("VTextField", "First Name")).props("modelValue")).toBe("Mary");
      expect((await field("VTextField", "Phone Number")).props("modelValue")).toBe("918-555-0000");
    });

    it("Delete driver row", async () => {
      signIn();
      driverServices.getDrivers.mockResolvedValue({ data: [john] });
      await mountAppAt("/drivers");

      await clickLabeled("Delete driver");

      const confirm = await dialogButton("Delete Driver");
      expect(confirm.closest(".v-overlay--active").textContent).toContain('Delete "John Doe"? This action is permanent.');
      expect(driverServices.removeDriver).not.toHaveBeenCalled();

      (await dialogButton("Cancel")).click();
      await settle();
      expect(driverServices.removeDriver).not.toHaveBeenCalled();
      expect(rows()).toHaveLength(1);
    });
  });

  describe("US-7.4 — Edit and delete drivers", () => {
    it("Driver is deleted", async () => {
      signIn();
      driverServices.getDrivers.mockResolvedValueOnce({ data: [john] }).mockResolvedValue({ data: [] });
      await mountAppAt("/drivers");

      await clickLabeled("Delete driver");
      (await dialogButton("Delete Driver")).click();
      await settle();

      expect(driverServices.removeDriver).toHaveBeenCalledWith(john.id);
      await waitFor(() => expect(document.body.textContent).toContain("No drivers yet. Create your first driver."));
    });

    it("Failed delete stays in the dialog with the API message", async () => {
      signIn();
      driverServices.getDrivers.mockResolvedValue({ data: [john] });
      driverServices.removeDriver.mockRejectedValue(apiError(400, "Driver cannot be deleted."));
      await mountAppAt("/drivers");

      await clickLabeled("Delete driver");
      (await dialogButton("Delete Driver")).click();
      await settle();

      const confirm = await dialogButton("Delete Driver");
      expect(confirm.closest(".v-overlay--active").textContent).toContain("Driver cannot be deleted.");
      expect(rows()).toHaveLength(1);
      (await dialogButton("Cancel")).click();
      await settle();
    });
  });

  describe("US-7.5 — Signed-in admin or area admin user access only", () => {
    it("Admin or area_admin can access", async () => {
      for (const nextRoles of [adminRoles, areaAdminRoles]) {
        signIn(nextRoles);
        await mountAppAt("/");
        await waitFor(() => expect(navLabels()).toContain("Drivers"));

        for (const [path, name] of [
          ["/drivers", "drivers"],
          ["/drivers/new", "driverCreate"],
          ["/drivers/1", "driverDetails"],
        ]) {
          await router.push(path);
          await settle();
          expect(router.currentRoute.value.name).toBe(name);
        }

        wrapper.unmount();
        await router.push("/");
      }
    });

    it("Non (area) admins cannot access", async () => {
      signIn(maintenanceRoles);
      await mountAppAt("/");
      await waitFor(() => expect(navLabels()).toContain("My Requests"));
      expect(navLabels()).not.toContain("Drivers");

      for (const path of ["/drivers", "/drivers/new", "/drivers/1"]) {
        await router.push(path);
        await settle();
        expect(router.currentRoute.value.path).toBe("/");
      }
      expect(driverServices.getDrivers).not.toHaveBeenCalled();

      wrapper.unmount();
      signInAs(null);
      await router.push("/login");
      for (const path of ["/drivers", "/drivers/new", "/drivers/1"]) {
        await router.push(path);
        await settle();
        expect(router.currentRoute.value.path).toBe("/login");
      }
    });
  });
});
