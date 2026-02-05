/**
 * Guest Sponsor Session Management
 *
 * Stores sponsorship info in localStorage so guests who just purchased
 * can access their sponsorship details without logging in.
 */

const STORAGE_KEY = 'fundraisr_guest_sponsor';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save guest sponsor session after successful checkout
 */
export const saveGuestSponsorSession = (email, sponsorshipIds) => {
    const session = {
        email: email.toLowerCase(),
        sponsorshipIds,
        createdAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

/**
 * Get guest sponsor session if valid (not expired)
 */
export const getGuestSponsorSession = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;

        const session = JSON.parse(stored);

        // Check if session is expired
        if (Date.now() - session.createdAt > SESSION_DURATION_MS) {
            clearGuestSponsorSession();
            return null;
        }

        return session;
    } catch (e) {
        console.error('Error reading guest sponsor session:', e);
        return null;
    }
};

/**
 * Check if a sponsorship ID belongs to the current guest session
 */
export const isGuestSponsorshipOwner = (sponsorshipId) => {
    const session = getGuestSponsorSession();
    if (!session) return false;
    return session.sponsorshipIds?.includes(sponsorshipId);
};

/**
 * Get guest email if session is valid
 */
export const getGuestSponsorEmail = () => {
    const session = getGuestSponsorSession();
    return session?.email || null;
};

/**
 * Clear guest sponsor session (after account creation or logout)
 */
export const clearGuestSponsorSession = () => {
    localStorage.removeItem(STORAGE_KEY);
};

/**
 * Add sponsorship IDs to existing session (for additional purchases)
 */
export const addToGuestSponsorSession = (email, newSponsorshipIds) => {
    const existing = getGuestSponsorSession();

    if (existing && existing.email === email.toLowerCase()) {
        // Merge with existing session
        const mergedIds = [...new Set([...existing.sponsorshipIds, ...newSponsorshipIds])];
        saveGuestSponsorSession(email, mergedIds);
    } else {
        // New session
        saveGuestSponsorSession(email, newSponsorshipIds);
    }
};
