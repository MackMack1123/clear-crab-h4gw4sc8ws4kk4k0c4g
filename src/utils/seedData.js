import { db } from '../firebase';
import { collection, addDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { userService } from '../services/userService';

export const seedData = async () => {
    console.log("Starting seed data...");

    try {
        // 1. Create Users
        const users = [
            { id: 'user_1', email: 'alice@example.com', role: 'organizer', createdAt: new Date('2024-01-15').toISOString() },
            { id: 'user_2', email: 'bob@example.com', role: 'organizer', createdAt: new Date('2024-02-20').toISOString() },
            { id: 'user_3', email: 'charlie@example.com', role: 'organizer', createdAt: new Date('2024-03-10').toISOString() },
            { id: 'admin_1', email: 'admin@fundraisr.com', role: 'admin', createdAt: new Date('2024-01-01').toISOString() }
        ];

        for (const user of users) {
            await setDoc(doc(db, 'users', user.id), user);
            console.log(`Created user: ${user.email}`);
        }

        // 2. Create Campaigns
        const campaigns = [
            {
                title: 'Spring Soccer Fundraiser',
                type: '5050',
                goalAmount: 5000,
                currentAmount: 1250,
                status: 'active',
                organizerId: 'user_1',
                createdAt: new Date('2024-04-01').toISOString(),
                description: 'Raising money for new uniforms!',
                imageUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&q=80&w=800'
            },
            {
                title: 'Marching Band Trip',
                type: 'blockpool',
                goalAmount: 10000,
                currentAmount: 8500,
                status: 'active',
                organizerId: 'user_2',
                createdAt: new Date('2024-03-15').toISOString(),
                description: 'Help us get to the state championship!',
                imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&q=80&w=800'
            },
            {
                title: 'Library Renovation',
                type: '5050',
                goalAmount: 20000,
                currentAmount: 19500,
                status: 'completed',
                organizerId: 'user_3',
                createdAt: new Date('2024-01-10').toISOString(),
                description: 'New books and furniture for the kids.',
                imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=80&w=800'
            }
        ];

        const campaignIds = [];
        for (const camp of campaigns) {
            const docRef = await addDoc(collection(db, 'campaigns'), camp);
            campaignIds.push(docRef.id);
            console.log(`Created campaign: ${camp.title}`);
        }

        // 3. Create Transactions
        const transactions = [
            { amount: 50, baseAmount: 45, processingFee: 2.5, tipAmount: 2.5, paymentCost: 1.5, netMargin: 3.5, donorName: 'John Doe', timestamp: new Date('2024-04-02').toISOString(), campaignId: campaignIds[0] },
            { amount: 100, baseAmount: 90, processingFee: 5, tipAmount: 5, paymentCost: 3, netMargin: 7, donorName: 'Jane Smith', timestamp: new Date('2024-04-03').toISOString(), campaignId: campaignIds[0] },
            { amount: 25, baseAmount: 22.5, processingFee: 1.25, tipAmount: 1.25, paymentCost: 0.75, netMargin: 1.75, donorName: 'Mike Johnson', timestamp: new Date('2024-03-16').toISOString(), campaignId: campaignIds[1] },
            { amount: 200, baseAmount: 180, processingFee: 10, tipAmount: 10, paymentCost: 6, netMargin: 14, donorName: 'Sarah Williams', timestamp: new Date('2024-03-18').toISOString(), campaignId: campaignIds[1] },
            { amount: 500, baseAmount: 450, processingFee: 25, tipAmount: 25, paymentCost: 15, netMargin: 35, donorName: 'Community Corp', timestamp: new Date('2024-01-20').toISOString(), campaignId: campaignIds[2] }
        ];

        for (const trans of transactions) {
            await addDoc(collection(db, 'transactions'), trans);
            console.log(`Created transaction from: ${trans.donorName}`);
        }

        console.log("Seed data completed successfully!");
        alert("Database seeded successfully!");
    } catch (error) {
        console.error("Error seeding data:", error);
        alert("Error seeding data. Check console.");
    }
};



// ... (keep existing imports if needed, but we might not need firestore ones for this function anymore, though seedData main function uses them)

export const promoteToAdmin = async (userId, userEmail) => {
    if (!userId) return;
    try {
        const updates = { role: 'admin' };
        if (userEmail) updates.email = userEmail; // Required for upsert if user doesn't exist

        await userService.updateUser(userId, updates);
        alert("User promoted to admin! Refresh the page.");
    } catch (error) {
        console.error("Error promoting user:", error);
        alert("Error promoting user: " + error.message);
    }
};
