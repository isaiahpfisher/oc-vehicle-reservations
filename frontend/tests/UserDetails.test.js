/**
 * Feature 3 — User Role Management
 * Spec: features/feature-3-user-role-management.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import userServices from "../src/services/userServices.js";
import areaServices from "../src/services/areaServices.js";
import { apiError, settle, signInAs, vuetify, waitFor } from "./testUtils.js";

vi.mock("../src/services/userServices.js", () => ({
  default: { getUsers: vi.fn(), getUser: vi.fn(), updateUserRoles: vi.fn(), deleteUser: vi.fn() },
}));

vi.mock("../src/services/areaServices.js", () => ({
  default: { getAreas: vi.fn() },
}));

const athletics = { id: 10, name: "Athletics" };
const music = { id: 11, name: "Music" };
const role = (id, name, area = null) => ({ id, role: name, areaId: area?.id ?? null, area });
const createdAt = "2026-10-20T15:04:00.000Z";

const ada = { id: 1, firstName: "Ada", lastName: "Admin", email: "ada@eagles.oc.edu", createdAt, roles: [role(1, "admin")] };
const jane = {
  id: 2,
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@eagles.oc.edu",
  createdAt,
  roles: [role(2, "maintenance"), role(3, "area_admin", athletics)],
};
const bob = { id: 3, firstName: "Bob", lastName: "Jones", email: "bob@eagles.oc.edu", createdAt, roles: [] };
const carol = {
  id: 4,
  firstName: "Carol",
  lastName: "Chen",
  email: "carol@eagles.oc.edu",
  createdAt,
  roles: [role(9, "admin"), role(10, "maintenance")],
};
const users = [ada, jane, bob, carol];

let wrapper;

const openDetails = async (user) => {
  await router.push({ name: "userDetails", params: { id: user.id } });
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

const checkbox = (label) =>
  waitFor(() => {
    const box = wrapper.findAllComponents({ name: "VCheckbox" }).find((c) => c.props("label") === label);
    expect(box).toBeDefined();
    return box;
  });

const isChecked = async (label) => (await checkbox(label)).find("input").element.checked;

const toggle = async (label, value) => {
  await (await checkbox(label)).find("input").setValue(value);
  await settle();
};

const groupLabels = (heading) => {
  const group = [...document.body.querySelectorAll('[role="group"]')].find(
    (el) => document.getElementById(el.getAttribute("aria-labelledby"))?.textContent.trim() === heading,
  );
  return [...group.querySelectorAll(".v-checkbox .v-label")].map((el) => el.textContent.trim());
};

const button = (text) => [...document.body.querySelectorAll("button")].find((el) => el.textContent.trim() === text);

const click = async (text) => {
  button(text).click();
  await settle();
};

const headerChips = () => [...document.body.querySelectorAll(".detail-header .v-chip")].map((chip) => chip.textContent.trim());

beforeEach(async () => {
  vi.resetAllMocks();
  signInAs({ userId: ada.id, email: ada.email, firstName: "Ada", lastName: "Admin", roles: ada.roles, token: "t" });
  userServices.getUser.mockImplementation(async (id) => ({ data: users.find((user) => user.id === Number(id)) }));
  userServices.getUsers.mockResolvedValue({ data: users });
  userServices.updateUserRoles.mockImplementation(async (id, roles) => ({
    data: {
      ...users.find((user) => user.id === id),
      roles: roles.map((r, i) => role(50 + i, r.role, r.areaId ? [athletics, music].find((a) => a.id === r.areaId) : null)),
    },
  }));
  userServices.deleteUser.mockResolvedValue({ status: 204 });
  areaServices.getAreas.mockResolvedValue({ data: [athletics, music] });
  await router.push("/");
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 3 — User Role Management UI", () => {
  describe("US-3.4 — User details", () => {
    it("User details page loads the user's current data", async () => {
      await openDetails(jane);

      expect(wrapper.find("h2").text()).toBe("Jane Smith");
      expect(document.body.textContent).toContain("jane@eagles.oc.edu");
      expect(document.body.textContent).toContain("Member since October 2026");
      expect(headerChips()).toEqual(["Maintenance", "Area Admin — Athletics"]);
      expect(await isChecked("Maintenance")).toBe(true);
      expect(await isChecked("Athletics")).toBe(true);
      expect(await isChecked("Admin")).toBe(false);
      expect(await isChecked("Music")).toBe(false);

      // Breadcrumbs back to Users; name and email are display only.
      expect(document.body.querySelector(".v-breadcrumbs").textContent).toContain("Users");
      expect(wrapper.findAllComponents({ name: "VTextField" })).toHaveLength(0);
    });

    it("Role options", async () => {
      await openDetails(bob);

      expect(groupLabels("System roles")).toEqual(["Admin", "Maintenance"]);
      expect(groupLabels("Area admin of")).toEqual(["Athletics", "Music"]);
    });

    it("Admin adds a role", async () => {
      await openDetails(bob);

      await toggle("Maintenance", true);
      await click("Save");

      expect(userServices.updateUserRoles).toHaveBeenCalledWith(bob.id, [{ role: "maintenance" }]);
      await waitFor(() => expect(document.body.textContent).toContain("Roles saved."));
      expect(router.currentRoute.value.name).toBe("userDetails");
      expect(headerChips()).toEqual(["Maintenance"]);
      expect(button("Save").disabled).toBe(true);
    });

    it("Admin removes a role", async () => {
      await openDetails(carol);

      await toggle("Admin", false);
      await click("Save");

      expect(userServices.updateUserRoles).toHaveBeenCalledWith(carol.id, [{ role: "maintenance" }]);
    });

    it("Admin assigns area admin for multiple areas", async () => {
      await openDetails(bob);

      await toggle("Athletics", true);
      await toggle("Music", true);
      await click("Save");

      expect(userServices.updateUserRoles).toHaveBeenCalledWith(bob.id, [
        { role: "area_admin", areaId: athletics.id },
        { role: "area_admin", areaId: music.id },
      ]);
      await waitFor(() => expect(headerChips()).toEqual(["Area Admin — Athletics", "Area Admin — Music"]));
    });

    it("Admin removes their own admin role", async () => {
      await openDetails(ada);

      const admin = await checkbox("Admin");
      expect(admin.find("input").element.checked).toBe(true);
      expect(admin.find("input").element.disabled).toBe(true);
      expect(document.body.textContent).toContain("You cannot remove your own admin role.");
      expect(button("Save").disabled).toBe(true);
    });

    it("Cancel editing", async () => {
      await openDetails(bob);
      expect(button("Cancel").disabled).toBe(true);

      await toggle("Admin", true);
      expect(button("Save").disabled).toBe(false);
      await click("Cancel");

      expect(await isChecked("Admin")).toBe(false);
      expect(button("Save").disabled).toBe(true);
      expect(userServices.updateUserRoles).not.toHaveBeenCalled();
      expect(router.currentRoute.value.name).toBe("userDetails");
    });

    it("Later sections show Coming soon", async () => {
      await openDetails(jane);
      const tabTitles = () => [...document.body.querySelectorAll(".v-tab")].map((el) => el.textContent.trim());

      expect(tabTitles()).toEqual(["Requests", "Issue reports", "Maintenance"]);
      for (const [title, text] of [
        ["Requests", "vehicle requests"],
        ["Issue reports", "Issue reports this user filed"],
        ["Maintenance", "Maintenance needs, service logs"],
      ]) {
        [...document.body.querySelectorAll(".v-tab")].find((el) => el.textContent.trim() === title).click();
        await settle();
        await waitFor(() => {
          const active = document.body.querySelector(".v-window-item--active");
          expect(active.textContent).toContain("Coming soon");
          expect(active.textContent).toContain(text);
        });
      }

      const driverCard = [...document.body.querySelectorAll(".v-card")].find((el) =>
        el.querySelector(".v-card-title")?.textContent.trim() === "Driver",
      );
      expect(driverCard.textContent).toContain("Coming soon");

      wrapper.unmount();
      await router.push("/");
      await openDetails(bob);
      expect(tabTitles()).toEqual(["Requests", "Issue reports"]);
    });

    it("explains where Area Admin options come from when no areas exist", async () => {
      const hint = "Area Admin roles appear here once areas are created.";

      areaServices.getAreas.mockResolvedValueOnce({ data: [] });
      await openDetails(bob);
      expect(document.body.textContent).toContain(hint);
      wrapper.unmount();

      // A held area admin role keeps its checkbox even if the areas list doesn't include it.
      await router.push("/");
      areaServices.getAreas.mockResolvedValueOnce({ data: [] });
      await openDetails(jane);
      expect(groupLabels("Area admin of")).toEqual(["Athletics"]);
      expect(await isChecked("Athletics")).toBe(true);
      expect(document.body.textContent).not.toContain(hint);
    });

    it("shows a loading skeleton, then load and save errors", async () => {
      userServices.getUser.mockReturnValueOnce(new Promise(() => {}));
      await openDetails(jane);
      expect(document.body.querySelector(".v-skeleton-loader")).not.toBeNull();
      wrapper.unmount();

      await router.push("/");
      userServices.getUser.mockRejectedValueOnce(apiError(404, "User with id=2 not found."));
      await openDetails(jane);
      expect(document.body.querySelector(".v-alert").textContent).toContain("User with id=2 not found.");
      wrapper.unmount();

      await router.push("/");
      userServices.updateUserRoles.mockRejectedValueOnce(apiError(400, "Area admin role requires a valid area."));
      await openDetails(jane);
      await toggle("Music", true);
      await click("Save");
      expect(document.body.querySelector(".v-alert").textContent).toContain("Area admin role requires a valid area.");
      expect(document.body.textContent).not.toContain("Roles saved.");
    });
  });

  describe("US-3.5 — Delete user", () => {
    it("Admin deletes a user from the details page", async () => {
      await openDetails(bob);

      await click("Delete user");
      const confirm = await waitFor(() => {
        const el = [...document.body.querySelectorAll(".v-dialog button")].find((b) => b.textContent.trim() === "Delete User");
        expect(el).toBeDefined();
        return el;
      });
      expect(document.body.querySelector(".v-dialog").textContent).toContain("Bob Jones");
      confirm.click();
      await settle();

      expect(userServices.deleteUser).toHaveBeenCalledWith(bob.id);
      await waitFor(() => expect(router.currentRoute.value.name).toBe("users"));
    });

    it("Admin cannot delete themselves from the details page", async () => {
      await openDetails(ada);

      expect(button("Delete user").disabled).toBe(true);
      expect(document.body.textContent).toContain("You cannot delete yourself.");
    });
  });
});
