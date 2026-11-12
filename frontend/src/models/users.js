/**
 * Role options are strings so Vuetify selects can hold them:
 * `admin`, `maintenance`, or `area_admin:<areaId>`.
 */
export const roleKey = ({ role, areaId }) => (role === "area_admin" ? `area_admin:${areaId}` : role);

export const ROLE_LABELS = { admin: "Admin", maintenance: "Maintenance", area_admin: "Area Admin" };

export const roleLabel = (role) =>
  role.role === "area_admin" ? `${ROLE_LABELS.area_admin} — ${role.area?.name ?? "Unknown area"}` : ROLE_LABELS[role.role];

const DISPLAY_ORDER = { admin: 0, maintenance: 1, area_admin: 2 };

/** Display order for role chips: Admin, Maintenance, then Area Admin by area name. */
export const sortRolesForDisplay = (roles = []) =>
  [...roles].sort(
    (a, b) => DISPLAY_ORDER[a.role] - DISPLAY_ORDER[b.role] || (a.area?.name ?? "").localeCompare(b.area?.name ?? ""),
  );

/** System role checkboxes on the User details Access card. */
export const systemRoleOptions = [
  { title: ROLE_LABELS.admin, value: "admin" },
  { title: ROLE_LABELS.maintenance, value: "maintenance" },
];

/**
 * "Area admin of" checkboxes: every area, plus any area the user already administers
 * (so a held role always has a labeled checkbox), sorted by name.
 */
export const areaRoleOptions = (areas = [], user = null) => {
  const known = new Map(areas.map((area) => [area.id, area]));
  for (const role of user?.roles ?? []) {
    if (role.area && !known.has(role.area.id)) known.set(role.area.id, role.area);
  }

  return [...known.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((area) => ({ title: area.name, value: roleKey({ role: "area_admin", areaId: area.id }) }));
};

/** PUT payload from selected option keys. */
export const toRolesPayload = (keys) =>
  keys.map((key) => {
    const [role, areaId] = key.split(":");
    return areaId ? { role, areaId: Number(areaId) } : { role };
  });

export const fullName = (user) => [user.firstName, user.lastName].filter(Boolean).join(" ");

export const initials = (user) =>
  [user.firstName, user.lastName]
    .filter(Boolean)
    .map((name) => name[0].toUpperCase())
    .join("");

/** "October 2026" from an ISO date. */
export const memberSince = (createdAt) =>
  createdAt ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(createdAt)) : "";

export const userMatchesQuery = (user, query) => {
  if (!query?.trim()) return true;

  const name = fullName(user).toLowerCase();
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every((word) => name.includes(word));
};

export const userHasRoleKey = (user, key) => !key || user.roles.some((role) => roleKey(role) === key);
