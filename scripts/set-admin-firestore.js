// Temporary script to set admin role in Firestore
// Run with: node scripts/set-admin-firestore.js YOUR_FIREBASE_UID
// Get your UID from Firebase Console > Authentication > Users

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// For this to work, you'll need firebase-admin installed
// npm install firebase-admin --save-dev
// And a service account key from Firebase Console

const userId = process.argv[2];

if (!userId) {
    console.log('Usage: node scripts/set-admin-firestore.js YOUR_FIREBASE_UID');
    console.log('');
    console.log('To find your Firebase UID:');
    console.log('1. Go to Firebase Console > Authentication > Users');
    console.log('2. Find your email and copy the "User UID" column');
    process.exit(1);
}

console.log(`
MANUAL STEPS - Since we don't have Firebase Admin SDK set up:

1. Go to Firebase Console: https://console.firebase.google.com/project/fundraisr-c0d55/firestore

2. Navigate to the 'users' collection

3. Create or update the document with ID: ${userId}

4. Set/update the fields:
   - role: "admin"
   - email: (your email)

This will allow the isAdmin() function in Firestore rules to recognize you.
`);
