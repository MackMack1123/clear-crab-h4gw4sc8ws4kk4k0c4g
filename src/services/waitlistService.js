import { API_BASE_URL } from '../config';

const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

export const waitlistService = {
    // Get all waitlist entries (admin only)
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/api/waitlist`, {
            headers: {
                'x-admin-key': ADMIN_API_KEY
            }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch waitlist');
        }
        return response.json();
    },

    // Update waitlist entry status
    updateStatus: async (entryId, status) => {
        const response = await fetch(`${API_BASE_URL}/api/waitlist/${entryId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': ADMIN_API_KEY
            },
            body: JSON.stringify({ status })
        });
        if (!response.ok) {
            throw new Error('Failed to update status');
        }
        return response.json();
    },

    // Delete waitlist entry
    delete: async (entryId) => {
        const response = await fetch(`${API_BASE_URL}/api/waitlist/${entryId}`, {
            method: 'DELETE',
            headers: {
                'x-admin-key': ADMIN_API_KEY
            }
        });
        if (!response.ok) {
            throw new Error('Failed to delete entry');
        }
        return response.json();
    }
};
