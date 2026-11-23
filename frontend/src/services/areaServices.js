import apiClient from "./services.js";

const areaServices = {
  getAreas() {
    return apiClient.get("areas");
  },

  getAreaById(areaId) {
    return apiClient.get(`areas/${areaId}`);
  },

  createArea(payload) {
    return apiClient.post("areas", payload);
  },

  updateArea(areaId, payload) {
    return apiClient.put(`areas/${areaId}`, payload);
  },

  /** UI/UX backlog #33: `moveVehiclesTo` (an id) moves its vehicles there as part of the delete. */
  removeArea(areaId, moveVehiclesTo) {
    return apiClient.delete(`areas/${areaId}`, moveVehiclesTo ? { params: { moveVehiclesTo } } : undefined);
  },
};

export default areaServices;
