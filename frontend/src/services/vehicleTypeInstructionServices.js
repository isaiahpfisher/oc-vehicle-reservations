import apiClient from "./services.js";

const vehicleTypeInstructionServices = {
  /** UI/UX backlog #9: `{ vehicleTypeId }` loads one vehicle type's instructions. */
  getVehicleTypeInstructions(params) {
    return apiClient.get("vehicle-type-instructions", params ? { params } : undefined);
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
