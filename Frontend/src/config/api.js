import axios from "axios";

/**
 * Centralized API Configuration
 * Automatically chooses live or local API base URL based on environment.
 */
export const API_BASE_URL =
  process.env.REACT_APP_ENV === "production"
    ? process.env.REACT_APP_LIVE_API || "https://elearningbackend.bitecodes.com"
    : process.env.REACT_APP_LOCAL_API || "http://localhost:8080";

export const getAuthHeaders = () => {
  const token = sessionStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Global axios request interceptor to attach JWT token
axios.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("authToken");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global axios response interceptor to handle 401 without redirect loops
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      if (sessionStorage.getItem("authToken") && currentPath !== "/login") {
        sessionStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API_BASE_URL;

