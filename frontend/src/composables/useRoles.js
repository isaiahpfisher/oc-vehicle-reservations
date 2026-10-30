import { computed } from "vue";
import { useAuthStore } from "../stores/auth.js";

/** Role checks for the signed-in user (Feature 3 US-3.7), backed by the auth store. */
export const useRoles = () => {
  const auth = useAuthStore();

  /**
   * True only if the user holds exactly `role`. Admins are NOT treated as holding other roles (for display).
   * For `area_admin`, `areaId` checks that area; leaving it out matches any area.
   */
  const hasRole = (role, areaId) =>
    auth.roles.some((held) => held.role === role && (areaId == null || role !== "area_admin" || held.areaId === areaId));

  /** True if the user holds any of `roleNames` or is an admin. Use for access checks. */
  const hasAnyRole = (roleNames = []) => hasRole("admin") || roleNames.some((role) => hasRole(role));

  const areaAdminAreaIds = computed(() =>
    auth.roles.filter((held) => held.role === "area_admin").map((held) => held.areaId),
  );

  return { user: computed(() => auth.user), hasRole, hasAnyRole, areaAdminAreaIds };
};
