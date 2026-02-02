import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, reauthenticateWithCredential, EmailAuthProvider, updateEmail } from 'firebase/auth';
import { userService } from '../services/userService';
import { teamService } from '../services/teamService';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

// Helper to normalize roles from legacy string or new array format
function normalizeRoles(profile) {
    if (!profile) return [];

    // If user has roles array, use it
    if (profile.roles && profile.roles.length > 0) {
        return profile.roles;
    }

    // Fall back to legacy single role
    if (profile.role) {
        return [profile.role];
    }

    return ['organizer']; // Default
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeRole, setActiveRole] = useState(null); // Current role being viewed

    // Organization switching state
    const [activeOrganization, setActiveOrganization] = useState(null); // { id, name, role, isOwn, logoUrl }
    const [memberOrganizations, setMemberOrganizations] = useState([]); // Orgs user is member of

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                // Fetch user profile from MongoDB via userService
                try {
                    const profile = await userService.getUser(user.uid);

                    if (profile) {
                        // User exists, use their data as-is
                        setUserProfile(profile);
                        // Set initial active role (prefer organizer if available, else first role)
                        const roles = normalizeRoles(profile);
                        if (!activeRole || !roles.includes(activeRole)) {
                            // Prefer organizer view if they have it, otherwise first available role
                            setActiveRole(roles.includes('organizer') ? 'organizer' : roles[0]);
                        }

                        // Set own organization as default active organization
                        setActiveOrganization({
                            id: user.uid,
                            name: profile.organizationProfile?.orgName || 'My Organization',
                            role: 'owner',
                            isOwn: true,
                            logoUrl: profile.organizationProfile?.logoUrl
                        });

                        // Load member organizations
                        if (profile.memberOf && profile.memberOf.length > 0) {
                            setMemberOrganizations(profile.memberOf.map(m => ({
                                id: m.organizationId,
                                name: m.orgName,
                                role: m.role,
                                isOwn: false,
                                joinedAt: m.joinedAt
                            })));
                        }
                    } else {
                        // User truly doesn't exist (404) - create minimal defaults
                        // We intentionally DON'T call updateUser here to avoid race conditions
                        // The profile will be created on their first save
                        console.log("No profile found for user:", user.email, "- will create on first save");
                        const defaultProfile = {
                            _id: user.uid,
                            email: user.email,
                            firstName: user.displayName ? user.displayName.split(' ')[0] : 'Organizer',
                            lastName: user.displayName ? user.displayName.split(' ')[1] || '' : '',
                            role: 'organizer',
                            roles: ['organizer'],
                            organizationProfile: {
                                orgName: '',
                                description: ''
                            }
                        };
                        setUserProfile(defaultProfile);
                        setActiveRole('organizer');
                    }
                } catch (err) {
                    console.error("Error fetching user profile:", err);
                    // On error, DON'T try to create defaults - just use minimal local state
                    setUserProfile({
                        _id: user.uid,
                        email: user.email,
                        organizationProfile: {}
                    });
                    setActiveRole('organizer');
                }
            } else {
                setUserProfile(null);
                setActiveRole(null);
                setActiveOrganization(null);
                setMemberOrganizations([]);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const refreshProfile = async () => {
        if (currentUser) {
            try {
                const profile = await userService.getUser(currentUser.uid);
                if (profile) {
                    setUserProfile(profile);

                    // Refresh member organizations
                    if (profile.memberOf && profile.memberOf.length > 0) {
                        setMemberOrganizations(profile.memberOf.map(m => ({
                            id: m.organizationId,
                            name: m.orgName,
                            role: m.role,
                            isOwn: false,
                            joinedAt: m.joinedAt
                        })));
                    } else {
                        setMemberOrganizations([]);
                    }

                    // Update active org if it's own org
                    if (activeOrganization?.isOwn) {
                        setActiveOrganization(prev => ({
                            ...prev,
                            name: profile.organizationProfile?.orgName || 'My Organization',
                            logoUrl: profile.organizationProfile?.logoUrl
                        }));
                    }
                }
            } catch (err) {
                console.error("Error refreshing profile:", err);
            }
        }
    };

    const updateUserEmail = async (newEmail, password) => {
        if (!currentUser) throw new Error('No user logged in');

        // 1. Re-authenticate
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        await reauthenticateWithCredential(currentUser, credential);

        // 2. Update Firebase Auth (this verifies the email format too)
        await updateEmail(currentUser, newEmail);

        // 3. Update Backend Profile
        await userService.updateUser(currentUser.uid, { email: newEmail });

        // 4. Update Local State
        setUserProfile(prev => ({ ...prev, email: newEmail }));
    };

    // Get all roles for this user (normalized from legacy or new format)
    const availableRoles = normalizeRoles(userProfile);

    // Role check helpers
    const hasRole = useCallback((roleName) => {
        return availableRoles.includes(roleName);
    }, [availableRoles]);

    const switchRole = useCallback((roleName) => {
        if (availableRoles.includes(roleName)) {
            setActiveRole(roleName);
            return true;
        }
        return false;
    }, [availableRoles]);

    // Add a role to the user (used when an organizer becomes a sponsor, etc.)
    const addRole = useCallback(async (roleName) => {
        if (!currentUser || !userProfile) return false;
        if (availableRoles.includes(roleName)) return true; // Already has role

        try {
            const newRoles = [...availableRoles, roleName];
            await userService.updateUser(currentUser.uid, { roles: newRoles });
            // Update local profile
            setUserProfile(prev => ({ ...prev, roles: newRoles }));
            return true;
        } catch (err) {
            console.error("Error adding role:", err);
            return false;
        }
    }, [currentUser, userProfile, availableRoles]);

    // Switch active organization
    const switchOrganization = useCallback((orgId) => {
        if (!currentUser || !userProfile) return false;

        // Switching to own org
        if (orgId === currentUser.uid) {
            setActiveOrganization({
                id: currentUser.uid,
                name: userProfile.organizationProfile?.orgName || 'My Organization',
                role: 'owner',
                isOwn: true,
                logoUrl: userProfile.organizationProfile?.logoUrl
            });
            return true;
        }

        // Switching to member org
        const memberOrg = memberOrganizations.find(o => o.id === orgId);
        if (memberOrg) {
            setActiveOrganization({
                id: memberOrg.id,
                name: memberOrg.name,
                role: memberOrg.role,
                isOwn: false,
                logoUrl: memberOrg.logoUrl
            });
            return true;
        }

        return false;
    }, [currentUser, userProfile, memberOrganizations]);

    // Quick permission check for edit capability
    const canEdit = activeOrganization?.role === 'owner' || activeOrganization?.role === 'manager';

    // Get all organizations user has access to (own + memberships)
    const allOrganizations = currentUser && userProfile ? [
        {
            id: currentUser.uid,
            name: userProfile.organizationProfile?.orgName || 'My Organization',
            role: 'owner',
            isOwn: true,
            logoUrl: userProfile.organizationProfile?.logoUrl
        },
        ...memberOrganizations
    ] : [];

    const value = {
        currentUser,
        userProfile,
        // Legacy computed property
        isAdmin: hasRole('admin'),
        // New role management
        activeRole,
        availableRoles,
        hasRole,
        switchRole,
        addRole,
        isOrganizer: hasRole('organizer'),
        isSponsor: hasRole('sponsor'),
        // Organization switching
        activeOrganization,
        memberOrganizations,
        allOrganizations,
        switchOrganization,
        canEdit,
        // Utilities
        loading,
        refreshProfile,
        updateUserEmail
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
