/**
 * STUB(feature-3): same API as Feature 3's useRoles, but reads `roles` straight from the stored login response.
 * Delete this file when Feature 3 merges; its version (backed by the auth store) is a drop-in replacement.
 */
import { computed } from "vue";
import Utils from "../config/utils.js";

export const useRoles = () => {
  const user = computed(() => Utils.getStore("user"));
  const roles = computed(() => user.value?.roles ?? []);

  /** True only if the user holds exactly `role` (in `areaId`, for area admins). */
  const hasRole = (role, areaId) =>
    roles.value.some((held) => held.role === role && (areaId == null || role !== "area_admin" || held.areaId === areaId));

  /** True if the user holds any of `roleNames` or is an admin. */
  const hasAnyRole = (roleNames = []) => hasRole("admin") || roleNames.some((role) => hasRole(role));

  const areaAdminAreaIds = computed(() =>
    roles.value.filter((held) => held.role === "area_admin").map((held) => held.areaId),
  );

  return { user, hasRole, hasAnyRole, areaAdminAreaIds };
};
