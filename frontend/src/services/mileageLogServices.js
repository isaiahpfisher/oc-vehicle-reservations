import apiClient from "./services.js";

const mileageLogServices = {
  getMileageLogs(vehicleId) {
    return apiClient.get("mileage-logs", { params: { vehicleId } });
  },

  getMileageLog(mileageLogId) {
    return apiClient.get(`mileage-logs/${mileageLogId}`);
  },

  createMileageLog(payload) {
    return apiClient.post("mileage-logs", payload);
  },

  updateMileageLog(mileageLogId, payload) {
    return apiClient.put(`mileage-logs/${mileageLogId}`, payload);
  },

  removeMileageLog(mileageLogId) {
    return apiClient.delete(`mileage-logs/${mileageLogId}`);
  },
};

export default mileageLogServices;
