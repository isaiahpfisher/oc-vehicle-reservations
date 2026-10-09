/**
 * Feature 1 — User Authentication and Session Management
 * Spec: features/feature-1-user-authentication-session-management.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import { vuetify } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const storedUser = {
  userId: 1,
  email: "jane@example.com",
  firstName: "Jane",
  lastName: "Doe",
  role: "student",
  token: "session-token",
};

const apiError = (status, message) => Object.assign(new Error(message), { response: { status, data: { message } } });

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

const field = (label) =>
  wrapper
    .findAll(".v-text-field")
    .find((f) => f.find("label").exists() && f.find("label").text() === label)
    .find("input");

const button = (text) => wrapper.findAll("button, a").find((b) => b.text().trim() === text);

const fillAndSubmit = async (values, submitText) => {
  for (const [label, value] of Object.entries(values)) {
    await field(label).setValue(value);
  }
  expect(button(submitText).attributes("type")).toBe("submit");
  await wrapper.find("form").trigger("submit");
  await settle();
};

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
      apiClient.post.mockResolvedValueOnce({ data: storedUser });
      await mountAppAt("/login");

      await button("Create an account").trigger("click");
      await waitFor(() => expect(router.currentRoute.value.name).toBe("register"));
      await settle();

      await fillAndSubmit(
        {
          "First name": "Jane",
          "Last name": "Doe",
          Email: "jane@example.com",
          Password: "password1",
          "Confirm password": "password1",
        },
        "Create account",
      );

      await waitFor(() => expect(router.currentRoute.value.name).toBe("home"));
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith("register", {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        password: "password1",
      });
      expect(router.currentRoute.value.name).toBe("home");
      expect(readStoredUser()).toEqual(storedUser);
    });

    it("User registers with a duplicate email", async () => {
      apiClient.post.mockRejectedValueOnce(apiError(400, "Email is already registered."));
      await mountAppAt("/register");

      await fillAndSubmit(
        {
          "First name": "Jane",
          "Last name": "Doe",
          Email: "jane@example.com",
          Password: "password1",
          "Confirm password": "password1",
        },
        "Create account",
      );

      await waitFor(() => expect(wrapper.find(".v-alert").text()).toContain("Email is already registered."));
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(router.currentRoute.value.name).toBe("register");
      expect(localStorage.getItem("user")).toBeNull();
    });
  });

  describe("US-1.2 — Sign in", () => {
    it("User logs in with valid credentials", async () => {
      apiClient.post.mockResolvedValueOnce({ data: storedUser });
      await mountAppAt("/login");

      await fillAndSubmit({ Email: "jane@example.com", Password: "password1" }, "Sign in");

      await waitFor(() => expect(router.currentRoute.value.name).toBe("home"));
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith("login", { email: "jane@example.com", password: "password1" });
      expect(router.currentRoute.value.name).toBe("home");
      expect(readStoredUser()).toEqual(storedUser);
    });

    it("User logs in with an unknown email", async () => {
      apiClient.post.mockRejectedValueOnce(apiError(401, "Invalid email or password."));
      await mountAppAt("/login");

      await fillAndSubmit({ Email: "nobody@example.com", Password: "password1" }, "Sign in");

      await waitFor(() => expect(wrapper.find(".v-alert").text()).toContain("Invalid email or password."));
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(router.currentRoute.value.name).toBe("login");
      expect(localStorage.getItem("user")).toBeNull();
    });

    it("User logs in with an invalid password", async () => {
      apiClient.post.mockRejectedValueOnce(apiError(401, "Invalid email or password."));
      await mountAppAt("/login");

      await fillAndSubmit({ Email: "jane@example.com", Password: "wrong-password" }, "Sign in");

      await waitFor(() => expect(wrapper.find(".v-alert").text()).toContain("Invalid email or password."));
      expect(apiClient.post).toHaveBeenCalledWith("login", { email: "jane@example.com", password: "wrong-password" });
      expect(router.currentRoute.value.name).toBe("login");
      expect(localStorage.getItem("user")).toBeNull();
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
      expect(wrapper.text()).toContain("Sign in");
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
