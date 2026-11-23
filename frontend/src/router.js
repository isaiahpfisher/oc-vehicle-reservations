import { createRouter, createWebHistory } from "vue-router";
import Login from "./views/Login.vue";
import MyRequests from "./views/MyRequests.vue";
import userServices from "./services/userServices.js";
import { useRoles } from "./composables/useRoles.js";
import { useAuthStore } from "./stores/auth.js";

/**
 * Access is declared on each route's `meta`; `router.beforeEach` and the nav both read it.
 * `meta.public`: open without a session; a signed-in user is sent home instead (Feature 1, FR-005).
 * `meta.roles`: the user needs any one of these (admins always pass); no `meta.roles` = any signed-in user.
 * `meta.nav` / `meta.icon`: label and icon for the MenuBar/Sidebar link, shown only when the user may open the route.
 * `meta.navGroup`: the Sidebar section the link sits in (NAV_GROUPS in useAppNav.js); links keep the order defined here.
 * `meta.pinned`: the Sidebar shows the link just above the profile instead of with the other pages.
 * `meta.badge`: the Sidebar shows that `GET /nav-counts` number on the link (UI/UX backlog #15).
 * `meta.badgeLabel`: what the number counts, for screen readers ("Drivers, 2 to renew"); "waiting" when not given.
 * `meta.notForOnly`: users whose only role is this one can't open the route (UI/UX backlog #28: maintenance and
 *   issue reports). Anyone who also holds another role, and requesters with no roles, still can.
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: Login,
      meta: { public: true },
    },
    {
      // Feature 8: home is the requester's own requests (replaces Feature 3's welcome page).
      path: "/",
      name: "home",
      component: MyRequests,
      meta: { nav: "My Requests", icon: "mdi-car-outline", pinned: true },
    },
    {
      // UI/UX backlog #13: every signed-in user's own profile, opened from the profile menu.
      path: "/profile",
      name: "profile",
      component: () => import("./views/Profile.vue"),
      // Opened from the profile menu, not a Sidebar link, so nothing in the Sidebar is marked.
      meta: { navUnder: null },
    },
    // Trips: planning and approving trips.
    {
      path: "/requests",
      name: "adminRequests",
      component: () => import("./views/Admin/Requests.vue"),
      meta: { nav: "Requests", navGroup: "Trips", icon: "mdi-clipboard-list-outline", roles: ["area_admin"], badge: "requests" },
    },
    {
      path: "/requests/new",
      name: "createRequest",
      component: () => import("./views/Request.vue"),
    },
    {
      path: "/requests/:requestId",
      name: "request",
      component: () => import("./views/Request.vue"),
      props: true,
    },
    {
      path: "/vehicles/:vehicleId/mileage-logs",
      name: "vehicle-mileage-logs",
      component: () => import("./views/MileageLogs.vue"),
      props: true,
      meta: { roles: ["admin", "area_admin", "maintenance"] },
    },
    {
      path: "/service-logs/:vehicleId",
      name: "service-logs",
      component: () => import("./views/ServiceLogs.vue"),
      props: true,
      // A vehicle's service log: the Sidebar marks Vehicles, like the vehicle's mileage log under /vehicles/:id.
      meta: { roles: ["admin", "area_admin", "maintenance"], navUnder: "vehicles" },
    },
    {
      path: "/drivers",
      name: "drivers",
      component: () => import("./views/Drivers.vue"),
      meta: {
        nav: "Drivers",
        navGroup: "Trips",
        icon: "mdi-card-account-details-outline",
        roles: ["admin", "area_admin"],
        // Licenses expired or expiring within 30 days, like the page's "Licenses to renew".
        badge: "drivers",
        badgeLabel: "to renew",
      },
    },
    {
      path: "/drivers/new",
      name: "driverCreate",
      component: () => import("./views/DriverForm.vue"),
      meta: { roles: ["admin", "area_admin"] },
    },
    {
      path: "/drivers/:id",
      name: "driverDetails",
      component: () => import("./views/DriverForm.vue"),
      props: true,
      meta: { roles: ["admin", "area_admin"] },
    },
    {
      path: "/destinations",
      name: "destinations",
      component: () => import("./views/Destinations.vue"),
      meta: { nav: "Destinations", navGroup: "Trips", icon: "mdi-map-marker-outline", roles: ["admin", "area_admin"] },
    },
    {
      path: "/destinations/new",
      name: "destinationCreate",
      component: () => import("./views/DestinationForm.vue"),
      meta: { roles: ["admin", "area_admin"] },
    },
    {
      path: "/destinations/:id",
      name: "destinationDetails",
      component: () => import("./views/DestinationForm.vue"),
      props: true,
      meta: { roles: ["admin", "area_admin"] },
    },
    // Fleet: the vehicles and their upkeep.
    {
      path: "/vehicles",
      name: "vehicles",
      component: () => import("./views/Vehicles.vue"),
      meta: {
        nav: "Vehicles",
        navGroup: "Fleet",
        icon: "mdi-car-multiple",
        roles: ["admin", "area_admin", "maintenance"],
        // The vehicles the page's "Needs attention" filter shows.
        badge: "vehicles",
        badgeLabel: "need attention",
      },
    },
    {
      path: "/vehicles/new",
      name: "vehicleCreate",
      component: () => import("./views/VehicleForm.vue"),
      meta: { roles: ["admin", "area_admin"] },
    },
    {
      path: "/vehicles/:id",
      name: "vehicleDetails",
      component: () => import("./views/VehicleForm.vue"),
      props: true,
      meta: { roles: ["admin", "area_admin", "maintenance"] },
    },
    {
      // UI/UX backlog #9: area admins open vehicle types too (read-only), to write their areas' instructions.
      path: "/vehicle-types",
      name: "vehicle-types",
      component: () => import("./views/VehicleTypes.vue"),
      meta: { nav: "Vehicle Types", navGroup: "Setup", icon: "mdi-shape-outline", roles: ["admin", "area_admin"] },
    },
    {
      path: "/vehicle-types/:id",
      name: "vehicleTypeDetails",
      component: () => import("./views/VehicleTypeDetails.vue"),
      props: true,
      meta: { roles: ["admin", "area_admin"] },
    },
    {
      // UI/UX backlog #9: instructions moved into each vehicle type's page.
      path: "/vehicle-type-instructions",
      name: "vehicle-type-instructions",
      redirect: { name: "vehicle-types" },
    },
    {
      path: "/issue-reports",
      name: "issue-reports",
      component: () => import("./views/IssueReports.vue"),
      meta: { nav: "Issue Reports", navGroup: "Fleet", icon: "mdi-alert-circle-outline", notForOnly: "maintenance", badge: "issueReports" },
    },
    {
      // Feature 14 (US-14.6): the issue report form page replaces Feature 10's create dialog. Any signed-in user.
      path: "/issue-reports/new",
      name: "issueReportCreate",
      component: () => import("./views/IssueReport.vue"),
      meta: { notForOnly: "maintenance" },
    },
    {
      // Feature 14 (US-14.6): replaces Feature 11's placeholder redirect. Access is checked by the API (Feature 10, FR-014).
      path: "/issue-reports/:issueReportId",
      name: "issueReport",
      component: () => import("./views/IssueReport.vue"),
      props: true,
      meta: { notForOnly: "maintenance" },
    },
    {
      path: "/service-types",
      name: "service-types",
      component: () => import("./views/ServiceTypes.vue"),
      meta: {
        nav: "Service Types",
        navGroup: "Setup",
        icon: "mdi-wrench-outline",
        roles: ["admin", "area_admin", "maintenance"],
      },
    },
    // Administration: who can do what, and where.
    {
      path: "/users",
      name: "users",
      component: () => import("./views/users/ListUsers.vue"),
      meta: { nav: "Users", navGroup: "Administration", icon: "mdi-account-multiple-outline", roles: ["admin"] },
    },
    {
      path: "/users/:id",
      name: "userDetails",
      component: () => import("./views/users/UserDetails.vue"),
      props: true,
      meta: { roles: ["admin"] },
    },
    {
      path: "/areas",
      name: "areas",
      component: () => import("./views/Areas.vue"),
      meta: { nav: "Areas", navGroup: "Administration", icon: "mdi-domain", roles: ["admin"] },
    },
    {
      path: "/maintenance-needs",
      name: "maintenance-needs",
      component: () => import("./views/MaintenanceNeeds.vue"),
      meta: {
        nav: "Maintenance Needs",
        navGroup: "Fleet",
        icon: "mdi-tools",
        badge: "maintenanceNeeds",
        roles: ["admin", "area_admin", "maintenance"],
      },
    },
    {
      path: "/maintenance-needs/new",
      name: "maintenanceNeedCreate",
      component: () => import("./views/MaintenanceNeedsForm.vue"),
      meta: { roles: ["admin", "area_admin", "maintenance"] },
    },
    {
      path: "/maintenance-needs/:id",
      name: "maintenanceNeedEdit",
      component: () => import("./views/MaintenanceNeedsForm.vue"),
      props: true,
      meta: { roles: ["admin", "area_admin", "maintenance"] },
    },
    {
      // UI/UX backlog #17: say the page doesn't exist instead of silently going home (App.vue shows the notice).
      path: "/:pathMatch(.*)*",
      redirect: { name: "home", query: { notice: "not-found" } },
    },
  ],
});

/** True if the signed-in user may open `route` (FR-011). */
export const canOpen = (route) => {
  const roles = useRoles();
  if (route.meta?.notForOnly && roles.holdsOnlyRole(route.meta.notForOnly)) return false;
  return !route.meta?.roles || roles.hasAnyRole(route.meta.roles);
};

/**
 * UI/UX backlog #14: where signing in lands, by role. Area admins (and admins) start on the requests waiting for
 * them; maintenance users on the needs assigned to them; everyone else on their own requests. Home stays My Requests.
 */
export const landingRoute = () => {
  const roles = useRoles();
  if (roles.hasAnyRole(["area_admin"])) return { name: "adminRequests", query: { needsAction: "1" } };
  if (roles.hasRole("maintenance")) return { name: "maintenance-needs" };
  return { name: "home" };
};

/**
 * UI/UX backlog #17: a `?redirect=` from the login page, if it's a path inside the app the user may open now.
 * Anything else (another site, an unknown page) is ignored.
 */
export const redirectTarget = (redirect) => {
  if (typeof redirect !== "string" || !redirect.startsWith("/") || redirect.startsWith("//")) return null;
  const target = router.resolve(redirect);
  return target.matched.length && target.name !== "login" && !target.matched.some((record) => record.redirect) && canOpen(target) ? redirect : null;
};

let rolesRefreshed = false;

/** FR-009: the backend owns roles, so reload them once per page load before any role check. */
const refreshRoles = async (auth) => {
  try {
    const { data } = await userServices.getUser(auth.user.userId);
    auth.setRoles(data?.roles ?? []);
  } catch (error) {
    if (error.response?.status === 401) {
      auth.signOut();
    }
    // Other failures keep the stored roles; the API still enforces them.
  }
};

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (!rolesRefreshed) {
    rolesRefreshed = true;
    if (auth.isSignedIn) {
      await refreshRoles(auth);
    }
  }

  if (to.meta.public) {
    return auth.isSignedIn ? { name: "home" } : true;
  }

  // UI/UX backlog #17: remember where the user was headed, so signing in takes them there.
  if (!auth.isSignedIn) {
    return to.name === "home" ? { name: "login" } : { name: "login", query: { redirect: to.fullPath } };
  }

  // UI/UX backlog #17: say why instead of silently going home (App.vue shows the notice).
  if (!canOpen(to)) {
    return { name: "home", query: { notice: "no-access" } };
  }

  return true;
});

/**
 * UI/UX backlog #43: every browser tab named for its page, not the app. Menu pages use their `meta.nav` label;
 * the rest are named here.
 */
// UI/UX backlog #43.
export const APP_NAME = "OC Vehicles";
const PAGE_TITLES = {
  login: "Sign in",
  profile: "Your profile",
  createRequest: "New request",
  request: "Request",
  "vehicle-mileage-logs": "Mileage log",
  "service-logs": "Service log",
  driverCreate: "New driver",
  driverDetails: "Driver",
  destinationCreate: "New destination",
  destinationDetails: "Destination",
  vehicleCreate: "New vehicle",
  vehicleDetails: "Vehicle",
  issueReportCreate: "Report an issue",
  issueReport: "Issue report",
  userDetails: "User",
  maintenanceNeedCreate: "New maintenance need",
  maintenanceNeedEdit: "Maintenance need",
  vehicleTypeDetails: "Vehicle type",
};

export const pageTitle = (route) => {
  const page = route.meta?.nav ?? PAGE_TITLES[route.name];
  return page ? `${page} · ${APP_NAME}` : APP_NAME;
};

router.afterEach((to) => {
  document.title = pageTitle(to);
});

export default router;
