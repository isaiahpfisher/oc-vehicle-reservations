import apiClient from "./services.js";

const serviceLogServices = {
  getServiceLogs() {
    return apiClient.get("service-logs");
  },

  getServiceLog(serviceLogId) {
    return apiClient.get(`service-logs/${serviceLogId}`);
  },

  getServiceLogsByVehicle(vehicleId) {
    return apiClient.get(`service-logs/vehicle/${vehicleId}`);
  },

  createServiceLog(payload) {
    return apiClient.post("service-logs", payload);
  },

  updateServiceLog(serviceLogId, payload) {
    return apiClient.put(`service-logs/${serviceLogId}`, payload);
  },

  removeServiceLog(serviceLogId) {
    return apiClient.delete(`service-logs/${serviceLogId}`);
  },
};

export default serviceLogServices;
