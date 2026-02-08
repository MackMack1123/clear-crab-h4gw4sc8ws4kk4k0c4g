const admin = require('firebase-admin');

let serviceAccount;

// Support both raw JSON and base64-encoded JSON for the service account key
const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const b64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64;

if (b64Key) {
    // Preferred: base64-encoded JSON (avoids shell/Docker escaping issues)
    try {
        const decoded = Buffer.from(b64Key, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decoded);
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        console.log('[Firebase Admin] Parsed from base64 env var, project:', serviceAccount.project_id);
    } catch (e) {
        console.error('[Firebase Admin] Failed to parse base64 key:', e.message);
    }
} else if (rawKey) {
    console.log('[Firebase Admin] Found raw env var, length:', rawKey.length);
    try {
        // Strip surrounding quotes if Coolify/Docker wraps the value
        let cleaned = rawKey.trim();
        if ((cleaned.startsWith("'") && cleaned.endsWith("'")) ||
            (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
            cleaned = cleaned.slice(1, -1);
        }
        serviceAccount = JSON.parse(cleaned);
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        console.log('[Firebase Admin] Parsed from raw env var, project:', serviceAccount.project_id);
    } catch (e) {
        console.error('[Firebase Admin] Failed to parse raw key:', e.message);
        console.error('[Firebase Admin] First 80 chars:', rawKey.substring(0, 80));
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
