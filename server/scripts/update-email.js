/**
 * One-off script to update a user's email in both Firebase Auth and MongoDB.
 * Usage: node server/scripts/update-email.js
 */
// Load both .env files (root has Firebase key, server has MongoDB URI)
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const admin = require('../firebaseAdmin');

const OLD_EMAIL = 'alice@example.com';
const NEW_EMAIL = 'brett.mackrell@gmail.com';
const UID = 'JewAWNK4vmQRZQ446Lha6cTb4Ln1';

async function main() {
    // Firebase Auth already updated — just need MongoDB now
    // Update MongoDB
    console.log(`\n[MongoDB] Connecting...`);
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`[MongoDB] Connected`);

    // Remove orphaned record for the deleted Firebase account
    const orphan = await mongoose.connection.db.collection('fr_users').findOne({ email: NEW_EMAIL });
    if (orphan && orphan._id !== UID) {
        console.log(`[MongoDB] Found orphaned record _id=${orphan._id} with email ${NEW_EMAIL} — deleting...`);
        await mongoose.connection.db.collection('fr_users').deleteOne({ _id: orphan._id });
        console.log(`[MongoDB] Orphaned record deleted`);
    }

    const result = await mongoose.connection.db.collection('fr_users').updateOne(
        { _id: UID },
        { $set: { email: NEW_EMAIL } }
    );
    console.log(`[MongoDB] Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

    await mongoose.disconnect();
    console.log(`\nEmail updated from ${OLD_EMAIL} → ${NEW_EMAIL}`);
}

main().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
