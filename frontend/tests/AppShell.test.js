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
  // A vehicle's service log loads the maintenance need options, an object rather than a list.
  apiClient.get.mockImplementation(async (url) => {
    if (url.startsWith("users/")) return { data: { roles: JSON.parse(localStorage.getItem("user"))?.roles ?? [] } };
    if (url === "maintenance-needs/options") return { data: { vehicles: [], assignees: [] } };
    return { data: [] };
  });
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
    expect(appBar().textContent).toContain("OC Vehicles");
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
    // Pages come from route `meta.nav` (Features 3–8, 10–12), grouped into sections by `meta.navGroup`.
    // Feature 11 adds Maintenance Needs in Fleet, after Service Types.
    // Feature 15 added Vehicle Type Instructions after Vehicle Types; UI/UX backlog #9 moved them into each type's page.
    // UI/UX backlog #38: the lists that configure the fleet moved from Fleet into a Setup section.
    const mainNav = content.querySelector('[aria-label="Main navigation"]');
    expect([...mainNav.querySelectorAll("a")].map((a) => a.textContent.trim())).toEqual([
      "Requests",
      "Drivers",
      "Destinations",
      "Vehicles",
      "Issue Reports",
      "Maintenance Needs",
      "Vehicle Types",
      "Service Types",
      "Users",
      "Areas",
    ]);
    expect(sectionTitles(mainNav)).toEqual(["Trips", "Fleet", "Setup", "Administration"]);
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
    // UI/UX backlog #28: a user whose only role is maintenance doesn't get Issue Reports.
    expect([...mainNav.querySelectorAll("a")].map((a) => a.textContent.trim())).toEqual([
      "Vehicles",
      "Maintenance Needs",
      "Service Types",
    ]);
    expect(sectionTitles(mainNav)).toEqual(["Fleet", "Setup"]);
  });

  // UI/UX backlog #28: another role brings Issue Reports back.
  it("shows Issue Reports to a maintenance user who is also an area admin", async () => {
    signIn([
      { id: 1, role: "maintenance", areaId: null, area: null },
      { id: 2, role: "area_admin", areaId: 3, area: { id: 3, name: "Athletics" } },
    ]);
    await openApp("/");

    const mainNav = drawer().querySelector('[aria-label="Main navigation"]');
    expect([...mainNav.querySelectorAll("a")].map((a) => a.textContent.trim())).toContain("Issue Reports");
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
      // Feature 21, US-21.1: a vehicle's service log is under Vehicles.
      ["/service-logs/4", ["Vehicles"]],
      ["/destinations/new", ["Destinations"]],
      ["/requests/5", ["Requests"]],
      ["/", ["My Requests"]],
    ]) {
      await router.push(path);
      await settle();
      await waitFor(() => expect(highlighted()).toEqual(expected));
    }
  });

  // UI/UX backlog #43: each tab is named for its page.
  it("names the browser tab after the page", async () => {
    signIn([{ id: 1, role: "admin", areaId: null, area: null }]);
    await openApp("/drivers");
    expect(document.title).toBe("Drivers · OC Vehicles");

    await router.push("/drivers/new");
    await settle();
    expect(document.title).toBe("New driver · OC Vehicles");
  });

  it("highlights My Requests on a requester's own request page", async () => {
    signIn([]);
    await openApp("/requests/5");

    const highlighted = [...appBar().querySelectorAll("a.v-btn--active")].map((link) => link.textContent.trim());
    expect(highlighted).toEqual(["My Requests"]);
  });

  // UI/UX backlog #15: links show what's waiting (`meta.badge`); zero shows nothing, collapsed shows a dot.
  it("shows count badges on Sidebar links, and a dot when collapsed", async () => {
    apiClient.get.mockImplementation(async (url) => {
      if (url.startsWith("users/")) return { data: { roles: JSON.parse(localStorage.getItem("user"))?.roles ?? [] } };
      if (url === "nav-counts") return { data: { requests: 3, issueReports: 0, maintenanceNeeds: 12, vehicles: 2, drivers: 4 } };
      return { data: [] };
    });
    signIn([{ id: 1, role: "admin", areaId: null, area: null }]);
    await openApp("/");

    const badgeText = (name) => drawer().querySelector(`[data-test="nav-badge-${name}"]`)?.textContent.trim();
    await waitFor(() => expect(badgeText("adminRequests")).toBe("3"));
    expect(badgeText("maintenance-needs")).toBe("12");
    expect(badgeText("issue-reports")).toBeUndefined();
    expect(drawer().querySelector('[aria-label="Requests, 3 waiting"]')).not.toBeNull();
    // Vehicles needing attention, and drivers whose license has expired or expires within 30 days.
    expect(badgeText("vehicles")).toBe("2");
    expect(badgeText("drivers")).toBe("4");
    expect(drawer().querySelector('[aria-label="Vehicles, 2 need attention"]')).not.toBeNull();
    expect(drawer().querySelector('[aria-label="Drivers, 4 to renew"]')).not.toBeNull();

    drawer().querySelector('[aria-label="Collapse sidebar"]').click();
    await settle();
    expect(drawer().querySelectorAll('[data-test="nav-badge-dot"]')).toHaveLength(4);
  });

  it("collapses and expands the Sidebar", async () => {
    signIn([{ id: 1, role: "maintenance", areaId: null, area: null }]);
    await openApp("/");
    expect(drawer().classList).not.toContain("v-navigation-drawer--rail");

    drawer().querySelector('[aria-label="Collapse sidebar"]').click();
    await settle();
    expect(drawer().classList).toContain("v-navigation-drawer--rail");
    expect(drawer().textContent).not.toContain("OC Vehicles");
    // Collapsed, section titles give way to icons only.
    expect(drawer().querySelectorAll(".v-list-subheader")).toHaveLength(0);
    // Collapsed links name their page in a tooltip; expanded, the label shows, so tooltips stay off.
    const tooltips = () =>
      wrapper.findComponent({ name: "VNavigationDrawer" }).findAllComponents({ name: "VTooltip" }).map((tooltip) => tooltip.props());
    expect(tooltips().map(({ text, disabled }) => [text, disabled])).toEqual([
      ["Vehicles", false],
      ["Maintenance Needs", false],
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
