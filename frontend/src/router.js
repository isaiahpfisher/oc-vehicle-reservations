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
    // Trips: planning and approving trips.
    {
      path: "/requests",
      name: "adminRequests",
      component: () => import("./views/Admin/Requests.vue"),
      meta: { nav: "Requests", navGroup: "Trips", icon: "mdi-clipboard-list-outline", roles: ["area_admin"] },
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
      meta: { roles: ["admin", "area_admin", "maintenance"] },
    },
    {
      path: "/drivers",
      name: "drivers",
      component: () => import("./views/Drivers.vue"),
      meta: { nav: "Drivers", navGroup: "Trips", icon: "mdi-card-account-details-outline", roles: ["admin", "area_admin"] },
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
      meta: { nav: "Vehicles", navGroup: "Fleet", icon: "mdi-car-multiple", roles: ["admin", "area_admin", "maintenance"] },
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
      path: "/vehicle-types",
      name: "vehicle-types",
      component: () => import("./views/VehicleTypes.vue"),
      meta: { nav: "Vehicle Types", navGroup: "Fleet", icon: "mdi-shape-outline", roles: ["admin"] },
    },
    {
      path: "/issue-reports",
      name: "issue-reports",
      component: () => import("./views/IssueReports.vue"),
      meta: { nav: "Issue Reports", navGroup: "Fleet", icon: "mdi-alert-circle-outline" },
    },
    {
      path: "/issue-reports/:id",
      redirect: (to) => ({
        path: "/issue-reports",
        query: {
          notice: `There is no page for /issue-reports/${to.params.id}. This is a placeholder for when such a page comes into existence.`,
        },
      }),
    },
    {
      path: "/service-types",
      name: "service-types",
      component: () => import("./views/ServiceTypes.vue"),
      meta: {
        nav: "Service Types",
        navGroup: "Fleet",
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
      path: "/:pathMatch(.*)*",
      redirect: { name: "home" },
    },
  ],
});

/** True if the signed-in user may open `route` (FR-011). */
export const canOpen = (route) => !route.meta?.roles || useRoles().hasAnyRole(route.meta.roles);

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

  if (!auth.isSignedIn) {
    return { name: "login" };
  }

  if (!canOpen(to)) {
    return { name: "home" };
  }

  return true;
});

export default router;
