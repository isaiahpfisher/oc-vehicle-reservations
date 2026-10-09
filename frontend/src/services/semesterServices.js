import apiClient from "./services.js";

const semesterServices = {
  getSemesters() {
    return apiClient.get("semesters");
  },

  getSemesterById(semesterId) {
    return apiClient.get(`semesters/${semesterId}`);
  },

  createSemester(payload) {
    return apiClient.post("semesters", payload);
  },

  updateSemester(semesterId, payload) {
    return apiClient.put(`semesters/${semesterId}`, payload);
  },

  removeSemester(semesterId) {
    return apiClient.delete(`semesters/${semesterId}`);
  },
};

export default semesterServices;