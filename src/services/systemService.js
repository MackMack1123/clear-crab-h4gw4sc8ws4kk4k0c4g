
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const SETTINGS_DOC_ID = 'global';
// Use a separate collection for development to avoid affecting production
const COLLECTION_NAME = import.meta.env.DEV ? 'systemSettings_dev' : 'systemSettings';

export const systemService = {
    // Get all system settings
    getSettings: async () => {
        try {
            const docRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                // Return defaults if document doesn't exist
                return {
                    payments: {
                        stripe: true,
                        square: true,
                        paypal: true,
                        check: true
                    },
                    registrations: {
                        organizationsEnabled: true
                    }
                };
            }
        } catch (error) {
            console.error("Error fetching system settings:", error);
            // Return safe defaults on error
            return {
                payments: { stripe: true, square: true, paypal: true, check: true },
                registrations: { organizationsEnabled: true }
            };
        }
    },

    // Update settings
    updateSettings: async (newSettings) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
            await setDoc(docRef, newSettings, { merge: true });
            return true;
        } catch (error) {
            console.error("Error updating system settings:", error);
            throw error;
        }
    },

    // Initialize defaults if needed (can be called by Admin Dashboard on load)
    initializeDefaults: async () => {
        const docRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            await setDoc(docRef, {
                payments: {
                    stripe: true,
                    square: true,
                    paypal: true,
                    check: true
                },
                registrations: {
                    organizationsEnabled: true
                }
            });
        }
    }
};
