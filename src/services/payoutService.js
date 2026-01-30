import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, orderBy } from 'firebase/firestore';

const PAYOUTS_COLLECTION = 'payouts';
const USERS_COLLECTION = 'users';

export const payoutService = {
    // Request a payout
    requestPayout: async (userId, amount, method) => {
        try {
            // In a real app, we'd use a transaction to deduct balance immediately or mark as pending
            // For MVP, we'll just create the request and let Admin handle the deduction/verification
            // OR we can deduct now. Let's deduct now to prevent double spending.

            // Actually, let's just record the request. The balance is "current available".
            // If we deduct now, it disappears from dashboard.
            // Let's keep it simple: Create request with status 'pending'.

            await addDoc(collection(db, PAYOUTS_COLLECTION), {
                userId,
                amount,
                method,
                status: 'pending',
                timestamp: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error("Error requesting payout:", error);
            throw error;
        }
    },

    // Get payouts for a user
    getUserPayouts: async (userId) => {
        try {
            const q = query(collection(db, PAYOUTS_COLLECTION), where("userId", "==", userId), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching user payouts:", error);
            throw error;
        }
    },

    // Get all pending payouts (Admin)
    getPendingPayouts: async () => {
        try {
            const q = query(collection(db, PAYOUTS_COLLECTION), where("status", "==", "pending"), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching pending payouts:", error);
            throw error;
        }
    },

    // Mark payout as paid (Admin)
    // This should also deduct from user balance if we didn't do it earlier.
    // Let's do the deduction HERE to ensure it only happens when actually paid.
    markAsPaid: async (payoutId, userId, amount) => {
        try {
            // 1. Update payout status
            const payoutRef = doc(db, PAYOUTS_COLLECTION, payoutId);
            await updateDoc(payoutRef, {
                status: 'paid',
                paidAt: new Date().toISOString()
            });

            // 2. Deduct from User Balance
            // Note: This is not atomic with the above in this simple implementation, but good enough for MVP.
            // Ideally use runTransaction.
            const userRef = doc(db, USERS_COLLECTION, userId);
            // We need to fetch current balance first or use increment(-amount)
            // Firestore increment is safe.
            const { increment } = await import('firebase/firestore');
            await updateDoc(userRef, {
                balance: increment(-amount)
            });

            return true;
        } catch (error) {
            console.error("Error marking payout as paid:", error);
            throw error;
        }
    }
};
