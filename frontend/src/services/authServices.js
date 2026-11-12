import apiClient from "./services.js";
import router from "../router.js";
import { useAuthStore } from "../stores/auth.js";

const authServices = {
  registerUser(payload) {
    return apiClient.post("register", payload);
  },

  loginUser(credentials) {
    return apiClient.post("login", credentials);
  },

  /** Development only (Feature 3 FR-014): `{ email, password }` for an existing user. */
  devLogin(credentials) {
    return apiClient.post("dev-login", credentials);
  },

  async logoutUser() {
    try {
      await apiClient.post("logout");
    } finally {
      useAuthStore().signOut();
      await router.push({ name: "login" });
    }
  },
};

export default authServices;
