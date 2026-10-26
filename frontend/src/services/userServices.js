import apiClient from "./services.js";

const userServices = {
  getUsers() {
    return apiClient.get("users");
  },

  getUser(userId) {
    return apiClient.get(`users/${userId}`);
  },

  /** Replace a user's roles: `roles` is `[{ role, areaId? }]`. Name and email are not editable. */
  updateUserRoles(userId, roles) {
    return apiClient.put(`users/${userId}`, { roles });
  },

  deleteUser(userId) {
    return apiClient.delete(`users/${userId}`);
  },
};

export default userServices;
