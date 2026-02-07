const admin = require('firebase-admin');

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
    }
}

if (!serviceAccount) {
    try {
        serviceAccount = require('./firebase-service-account.json');
    } catch (e) {
        console.warn('No Firebase service account found (env var or file). Firebase Admin features will be unavailable.');
    }
}

if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('[Firebase Admin] Initialized');
}

module.exports = admin;
