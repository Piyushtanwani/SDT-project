import axios from "axios";

/**
 * Centralized API Configuration
 *
 * A packaged build must never point at a development machine. `react-scripts build`
 * sets NODE_ENV=production while REACT_APP_ENV was still "development" here, so a
 * bundle wired to http://localhost:8080 reached the live site and every page loaded
 * empty. Packaged builds now take the live base unless REACT_APP_API_BASE overrides
 * it; the dev server keeps using the local base.
 */
const LIVE_API = process.env.REACT_APP_LIVE_API || "https://elearning.bitecodes.com";
const LOCAL_API = process.env.REACT_APP_LOCAL_API || "http://localhost:8080";
const isPackaged = process.env.NODE_ENV === "production";

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE ||
  (isPackaged || process.env.REACT_APP_ENV === "production" ? LIVE_API : LOCAL_API);

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

