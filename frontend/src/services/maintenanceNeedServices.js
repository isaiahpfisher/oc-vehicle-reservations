import apiClient from "./services.js";

const maintenanceNeedServices = {
  getMaintenanceNeeds() {
    return apiClient.get("maintenance-needs");
  },

  getMaintenanceNeed(maintenanceNeedId) {
    return apiClient.get(`maintenance-needs/${maintenanceNeedId}`);
  },

  getMaintenanceNeedOptions() {
    return apiClient.get("maintenance-needs/options");
  },

  createMaintenanceNeed(payload) {
    return apiClient.post("maintenance-needs", payload);
  },

  updateMaintenanceNeed(maintenanceNeedId, payload) {
    return apiClient.put(`maintenance-needs/${maintenanceNeedId}`, payload);
  },

  removeMaintenanceNeed(maintenanceNeedId) {
    return apiClient.delete(`maintenance-needs/${maintenanceNeedId}`);
  },
};

export default maintenanceNeedServices;
