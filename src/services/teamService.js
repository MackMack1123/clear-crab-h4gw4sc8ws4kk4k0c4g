import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/team`;

export const teamService = {
    /**
     * Get team members and pending invitations for an organization
     */
    getTeam: async (organizerId, userId) => {
        const res = await fetch(`${API_URL}/${organizerId}?userId=${userId}`, {
            headers: { 'x-user-id': userId }
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch team');
        }
        return await res.json();
    },

    /**
     * Send invitation to a new team member
     */
    inviteMember: async (organizerId, email, role, invitedByName, userId) => {
        const res = await fetch(`${API_URL}/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId
            },
            body: JSON.stringify({
                organizerId,
                email,
                role,
                invitedByName,
                userId
            })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to send invitation');
        }
        return await res.json();
    },

    /**
     * Get invitation details by token (public endpoint)
     */
    getInvitation: async (token) => {
        const res = await fetch(`${API_URL}/invitation/${token}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch invitation');
        }
        return await res.json();
    },

    /**
     * Accept an invitation
     */
    acceptInvitation: async (token, userId) => {
        const res = await fetch(`${API_URL}/invitation/${token}/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId
            },
            body: JSON.stringify({ userId })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to accept invitation');
        }
        return await res.json();
    },

    /**
     * Decline an invitation
     */
    declineInvitation: async (token) => {
        const res = await fetch(`${API_URL}/invitation/${token}/decline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to decline invitation');
        }
        return await res.json();
    },

    /**
     * Cancel a pending invitation (owner only)
     */
    cancelInvitation: async (organizerId, inviteId, userId) => {
        const res = await fetch(`${API_URL}/invitation/${organizerId}/${inviteId}`, {
            method: 'DELETE',
            headers: { 'x-user-id': userId }
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to cancel invitation');
        }
        return await res.json();
    },

    /**
     * Update a team member's role (owner only)
     */
    updateMemberRole: async (organizerId, memberId, role, userId) => {
        const res = await fetch(`${API_URL}/${organizerId}/member/${memberId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId
            },
            body: JSON.stringify({ role, userId })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update member role');
        }
        return await res.json();
    },

    /**
     * Remove a team member (owner only)
     */
    removeMember: async (organizerId, memberId, userId) => {
        const res = await fetch(`${API_URL}/${organizerId}/member/${memberId}?userId=${userId}`, {
            method: 'DELETE',
            headers: { 'x-user-id': userId }
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to remove member');
        }
        return await res.json();
    },

    /**
     * Get organizations the user is a member of
     */
    getMyMemberships: async (userId) => {
        const res = await fetch(`${API_URL}/my-memberships/${userId}?requestingUserId=${userId}`, {
            headers: { 'x-user-id': userId }
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch memberships');
        }
        return await res.json();
    }
};
