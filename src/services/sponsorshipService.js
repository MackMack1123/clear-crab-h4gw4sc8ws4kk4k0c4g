import { API_BASE_URL } from '../config';
import { auth } from '../firebase';
import { getGuestSponsorEmail } from '../utils/guestSponsorSession';

const API_URL = `${API_BASE_URL}/api/sponsorships`;

// Helper to get current user ID for permission checks
const getCurrentUserId = () => auth.currentUser?.uid;

// Helper to get auth headers (supports both logged-in users and guest sessions)
const getAuthHeaders = () => {
    const headers = {};
    const currentUser = auth.currentUser;

    if (currentUser) {
        // Logged-in user
        headers['x-user-id'] = currentUser.uid;
        if (currentUser.email) {
            headers['x-user-email'] = currentUser.email;
        }
    } else {
        // Check for guest sponsor session
        const guestEmail = getGuestSponsorEmail();
        if (guestEmail) {
            headers['x-user-email'] = guestEmail;
        }
    }

    return headers;
};

// Admin API key for protected endpoints
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

export const sponsorshipService = {
    // --- Sponsorship Packages ---

    // Create a new package (with permission support for team members)
    createPackage: async (organizerId, data) => {
        const headers = { 'Content-Type': 'application/json' };
        const currentUserId = getCurrentUserId();

        // Pass user ID for permission check if user is a team member
        if (currentUserId && currentUserId !== organizerId) {
            headers['x-user-id'] = currentUserId;
        }

        const res = await fetch(`${API_URL}/packages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...data, organizerId, userId: currentUserId })
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to create package');
        }
        const pkg = await res.json();
        return pkg.id;
    },

    // Update an existing package (with permission support)
    updatePackage: async (packageId, data) => {
        const headers = { 'Content-Type': 'application/json' };
        const currentUserId = getCurrentUserId();

        if (currentUserId) {
            headers['x-user-id'] = currentUserId;
        }

        const res = await fetch(`${API_URL}/packages/${packageId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ ...data, userId: currentUserId })
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to update package');
        }
    },

    // Get all packages for an organizer (with permission support for team members)
    getPackages: async (organizerId) => {
        const currentUserId = getCurrentUserId();
        let url = `${API_URL}/packages/${organizerId}`;

        // Pass user ID for team member access verification
        if (currentUserId && currentUserId !== organizerId) {
            url += `?userId=${currentUserId}`;
        }

        const res = await fetch(url);
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

    // Delete a package (with permission support)
    deletePackage: async (packageId) => {
        const headers = {};
        const currentUserId = getCurrentUserId();

        if (currentUserId) {
            headers['x-user-id'] = currentUserId;
        }

        const res = await fetch(`${API_URL}/packages/${packageId}?userId=${currentUserId || ''}`, {
            method: 'DELETE',
            headers
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to delete package');
        }
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
        const headers = {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        };

        const res = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update sponsorship');
    },

    // Get a single sponsorship by ID
    getSponsorship: async (id) => {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_URL}/${id}`, { headers });
        if (!res.ok) throw new Error('Failed to fetch sponsorship');
        return await res.json();
    },

    getOrganizerSponsorships: async (organizerId) => {
        const currentUserId = getCurrentUserId();
        let url = `${API_URL}/organizer/${organizerId}`;

        // Pass user ID for team member access verification
        if (currentUserId && currentUserId !== organizerId) {
            url += `?userId=${currentUserId}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch organizer sponsorships');
        return await res.json();
    },

    // Get ALL sponsorships (Admin only)
    getAllSponsorships: async () => {
        const res = await fetch(`${API_URL}/admin/all`, {
            headers: {
                'x-admin-key': ADMIN_API_KEY
            }
        });
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
    },

    // Lookup sponsor by email (for guest checkout recognition)
    lookupSponsorByEmail: async (email) => {
        const res = await fetch(`${API_URL}/lookup-by-email/${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error('Failed to lookup sponsor');
        return await res.json();
    },

    // Link all sponsorships to a new user account
    linkSponsorshipsToAccount: async (email, userId) => {
        const res = await fetch(`${API_URL}/link-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, userId })
        });
        if (!res.ok) throw new Error('Failed to link sponsorships');
        return await res.json();
    },

    // Delete a sponsorship (for cleaning up failed payments)
    deleteSponsorship: async (id) => {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete sponsorship');
    },

    // Delete multiple sponsorships
    deleteSponsorships: async (ids) => {
        await Promise.all(ids.map(id =>
            fetch(`${API_URL}/${id}`, { method: 'DELETE' })
        ));
    },

    // Resend receipt email to sponsor
    resendReceipt: async (sponsorshipId) => {
        const headers = {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        };
        const res = await fetch(`${API_URL}/${sponsorshipId}/resend-receipt`, {
            method: 'POST',
            headers
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to resend receipt');
        }
        return await res.json();
    }
};
