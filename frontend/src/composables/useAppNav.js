import { computed } from "vue";
import { useRouter } from "vue-router";
import { useRoles } from "./useRoles.js";
import { canOpen } from "../router.js";

/** Sidebar sections, in order. A route joins one with `meta.navGroup`; routes without one come first, unlabeled. */
export const NAV_GROUPS = ["Trips", "Fleet", "Administration"];

/**
 * Page links for the app shell (MenuBar or Sidebar): routes with `meta.nav` the user may open, in the order router.js
 * defines them. Same `canOpen` rule as router.beforeEach.
 * `navGroups` splits the unpinned links into Sidebar sections; empty sections are left out.
 */
export const useAppNav = () => {
  const router = useRouter();
  const { user } = useRoles();

  // getRoutes() is sorted by path rank, so restore definition order; routes added at runtime go last.
  const definitionOrder = new Map(router.options.routes.map((route, index) => [route.name, index]));
  const position = (route) => definitionOrder.get(route.name) ?? Infinity;

  // `user` is read so the links re-evaluate when roles change.
  const navLinks = computed(() =>
    user.value
      ? router
          .getRoutes()
          .filter((route) => route.meta?.nav && canOpen(route))
          .sort((a, b) => position(a) - position(b))
      : [],
  );

  const navGroups = computed(() => {
    const links = navLinks.value.filter((link) => !link.meta.pinned);
    return [null, ...NAV_GROUPS]
      .map((title) => ({ title, links: links.filter((link) => (link.meta.navGroup ?? null) === title) }))
      .filter((group) => group.links.length);
  });

  return { user, navLinks, navGroups };
};
