import { computed, readonly, ref } from "vue";
import Utils from "../config/utils.js";

// One shared copy of the stored user so templates re-render when roles change.
const user = ref(Utils.getStore("user"));

/** Re-read the stored `user` (after login, logout, or a role refresh). */
export const syncUser = () => {
  user.value = Utils.getStore("user");
};

/** Replace the signed-in user's stored roles (after a refresh or a self-edit). */
export const setStoredRoles = (roles) => {
  Utils.setStore("user", { ...Utils.getStore("user"), roles });
  syncUser();
};

window.addEventListener("user-logged-in", syncUser);
window.addEventListener("user-logged-out", syncUser);

const roles = () => user.value?.roles ?? [];

/**
 * True only if the user holds exactly `role`. Admins are NOT treated as holding other roles (for display).
 * For `area_admin`, `areaId` checks that area; leaving it out matches any area.
 */
const hasRole = (role, areaId) =>
  roles().some((held) => held.role === role && (areaId == null || role !== "area_admin" || held.areaId === areaId));

/** True if the user holds any of `roleNames` or is an admin. Use for access checks. */
const hasAnyRole = (roleNames = []) => hasRole("admin") || roleNames.some((role) => hasRole(role));

const areaAdminAreaIds = computed(() =>
  roles()
    .filter((held) => held.role === "area_admin")
    .map((held) => held.areaId),
);

export const useRoles = () => ({ user: readonly(user), hasRole, hasAnyRole, areaAdminAreaIds });
