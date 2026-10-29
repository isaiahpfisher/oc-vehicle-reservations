import apiClient from "./services.js";

/** Feature 8, FR-008: address search for custom destinations, proxied to Google Places by the backend. */
const placeServices = {
  searchAddresses(input, sessionToken) {
    return apiClient.get("places/autocomplete", { params: { input, sessionToken } });
  },

  getAddress(placeId, sessionToken) {
    return apiClient.get(`places/${encodeURIComponent(placeId)}`, { params: { sessionToken } });
  },
};

export default placeServices;
