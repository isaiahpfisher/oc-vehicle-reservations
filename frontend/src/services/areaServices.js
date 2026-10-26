/** INTERIM stand-in for Feature 2 (Area Management). Replace with Feature 2's areaServices once it is merged. */
import apiClient from "./services.js";

const areaServices = {
  getAreas() {
    return apiClient.get("areas");
  },
};

export default areaServices;
