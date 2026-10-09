import apiClient from "./services.js";

const enrollmentServices = {
  getEnrollments() {
    return apiClient.get("enrollments");
  },

  createEnrollment(payload) {
    return apiClient.post("enrollments", payload);
  },

  deleteEnrollment(sectionId) {
    return apiClient.delete(`enrollments/${sectionId}`);
  },
};

export default enrollmentServices;
