const express = require('express');
const router = express.Router();
const { Client, Environment } = require('square');
const User = require('../../models/User');
const Sponsorship = require('../../models/Sponsorship');
const Package = require('../../models/Package');
const emailService = require('../../services/emailService');
const slackService = require('../../services/slackService');
const { ensureValidSquareToken } = require('../../utils/squareTokenManager');

// Initialize Square Client
// Note: We use the platform credentials (your app creds) for these operations
const client = new Client({
    environment: process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox,
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
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
        return res.redirect(`${FRONTEND_URL}/dashboard?square_error=${error}`);
    }

    // Decode state to get userId
    let userId;
    try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = decoded.userId;
    } catch (e) {
        return res.redirect(`${FRONTEND_URL}/dashboard?square_error=invalid_state`);
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

        // Fetch the merchant's main location
        let mainLocationId = null;
        try {
            const merchantClient = new Client({
                environment: process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox,
                accessToken: accessToken
            });
            const locationsResponse = await merchantClient.locationsApi.listLocations();
            const locations = locationsResponse.result.locations || [];
            const activeLocation = locations.find(l => l.status === 'ACTIVE');
            if (activeLocation) {
                mainLocationId = activeLocation.id;
            }
        } catch (locErr) {
            console.warn('Could not fetch Square locations during OAuth:', locErr.message);
            // Non-fatal: continue without mainLocationId
        }

        // Update user with Square credentials
        await User.findByIdAndUpdate(userId, {
            $set: {
                'paymentSettings.activeGateway': 'square',
                'paymentSettings.square': {
                    merchantId: merchantId,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    expiresAt: expiresAt,
                    mainLocationId: mainLocationId,
                    connectedAt: new Date()
                }
            }
        });

        console.log(`Square connected for user ${userId}: ${merchantId} (location: ${mainLocationId})`);

        res.redirect(`${FRONTEND_URL}/dashboard?square_success=true`);
    } catch (err) {
        console.error('Square OAuth token error:', err);
        const errorMsg = err.result?.errors ? JSON.stringify(err.result.errors) : err.message;
        res.redirect(`${FRONTEND_URL}/dashboard?square_error=token_exchange_failed`);
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

        // Ensure organizer's Square token is valid (refreshes if needed)
        const validAccessToken = await ensureValidSquareToken(organizerId);

        // Re-fetch organizer for waiveFees check (token refresh may have updated the doc)
        const organizer = await User.findById(organizerId);

        const merchantClient = new Client({
            environment: process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox,
            accessToken: validAccessToken
        });

        // Calculate amount in cents
        const amountMoney = {
            amount: BigInt(Math.round(amount * 100)),
            currency: 'USD'
        };

        const idempotencyKey = require('crypto').randomUUID();

        // Create Payment Object
        const paymentReq = {
            sourceId: sourceId,
            idempotencyKey: idempotencyKey,
            amountMoney: amountMoney,
            autocomplete: true, // Capture immediately
            buyerEmailAddress: payerEmail,
            note: `Sponsorship Payment`
        };

        // Check fee waiver - only add app fee if NOT waived
        const feesWaived = organizer?.organizationProfile?.waiveFees === true;

        if (!feesWaived) {
            paymentReq.appFeeMoney = {
                // Platform Fee: 5% (Simplification: We take 5% of gross. 
                // Improvements needed to match exact coverFee logic if strict accounting required)
                amount: BigInt(Math.round(amount * 0.05 * 100)),
                currency: 'USD'
            };
        }

        const paymentResponse = await merchantClient.paymentsApi.createPayment(paymentReq);

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

                // Send confirmation emails and Slack notifications for each sponsorship
                const sponsorships = await Sponsorship.find({ _id: { $in: sponsorshipIds } });
                for (const sp of sponsorships) {
                    // Slack notification
                    if (organizer.slackSettings?.connected && organizer.slackSettings?.incomingWebhook?.url) {
                        const pkg = sp.packageId ? await Package.findById(sp.packageId) : null;
                        slackService.sendSponsorshipNotification(
                            organizer.slackSettings.incomingWebhook.url,
                            sp,
                            pkg || { title: 'Unknown Package', price: '0' }
                        ).catch(err => console.error('Square payment Slack error:', err));
                    }

                    if (sp.sponsorEmail) {
                        const pkg = sp.packageId ? await Package.findById(sp.packageId) : null;
                        const portalUrl = `${process.env.FRONTEND_URL || 'https://getfundraisr.io'}/sponsorship/fulfilment/${sp._id}?email=${encodeURIComponent(sp.sponsorEmail)}`;
                        emailService.sendTemplateEmail(
                            organizer,
                            'sponsorship_confirmation',
                            sp.sponsorEmail,
                            {
                                donorName: sp.sponsorName || 'Valued Sponsor',
                                contactName: sp.sponsorName || 'Valued Sponsor',
                                amount: `$${sp.amount}`,
                                packageTitle: pkg?.title || sp.packageTitle || 'Sponsorship Package',
                                portalUrl: portalUrl,
                            }
                        ).catch(err => console.error('Square payment email error:', err));
                    }
                }
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
