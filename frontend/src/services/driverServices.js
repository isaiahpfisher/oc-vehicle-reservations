import apiClient from "./services.js";

const driverServices = {
  getDrivers() {
    return apiClient.get("drivers");
  },

  getDriver(driverId) {
    return apiClient.get(`drivers/${driverId}`);
  },

  /** Users the driver form can link; `driverId` also includes that driver's own linked user. */
  getAvailableUsers(driverId) {
    return apiClient.get("drivers/available-users", { params: { driverId } });
  },

  createDriver(payload) {
    return apiClient.post("drivers", payload);
  },

  updateDriver(driverId, payload) {
    return apiClient.put(`drivers/${driverId}`, payload);
  },

  removeDriver(driverId) {
    return apiClient.delete(`drivers/${driverId}`);
  },
};

export default driverServices;
