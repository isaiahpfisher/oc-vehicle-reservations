import apiClient from "./services.js";

const destinationServices = {
  getDestinations() {
    return apiClient.get("destinations");
  },

  /** Feature 8: official destinations for the request form. Any signed-in user. */
  getSelectableDestinations() {
    return apiClient.get("destinations/selectable");
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
