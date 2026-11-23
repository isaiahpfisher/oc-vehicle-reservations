/**
 * UI/UX backlog #13 — Profile page
 * Spec: docs/ui-ux-backlog.md (no feature spec yet; scratch branch)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import userServices from "../src/services/userServices.js";
import requestServices from "../src/services/requestServices.js";
import issueReportServices from "../src/services/issueReportServices.js";
import maintenanceNeedServices from "../src/services/maintenanceNeedServices.js";
import { apiError, settle, signInAs, vuetify, waitFor } from "./testUtils.js";

vi.mock("../src/services/userServices.js", () => ({ default: { getUser: vi.fn() } }));
vi.mock("../src/services/requestServices.js", () => ({ default: { getMyRequests: vi.fn(), getRequests: vi.fn() } }));
vi.mock("../src/services/issueReportServices.js", () => ({ default: { getIssueReports: vi.fn() } }));
vi.mock("../src/services/maintenanceNeedServices.js", () => ({ default: { getMaintenanceNeeds: vi.fn() } }));

const createdAt = "2026-10-20T15:04:00.000Z";
const maintenanceRole = { id: 4, role: "maintenance", areaId: null, area: null };
const jane = { id: 2, firstName: "Jane", lastName: "Doe", email: "jane@eagles.oc.edu", createdAt, roles: [], driver: null };
const driver = {
  id: 7,
  status: "approved",
  licenseState: "OK",
  licenseExpirationDate: "2030-05-01",
  phoneNumber: "405-555-1234",
};

let wrapper;

const openProfile = async (user) => {
  signInAs({ userId: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, roles: user.roles, token: "t" });
  userServices.getUser.mockResolvedValue({ data: user });
  await router.push("/profile");
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
};

const byTest = (id) => document.body.querySelector(`[data-test="${id}"]`);
const tabTitles = () => [...document.body.querySelectorAll(".v-tab")].map((el) => el.textContent.replace(/\s+/g, " ").trim());

beforeEach(() => {
  vi.resetAllMocks();
  requestServices.getMyRequests.mockResolvedValue({ data: [] });
  issueReportServices.getIssueReports.mockResolvedValue({ data: [] });
  maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({ data: [] });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("UI/UX backlog #13 — Profile page", () => {
  it("shows a requester who they are, that they aren't a driver, and their own trips", async () => {
    requestServices.getMyRequests.mockResolvedValue({
      data: [
        { id: 3, userId: 2, status: "pending", allDay: true, startAt: "2030-12-18", endAt: "2030-12-19", destinations: [{ name: "BOK Center" }] },
      ],
    });
    await openProfile(jane);

    await waitFor(() => expect(document.body.querySelector(".detail-header h2").textContent).toBe("Jane Doe"));
    expect(document.body.textContent).toContain("jane@eagles.oc.edu");
    expect(document.body.textContent).toContain("Requester");
    expect(byTest("profile-driver").textContent).toContain("You're not set up as a driver.");
    expect(userServices.getUser).toHaveBeenCalledWith(2);
    // Your own trips come from the "my requests" endpoint, not the admin list.
    await waitFor(() => expect(byTest("activity-requests").textContent).toContain("Trip to BOK Center"));
    expect(requestServices.getRequests).not.toHaveBeenCalled();
    expect(issueReportServices.getIssueReports).toHaveBeenCalledWith({ userId: 2 });
    expect(tabTitles()).toEqual(["Requests 1", "Issue reports"]);
  });

  it("shows a linked driver record, and warns when the license has expired", async () => {
    await openProfile({ ...jane, driver: { ...driver, licenseExpirationDate: "2020-01-01" } });

    const card = await waitFor(() => {
      expect(byTest("profile-driver").textContent).toContain("Approved");
      return byTest("profile-driver");
    });
    expect(card.textContent).toContain("405-555-1234");
    expect(card.textContent).toContain("Jan 1, 2020");
    expect(card.textContent).toContain("Your license has expired");
  });

  it("gives a maintenance-only user a Maintenance tab and no Issue reports tab", async () => {
    maintenanceNeedServices.getMaintenanceNeeds.mockResolvedValue({
      data: [
        { id: 5, title: "Brake noise", assigneeId: 2, authorId: 1, priority: "High", status: "Open", createdAt },
        { id: 6, title: "Someone else's", assigneeId: 9, authorId: 9, priority: "Low", status: "Open", createdAt },
      ],
    });
    await openProfile({ ...jane, roles: [maintenanceRole] });

    await waitFor(() => expect(tabTitles()).toEqual(["Requests", "Maintenance 1"]));
    expect(issueReportServices.getIssueReports).not.toHaveBeenCalled();
  });

  it("shows the error when the profile can't load", async () => {
    signInAs({ userId: 2, email: jane.email, firstName: "Jane", lastName: "Doe", roles: [], token: "t" });
    userServices.getUser.mockRejectedValue(apiError(500, "Failed to fetch user."));
    await router.push("/profile");
    await router.isReady();
    wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
    await settle();

    await waitFor(() => expect(document.body.querySelector(".v-alert").textContent).toContain("Failed to fetch user."));
  });

  it("is opened from the profile menu", async () => {
    await openProfile(jane);
    await router.push("/");
    await settle();

    document.body.querySelector('[aria-label="Open profile menu"]').click();
    await settle();
    const link = await waitFor(() => {
      expect(byTest("profile-link")).not.toBeNull();
      return byTest("profile-link");
    });
    link.click();
    await settle();

    await waitFor(() => expect(router.currentRoute.value.name).toBe("profile"));
  });
});
