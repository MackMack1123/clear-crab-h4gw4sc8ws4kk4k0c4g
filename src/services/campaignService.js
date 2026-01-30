const API_URL = 'http://localhost:3001/api/campaigns';

export const campaignService = {
    // Create a new campaign
    createCampaign: async (campaignData) => {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaignData)
        });
        if (!res.ok) throw new Error('Failed to create campaign');
        return await res.json();
    },

    // Get all campaigns for a specific organizer
    getOrganizerCampaigns: async (organizerId) => {
        const res = await fetch(`${API_URL}/organizer/${organizerId}`);
        if (!res.ok) throw new Error('Failed to fetch organizer campaigns');
        return await res.json();
    },

    // Get a single campaign by ID
    fetchCampaignById: async (campaignId) => {
        const res = await fetch(`${API_URL}/${campaignId}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('Failed to fetch campaign');
        return await res.json();
    },

    // Update campaign status or details
    updateCampaign: async (campaignId, updates) => {
        const res = await fetch(`${API_URL}/${campaignId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Failed to update campaign');
    },

    // Get all campaigns (Admin)
    getAllCampaigns: async () => {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('Failed to fetch all campaigns');
        return await res.json();
    }
};
