import { API_BASE_URL } from '../config';
const API_URL = `${API_BASE_URL}/api/analytics`;

export const analyticsService = {
    // Org-specific analytics
    getOrgAnalytics: async (orgId, period = '30d') => {
        const res = await fetch(`${API_URL}/org/${orgId}?period=${period}`);
        if (!res.ok) throw new Error('Failed to fetch org analytics');
        return res.json();
    },

    getOrgTrends: async (orgId, period = '30d') => {
        const res = await fetch(`${API_URL}/org/${orgId}/trends?period=${period}`);
        if (!res.ok) throw new Error('Failed to fetch org trends');
        return res.json();
    },

    // Admin platform-wide analytics
    getAdminAnalytics: async (period = '30d') => {
        const res = await fetch(`${API_URL}/admin?period=${period}`);
        if (!res.ok) throw new Error('Failed to fetch admin analytics');
        return res.json();
    },

    getAdminTrends: async (period = '30d') => {
        const res = await fetch(`${API_URL}/admin/trends?period=${period}`);
        if (!res.ok) throw new Error('Failed to fetch admin trends');
        return res.json();
    }
};
