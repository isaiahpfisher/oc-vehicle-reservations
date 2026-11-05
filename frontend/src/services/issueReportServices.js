import apiClient from "./services.js";

const issueReportServices = {
  getIssueReports(params) {
    return apiClient.get("issue-reports", { params });
  },

  getIssueReport(issueReportId) {
    return apiClient.get(`issue-reports/${issueReportId}`);
  },

  createIssueReport(payload) {
    return apiClient.post("issue-reports", payload);
  },

  updateIssueReport(issueReportId, payload) {
    return apiClient.put(`issue-reports/${issueReportId}`, payload);
  },

  removeIssueReport(issueReportId) {
    return apiClient.delete(`issue-reports/${issueReportId}`);
  },
};

export default issueReportServices;
