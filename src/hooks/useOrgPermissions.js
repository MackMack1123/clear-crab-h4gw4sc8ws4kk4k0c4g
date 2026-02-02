import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Permission levels for different roles
 */
const PERMISSION_LEVELS = {
    owner: ['owner'],
    manager: ['owner', 'manager'],
    member: ['owner', 'manager', 'member']
};

/**
 * Hook to check organization permissions based on the active organization context
 *
 * @returns {Object} Permission flags and helper functions
 */
export function useOrgPermissions() {
    const { activeOrganization, currentUser } = useAuth();

    const permissions = useMemo(() => {
        // If no active org, treat as owner of own data (backward compatibility)
        const role = activeOrganization?.role || 'owner';
        const isOwn = activeOrganization?.isOwn !== false;

        // Role checks
        const isOwner = role === 'owner';
        const isManager = role === 'manager';
        const isMember = role === 'member';

        // Check if role has access to a permission level
        const hasPermission = (level) => {
            const allowedRoles = PERMISSION_LEVELS[level];
            return allowedRoles?.includes(role) || false;
        };

        return {
            // Role state
            role,
            isOwn,
            isOwner,
            isManager,
            isMember,

            // Specific permission checks
            canViewDashboard: hasPermission('member'),
            canViewAnalytics: hasPermission('member'),
            canViewSponsorships: hasPermission('member'),

            canEditPackages: hasPermission('manager'),
            canEditContent: hasPermission('manager'),
            canManageSponsorships: hasPermission('manager'),

            canEditSettings: hasPermission('owner'),
            canManageTeam: hasPermission('owner'),
            canConnectPayments: hasPermission('owner'),

            // Quick check for any edit capability
            canEdit: hasPermission('manager'),

            // Helper function
            hasPermission
        };
    }, [activeOrganization, currentUser]);

    return permissions;
}

export default useOrgPermissions;
