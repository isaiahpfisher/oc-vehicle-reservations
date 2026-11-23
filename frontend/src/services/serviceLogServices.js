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

  /** UI/UX backlog #54: a visit is the service logs sharing one odometer reading, keyed by that reading's id. */
  updateServiceVisit(mileageLogId, payload) {
    return apiClient.put(`service-logs/visits/${mileageLogId}`, payload);
  },

  removeServiceVisit(mileageLogId) {
    return apiClient.delete(`service-logs/visits/${mileageLogId}`);
  },
};

export default serviceLogServices;
