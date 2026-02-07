const admin = require('firebase-admin');

let serviceAccount;

const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (rawKey) {
    console.log('[Firebase Admin] Found env var, length:', rawKey.length, 'starts with:', rawKey.substring(0, 20));
    try {
        // Strip surrounding quotes if Coolify/Docker wraps the value
        let cleaned = rawKey.trim();
        if ((cleaned.startsWith("'") && cleaned.endsWith("'")) ||
            (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
            cleaned = cleaned.slice(1, -1);
        }
        serviceAccount = JSON.parse(cleaned);
        // Fix private key newlines — env vars often store \n as literal strings
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        console.log('[Firebase Admin] Parsed service account for project:', serviceAccount.project_id);
    } catch (e) {
        console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
        console.error('[Firebase Admin] First 100 chars:', rawKey.substring(0, 100));
    }
} else {
    console.log('[Firebase Admin] No FIREBASE_SERVICE_ACCOUNT_KEY env var found');
}

if (!serviceAccount) {
    try {
        serviceAccount = require('./firebase-service-account.json');
        console.log('[Firebase Admin] Loaded from file for project:', serviceAccount.project_id);
    } catch (e) {
        console.warn('[Firebase Admin] No service account found (env var or file). Admin features unavailable.');
    }
}

if (serviceAccount && !admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('[Firebase Admin] Initialized successfully');
    } catch (e) {
        console.error('[Firebase Admin] Failed to initialize:', e.message);
    }
}

module.exports = admin;
