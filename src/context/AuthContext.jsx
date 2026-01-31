import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, reauthenticateWithCredential, EmailAuthProvider, updateEmail } from 'firebase/auth';
import { userService } from '../services/userService';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

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
                    } else {
                        // User truly doesn't exist (404) - create minimal defaults
                        // We intentionally DON'T call updateUser here to avoid race conditions
                        // The profile will be created on their first save
                        console.log("No profile found for user:", user.email, "- will create on first save");
                        setUserProfile({
                            _id: user.uid,
                            email: user.email,
                            firstName: user.displayName ? user.displayName.split(' ')[0] : 'Organizer',
                            lastName: user.displayName ? user.displayName.split(' ')[1] || '' : '',
                            role: 'organizer',
                            organizationProfile: {
                                orgName: '',
                                description: ''
                            }
                        });
                    }
                } catch (err) {
                    console.error("Error fetching user profile:", err);
                    // On error, DON'T try to create defaults - just use minimal local state
                    setUserProfile({
                        _id: user.uid,
                        email: user.email,
                        organizationProfile: {}
                    });
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const refreshProfile = async () => {
        if (currentUser) {
            try {
                const profile = await userService.getUser(currentUser.uid);
                if (profile) setUserProfile(profile);
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

    const value = {
        currentUser,
        userProfile,
        isAdmin: userProfile?.role === 'admin',
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
