import { canAccessArea, isAdmin } from "./authorization.js";

/** Requesters see their own requests; admins and area admins also see requests in the areas they manage. */
export const canViewRequest = (user, request) => request.user_id === user.id || canAccessArea(user, request.area_id);

/** True if the user may approve, assign vehicles to, or change the status of this request. */
export const canManageRequest = (user, request) => canAccessArea(user, request.area_id);

/** `where` clause for `GET /requests`: every request for admins, managed areas for area admins (FR-002). */
export const managedRequestsWhere = (user) =>
  isAdmin(user) ? {} : { area_id: user.roles.filter(({ role }) => role === "area_admin").map(({ areaId }) => areaId) };
