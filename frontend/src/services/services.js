import axios from "axios";
import router from "../router.js";
import { useAuthStore } from "../stores/auth.js";

const apiClient = axios.create({
  baseURL: import.meta.env.DEV ? "http://localhost:3200/api/" : "/course-t1/",
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
    const message = error.response?.data?.message || "";

    if (error.response?.status === 401 || /Unauthorized/i.test(message)) {
      useAuthStore().signOut();
      if (router.hasRoute("login")) {
        router.push({ name: "login" });
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
