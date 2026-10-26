import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils.js";
import Login from "./views/Login.vue";
import Home from "./views/Home.vue";
import userServices from "./services/userServices.js";
import { setStoredRoles, syncUser, useRoles } from "./composables/useRoles.js";

const publicRouteNames = new Set(["login"]);

/**
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
      // Old Edit User URL
      path: "/users/:id/edit",
      redirect: (to) => ({ name: "userDetails", params: { id: to.params.id } }),
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "home" },
    },
  ],
});

const { hasAnyRole } = useRoles();

/** True if the signed-in user may open `route` (FR-011). */
export const canOpen = (route) => !route.meta?.roles || hasAnyRole(route.meta.roles);

let rolesRefreshed = false;

/** FR-009: the backend owns roles, so reload them once per page load before any role check. */
const refreshRoles = async () => {
  try {
    const { data } = await userServices.getUser(Utils.getStore("user").userId);
    setStoredRoles(data?.roles ?? []);
  } catch (error) {
    if (error.response?.status === 401) {
      Utils.removeItem("user");
      window.dispatchEvent(new CustomEvent("user-logged-out"));
    }
    // Other failures keep the stored roles; the API still enforces them.
  }
};

router.beforeEach(async (to) => {
  if (!rolesRefreshed) {
    rolesRefreshed = true;
    if (Utils.getStore("user")) {
      await refreshRoles();
    }
  }

  syncUser();
  const user = Utils.getStore("user");
  const isPublicRoute = publicRouteNames.has(to.name);

  if (!user && !isPublicRoute) {
    return { name: "login" };
  }

  if (user && isPublicRoute) {
    return { name: "home" };
  }

  if (!canOpen(to)) {
    return { name: "home" };
  }

  return true;
});

export default router;
