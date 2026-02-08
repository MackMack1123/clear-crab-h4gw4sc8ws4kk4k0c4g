/**
 * One-off script to remove test data before launch.
 * Drops: sponsorships, analytics events, widget stats, email logs.
 * Keeps: users, packages, campaigns, system settings.
 * Usage: node server/scripts/clean-test-data.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const COLLECTIONS_TO_DROP = [
    'fr_sponsorships',
    'fr_page_view_events',
    'fr_funnel_daily_stats',
    'fr_widget_events',
    'fr_widget_daily_stats',
    'fr_email_logs'
];

async function main() {
    console.log('\n[MongoDB] Connecting...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[MongoDB] Connected\n');

    const db = mongoose.connection.db;

    for (const name of COLLECTIONS_TO_DROP) {
        const exists = await db.listCollections({ name }).hasNext();
        if (exists) {
            const count = await db.collection(name).countDocuments();
            await db.collection(name).drop();
            console.log(`  Dropped ${name} (${count} documents)`);
        } else {
            console.log(`  Skipped ${name} (does not exist)`);
        }
    }

    await mongoose.disconnect();
    console.log('\nDone — test data removed.');
}

main().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
