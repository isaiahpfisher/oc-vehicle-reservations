import axios from "axios";
import router from "../router.js";
import { useAuthStore } from "../stores/auth.js";

const apiClient = axios.create({
  baseURL: import.meta.env.DEV ? "http://localhost:3200/api/" : "/vehicle-t1/",
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only a 401 means the session is gone. A 403 (e.g. "Unauthorized for this area.") is a permission error and
    // must not sign the user out, whatever its message says.
    if (error.response?.status === 401) {
      useAuthStore().signOut();
      // UI/UX backlog #17: tell them their session ended, and bring them back to this page after they sign in.
      const current = router.currentRoute.value;
      if (router.hasRoute("login") && current.name !== "login") {
        router.push({ name: "login", query: { expired: "1", ...(current.name === "home" ? {} : { redirect: current.fullPath }) } });
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
