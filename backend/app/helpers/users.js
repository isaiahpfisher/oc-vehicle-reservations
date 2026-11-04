import db from "../models/index.js";

/** Sequelize `include` that loads a user's roles and each role's area. */
export const rolesInclude = () => [
  {
    model: db.role,
    as: "roles",
    attributes: ["id", "role", "areaId"],
    include: [{ model: db.area, as: "area", attributes: ["id", "name"] }],
  },
];

const compareRoles = (a, b) => a.role.localeCompare(b.role) || (a.area?.name ?? "").localeCompare(b.area?.name ?? "");

const toRoleResponse = (role) => ({
  id: role.id,
  role: role.role,
  areaId: role.areaId,
  area: role.area ? { id: role.area.id, name: role.area.name } : null,
});

/** Roles in display-stable order, as returned by the API. */
export const toRolesResponse = (roles = []) => [...roles].sort(compareRoles).map(toRoleResponse);

/** Sequelize `include` that loads a user's linked driver. */
export const driverInclude = () => [
  {
    model: db.driver,
    as: "driver",
    attributes: ["id", "status", "licenseState", "licenseExpirationDate", "phoneNumber"],
  },
];

/** The linked driver as shown on a user (Feature 7, FR-020), or `null`. */
export const toLinkedDriverResponse = (driver) =>
  driver
    ? {
        status: driver.status,
        licenseState: driver.licenseState,
        licenseExpirationDate: driver.licenseExpirationDate,
        phoneNumber: driver.phoneNumber,
      }
    : null;

/** Flat user payload with roles (no Sequelize instance internals). */
export const toUserResponse = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  createdAt: user.createdAt,
  roles: toRolesResponse(user.roles),
});
