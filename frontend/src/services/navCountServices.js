import apiClient from "./services.js";

const navCountServices = {
  /** UI/UX backlog #15: `{ requests, issueReports, maintenanceNeeds }`, each a number or null (no badge). */
  getNavCounts() {
    return apiClient.get("nav-counts");
  },
};

export default navCountServices;
