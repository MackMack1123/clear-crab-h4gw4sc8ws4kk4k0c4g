const User = require('../models/User');

/**
 * Check if a user can access an organization's data
 * @param {string} userId - The requesting user's Firebase UID
 * @param {string} organizerId - The organization owner's Firebase UID
 * @returns {Object} { canAccess: boolean, role: 'owner' | 'manager' | 'member' | null }
 */
async function checkOrgAccess(userId, organizerId) {
    // Owner has full access
    if (userId === organizerId) {
        return { canAccess: true, role: 'owner' };
    }

    // Check if user is a team member of this organization
    const org = await User.findById(organizerId);
    if (!org) {
        return { canAccess: false, role: null };
    }

    const member = org.teamMembers?.find(
        m => m.memberId === userId && m.status === 'active'
    );

    if (member) {
        return { canAccess: true, role: member.role };
    }

    return { canAccess: false, role: null };
}

/**
 * Permission levels for different actions
 */
const PERMISSION_LEVELS = {
    owner: ['owner'],
    manager: ['owner', 'manager'],
    member: ['owner', 'manager', 'member']
};

/**
 * Middleware factory to protect routes based on minimum required role
 * @param {string} minimumRole - 'owner' | 'manager' | 'member'
 * @returns {Function} Express middleware
 */
function requireOrgAccess(minimumRole = 'member') {
    return async (req, res, next) => {
        try {
            // Get user ID from request (assumes auth middleware has set this)
            const userId = req.headers['x-user-id'] || req.body.userId || req.query.userId;

            // Get organizer ID from various sources
            const organizerId = req.params.organizerId || req.params.orgId || req.body.organizerId;

            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            if (!organizerId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }

            const { canAccess, role } = await checkOrgAccess(userId, organizerId);

            if (!canAccess) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Check if role meets minimum requirement
            const allowedRoles = PERMISSION_LEVELS[minimumRole];
            if (!allowedRoles.includes(role)) {
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    required: minimumRole,
                    current: role
                });
            }

            // Attach access info to request for use in route handlers
            req.orgAccess = { role, organizerId, userId };
            next();

        } catch (error) {
            console.error('Team Auth Error:', error);
            res.status(500).json({ error: 'Authorization check failed' });
        }
    };
}

/**
 * Permission matrix for specific actions
 */
const ACTION_PERMISSIONS = {
    // View permissions (member level)
    viewDashboard: 'member',
    viewAnalytics: 'member',
    viewSponsorships: 'member',

    // Edit permissions (manager level)
    editPackages: 'manager',
    editContent: 'manager',
    manageSponsorships: 'manager',

    // Admin permissions (owner only)
    editSettings: 'owner',
    manageTeam: 'owner',
    connectPayments: 'owner'
};

/**
 * Check if a role can perform a specific action
 * @param {string} role - 'owner' | 'manager' | 'member'
 * @param {string} action - Action key from ACTION_PERMISSIONS
 * @returns {boolean}
 */
function canPerformAction(role, action) {
    const requiredLevel = ACTION_PERMISSIONS[action];
    if (!requiredLevel) return false;

    const allowedRoles = PERMISSION_LEVELS[requiredLevel];
    return allowedRoles.includes(role);
}

module.exports = {
    checkOrgAccess,
    requireOrgAccess,
    canPerformAction,
    ACTION_PERMISSIONS,
    PERMISSION_LEVELS
};
