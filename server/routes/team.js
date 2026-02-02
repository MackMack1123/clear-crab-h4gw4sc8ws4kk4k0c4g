const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { checkOrgAccess, requireOrgAccess } = require('../middleware/teamAuth');

// Generate secure token for invite links
function generateInviteToken() {
    return crypto.randomBytes(32).toString('hex');
}

// GET /api/team/:organizerId - Get team members and pending invites
router.get('/:organizerId', async (req, res) => {
    try {
        const { organizerId } = req.params;
        const userId = req.headers['x-user-id'] || req.query.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Only owner can view team
        if (userId !== organizerId) {
            return res.status(403).json({ error: 'Only the organization owner can view team members' });
        }

        const org = await User.findById(organizerId);
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Filter out removed members and expired invitations
        const activeMembers = (org.teamMembers || []).filter(m => m.status === 'active');
        const pendingInvites = (org.teamInvitations || []).filter(i =>
            i.status === 'pending' && new Date(i.expiresAt) > new Date()
        );

        // Get member details (names) from their user records
        const memberDetails = await Promise.all(
            activeMembers.map(async (member) => {
                const user = await User.findById(member.memberId);
                return {
                    ...member.toObject(),
                    firstName: user?.firstName || '',
                    lastName: user?.lastName || '',
                    displayName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : member.email
                };
            })
        );

        res.json({
            members: memberDetails,
            invitations: pendingInvites.map(inv => ({
                id: inv.id,
                email: inv.email,
                role: inv.role,
                invitedByName: inv.invitedByName,
                createdAt: inv.createdAt,
                expiresAt: inv.expiresAt
            }))
        });
    } catch (error) {
        console.error('Get Team Error:', error);
        res.status(500).json({ error: 'Failed to fetch team' });
    }
});

// POST /api/team/invite - Send invitation
router.post('/invite', async (req, res) => {
    try {
        const { organizerId, email, role, invitedByName, userId } = req.body;

        if (!userId || userId !== organizerId) {
            return res.status(403).json({ error: 'Only the organization owner can invite members' });
        }

        if (!email || !role) {
            return res.status(400).json({ error: 'Email and role are required' });
        }

        if (!['manager', 'member'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be "manager" or "member"' });
        }

        const org = await User.findById(organizerId);
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Check if already a member
        const existingMember = org.teamMembers?.find(
            m => m.email.toLowerCase() === email.toLowerCase() && m.status === 'active'
        );
        if (existingMember) {
            return res.status(400).json({ error: 'This user is already a team member' });
        }

        // Check for existing pending invite
        const existingInvite = org.teamInvitations?.find(
            i => i.email.toLowerCase() === email.toLowerCase() &&
                i.status === 'pending' &&
                new Date(i.expiresAt) > new Date()
        );
        if (existingInvite) {
            return res.status(400).json({ error: 'An invitation is already pending for this email' });
        }

        // Create invitation
        const token = generateInviteToken();
        const inviteId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const invitation = {
            id: inviteId,
            email: email.toLowerCase(),
            role,
            token,
            invitedBy: userId,
            invitedByName: invitedByName || 'Team Admin',
            expiresAt,
            createdAt: new Date(),
            status: 'pending'
        };

        // Add to organization's invitations
        if (!org.teamInvitations) org.teamInvitations = [];
        org.teamInvitations.push(invitation);
        await org.save();

        // Send invitation email
        const orgName = org.organizationProfile?.orgName || 'the organization';
        const inviteUrl = `${process.env.FRONTEND_URL || 'https://getfundraisr.io'}/invite/${token}`;

        const roleDescription = role === 'manager'
            ? 'As a Manager, you can edit packages, manage content, and view analytics.'
            : 'As a Member, you can view the dashboard and analytics.';

        await emailService.sendRawEmail(
            email,
            `You've been invited to join ${orgName} on Fundraisr`,
            `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="color: #1e293b; font-size: 24px; margin-bottom: 16px;">You've been invited!</h1>
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                    <strong>${invitedByName || 'A team admin'}</strong> has invited you to join <strong>${orgName}</strong> as a <strong>${role}</strong> on Fundraisr.
                </p>
                <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-top: 12px;">
                    ${roleDescription}
                </p>
                <div style="margin: 32px 0;">
                    <a href="${inviteUrl}" style="display: inline-block; background-color: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Accept Invitation
                    </a>
                </div>
                <p style="color: #94a3b8; font-size: 12px;">
                    This invitation expires in 7 days. If you didn't expect this invitation, you can ignore this email.
                </p>
            </div>
            `
        );

        res.json({
            success: true,
            invitation: {
                id: inviteId,
                email,
                role,
                expiresAt
            }
        });
    } catch (error) {
        console.error('Invite Error:', error);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});

// GET /api/team/invitation/:token - Get invite details (public)
router.get('/invitation/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Find organization with this invitation token
        const org = await User.findOne({
            'teamInvitations.token': token,
            'teamInvitations.status': 'pending'
        });

        if (!org) {
            return res.status(404).json({ error: 'Invitation not found or expired' });
        }

        const invitation = org.teamInvitations.find(i => i.token === token);

        if (new Date(invitation.expiresAt) < new Date()) {
            return res.status(410).json({ error: 'Invitation has expired' });
        }

        res.json({
            organizationId: org._id,
            orgName: org.organizationProfile?.orgName || 'Organization',
            orgLogo: org.organizationProfile?.logoUrl,
            email: invitation.email,
            role: invitation.role,
            invitedByName: invitation.invitedByName,
            expiresAt: invitation.expiresAt
        });
    } catch (error) {
        console.error('Get Invitation Error:', error);
        res.status(500).json({ error: 'Failed to fetch invitation' });
    }
});

// POST /api/team/invitation/:token/accept - Accept invitation
router.post('/invitation/:token/accept', async (req, res) => {
    try {
        const { token } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Must be logged in to accept invitation' });
        }

        // Find organization with this invitation
        const org = await User.findOne({
            'teamInvitations.token': token,
            'teamInvitations.status': 'pending'
        });

        if (!org) {
            return res.status(404).json({ error: 'Invitation not found or expired' });
        }

        const invitationIndex = org.teamInvitations.findIndex(i => i.token === token);
        const invitation = org.teamInvitations[invitationIndex];

        if (new Date(invitation.expiresAt) < new Date()) {
            org.teamInvitations[invitationIndex].status = 'expired';
            await org.save();
            return res.status(410).json({ error: 'Invitation has expired' });
        }

        // Get accepting user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify email matches (optional - could allow any logged-in user to accept)
        // For now, we'll allow any logged-in user since they might use different emails

        // Check if already a member
        const existingMember = org.teamMembers?.find(
            m => m.memberId === userId && m.status === 'active'
        );
        if (existingMember) {
            org.teamInvitations[invitationIndex].status = 'accepted';
            await org.save();
            return res.status(400).json({ error: 'You are already a member of this organization' });
        }

        // Add user to team members
        if (!org.teamMembers) org.teamMembers = [];
        org.teamMembers.push({
            memberId: userId,
            email: user.email,
            role: invitation.role,
            joinedAt: new Date(),
            invitedBy: invitation.invitedBy,
            status: 'active'
        });

        // Mark invitation as accepted
        org.teamInvitations[invitationIndex].status = 'accepted';
        await org.save();

        // Add membership to user's memberOf list
        if (!user.memberOf) user.memberOf = [];
        user.memberOf.push({
            organizationId: org._id,
            orgName: org.organizationProfile?.orgName || 'Organization',
            role: invitation.role,
            joinedAt: new Date()
        });
        await user.save();

        res.json({
            success: true,
            organization: {
                id: org._id,
                name: org.organizationProfile?.orgName,
                role: invitation.role
            }
        });
    } catch (error) {
        console.error('Accept Invitation Error:', error);
        res.status(500).json({ error: 'Failed to accept invitation' });
    }
});

// POST /api/team/invitation/:token/decline - Decline invitation
router.post('/invitation/:token/decline', async (req, res) => {
    try {
        const { token } = req.params;

        const org = await User.findOne({
            'teamInvitations.token': token,
            'teamInvitations.status': 'pending'
        });

        if (!org) {
            return res.status(404).json({ error: 'Invitation not found' });
        }

        const invitationIndex = org.teamInvitations.findIndex(i => i.token === token);
        org.teamInvitations[invitationIndex].status = 'declined';
        await org.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Decline Invitation Error:', error);
        res.status(500).json({ error: 'Failed to decline invitation' });
    }
});

// DELETE /api/team/invitation/:orgId/:inviteId - Cancel pending invite (owner only)
router.delete('/invitation/:orgId/:inviteId', async (req, res) => {
    try {
        const { orgId, inviteId } = req.params;
        const userId = req.headers['x-user-id'] || req.body.userId;

        if (!userId || userId !== orgId) {
            return res.status(403).json({ error: 'Only the organization owner can cancel invitations' });
        }

        const org = await User.findById(orgId);
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const invitationIndex = org.teamInvitations?.findIndex(i => i.id === inviteId);
        if (invitationIndex === -1 || invitationIndex === undefined) {
            return res.status(404).json({ error: 'Invitation not found' });
        }

        // Remove the invitation
        org.teamInvitations.splice(invitationIndex, 1);
        await org.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Cancel Invitation Error:', error);
        res.status(500).json({ error: 'Failed to cancel invitation' });
    }
});

// PUT /api/team/:orgId/member/:memberId - Update member role (owner only)
router.put('/:orgId/member/:memberId', async (req, res) => {
    try {
        const { orgId, memberId } = req.params;
        const { role, userId } = req.body;

        if (!userId || userId !== orgId) {
            return res.status(403).json({ error: 'Only the organization owner can update member roles' });
        }

        if (!['manager', 'member'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const org = await User.findById(orgId);
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const memberIndex = org.teamMembers?.findIndex(
            m => m.memberId === memberId && m.status === 'active'
        );
        if (memberIndex === -1 || memberIndex === undefined) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Update role in org's teamMembers
        org.teamMembers[memberIndex].role = role;
        await org.save();

        // Update role in member's memberOf list
        const member = await User.findById(memberId);
        if (member) {
            const memberOfIndex = member.memberOf?.findIndex(m => m.organizationId === orgId);
            if (memberOfIndex !== -1 && memberOfIndex !== undefined) {
                member.memberOf[memberOfIndex].role = role;
                await member.save();
            }
        }

        res.json({ success: true, role });
    } catch (error) {
        console.error('Update Member Role Error:', error);
        res.status(500).json({ error: 'Failed to update member role' });
    }
});

// DELETE /api/team/:orgId/member/:memberId - Remove member (owner only)
router.delete('/:orgId/member/:memberId', async (req, res) => {
    try {
        const { orgId, memberId } = req.params;
        const userId = req.headers['x-user-id'] || req.query.userId;

        if (!userId || userId !== orgId) {
            return res.status(403).json({ error: 'Only the organization owner can remove members' });
        }

        const org = await User.findById(orgId);
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const memberIndex = org.teamMembers?.findIndex(
            m => m.memberId === memberId && m.status === 'active'
        );
        if (memberIndex === -1 || memberIndex === undefined) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Mark as removed (soft delete)
        org.teamMembers[memberIndex].status = 'removed';
        await org.save();

        // Remove from member's memberOf list
        const member = await User.findById(memberId);
        if (member && member.memberOf) {
            member.memberOf = member.memberOf.filter(m => m.organizationId !== orgId);
            await member.save();
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Remove Member Error:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

// GET /api/team/my-memberships - Get organizations user is member of
router.get('/my-memberships/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUserId = req.headers['x-user-id'] || req.query.requestingUserId;

        if (!requestingUserId || requestingUserId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get full org details for each membership
        const memberships = await Promise.all(
            (user.memberOf || []).map(async (membership) => {
                const org = await User.findById(membership.organizationId);
                return {
                    organizationId: membership.organizationId,
                    orgName: org?.organizationProfile?.orgName || membership.orgName,
                    orgLogo: org?.organizationProfile?.logoUrl,
                    role: membership.role,
                    joinedAt: membership.joinedAt
                };
            })
        );

        res.json({ memberships });
    } catch (error) {
        console.error('Get Memberships Error:', error);
        res.status(500).json({ error: 'Failed to fetch memberships' });
    }
});

module.exports = router;
