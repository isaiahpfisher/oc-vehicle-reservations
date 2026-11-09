/**
 * Feature 3 FR-016 / FR-017: the project team's real Google accounts. The seed creates them as admins, and in
 * development (DEV_LOGIN on, never production) Google sign-in gives them the admin role. Google replaces these names.
 */
export const TEAM_ADMINS = [
  { firstName: "Isaiah", lastName: "Fisher", email: "isaiah.fisher@eagles.oc.edu", roles: [{ role: "admin" }] },
  { firstName: "Lana", lastName: "Cutter", email: "lana.n.cutter@eagles.oc.edu", roles: [{ role: "admin" }] },
  { firstName: "J", lastName: "Walraven", email: "j.walraven@eagles.oc.edu", roles: [{ role: "admin" }] },
];

export const isTeamAdmin = (email) => TEAM_ADMINS.some((admin) => admin.email === email);
