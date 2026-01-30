import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';

const SELLERS_COLLECTION = 'sellers';

export const sellerService = {
    // Add a single seller to a campaign
    addSeller: async (campaignId, name, email = '') => {
        try {
            const docRef = await addDoc(collection(db, SELLERS_COLLECTION), {
                campaignId,
                name,
                email,
                totalRaised: 0,
                createdAt: new Date().toISOString()
            });
            return { id: docRef.id, campaignId, name, email };
        } catch (error) {
            console.error("Error adding seller:", error);
            throw error;
        }
    },

    // Bulk add sellers (for roster upload)
    addSellersBulk: async (campaignId, sellersList) => {
        try {
            const batch = writeBatch(db);
            const sellersRef = collection(db, SELLERS_COLLECTION);

            sellersList.forEach(seller => {
                const newSellerRef = doc(sellersRef); // Generate new ID
                batch.set(newSellerRef, {
                    campaignId,
                    name: seller.name,
                    email: seller.email || '',
                    totalRaised: 0,
                    createdAt: new Date().toISOString()
                });
            });

            await batch.commit();
        } catch (error) {
            console.error("Error bulk adding sellers:", error);
            throw error;
        }
    },

    // Get all sellers for a campaign
    fetchSellersForCampaign: async (campaignId) => {
        try {
            const q = query(collection(db, SELLERS_COLLECTION), where("campaignId", "==", campaignId));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching sellers:", error);
            throw error;
        }
    }
};
