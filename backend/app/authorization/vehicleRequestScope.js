import { canAccessArea, isAdmin } from "./authorization.js";

/** Requesters see their own requests; admins and area admins also see requests in the areas they manage. */
export const canViewRequest = (user, request) => request.userId === user.id || canAccessArea(user, request.areaId);

/** True if the user may approve, assign vehicles to, or change the status of this request. */
export const canManageRequest = (user, request) => canAccessArea(user, request.areaId);

/** `where` clause for `GET /requests`: every request for admins, managed areas for area admins (FR-002). */
export const managedRequestsWhere = (user) =>
  isAdmin(user) ? {} : { areaId: user.roles.filter(({ role }) => role === "area_admin").map(({ areaId }) => areaId) };
