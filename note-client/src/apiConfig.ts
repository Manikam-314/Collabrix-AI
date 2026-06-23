// Centralized API configuration for dev/production environments
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://54.90.225.145:8080";
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || "ws://54.90.225.145:8080";
