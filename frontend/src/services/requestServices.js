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
};

export default requestServices;
