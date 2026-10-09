import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils.js";
import Login from "./views/Login.vue";
import Register from "./views/Register.vue";
import Faculty from "./views/Faculty.vue";
import Courses from "./views/Courses.vue";
import Semesters from "./views/Semesters.vue";
import CourseListing from "./views/CourseListing.vue";

const publicRouteNames = new Set(["login", "register"]);

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: Login,
    },
    {
      path: "/register",
      name: "register",
      component: Register,
    },
    {
      path: "/",
      name: "home",
      component: Courses,
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

  if (user && user.role !== "student" && to.name === "course-listing") {
    next({ name: "home" });
    return;
  }

  next();
});

export default router;
