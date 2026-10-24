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

export default API_BASE_URL;
