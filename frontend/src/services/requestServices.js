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

  // STUB(feature-7): move to driverServices.js when Drivers merges.
  getDrivers() {
    return apiClient.get("drivers");
  },

  // STUB(feature-6): move to destinationServices.js when Destinations merges.
  getDestinations() {
    return apiClient.get("destinations");
  },
};

export default requestServices;
