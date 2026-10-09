import apiClient from "./services.js";

const sectionServices = {
  getSections() {
    return apiClient.get("sections");
  },

  getSection(sectionId) {
    return apiClient.get(`sections/${sectionId}`);
  },

  createSection(payload) {
    return apiClient.post("sections", payload);
  },

  updateSection(sectionId, payload) {
    return apiClient.put(`sections/${sectionId}`, payload);
  },

  removeSection(sectionId) {
    return apiClient.delete(`sections/${sectionId}`);
  },
};

export default sectionServices;
