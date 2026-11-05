import apiClient from "./services.js";

/** INTERIM: remove when Feature 8 serves vehicle requests. */
const vehicleRequestServices = {
  getVehicleRequests() {
    return apiClient.get("vehicle-requests");
  },
};

export default vehicleRequestServices;
