const express = require('express');
const router = express.Router();
const { SquareClient, SquareEnvironment } = require('square');
const User = require('../../models/User');
const Sponsorship = require('../../models/Sponsorship');

// Initialize Square Client
// Note: We use the platform credentials (your app creds) for these operations
const client = new SquareClient({
    environment: process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    token: process.env.SQUARE_ACCESS_TOKEN, // 'token' instead of 'accessToken' for new SDK?
});

const SQUARE_APP_ID = process.env.SQUARE_APP_ID;
const API_URL = process.env.API_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * GET /api/payments/square/connect
 * Generate Square OAuth link for Connect
 */
router.get('/connect', (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    // State passed to Square to identify the user on return
    // We base64 encode it to be safe
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

    // Square OAuth Permission Scopes
    const scopes = [
        'MERCHANT_PROFILE_READ',
        'PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS',
        'PAYMENTS_WRITE',
        'PAYMENTS_READ'
    ];

    const params = new URLSearchParams({
        client_id: SQUARE_APP_ID,
        scope: scopes.join(' '),
        session: false,
        state: state
    });

    const authUrl = process.env.SQUARE_ENVIRONMENT === 'production'
        ? `https://connect.squareup.com/oauth2/authorize?${params.toString()}`
        : `https://connect.squareupsandbox.com/oauth2/authorize?${params.toString()}`;

    res.json({ url: authUrl });
});

/**
 * GET /api/payments/square/callback
 * Handle OAuth callback from Square
 */
router.get('/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
        console.error('Square OAuth error:', error, error_description);
        return res.redirect(`${FRONTEND_URL}/dashboard/settings?square_error=${error}`);
    }

    // Decode state to get userId
    let userId;
    try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = decoded.userId;
    } catch (e) {
        return res.redirect(`${FRONTEND_URL}/dashboard/settings?square_error=invalid_state`);
    }

    try {
        // Exchange code for access token
        const response = await client.oAuthApi.obtainToken({
            clientId: SQUARE_APP_ID,
            clientSecret: process.env.SQUARE_APP_SECRET, // Needed for token exchange
            code: code,
            grantType: 'authorization_code',
        });

        const {
            accessToken,
            refreshToken,
            expiresAt,
            merchantId
        } = response.result;

        // Update user with Square credentials
        await User.findByIdAndUpdate(userId, {
            $set: {
                'paymentSettings.activeGateway': 'square',
                'paymentSettings.square': {
                    merchantId: merchantId,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    expiresAt: expiresAt,
                    connectedAt: new Date()
                }
            }
        });

        console.log(`Square connected for user ${userId}: ${merchantId}`);

        res.redirect(`${FRONTEND_URL}/dashboard/settings?square_success=true`);
    } catch (err) {
        console.error('Square OAuth token error:', err);
        const errorMsg = err.result?.errors ? JSON.stringify(err.result.errors) : err.message;
        res.redirect(`${FRONTEND_URL}/dashboard/settings?square_error=token_exchange_failed`);
    }
});

/**
 * POST /api/payments/square/process-payment
 * Process a payment using a nonce
 */
router.post('/process-payment', async (req, res) => {
    const {
        sourceId, // The nonce from frontend
        amount, // Amount in dollars
        organizerId, // Who we are paying
        sponsorshipIds, // Array of sponsorship IDs
        coverFees, // Boolean
        payerEmail // For verification/receipts
    } = req.body;

    try {
        if (!sourceId || !amount || !organizerId) {
            throw new Error('Missing required payment fields');
        }

        // Get organizer's Square credentials
        const organizer = await User.findById(organizerId);
        const squareSettings = organizer?.paymentSettings?.square;

        if (!squareSettings?.accessToken) {
            throw new Error('Organizer has not connected Square');
        }

        // Create a dedicated client for this merchant?
        // Actually, with Square OAuth, we can use the specific access token 
        // OR use our app token + 'Authorization: Bearer <UsersToken>'
        // The Square Node SDK allows creating a client with a specific accessToken.
        const merchantClient = new Client({
            environment: process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox,
            accessToken: squareSettings.accessToken
        });

        // Calculate amount in cents
        const amountMoney = {
            amount: BigInt(Math.round(amount * 100)),
            currency: 'USD'
        };

        const idempotencyKey = require('crypto').randomUUID();

        // Create Payment
        const paymentResponse = await merchantClient.paymentsApi.createPayment({
            sourceId: sourceId,
            idempotencyKey: idempotencyKey,
            amountMoney: amountMoney,
            autocomplete: true, // Capture immediately
            buyerEmailAddress: payerEmail,
            note: `Sponsorship Payment`,
            appFeeMoney: {
                // Platform Fee: 5%
                // If coverFees is TRUE, we assume the amount passed ALREADY includes the fee override logic from frontend
                // e.g. Frontend sent $105. We take $5. Organizer gets $100.
                amount: BigInt(Math.round(amount * 0.05 * 100)),
                currency: 'USD'
            }
        });

        const payment = paymentResponse.result.payment;

        if (payment.status === 'COMPLETED' || payment.status === 'APPROVED') {
            // Update Sponsorships
            if (sponsorshipIds && sponsorshipIds.length > 0) {
                await Sponsorship.updateMany(
                    { _id: { $in: sponsorshipIds } },
                    {
                        $set: {
                            status: 'paid',
                            paymentId: payment.id,
                            paymentMethod: 'square'
                        }
                    }
                );
            }

            res.json({
                success: true,
                paymentId: payment.id,
                status: payment.status
            });
        } else {
            throw new Error(`Payment status: ${payment.status}`);
        }

    } catch (err) {
        console.error('Square payment error:', err);
        // Better error message handling from Square errors
        let message = err.message;
        if (err.result && err.result.errors) {
            message = err.result.errors.map(e => e.detail).join(', ');
        }
        res.status(500).json({ error: message });
    }
});

module.exports = router;
