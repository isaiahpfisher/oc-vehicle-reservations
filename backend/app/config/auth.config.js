import "./env.js";
const authConfig = {
  secret: process.env.AUTH_SECRET || "course-speckit-dev-secret",
  // Feature 3 FR-014: read per request so tests (and a restart-free .env tweak) can toggle it.
  devLogin: {
    enabled: () => process.env.DEV_LOGIN === "true" && process.env.NODE_ENV !== "production",
    password: () => process.env.DEV_LOGIN_PASSWORD || "password",
  },
};

export default authConfig;
