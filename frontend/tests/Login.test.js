/**
 * Feature 1 — User Authentication and Session Management
 * Spec: features/feature-1-user-authentication-session-management.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import { startGoogleSignIn } from "../src/services/googleAuth.js";
import { vuetify } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock("../src/services/googleAuth.js", () => ({
  startGoogleSignIn: vi.fn(),
  readRedirectIdToken: vi.fn(() => null),
}));

const storedUser = {
  userId: 1,
  email: "jane@eagles.oc.edu",
  firstName: "Jane",
  lastName: "Doe",
  role: "student",
  token: "session-token",
};

/** Let Vuetify validation, API promises, and router navigation finish. */
const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await flushPromises();
  }
};

/** Retry an assertion until it passes (async validation and navigation settle on timers). */
const waitFor = async (assertion, timeout = 1500) => {
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

const mountAppAt = async (path) => {
  await router.push(path);
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

const button = (text) => wrapper.findAll("button, a").find((b) => b.text().trim() === text);

const readStoredUser = () => JSON.parse(localStorage.getItem("user"));

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  // Tests that land on the home page load courses; give them an empty list
  apiClient.get.mockResolvedValue({ data: [] });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 1 — User Authentication and Session Management UI", () => {
  describe("US-1.1 — Create account", () => {
    it("User registers with valid information", async () => {
      startGoogleSignIn.mockResolvedValueOnce("google-id-token");
      apiClient.post.mockResolvedValueOnce({ data: storedUser });
      await mountAppAt("/login");

      await button("Log in with Google").trigger("click");

      await waitFor(() => expect(router.currentRoute.value.name).toBe("home"));
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith("login", { googleCredentials: "google-id-token" });
      expect(readStoredUser()).toEqual(storedUser);
    });
  });

  describe("US-1.2 — Sign in", () => {
    it("Returning User Signs in", async () => {
      startGoogleSignIn.mockResolvedValueOnce("google-id-token");
      apiClient.post.mockResolvedValueOnce({ data: storedUser });
      await mountAppAt("/login");

      await button("Log in with Google").trigger("click");

      await waitFor(() => expect(router.currentRoute.value.name).toBe("home"));
      expect(apiClient.post).toHaveBeenCalledWith("login", { googleCredentials: "google-id-token" });
      expect(readStoredUser()).toEqual(storedUser);
    });

    it("User cannot change name or email", async () => {
      localStorage.setItem("user", JSON.stringify(storedUser));
      await mountAppAt("/");

      await wrapper.find('[aria-label="Open profile menu"]').trigger("click");
      const editProfile = await waitFor(() => {
        const item = [...document.body.querySelectorAll("button")].find((el) => el.textContent.trim() === "Edit Profile");
        expect(item).toBeDefined();
        return item;
      });
      editProfile.click();

      await waitFor(() => expect(document.body.textContent).toContain("Edit Profile"));
      expect(document.body.querySelector('input[autocomplete="given-name"]')).toBeNull();
      expect(document.body.querySelector('input[autocomplete="family-name"]')).toBeNull();
      expect(document.body.querySelector('input[autocomplete="email"]')).toBeNull();
      expect(document.body.textContent).not.toContain("First name");
      expect(document.body.textContent).not.toContain("Last name");
    });
  });

  describe("US-1.3 — Stay signed in across page loads", () => {
    it("Signed-in user refreshes the home page", async () => {
      localStorage.setItem("user", JSON.stringify(storedUser));

      await mountAppAt("/");

      expect(router.currentRoute.value.name).toBe("home");
      expect(readStoredUser()).toEqual(storedUser);
      expect(wrapper.find('[aria-label="Open profile menu"]').exists()).toBe(true);
    });

    it("API request includes session token", async () => {
      const { default: realClient } = await vi.importActual("../src/services/services.js");
      localStorage.setItem("user", JSON.stringify(storedUser));
      let sentHeaders;

      await realClient.get("users/1", {
        adapter: async (config) => {
          sentHeaders = config.headers;
          return { data: {}, status: 200, statusText: "OK", headers: {}, config };
        },
      });

      expect(sentHeaders.Authorization).toBe("Bearer session-token");
    });

    it("Signed-in user visits the login page", async () => {
      localStorage.setItem("user", JSON.stringify(storedUser));

      await mountAppAt("/login");

      expect(router.currentRoute.value.name).toBe("home");
      expect(readStoredUser()).toEqual(storedUser);
    });
  });

  describe("US-1.4 — Sign out", () => {
    it("User logs out", async () => {
      localStorage.setItem("user", JSON.stringify(storedUser));
      apiClient.post.mockResolvedValueOnce({ data: { message: "Signed out successfully." } });
      await mountAppAt("/");

      await wrapper.find('[aria-label="Open profile menu"]').trigger("click");
      const signOut = await waitFor(() => {
        const item = [...document.body.querySelectorAll(".v-list-item")].find((el) =>
          el.textContent.includes("Sign out"),
        );
        expect(item).toBeDefined();
        return item;
      });
      signOut.click();

      await waitFor(() => expect(router.currentRoute.value.name).toBe("login"));
      expect(apiClient.post).toHaveBeenCalledWith("logout");
      expect(localStorage.getItem("user")).toBeNull();
    });
  });

  describe("US-1.5 — Protect authenticated APIs and signed-in UI", () => {
    it("Unauthenticated user is sent to login", async () => {
      await mountAppAt("/");

      expect(router.currentRoute.value.name).toBe("login");
      expect(wrapper.text()).toContain("Log in with Google");
      expect(wrapper.text()).toContain("Use your @oc.edu or @eagles.oc.edu account.");
      expect(wrapper.find('[aria-label="Open profile menu"]').exists()).toBe(false);
    });
  });

  describe("US-1.7 — Stay signed in across page navigation", () => {
    afterEach(() => {
      if (router.hasRoute("other-page")) {
        router.removeRoute("other-page");
      }
    });

    it("Signed-in user changes pages", async () => {
      // Home is the only signed-in view today, so register a stand-in protected page to navigate to.
      router.addRoute({ path: "/other-page", name: "other-page", component: { template: "<div>Other page</div>" } });
      localStorage.setItem("user", JSON.stringify(storedUser));
      await mountAppAt("/");
      expect(router.currentRoute.value.name).toBe("home");

      await router.push("/other-page");
      await settle();

      expect(router.currentRoute.value.name).toBe("other-page");
      expect(readStoredUser()).toEqual(storedUser);
      expect(wrapper.find('[aria-label="Open profile menu"]').exists()).toBe(true);
    });
  });
});
