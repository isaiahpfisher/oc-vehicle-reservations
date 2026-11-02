import apiClient from "./services.js";

const requestServices = {
  getMyRequests() {
    return apiClient.get("me/requests");
  },

  getRequests() {
    return apiClient.get("requests");
  },

  getRequest(requestId) {
    return apiClient.get(`requests/${requestId}`);
  },

  createRequest(payload) {
    return apiClient.post("requests", payload);
  },

  updateRequest(requestId, payload) {
    return apiClient.put(`requests/${requestId}`, payload);
  },

  getVehicleOptions(requestId) {
    return apiClient.get(`requests/${requestId}/vehicle-options`);
  },

  // INTERIM(feature-7): move to driverServices.js when Drivers merges. The path is Feature 7's (FR-015).
  getDrivers() {
    return apiClient.get("drivers/selectable");
  },
};

export default requestServices;
