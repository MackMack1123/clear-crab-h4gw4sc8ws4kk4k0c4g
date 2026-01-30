import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, runTransaction, doc } from 'firebase/firestore';

const TRANSACTIONS_COLLECTION = 'transactions';
const CAMPAIGNS_COLLECTION = 'campaigns';
const SELLERS_COLLECTION = 'sellers';

export const transactionService = {
    // Record a new transaction and update campaign/seller totals atomically
    createTransaction: async (transactionData) => {
        try {
            await runTransaction(db, async (transaction) => {
                // --- READS FIRST ---
                const campaignRef = doc(db, CAMPAIGNS_COLLECTION, transactionData.campaignId);
                const campaignDoc = await transaction.get(campaignRef);
                if (!campaignDoc.exists()) throw "Campaign does not exist!";

                let sellerDoc = null;
                if (transactionData.sellerId) {
                    const sellerRef = doc(db, SELLERS_COLLECTION, transactionData.sellerId);
                    sellerDoc = await transaction.get(sellerRef);
                }

                let userDoc = null;
                const organizerId = campaignDoc.data().organizerId;
                if (organizerId) {
                    const userRef = doc(db, 'users', organizerId);
                    userDoc = await transaction.get(userRef);
                }

                // --- CALCULATIONS ---
                const totalAmount = transactionData.amount; // Total paid by donor
                const baseAmount = transactionData.baseAmount || totalAmount; // What the campaign gets

                // Est. Stripe/Venmo fees: 3.49% + $0.49
                const paymentCost = (totalAmount * 0.0349) + 0.49;

                // Net Margin = (Fee + Tip) - Cost
                // Fee + Tip = Total - Base
                const revenue = totalAmount - baseAmount;
                const netMargin = revenue - paymentCost;

                // --- WRITES ---
                // 1. Create transaction record
                const newTransactionRef = doc(collection(db, TRANSACTIONS_COLLECTION));
                transaction.set(newTransactionRef, {
                    ...transactionData,
                    paymentCost: Number(paymentCost.toFixed(2)),
                    netMargin: Number(netMargin.toFixed(2)),
                    timestamp: new Date().toISOString()
                });

                // 2. Update Campaign Total (ONLY Base Amount)
                const currentAmount = campaignDoc.data().currentAmount || 0;
                transaction.update(campaignRef, {
                    currentAmount: currentAmount + baseAmount
                });

                // 3. Update Seller Total (if applicable) (ONLY Base Amount)
                if (transactionData.sellerId && sellerDoc && sellerDoc.exists()) {
                    const currentRaised = sellerDoc.data().totalRaised || 0;
                    transaction.update(doc(db, SELLERS_COLLECTION, transactionData.sellerId), {
                        totalRaised: currentRaised + baseAmount
                    });
                }

                // 4. Update Organizer Balance (Custodial Ledger)
                if (organizerId && userDoc && userDoc.exists()) {
                    const currentBalance = userDoc.data().balance || 0;
                    transaction.update(doc(db, 'users', organizerId), {
                        balance: currentBalance + baseAmount
                    });
                }
            });
            return true;
        } catch (error) {
            console.error("Error creating transaction:", error);
            throw error;
        }
    },

    // Get transactions for a campaign
    getCampaignTransactions: async (campaignId) => {
        try {
            const q = query(collection(db, TRANSACTIONS_COLLECTION), where("campaignId", "==", campaignId));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching transactions:", error);
            throw error;
        }
    }
};
