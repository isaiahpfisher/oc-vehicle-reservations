import apiClient from "./services.js";

const facultyServices = {
  getFaculty() {
    return apiClient.get("faculty");
  },

  getFacultyById(facultyId) {
    return apiClient.get(`faculty/${facultyId}`);
  },

  createFaculty(payload) {
    return apiClient.post("faculty", payload);
  },

  updateFaculty(facultyId, payload) {
    return apiClient.put(`faculty/${facultyId}`, payload);
  },

  removeFaculty(facultyId) {
    return apiClient.delete(`faculty/${facultyId}`);
  },
};

export default facultyServices;