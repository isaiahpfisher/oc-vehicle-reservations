import { computed } from "vue";
import { useRouter } from "vue-router";
import { useRoles } from "./useRoles.js";
import { canOpen } from "../router.js";

/**
 * Page links for the app shell (MenuBar or Sidebar): routes with `meta.nav` the user may open.
 * Same `canOpen` rule as router.beforeEach.
 */
export const useAppNav = () => {
  const router = useRouter();
  const { user } = useRoles();

  // `user` is read so the links re-evaluate when roles change.
  const navLinks = computed(() =>
    user.value ? router.getRoutes().filter((route) => route.meta?.nav && canOpen(route)) : [],
  );

  return { user, navLinks };
};
