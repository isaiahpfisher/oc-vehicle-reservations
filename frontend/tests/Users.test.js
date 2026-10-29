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

const role = (id, name, area = null) => ({ id, role: name, areaId: area?.id ?? null, area });
const athletics = { id: 10, name: "Athletics" };
const music = { id: 11, name: "Music" };

const ada = { id: 1, firstName: "Ada", lastName: "Admin", email: "ada@eagles.oc.edu", roles: [role(1, "admin")] };
const jane = {
  id: 2,
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@eagles.oc.edu",
  roles: [role(2, "maintenance"), role(3, "area_admin", athletics)],
};
const bob = { id: 3, firstName: "Bob", lastName: "Jones", email: "bob@eagles.oc.edu", roles: [role(4, "area_admin", music)] };
const sam = { id: 4, firstName: "Sam", lastName: "Smithers", email: "sam@eagles.oc.edu", roles: [role(5, "admin")] };
const allUsers = [ada, bob, jane, sam];

const signIn = (user, roles = user.roles) =>
  signInAs({ userId: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, roles, token: "t" });

let wrapper;

const openUsers = async () => {
  await router.push("/users");
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

const rows = () => [...document.body.querySelectorAll(".v-data-table tbody tr")];
const rowFor = (name) => rows().find((row) => row.textContent.includes(name));
const shownNames = () => rows().map((row) => row.querySelector("td")?.textContent.trim());

const setSearch = async (value) => {
  await wrapper.find('input[placeholder="Search users by name..."]').setValue(value);
  await settle();
};

const setRoleFilter = async (value) => {
  const select = wrapper.findAllComponents({ name: "VSelect" }).find((c) => c.props("label") === "Filter by role");
  await select.setValue(value);
  await settle();
};

const dialogButton = (text) =>
  waitFor(() => {
    const button = [...document.body.querySelectorAll(".v-dialog button")].find((el) => el.textContent.trim() === text);
    expect(button).toBeDefined();
    return button;
  });

beforeEach(async () => {
  signInAs(null);
  vi.resetAllMocks();
  // Role refresh (FR-009) echoes whatever roles are stored.
  userServices.getUser.mockImplementation(async () => ({ data: { roles: JSON.parse(localStorage.getItem("user")).roles } }));
  userServices.getUsers.mockResolvedValue({ data: allUsers });
  areaServices.getAreas.mockResolvedValue({ data: [athletics, music] });
  signIn(ada);
  // Start every test from home so /users mounts fresh.
  await router.push("/");
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 3 — User Role Management UI", () => {
  describe("US-3.1 — View users", () => {
    it("Admin views users list", async () => {
      await openUsers();

      expect(wrapper.find("h2").text()).toBe("User Management");
      expect(shownNames()).toEqual(["Ada Admin", "Bob Jones", "Jane Smith", "Sam Smithers"]);
      const janeRow = rowFor("Jane Smith");
      expect(janeRow.textContent).toContain("jane@eagles.oc.edu");
      expect([...janeRow.querySelectorAll(".v-chip")].map((chip) => chip.textContent.trim())).toEqual([
        "Maintenance",
        "Area Admin — Athletics",
      ]);
    });

    it("collapses more than two roles into a +N chip", async () => {
      const support = { id: 12, name: "Support Central" };
      const margaret = {
        id: 9,
        firstName: "Margaret",
        lastName: "Hollingsworth",
        email: "margaret@eagles.oc.edu",
        // Deliberately out of display order.
        roles: [role(20, "area_admin", music), role(21, "maintenance"), role(22, "area_admin", support), role(23, "admin"), role(24, "area_admin", athletics)],
      };
      userServices.getUsers.mockResolvedValue({ data: [margaret] });
      await openUsers();

      const chips = [...rowFor("Margaret Hollingsworth").querySelectorAll(".v-chip")];
      expect(chips.map((chip) => chip.textContent.trim())).toEqual(["Admin", "Maintenance", "+3"]);
      expect(chips[2].getAttribute("aria-label")).toBe(
        "3 more roles: Area Admin — Athletics, Area Admin — Music, Area Admin — Support Central",
      );
      expect(rowFor("Margaret Hollingsworth").querySelector('[title="margaret@eagles.oc.edu"]')).not.toBeNull();
    });

    it("Users list is paginated", async () => {
      const many = Array.from({ length: 12 }, (_, i) => ({
        id: 100 + i,
        firstName: `Person${String(i + 1).padStart(2, "0")}`,
        lastName: "User",
        email: `p${i}@eagles.oc.edu`,
        roles: [],
      }));
      userServices.getUsers.mockResolvedValue({ data: many });
      await openUsers();

      expect(rows()).toHaveLength(10);
      expect(rowFor("Person11")).toBeUndefined();

      document.body.querySelector('[aria-label="Next page"]').click();
      await settle();

      expect(shownNames()).toEqual(["Person11 User", "Person12 User"]);
    });

    it("Users loading state", async () => {
      userServices.getUsers.mockReturnValue(new Promise(() => {}));
      await openUsers();

      expect(document.body.querySelector(".v-skeleton-loader")).not.toBeNull();
      expect(document.body.querySelector(".v-data-table")).toBeNull();
    });

    it("Users error state", async () => {
      userServices.getUsers.mockRejectedValue(apiError(500, "Failed to fetch users."));
      await openUsers();

      const alert = document.body.querySelector(".v-alert");
      expect(alert).not.toBeNull();
      expect(alert.textContent).toContain("Failed to fetch users.");
    });

    it("Non-admin cannot open the users view", async () => {
      signIn(jane);
      await openUsers();

      expect(router.currentRoute.value.name).toBe("home");
      expect(userServices.getUsers).not.toHaveBeenCalled();
    });

    it("shows an empty state when there are no users", async () => {
      userServices.getUsers.mockResolvedValue({ data: [] });
      await openUsers();

      expect(document.body.textContent).toContain("No users yet.");
    });
  });

  describe("US-3.2 — Search and filter users", () => {
    it("Admin searches users by partial name", async () => {
      userServices.getUsers.mockResolvedValue({ data: [jane, bob] });
      await openUsers();

      await setSearch("smi");

      expect(shownNames()).toEqual(["Jane Smith"]);
    });

    it("Search is case-insensitive", async () => {
      await openUsers();

      await setSearch("SMITH");

      expect(shownNames()).toEqual(["Jane Smith", "Sam Smithers"]);
    });

    it("Admin filters users by role", async () => {
      await openUsers();

      await setRoleFilter("maintenance");

      expect(shownNames()).toEqual(["Jane Smith"]);
    });

    it("Admin filters by area admin for a specific area", async () => {
      await openUsers();

      await setRoleFilter(`area_admin:${athletics.id}`);
      expect(shownNames()).toEqual(["Jane Smith"]);

      await setRoleFilter(`area_admin:${music.id}`);
      expect(shownNames()).toEqual(["Bob Jones"]);
    });

    it("Admin combines search and role filter", async () => {
      await openUsers();

      await setSearch("smi");
      await setRoleFilter("admin");

      expect(shownNames()).toEqual(["Sam Smithers"]);
    });

    it("Search returns no results", async () => {
      await openUsers();

      await setSearch("zzz");

      expect(document.body.textContent).toContain("No users match your search.");
      expect(rows()).toHaveLength(0);
    });

    it("Clearing search and filters", async () => {
      const many = Array.from({ length: 12 }, (_, i) => ({
        id: 100 + i,
        firstName: `Person${String(i + 1).padStart(2, "0")}`,
        lastName: "User",
        email: `p${i}@eagles.oc.edu`,
        roles: i < 11 ? [role(200 + i, "maintenance")] : [],
      }));
      userServices.getUsers.mockResolvedValue({ data: many });
      await openUsers();

      await setSearch("Person");
      await setRoleFilter("maintenance");
      document.body.querySelector('[aria-label="Next page"]').click();
      await settle();
      expect(shownNames()).toEqual(["Person11 User"]);

      await setSearch("");
      await setRoleFilter(null);

      expect(rows()).toHaveLength(10);
      expect(shownNames()[0]).toBe("Person01 User");
    });
  });

  describe("US-3.3 — User row actions", () => {
    it("User rows have view and delete actions for admins", async () => {
      await openUsers();

      for (const row of rows()) {
        const view = row.querySelector('button[aria-label="View user"]');
        const del = row.querySelector('button[aria-label="Delete user"]');
        expect(view).not.toBeNull();
        expect(del).not.toBeNull();
        expect(view.classList).toContain("v-btn--size-small");
        expect(del.classList).toContain("v-btn--size-small");
      }
    });

    it("View action opens the user details page", async () => {
      userServices.getUser.mockImplementation(async (id) => ({
        data: allUsers.find((user) => user.id === Number(id)) ?? { roles: JSON.parse(localStorage.getItem("user")).roles },
      }));
      await openUsers();

      rowFor("Bob Jones").querySelector('button[aria-label="View user"]').click();
      await settle();
      await waitFor(() => expect(router.currentRoute.value.name).toBe("userDetails"));
      expect(router.currentRoute.value.params.id).toBe(String(bob.id));

      // The name is a link to the same page.
      await router.push("/users");
      await settle();
      const nameLink = await waitFor(() => {
        const link = rowFor("Jane Smith")?.querySelector("a");
        expect(link).toBeTruthy();
        return link;
      });
      nameLink.click();
      await settle();
      await waitFor(() => expect(router.currentRoute.value.params.id).toBe(String(jane.id)));
    });

    it("Delete action opens a confirmation dialog", async () => {
      await openUsers();

      rowFor("Bob Jones").querySelector('button[aria-label="Delete user"]').click();

      await waitFor(() => expect(document.body.querySelector(".v-dialog")?.textContent).toContain("Bob Jones"));
      expect(userServices.deleteUser).not.toHaveBeenCalled();
    });

    it("Admin cannot delete themselves from the list", async () => {
      await openUsers();

      expect(rowFor("Ada Admin").querySelector('button[aria-label="Delete user"]').disabled).toBe(true);
      expect(rowFor("Bob Jones").querySelector('button[aria-label="Delete user"]').disabled).toBe(false);
    });
  });

  describe("US-3.5 — Delete user", () => {
    it("Admin deletes a user", async () => {
      userServices.deleteUser.mockResolvedValue({ status: 204 });
      await openUsers();
      userServices.getUsers.mockResolvedValue({ data: allUsers.filter((user) => user.id !== bob.id) });

      rowFor("Bob Jones").querySelector('button[aria-label="Delete user"]').click();
      (await dialogButton("Delete User")).click();
      await settle();

      expect(userServices.deleteUser).toHaveBeenCalledWith(bob.id);
      await waitFor(() => expect(rowFor("Bob Jones")).toBeUndefined());
      expect(rows()).toHaveLength(3);
    });

    it("Admin cancels delete", async () => {
      await openUsers();

      rowFor("Bob Jones").querySelector('button[aria-label="Delete user"]').click();
      (await dialogButton("Cancel")).click();
      await settle();

      expect(userServices.deleteUser).not.toHaveBeenCalled();
      expect(rowFor("Bob Jones")).toBeDefined();
      expect(router.currentRoute.value.name).toBe("users");
      await waitFor(() => expect(document.body.querySelector(".v-dialog.v-overlay--active")).toBeNull());
    });
  });
});
