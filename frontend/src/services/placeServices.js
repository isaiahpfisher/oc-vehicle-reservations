import apiClient from "./services.js";

/** Feature 8, FR-008 and FR-010: address search and distance for destinations, proxied to Google by the backend. */
const placeServices = {
  searchAddresses(input, sessionToken) {
    return apiClient.get("places/autocomplete", { params: { input, sessionToken } });
  },

  getAddress(placeId, sessionToken) {
    return apiClient.get(`places/${encodeURIComponent(placeId)}`, { params: { sessionToken } });
  },

  /** Admins and area admins only; each call is a billed Routes request. */
  getMilesFromCampus(placeId) {
    return apiClient.get(`places/${encodeURIComponent(placeId)}/miles-from-campus`);
  },
};

export default placeServices;
