const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fundraisr';

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

async function migrateSlugs() {
    try {
        const users = await User.find({ 'organizationProfile.slug': { $exists: true, $ne: null } });
        console.log(`Found ${users.length} users with legacy slugs...`);

        for (const user of users) {
            const legacySlug = user.organizationProfile.slug;

            // Only migrate if root slug is empty
            if (!user.slug && legacySlug) {
                user.slug = legacySlug;
                // Optionally clear the old one, or keep it as backup. 
                // Mongoose might complain if we try to set a field that doesn't exist in schema anymore?
                // But since we just moved it in schema, `organizationProfile.slug` is technically NOT in schema anymore.
                // So we need to use `updateOne` with $set and $unset to be safe / explicit for MongoDB.

                console.log(`Migrating user ${user.email}: ${legacySlug} -> root`);

                await User.updateOne(
                    { _id: user._id },
                    {
                        $set: { slug: legacySlug },
                        $unset: { 'organizationProfile.slug': "" }
                    }
                );
            }
        }
        console.log('Migration complete.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        mongoose.connection.close();
    }
}

migrateSlugs();
