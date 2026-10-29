import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils.js";
import Login from "./views/Login.vue";
import Faculty from "./views/Faculty.vue";
import Semesters from "./views/Semesters.vue";
import CourseListing from "./views/CourseListing.vue";
import Areas from "./views/Areas.vue";
import MyRequests from "./views/MyRequests.vue";
import Request from "./views/Request.vue";
import AdminRequests from "./views/Admin/Requests.vue";

const publicRouteNames = new Set(["login"]);

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
      component: MyRequests,
    },
    {
      path: "/requests/new",
      name: "createRequest",
      component: Request,
    },
    {
      path: "/requests/:requestId",
      name: "request",
      component: Request,
      props: true,
    },
    {
      path: "/admin/requests",
      name: "adminRequests",
      component: AdminRequests,
    },
    {
      path: "/faculty",
      name: "faculty",
      component: Faculty,
    },
    {
      path: "/semesters",
      name: "semesters",
      component: Semesters,
    },
    {
      path: "/course-listing",
      name: "course-listing",
      component: () => import("./views/CourseListing.vue"),
    },
    {
      path: "/areas",
      name: "areas",
      component: Areas,
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "home" },
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const user = Utils.getStore("user");
  const isPublicRoute = publicRouteNames.has(to.name);

  if (!user && !isPublicRoute) {
    next({ name: "login" });
    return;
  }

  if (user && isPublicRoute) {
    next({ name: "home" });
    return;
  }

  if (user && user.role !== "admin" && (to.name === "faculty" || to.name == "semesters")) {
    next({ name: "home" });
    return;
  }

  // STUB(feature-3): Feature 3's router guard checks roles through useRoles(); fold this into it when it merges.
  const managesRequests = user?.roles?.some(({ role }) => role === "admin" || role === "area_admin");
  if (user && !managesRequests && to.name === "adminRequests") {
    next({ name: "home" });
    return;
  }

  if (user && user.role !== "student" && to.name === "course-listing") {
    next({ name: "home" });
    return;
  }

  next();
});

export default router;
