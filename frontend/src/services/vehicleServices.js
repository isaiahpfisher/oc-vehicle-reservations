import apiClient from "./services.js";

const vehicleServices = {
  getVehicles() {
    return apiClient.get("vehicles");
  },

  getVehicle(vehicleId) {
    return apiClient.get(`vehicles/${vehicleId}`);
  },

  createVehicle(payload) {
    return apiClient.post("vehicles", payload);
  },

  updateVehicle(vehicleId, payload) {
    return apiClient.put(`vehicles/${vehicleId}`, payload);
  },

  removeVehicle(vehicleId) {
    return apiClient.delete(`vehicles/${vehicleId}`);
  },
};

export default vehicleServices;
