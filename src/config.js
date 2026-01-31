// Centralized API Configuration
// Uses the environment variable VITE_API_URL if set (e.g., in production/Coolify)
// Otherwise falls back to localhost for local development.

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper to remove trailing slash if present, to ensure consistency
export const getApiUrl = (endpoint) => {
    const base = API_BASE_URL.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
};
