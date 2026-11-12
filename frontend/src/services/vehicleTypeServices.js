import apiClient from "./services.js";

const vehicleTypeServices = {
  getVehicleTypes() {
    return apiClient.get("vehicle-types");
  },

  getVehicleTypeById(vehicleTypeId) {
    return apiClient.get(`vehicle-types/${vehicleTypeId}`);
  },

  createVehicleType(payload) {
    return apiClient.post("vehicle-types", payload);
  },

  updateVehicleType(vehicleTypeId, payload) {
    return apiClient.put(`vehicle-types/${vehicleTypeId}`, payload);
  },

  removeVehicleType(vehicleTypeId) {
    return apiClient.delete(`vehicle-types/${vehicleTypeId}`);
  },
};

export default vehicleTypeServices;
