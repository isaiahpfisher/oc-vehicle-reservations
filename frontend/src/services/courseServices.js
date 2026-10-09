import apiClient from "./services.js";

const courseServices = {
  getCourses() {
    return apiClient.get("courses");
  },

  getCourse(courseId) {
    return apiClient.get(`courses/${courseId}`);
  },

  createCourse(payload) {
    return apiClient.post("courses", payload);
  },

  updateCourse(courseId, payload) {
    return apiClient.put(`courses/${courseId}`, payload);
  },

  removeCourse(courseId) {
    return apiClient.delete(`courses/${courseId}`);
  },
};

export default courseServices;
