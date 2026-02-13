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
    },

    // Widget performance metrics
    getWidgetMetrics: async (orgId, period = '30d') => {
        const res = await fetch(`${API_URL}/org/${orgId}/widget?period=${period}`);
        if (!res.ok) throw new Error('Failed to fetch widget metrics');
        return res.json();
    },

    // Page view tracking (fire-and-forget from public pages)
    trackPageView: async (organizerId, page, sessionId, extra = {}) => {
        await fetch(`${API_URL}/track/page-view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organizerId, page, sessionId, referrer: document.referrer, ...extra }),
            keepalive: true
        });
    },

    // Funnel performance metrics
    getFunnelMetrics: async (orgId, period = '30d') => {
        const res = await fetch(`${API_URL}/org/${orgId}/funnel?period=${period}`);
        if (!res.ok) throw new Error('Failed to fetch funnel metrics');
        return res.json();
    },

    // Report: send to Slack
    sendReportToSlack: async (orgId, period = '30d') => {
        const res = await fetch(`${API_URL}/org/${orgId}/report/slack`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ period })
        });
        if (!res.ok) throw new Error('Failed to send report to Slack');
        return res.json();
    },

    // Report schedule: get
    getReportSchedule: async (orgId) => {
        const res = await fetch(`${API_URL}/org/${orgId}/report/schedule`);
        if (!res.ok) throw new Error('Failed to fetch report schedule');
        return res.json();
    },

    // Report schedule: update
    updateReportSchedule: async (orgId, schedule) => {
        const res = await fetch(`${API_URL}/org/${orgId}/report/schedule`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schedule)
        });
        if (!res.ok) throw new Error('Failed to update report schedule');
        return res.json();
    }
};
