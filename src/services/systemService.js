import { API_BASE_URL } from '../config';
import { auth } from '../firebase';

export const systemService = {
    // Get all system settings (public - used by signup page)
    getSettings: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/system/settings`);
            if (!response.ok) {
                throw new Error('Failed to fetch system settings');
            }
            return await response.json();
        } catch (error) {
            console.error("Error fetching system settings:", error);
            // Return safe defaults on error
            return {
                payments: { stripe: true, square: true, paypal: true, check: true },
                registrations: { organizationsEnabled: true }
            };
        }
    },

    // Update settings (admin only)
    updateSettings: async (newSettings) => {
        try {
            // Get current user's ID for admin verification
            const userId = auth.currentUser?.uid;

            if (!userId) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`${API_BASE_URL}/api/system/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': userId
                },
                body: JSON.stringify({
                    ...newSettings,
                    userId
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update settings');
            }

            return await response.json();
        } catch (error) {
            console.error("Error updating system settings:", error);
            throw error;
        }
    }
};
