import { API_BASE_URL } from '../config';
const API_URL = `${API_BASE_URL}/api/users`;

export const userService = {
    // Update user profile
    updateUser: async (userId, updates) => {
        const res = await fetch(`${API_URL}/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Failed to update user');
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

    // Update Public Page Content
    updatePageContent: async (userId, contentBlocks) => {
        const res = await fetch(`${API_URL}/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicContent: contentBlocks })
        });
        if (!res.ok) throw new Error('Failed to update page content');
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
    }
};
