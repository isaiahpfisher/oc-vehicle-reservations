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

  removeArea(areaId) {
    return apiClient.delete(`areas/${areaId}`);
  },
};

export default areaServices;
