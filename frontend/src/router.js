import { createRouter, createWebHistory } from "vue-router";
import Login from "./views/Login.vue";
import Home from "./views/Home.vue";
import userServices from "./services/userServices.js";
import { useRoles } from "./composables/useRoles.js";
import { useAuthStore } from "./stores/auth.js";

/**
 * Access is declared on each route's `meta`; `router.beforeEach` and the nav both read it.
 * `meta.public`: open without a session; a signed-in user is sent home instead (Feature 1, FR-005).
 * `meta.roles`: the user needs any one of these (admins always pass); no `meta.roles` = any signed-in user.
 * `meta.nav` / `meta.icon`: label and icon for the MenuBar/Sidebar link, shown only when the user may open the route.
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
      path: "/",
      name: "home",
      component: Home,
      meta: { nav: "Home", icon: "mdi-home-outline" },
    },
    {
      path: "/users",
      name: "users",
      component: () => import("./views/users/ListUsers.vue"),
      meta: { nav: "Users", icon: "mdi-account-multiple-outline", roles: ["admin"] },
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
      meta: { nav: "Areas", icon: "mdi-map-marker-outline", roles: ["admin"] },
    },
    {
      path: "/vehicle-types",
      name: "vehicle-types",
      component: () => import("./views/VehicleTypes.vue"),
      meta: { nav: "Vehicle Types", icon: "mdi-car-outline", roles: ["admin"] },
    },
    {
      path: "/vehicles",
      name: "vehicles",
      component: () => import("./views/Vehicles.vue"),
      meta: { nav: "Vehicles", icon: "mdi-car-multiple", roles: ["admin", "area_admin"] },
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
      meta: { roles: ["admin", "area_admin"] },
    },
    {
      path: "/service-types",
      name: "service-types",
      component: () => import("./views/ServiceTypes.vue"),
      meta: {
        nav: "Service Types",
        icon: "mdi-wrench-outline",
        roles: ["admin", "area_admin", "maintenance"],
      },
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
