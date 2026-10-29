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
      meta: { nav: "My Requests", icon: "mdi-car-outline" },
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
      path: "/requests",
      name: "adminRequests",
      component: () => import("./views/Admin/Requests.vue"),
      meta: { nav: "Requests", icon: "mdi-clipboard-list-outline", roles: ["area_admin"] },
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
