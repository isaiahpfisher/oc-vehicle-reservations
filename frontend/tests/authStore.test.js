/**
 * Auth store — frontend auth state, not a numbered feature
 * Rule: .cursor/rules/auth-patterns.mdc → Frontend Auth State
 * Behavior it backs: Feature 1 (session survives reloads, sign out) and Feature 3 FR-009 (role refresh).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { STORAGE_KEY, useAuthStore } from "../src/stores/auth.js";
import { useRoles } from "../src/composables/useRoles.js";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import authServices from "../src/services/authServices.js";
import { waitFor } from "./testUtils.js";

const maintenance = { id: 1, role: "maintenance", areaId: null, area: null };
const athleticsAdmin = { id: 2, role: "area_admin", areaId: 10, area: { id: 10, name: "Athletics" } };

const loginResponse = {
  userId: 7,
  email: "jane@eagles.oc.edu",
  firstName: "Jane",
  lastName: "Doe",
  roles: [maintenance],
  token: "session-token",
};

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY));

/** A new Pinia is what a page load gets: the store is created again and reads localStorage. */
const pageLoad = () => {
  setActivePinia(createPinia());
  return useAuthStore();
};

/** Answer an apiClient request without the network. */
const respondWith = (status, data) => async (config) => {
  if (status < 400) return { data, status, statusText: "OK", headers: {}, config };
  throw Object.assign(new Error(`Request failed with status code ${status}`), {
    config,
    response: { status, data, headers: {}, config },
  });
};

beforeEach(() => {
  localStorage.clear();
});

describe("Auth store (auth-patterns.mdc)", () => {
  describe("startup", () => {
    it("starts signed out when nothing is saved", () => {
      const auth = pageLoad();

      expect(auth.user).toBeNull();
      expect(auth.isSignedIn).toBe(false);
      expect(auth.token).toBeNull();
      expect(auth.roles).toEqual([]);
    });

    it("restores the saved session on a page load", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loginResponse));

      const auth = pageLoad();

      expect(auth.user).toEqual(loginResponse);
      expect(auth.isSignedIn).toBe(true);
      expect(auth.token).toBe("session-token");
      expect(auth.roles).toEqual([maintenance]);
    });

    it("ignores a corrupt saved session", () => {
      localStorage.setItem(STORAGE_KEY, "{not json");

      expect(pageLoad().isSignedIn).toBe(false);
    });

    it("treats a saved user without roles as holding none", () => {
      const { roles, ...withoutRoles } = loginResponse;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutRoles));

      expect(pageLoad().roles).toEqual([]);
    });
  });

  describe("actions", () => {
    it("signIn stores the login response and saves it for the next page load", () => {
      const auth = pageLoad();

      auth.signIn(loginResponse);

      expect(auth.user).toEqual(loginResponse);
      expect(saved()).toEqual(loginResponse);
      expect(pageLoad().user).toEqual(loginResponse);
    });

    it("setRoles replaces only the roles and saves them", () => {
      const auth = pageLoad();
      auth.signIn(loginResponse);

      auth.setRoles([athleticsAdmin]);

      expect(auth.user).toEqual({ ...loginResponse, roles: [athleticsAdmin] });
      expect(saved().roles).toEqual([athleticsAdmin]);
    });

    it("setRoles does nothing while signed out", () => {
      const auth = pageLoad();

      auth.setRoles([athleticsAdmin]);

      expect(auth.user).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("signOut forgets the session here and in localStorage", () => {
      const auth = pageLoad();
      auth.signIn(loginResponse);

      auth.signOut();

      expect(auth.isSignedIn).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(pageLoad().isSignedIn).toBe(false);
    });
  });

  describe("consumers", () => {
    it("useRoles follows the store's roles", () => {
      const auth = pageLoad();
      const roles = useRoles();
      auth.signIn(loginResponse);

      expect(roles.user.value).toEqual(loginResponse);
      expect(roles.hasRole("maintenance")).toBe(true);
      expect(roles.areaAdminAreaIds.value).toEqual([]);

      auth.setRoles([athleticsAdmin]);

      expect(roles.hasRole("maintenance")).toBe(false);
      expect(roles.hasRole("area_admin", 10)).toBe(true);
      expect(roles.areaAdminAreaIds.value).toEqual([10]);

      auth.signOut();

      expect(roles.user.value).toBeNull();
      expect(roles.hasAnyRole(["area_admin"])).toBe(false);
    });

    it("API requests send the store's token", async () => {
      const auth = pageLoad();
      let sent;
      const adapter = async (config) => {
        sent = config.headers.Authorization;
        return respondWith(200, {})(config);
      };

      await apiClient.get("users/7", { adapter });
      expect(sent).toBeUndefined();

      auth.signIn(loginResponse);
      await apiClient.get("users/7", { adapter });
      expect(sent).toBe("Bearer session-token");
    });

    it("a 401 response signs out and goes to login", async () => {
      const auth = pageLoad();
      auth.signIn(loginResponse);

      await expect(
        apiClient.get("users/7", { adapter: respondWith(401, { message: "Unauthorized! Invalid or expired token." }) }),
      ).rejects.toThrow();

      expect(auth.isSignedIn).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      await waitFor(() => expect(router.currentRoute.value.name).toBe("login"));
    });

    it("logoutUser signs out even when the server call fails", async () => {
      const auth = pageLoad();
      auth.signIn(loginResponse);
      const post = apiClient.post;
      apiClient.post = async () => {
        throw new Error("Network Error");
      };

      try {
        await expect(authServices.logoutUser()).rejects.toThrow("Network Error");
      } finally {
        apiClient.post = post;
      }

      expect(auth.isSignedIn).toBe(false);
      expect(router.currentRoute.value.name).toBe("login");
    });
  });
});
