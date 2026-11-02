import apiClient from "./services.js";

const destinationServices = {
  getDestinations() {
    return apiClient.get("destinations");
  },

  getDestinationById(destinationId) {
    return apiClient.get(`destinations/${destinationId}`);
  },

  createDestination(payload) {
    return apiClient.post("destinations", payload);
  },

  updateDestination(destinationId, payload) {
    return apiClient.put(`destinations/${destinationId}`, payload);
  },

  removeDestination(destinationId) {
    return apiClient.delete(`destinations/${destinationId}`);
  },
};

export default destinationServices;
