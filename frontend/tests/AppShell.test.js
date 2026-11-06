/**
 * App shell — UI rule, not a numbered feature
 * Rule: .cursor/rules/ui-style-system.mdc → App Shell (`App.vue`)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import { settle, signInAs, vuetify, waitFor } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const signIn = (roles) =>
  signInAs({ userId: 1, email: "jane@eagles.oc.edu", firstName: "Jane", lastName: "Doe", roles, token: "t" });

let wrapper;

const openApp = async (path = "/") => {
  await router.push(path);
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

const drawer = () => document.body.querySelector(".v-navigation-drawer");
const appBar = () => document.body.querySelector(".v-app-bar");

beforeEach(() => {
  signInAs(null);
  vi.resetAllMocks();
  // Role refresh echoes the stored roles.
  // Feature 8 (US-8.2): home now loads `me/requests`, so only the role refresh gets a user back.
  apiClient.get.mockImplementation(async (url) =>
    url.startsWith("users/") ? { data: { roles: JSON.parse(localStorage.getItem("user"))?.roles ?? [] } } : { data: [] },
  );
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

const sectionTitles = (list) => [...list.querySelectorAll(".v-list-subheader")].map((header) => header.textContent.trim());

describe("App shell (ui-style-system.mdc)", () => {
  it("shows the MenuBar with logo and profile menu for requesters", async () => {
    signIn([]);
    await openApp("/");

    expect(appBar()).not.toBeNull();
    expect(drawer()).toBeNull();
    expect(appBar().textContent).toContain("OC");
    expect(appBar().textContent).toContain("Vehicle Registration");
    expect(appBar().textContent).toContain("Oklahoma Christian University");
    expect(appBar().querySelector('[aria-label="Open profile menu"]')).not.toBeNull();
  });

  it("shows the Sidebar with logo, pages, and profile at the bottom for users with roles", async () => {
    signIn([{ id: 1, role: "admin", areaId: null, area: null }]);
    await openApp("/");

    expect(appBar()).toBeNull();
    const sidebar = drawer();
    expect(sidebar).not.toBeNull();

    const content = sidebar.querySelector(".v-navigation-drawer__content");
    expect(content.textContent).toContain("OC");
    // Pages come from route `meta.nav` (Features 3–8, 10, 12), grouped into sections by `meta.navGroup`.
    const mainNav = content.querySelector('[aria-label="Main navigation"]');
    expect([...mainNav.querySelectorAll("a")].map((a) => a.textContent.trim())).toEqual([
      "Requests",
      "Drivers",
      "Destinations",
      "Vehicles",
      "Vehicle Types",
      "Issue Reports",
      "Service Types",
      "Users",
      "Areas",
    ]);
    expect(sectionTitles(mainNav)).toEqual(["Trips", "Fleet", "Administration"]);
    expect(mainNav.textContent.indexOf("Trips")).toBeLessThan(mainNav.textContent.indexOf("Requests"));
    expect(mainNav.textContent.indexOf("Administration")).toBeLessThan(mainNav.textContent.indexOf("Users"));

    // My Requests (`meta.pinned`) and the profile are glued to the bottom (drawer append slot), My Requests first.
    const bottom = sidebar.querySelector(".v-navigation-drawer__append");
    const pinned = bottom.querySelector('[aria-label="Pinned navigation"]');
    expect([...pinned.querySelectorAll("a")].map((a) => a.textContent.trim())).toEqual(["My Requests"]);
    const profile = bottom.querySelector('[aria-label="Open profile menu"]');
    expect(profile.textContent).toContain("Jane Doe");
    expect(pinned.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("leaves out Sidebar sections the user has no pages in", async () => {
    signIn([{ id: 1, role: "maintenance", areaId: null, area: null }]);
    await openApp("/");

    const mainNav = drawer().querySelector('[aria-label="Main navigation"]');
    expect([...mainNav.querySelectorAll("a")].map((a) => a.textContent.trim())).toEqual(["Service Types"]);
    expect(sectionTitles(mainNav)).toEqual(["Fleet"]);
  });

  it("highlights the Sidebar link for the page's section, including nested pages", async () => {
    signIn([{ id: 1, role: "admin", areaId: null, area: null }]);
    await openApp("/drivers");
    const highlighted = () =>
      [...drawer().querySelectorAll("a.v-list-item--active")].map((link) => link.textContent.trim());

    expect(highlighted()).toEqual(["Drivers"]);
    for (const [path, expected] of [
      ["/drivers/new", ["Drivers"]],
      ["/drivers/3", ["Drivers"]],
      ["/vehicles/4", ["Vehicles"]],
      ["/destinations/new", ["Destinations"]],
      ["/requests/5", ["Requests"]],
      ["/", ["My Requests"]],
    ]) {
      await router.push(path);
      await settle();
      await waitFor(() => expect(highlighted()).toEqual(expected));
    }
  });

  it("highlights My Requests on a requester's own request page", async () => {
    signIn([]);
    await openApp("/requests/5");

    const highlighted = [...appBar().querySelectorAll("a.v-btn--active")].map((link) => link.textContent.trim());
    expect(highlighted).toEqual(["My Requests"]);
  });

  it("collapses and expands the Sidebar", async () => {
    signIn([{ id: 1, role: "maintenance", areaId: null, area: null }]);
    await openApp("/");
    expect(drawer().classList).not.toContain("v-navigation-drawer--rail");

    drawer().querySelector('[aria-label="Collapse sidebar"]').click();
    await settle();
    expect(drawer().classList).toContain("v-navigation-drawer--rail");
    expect(drawer().textContent).not.toContain("Vehicle Registration");
    // Collapsed, section titles give way to icons only.
    expect(drawer().querySelectorAll(".v-list-subheader")).toHaveLength(0);
    // Collapsed links name their page in a tooltip; expanded, the label shows, so tooltips stay off.
    const tooltips = () =>
      wrapper.findComponent({ name: "VNavigationDrawer" }).findAllComponents({ name: "VTooltip" }).map((tooltip) => tooltip.props());
    expect(tooltips().map(({ text, disabled }) => [text, disabled])).toEqual([
      ["Service Types", false],
      ["My Requests", false],
    ]);

    drawer().querySelector('[aria-label="Expand sidebar"]').click();
    await settle();
    expect(drawer().classList).not.toContain("v-navigation-drawer--rail");
    expect(tooltips().every(({ disabled }) => disabled)).toBe(true);
  });

  it("signs out from the Sidebar profile menu", async () => {
    signIn([{ id: 1, role: "admin", areaId: null, area: null }]);
    apiClient.post.mockResolvedValueOnce({ data: { message: "Signed out successfully." } });
    await openApp("/");

    drawer().querySelector('[aria-label="Open profile menu"]').click();
    const signOut = await waitFor(() => {
      const item = [...document.body.querySelectorAll(".v-list-item")].find((el) => el.textContent.includes("Sign out"));
      expect(item).toBeDefined();
      return item;
    });
    signOut.click();

    await waitFor(() => expect(router.currentRoute.value.name).toBe("login"));
    expect(apiClient.post).toHaveBeenCalledWith("logout");
    expect(drawer()).toBeNull();
    expect(appBar()).toBeNull();
  });

  it("hides the app chrome on the login page", async () => {
    await openApp("/login");

    expect(drawer()).toBeNull();
    expect(appBar()).toBeNull();
  });

  it("does not flash the app chrome before the first navigation resolves", async () => {
    // Fresh page load: main.js mounts App before the router's first navigation finishes.
    vi.resetModules();
    const { default: freshRouter } = await import("../src/router.js");
    const { default: FreshApp } = await import("../src/App.vue");

    wrapper = mount(FreshApp, { attachTo: document.body, global: { plugins: [vuetify, freshRouter] } });
    await settle();
    expect(appBar()).toBeNull();
    expect(drawer()).toBeNull();

    // Signed out: redirected to login, still no chrome.
    await freshRouter.push("/");
    await settle();
    expect(freshRouter.currentRoute.value.name).toBe("login");
    expect(appBar()).toBeNull();
    wrapper.unmount();

    // Signed in, but the role refresh is still pending: no chrome until navigation finishes.
    vi.resetModules();
    signIn([]);
    const { default: pendingRouter } = await import("../src/router.js");
    const { default: PendingApp } = await import("../src/App.vue");
    const { default: pendingClient } = await import("../src/services/services.js");
    let finishRefresh;
    pendingClient.get.mockReturnValueOnce(new Promise((resolve) => (finishRefresh = resolve)));

    wrapper = mount(PendingApp, { attachTo: document.body, global: { plugins: [vuetify, pendingRouter] } });
    const navigation = pendingRouter.push("/");
    await settle();
    expect(appBar()).toBeNull();

    finishRefresh({ data: { roles: [] } });
    await navigation;
    await settle();
    expect(appBar()).not.toBeNull();
  });
});
