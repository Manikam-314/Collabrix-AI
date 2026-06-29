// Centralized API configuration for dev/production environments
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.PROD) {
    // Use same origin — nginx proxies /api/ to backend container
    return `${window.location.protocol}//${window.location.host}`;
  }
  return "http://localhost:8080";
};

const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (import.meta.env.PROD) {
    // Use same origin — nginx proxies /ws to backend container
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }
  return "ws://localhost:8080/ws";
};

export const API_BASE_URL = getApiUrl();
export const WS_BASE_URL = getWsUrl();
