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

  /** UI/UX backlog #33: `moveVehiclesTo` (an id) moves its vehicles there as part of the delete. */
  removeVehicleType(vehicleTypeId, moveVehiclesTo) {
    return apiClient.delete(`vehicle-types/${vehicleTypeId}`, moveVehiclesTo ? { params: { moveVehiclesTo } } : undefined);
  },
};

export default vehicleTypeServices;
