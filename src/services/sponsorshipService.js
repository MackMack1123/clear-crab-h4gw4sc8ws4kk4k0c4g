import { API_BASE_URL } from '../config';
const API_URL = `${API_BASE_URL}/api/sponsorships`;

export const sponsorshipService = {
    // --- Sponsorship Packages ---

    // Create a new package
    createPackage: async (organizerId, data) => {
        const res = await fetch(`${API_URL}/packages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, organizerId })
        });
        if (!res.ok) throw new Error('Failed to create package');
        const pkg = await res.json();
        return pkg.id;
    },

    // Update an existing package
    updatePackage: async (packageId, data) => {
        const res = await fetch(`${API_URL}/packages/${packageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update package');
    },

    // Get all packages for an organizer (Admin)
    getPackages: async (organizerId) => {
        const res = await fetch(`${API_URL}/packages/${organizerId}`);
        if (!res.ok) throw new Error('Failed to fetch packages');
        return await res.json();
    },

    // Get active packages (Public)
    getActivePackages: async (organizerId) => {
        const res = await fetch(`${API_URL}/packages/active/${organizerId}`);
        if (!res.ok) throw new Error('Failed to fetch active packages');
        return await res.json();
    },

    // Get single package by ID (Public)
    getPackage: async (id) => {
        const res = await fetch(`${API_URL}/package/${id}`);
        if (!res.ok) throw new Error('Failed to fetch package');
        return await res.json();
    },

    // Delete a package
    deletePackage: async (packageId) => {
        const res = await fetch(`${API_URL}/packages/${packageId}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete package');
    },

    // --- Sponsorships (Purchases) ---

    // Create a new sponsorship
    createSponsorship: async (data) => {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create sponsorship');
        const sponsorship = await res.json();
        return sponsorship.id;
    },

    // Update sponsorship
    updateSponsorship: async (id, data) => {
        // Note: For now we might need a specific endpoint or just reuse a general update if we add one
        // Looking at our routes, we didn't add a PUT /:id for sponsorships yet. 
        // I will assume we might need to add it or this will fail.
        // Actually, let's strictly follow the implementation_plan steps. 
        // If I missed adding the route, I should fix the backend too.
        // For now, I will implement this as if the route exists or I will add it shortly.
        // Let's assume standard REST, PUT /api/sponsorships/:id

        // Wait, looking back at my server/routes/sponsorships.js file, I did NOT add a PUT /:id route for sponsorships.
        // I only added POST /, GET /:id, GET /organizer/:id.
        // I need to add that route to the backend file first or soon.

        // Let's implement this fetch call assuming I will fix the backend in the next step.
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update sponsorship');
    },

    // Get a single sponsorship by ID
    getSponsorship: async (id) => {
        const res = await fetch(`${API_URL}/${id}`);
        if (!res.ok) throw new Error('Failed to fetch sponsorship');
        // If 404/null handled by backend? backend returns 200 with null or 404? 
        // My backend returns 200 with result.
        return await res.json();
    },

    getOrganizerSponsorships: async (organizerId) => {
        const res = await fetch(`${API_URL}/organizer/${organizerId}`);
        if (!res.ok) throw new Error('Failed to fetch organizer sponsorships');
        return await res.json();
    },

    // Get ALL sponsorships (Admin only)
    getAllSponsorships: async () => {
        const res = await fetch(`${API_URL}/admin/all`);
        if (!res.ok) throw new Error('Failed to fetch all sponsorships');
        return await res.json();
    },

    // Get all sponsorships for a sponsor
    getSponsorSponsorships: async (userId, email) => {
        let url = `${API_URL}/sponsor/${userId}`;
        if (email) url += `?email=${encodeURIComponent(email)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch sponsor sponsorships');
        return await res.json();
    },

    // Create Stripe Checkout Session
    createStripeCheckoutSession: async (data) => {
        const res = await fetch(`${API_BASE_URL}/api/payments/stripe/create-checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create checkout session');
        }
        return await res.json();
    }
};
