import apiClient from "./services.js";

const serviceTypeServices = {
  getServiceTypes() {
    return apiClient.get("service-types");
  },

  getServiceTypeById(serviceTypeId) {
    return apiClient.get(`service-types/${serviceTypeId}`);
  },

  createServiceType(payload) {
    return apiClient.post("service-types", payload);
  },

  updateServiceType(serviceTypeId, payload) {
    return apiClient.put(`service-types/${serviceTypeId}`, payload);
  },

  removeServiceType(serviceTypeId) {
    return apiClient.delete(`service-types/${serviceTypeId}`);
  },
};

export default serviceTypeServices;
