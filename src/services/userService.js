import { API_BASE_URL } from '../config';
import { auth } from '../firebase';
const API_URL = `${API_BASE_URL}/api/users`;

// Helper to get current user ID for permission checks
const getCurrentUserId = () => auth.currentUser?.uid;

export const userService = {
    // Update user profile (supports team member access with permission checks)
    updateUser: async (userId, updates, requesterId = null) => {
        const headers = { 'Content-Type': 'application/json' };

        // If updating a different user (team member scenario), pass requester ID
        const currentUserId = requesterId || getCurrentUserId();
        if (currentUserId && currentUserId !== userId) {
            headers['x-user-id'] = currentUserId;
        }

        const res = await fetch(`${API_URL}/${userId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(updates)
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to update user');
        }
        return await res.json();
    },

    // Get user profile
    getUser: async (userId) => {
        const res = await fetch(`${API_URL}/${userId}`);
        // If 404, we return null so the AuthContext knows profile data isn't set yet
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('Failed to fetch user');
        return await res.json();
    },

    // Get all users (Admin)
    getAllUsers: async () => {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('Failed to fetch users');
        return await res.json();
    },

    // Update Organization Branding Profile
    updateOrganizationProfile: async (userId, profileData) => {
        const res = await fetch(`${API_URL}/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organizationProfile: profileData })
        });
        if (!res.ok) throw new Error('Failed to update organization profile');
    },

    // Update Public Page Content (supports team member access)
    updatePageContent: async (userId, contentBlocks, requesterId = null) => {
        const headers = { 'Content-Type': 'application/json' };

        const currentUserId = requesterId || getCurrentUserId();
        if (currentUserId && currentUserId !== userId) {
            headers['x-user-id'] = currentUserId;
        }

        const res = await fetch(`${API_URL}/${userId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ publicContent: contentBlocks })
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to update page content');
        }
    },


    // Update Hero Section Settings
    updateHeroSettings: async (userId, heroSettings) => {
        const res = await fetch(`${API_URL}/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "organizationProfile.heroSettings": heroSettings })
        });
        if (!res.ok) throw new Error('Failed to update hero settings');
    },

    // Check slug availability
    checkSlugAvailability: async (slug, userId) => {
        let url = `${API_URL}/check-slug/${slug}`;
        if (userId) url += `?userId=${userId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to check slug availability');
        const data = await res.json();
        return data.available;
    },

    // Check email availability
    checkEmailAvailability: async (email, userId) => {
        let url = `${API_URL}/check-email/${encodeURIComponent(email)}`;
        if (userId) url += `?userId=${userId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to check email availability');
        const data = await res.json();
        return data.available;
    }
};
