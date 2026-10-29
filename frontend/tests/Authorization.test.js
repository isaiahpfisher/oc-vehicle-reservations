/**
 * Feature 3 — User Role Management
 * Spec: features/feature-3-user-role-management.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { apiError, settle, vuetify, waitFor } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const maintenance = { id: 1, role: "maintenance", areaId: null, area: null };
const admin = { id: 2, role: "admin", areaId: null, area: null };
const athleticsAdmin = { id: 3, role: "area_admin", areaId: 10, area: { id: 10, name: "Athletics" } };
const MUSIC_ID = 11;

const storedUser = (roles) => ({
  userId: 1,
  email: "jane@eagles.oc.edu",
  firstName: "Jane",
  lastName: "Doe",
  roles,
  token: "session-token",
});

const readStoredUser = () => JSON.parse(localStorage.getItem("user"));

// Stand-in routes for pages later features add.
const maintenanceRoute = {
  path: "/maintenance-only",
  name: "maintenanceOnly",
  component: { template: "<div>Maintenance page</div>" },
  meta: { nav: "Maintenance", roles: ["maintenance"] },
};
const sharedRoute = {
  path: "/area-or-maintenance",
  name: "areaOrMaintenance",
  component: { template: "<div>Shared page</div>" },
  meta: { roles: ["area_admin", "maintenance"] },
};
const openRoute = { path: "/open", name: "open", component: { template: "<div>Open page</div>" } };

let app;
let wrapper;

/**
 * Simulate a full page load: fresh router/composable state, `user` already in localStorage,
 * and GET users/:id answering the role refresh with `refresh` (roles array or an error).
 */
const pageLoad = async (user, refresh = user?.roles ?? []) => {
  vi.resetModules();
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }

  const { default: apiClient } = await import("../src/services/services.js");
  apiClient.get.mockReset();
  apiClient.get.mockImplementation(async (url) => {
    if (url !== `users/${user?.userId}`) return { data: [] };
    if (refresh instanceof Error) throw refresh;
    return { data: { ...user, roles: refresh } };
  });

  const { default: router } = await import("../src/router.js");
  for (const route of [maintenanceRoute, sharedRoute, openRoute]) {
    router.addRoute(route);
  }
  const { default: App } = await import("../src/App.vue");
  const { useRoles } = await import("../src/composables/useRoles.js");

  app = { router, apiClient, useRoles: useRoles(), App };
  return app;
};

const openApp = async (path) => {
  await app.router.push(path).catch(() => {});
  await app.router.isReady();
  wrapper = mount(app.App, { attachTo: document.body, global: { plugins: [vuetify, app.router] } });
  await settle();
  return wrapper;
};

/** Page links in the app shell's main navigation (MenuBar or Sidebar). */
const navLabels = () =>
  [...document.body.querySelectorAll('[aria-label="Main navigation"] a')].map((link) => link.textContent.trim());

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 3 — User Role Management UI", () => {
  describe("US-3.1 — View users", () => {
    it("Users nav link is hidden for non-admins", async () => {
      await pageLoad(storedUser([maintenance, athleticsAdmin]));
      await openApp("/");

      // Feature 8 (US-8.2) made home the My Requests page and added Requests for area admins.
      expect(navLabels()).toContain("My Requests");
      expect(navLabels()).not.toContain("Users");
    });
  });

  describe("US-3.6 — Roles are enforced", () => {
    it("Frontend route guard redirects", async () => {
      await pageLoad(storedUser([athleticsAdmin]));
      await openApp("/maintenance-only");

      expect(app.router.currentRoute.value.name).toBe("home");

      await app.router.push("/users/5");
      await settle();
      expect(app.router.currentRoute.value.name).toBe("home");
    });

    it("Navigation hides unauthorized links", async () => {
      await pageLoad(storedUser([]));
      await openApp("/");
      // Feature 8 (US-8.2) made home the My Requests page and added Requests for area admins.
      expect(navLabels()).toEqual(["My Requests"]);

      wrapper.unmount();
      await pageLoad(storedUser([admin]));
      await openApp("/");
      expect(navLabels()).toEqual(expect.arrayContaining(["My Requests", "Users", "Maintenance"]));
    });
  });

  describe("US-3.7 — Reusable Authorization Middleware and Hooks", () => {
    it("useRoles returns true for held roles", async () => {
      await pageLoad(storedUser([maintenance]));

      expect(app.useRoles.hasRole("maintenance")).toBe(true);
    });

    it("useRoles returns false for missing roles", async () => {
      await pageLoad(storedUser([maintenance]));

      expect(app.useRoles.hasRole("admin")).toBe(false);
      expect(app.useRoles.hasRole("area_admin")).toBe(false);
      expect(app.useRoles.hasAnyRole(["admin"])).toBe(false);
    });

    it("hasRole checks a specific area", async () => {
      await pageLoad(storedUser([athleticsAdmin]));

      expect(app.useRoles.hasRole("area_admin", athleticsAdmin.areaId)).toBe(true);
      expect(app.useRoles.hasRole("area_admin", MUSIC_ID)).toBe(false);
      expect(app.useRoles.areaAdminAreaIds.value).toEqual([athleticsAdmin.areaId]);
    });

    it("hasRole without an area matches any area", async () => {
      await pageLoad(storedUser([athleticsAdmin]));

      expect(app.useRoles.hasRole("area_admin")).toBe(true);
    });

    it("hasAnyRole passes admins but hasRole does not", async () => {
      await pageLoad(storedUser([admin]));

      expect(app.useRoles.hasAnyRole(["maintenance"])).toBe(true);
      expect(app.useRoles.hasRole("maintenance")).toBe(false);
    });

    it("router.beforeEach redirects users without the required role", async () => {
      await pageLoad(storedUser([maintenance]));
      await openApp("/");

      await app.router.push({ name: "users" });
      await settle();

      expect(app.router.currentRoute.value.name).toBe("home");
    });

    it("meta.roles allows any listed role", async () => {
      await pageLoad(storedUser([maintenance]));
      await openApp("/area-or-maintenance");

      expect(app.router.currentRoute.value.name).toBe("areaOrMaintenance");
      expect(wrapper.text()).toContain("Shared page");
    });

    it("Routes without meta.roles are open to every signed-in user", async () => {
      await pageLoad(storedUser([]));
      await openApp("/open");

      expect(app.router.currentRoute.value.name).toBe("open");
      expect(wrapper.text()).toContain("Open page");
    });

    it("Roles refresh on page load", async () => {
      await pageLoad(storedUser([]), [maintenance]);

      // Opening a maintenance-only route directly only works if the refresh ran before the role check.
      await openApp("/maintenance-only");

      expect(app.apiClient.get).toHaveBeenCalledWith("users/1");
      expect(app.router.currentRoute.value.name).toBe("maintenanceOnly");
      expect(readStoredUser().roles).toEqual([maintenance]);
      expect(navLabels()).toContain("Maintenance");

      // Only once per page load. Feature 8 (US-8.2): home also loads `me/requests`, so count role refreshes only.
      await app.router.push("/");
      await settle();
      expect(app.apiClient.get.mock.calls.filter(([url]) => url === "users/1")).toHaveLength(1);
    });

    it("Removed role is dropped on page load", async () => {
      await pageLoad(storedUser([admin]), []);
      await openApp("/users");

      expect(app.router.currentRoute.value.name).toBe("home");
      expect(readStoredUser().roles).toEqual([]);
      expect(navLabels()).not.toContain("Users");
    });

    it("Role refresh with an invalid session", async () => {
      await pageLoad(storedUser([admin]), apiError(401, "Unauthorized! Invalid or expired token."));
      await openApp("/users");

      await waitFor(() => expect(app.router.currentRoute.value.name).toBe("login"));
      expect(localStorage.getItem("user")).toBeNull();
    });
  });
});
