import apiClient from "./services.js";

/** The URL segment for each note parent (Feature 14). */
const PARENT_PATHS = {
  vehicleRequestId: "requests",
  issueReportId: "issue-reports",
  maintenanceNeedId: "maintenance-needs",
};

const noteServices = {
  /** `parentKey` is `vehicleRequestId`, `issueReportId`, or `maintenanceNeedId`. */
  getNotes(parentKey, parentId) {
    return apiClient.get(`${PARENT_PATHS[parentKey]}/${parentId}/notes`);
  },

  getNote(noteId) {
    return apiClient.get(`notes/${noteId}`);
  },

  createNote(payload) {
    return apiClient.post("notes", payload);
  },

  removeNote(noteId) {
    return apiClient.delete(`notes/${noteId}`);
  },
};

export default noteServices;
