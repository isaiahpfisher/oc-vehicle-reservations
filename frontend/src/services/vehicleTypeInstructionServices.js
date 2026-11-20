import apiClient from "./services.js";

const vehicleTypeInstructionServices = {
  getVehicleTypeInstructions() {
    return apiClient.get("vehicle-type-instructions");
  },

  getVehicleTypeInstructionById(vehicleTypeInstructionId) {
    return apiClient.get(`vehicle-type-instructions/${vehicleTypeInstructionId}`);
  },

  createVehicleTypeInstruction(payload) {
    return apiClient.post("vehicle-type-instructions", payload);
  },

  updateVehicleTypeInstruction(vehicleTypeInstructionId, payload) {
    return apiClient.put(`vehicle-type-instructions/${vehicleTypeInstructionId}`, payload);
  },

  removeVehicleTypeInstruction(vehicleTypeInstructionId) {
    return apiClient.delete(`vehicle-type-instructions/${vehicleTypeInstructionId}`);
  },
};

export default vehicleTypeInstructionServices;
