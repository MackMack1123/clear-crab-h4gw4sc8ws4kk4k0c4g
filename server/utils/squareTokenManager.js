const { Client, Environment } = require('square');
const User = require('../models/User');

// Buffer: refresh if token expires within 5 minutes
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * Ensures the organizer's Square access token is valid.
 * If the token is expired or about to expire, refreshes it using the refresh token.
 * Returns the valid access token.
 */
async function ensureValidSquareToken(userId) {
    const user = await User.findById(userId);
    const square = user?.paymentSettings?.square;

    if (!square?.accessToken) {
        throw new Error('Organizer has not connected Square');
    }

    // Check if token is still valid (with buffer)
    const expiresAt = square.expiresAt ? new Date(square.expiresAt).getTime() : 0;
    const now = Date.now();

    if (expiresAt > now + EXPIRY_BUFFER_MS) {
        // Token is still valid
        return square.accessToken;
    }

    // Token expired or about to expire — refresh it
    if (!square.refreshToken) {
        throw new Error('No refresh token available. Organizer must reconnect Square.');
    }

    console.log(`Refreshing Square token for user ${userId}`);

    const platformClient = new Client({
        environment: process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox,
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
    });

    const response = await platformClient.oAuthApi.obtainToken({
        clientId: process.env.SQUARE_APP_ID,
        clientSecret: process.env.SQUARE_APP_SECRET,
        refreshToken: square.refreshToken,
        grantType: 'refresh_token',
    });

    const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: newExpiresAt,
    } = response.result;

    await User.findByIdAndUpdate(userId, {
        $set: {
            'paymentSettings.square.accessToken': newAccessToken,
            'paymentSettings.square.refreshToken': newRefreshToken || square.refreshToken,
            'paymentSettings.square.expiresAt': newExpiresAt,
        }
    });

    console.log(`Square token refreshed for user ${userId}, new expiry: ${newExpiresAt}`);

    return newAccessToken;
}

module.exports = { ensureValidSquareToken };
