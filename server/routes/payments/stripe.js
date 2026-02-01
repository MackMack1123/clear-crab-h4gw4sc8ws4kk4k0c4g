const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Sponsorship = require('../../models/Sponsorship');

// Stripe SDK - will be initialized with your platform's secret key
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PLATFORM_FEE_PERCENT = 5; // 5% platform fee - adjust as needed

/**
 * GET /api/payments/stripe/connect
 * Generate Stripe OAuth link for Connect onboarding
 */
router.get('/connect', (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    // Build Stripe Connect OAuth URL
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: STRIPE_CLIENT_ID,
        scope: 'read_write',
        redirect_uri: `${process.env.API_URL || 'http://localhost:3001'}/api/payments/stripe/callback`,
        state: state,
        'stripe_user[business_type]': 'individual', // or 'company'
    });

    const authUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    res.json({ url: authUrl });
});

/**
 * GET /api/payments/stripe/callback
 * Handle OAuth callback from Stripe
 */
router.get('/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;

    // Decode state to get userId
    let userId;
    try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = decoded.userId;
    } catch (e) {
        return res.redirect(`${FRONTEND_URL}/dashboard/settings?stripe_error=invalid_state`);
    }

    if (error) {
        console.error('Stripe OAuth error:', error, error_description);
        return res.redirect(`${FRONTEND_URL}/dashboard/settings?stripe_error=${error}`);
    }

    try {
        // Exchange code for access token
        const response = await stripe.oauth.token({
            grant_type: 'authorization_code',
            code: code,
        });

        const {
            access_token,
            refresh_token,
            stripe_user_id,
            livemode
        } = response;

        // Update user with Stripe credentials
        await User.findByIdAndUpdate(userId, {
            $set: {
                'paymentSettings.activeGateway': 'stripe',
                'paymentSettings.stripe': {
                    accountId: stripe_user_id,
                    accessToken: access_token,
                    refreshToken: refresh_token,
                    livemode: livemode,
                    connectedAt: new Date()
                }
            }
        });

        console.log(`Stripe connected for user ${userId}: ${stripe_user_id}`);

        res.redirect(`${FRONTEND_URL}/dashboard/settings?stripe_success=true`);
    } catch (err) {
        console.error('Stripe OAuth token error:', err);
        res.redirect(`${FRONTEND_URL}/dashboard/settings?stripe_error=token_exchange_failed`);
    }
});

/**
 * POST /api/payments/stripe/disconnect
 * Remove Stripe connection for user
 */
router.post('/disconnect', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        // Get user's Stripe account ID
        const user = await User.findById(userId);
        const stripeAccountId = user?.paymentSettings?.stripe?.accountId;

        if (stripeAccountId) {
            // Revoke access (optional - deauthorizes the connection)
            try {
                await stripe.oauth.deauthorize({
                    client_id: STRIPE_CLIENT_ID,
                    stripe_user_id: stripeAccountId,
                });
            } catch (deauthErr) {
                console.warn('Stripe deauthorize warning:', deauthErr.message);
            }
        }

        // Clear from database
        await User.findByIdAndUpdate(userId, {
            $unset: {
                'paymentSettings.stripe': 1
            },
            $set: {
                'paymentSettings.activeGateway': null
            }
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Stripe disconnect error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/payments/stripe/create-checkout
 * Create a Stripe Checkout Session with platform fee
 */
router.post('/create-checkout', async (req, res) => {
    const {
        organizerId,
        items,
        successUrl,
        cancelUrl,
        customerEmail,
        metadata
    } = req.body;

    try {
        // Get organizer's Stripe account
        const organizer = await User.findById(organizerId);
        const stripeAccountId = organizer?.paymentSettings?.stripe?.accountId;

        if (!stripeAccountId) {
            return res.status(400).json({
                error: 'Organizer has not connected Stripe'
            });
        }

        // Check for fee waiver
        // Check for fee waiver
        const feesWaived = organizer?.organizationProfile?.waiveFees === true;

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const subtotalCents = Math.round(subtotal * 100);

        // Constants
        const PLATFORM_RATE = 0.05;
        const PROC_RATE = 0.029;
        const PROC_FIXED_CENTS = 30;

        // Calculate Fee Components
        const rawPlatformFeeCents = Math.round(subtotalCents * PLATFORM_RATE);
        // Match frontend calculation: (Subtotal * 0.029) + 0.30
        const rawProcFeeCents = Math.round((subtotalCents * PROC_RATE) + PROC_FIXED_CENTS);

        // Base Application Fee (what Platform keeps)
        // If not covering fees: Platform keeps 5% (deducted from subtotal), unless waived (0).
        // If covering fees: Platform keeps 5% (added on top), unless waived (0).
        let applicationFee = feesWaived ? 0 : rawPlatformFeeCents;

        const line_items = items.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    description: item.description,
                },
                unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
        }));

        // Handle Fee Coverage
        if (req.body.coverFees) {
            // 1. Processing Fee (Always added if covered)
            line_items.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Processing Fee',
                        description: 'Transaction processing costs'
                    },
                    unit_amount: rawProcFeeCents
                },
                quantity: 1
            });

            // 2. Platform Fee (Added if not waived)
            if (!feesWaived) {
                line_items.push({
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Platform Fee',
                            description: 'Fundraisr platform support'
                        },
                        unit_amount: rawPlatformFeeCents
                    },
                    quantity: 1
                });
            }
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer_email: customerEmail,
            line_items: line_items,
            payment_intent_data: {
                application_fee_amount: applicationFee,
                transfer_data: {
                    destination: stripeAccountId,
                },
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                organizerId,
                ...metadata
            }
        });

        res.json({
            sessionId: session.id,
            url: session.url
        });
    } catch (err) {
        console.error('Stripe checkout error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/payments/stripe/account-status
 * Check if user has connected Stripe and get account status
 */
router.get('/account-status', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        const user = await User.findById(userId);
        const stripeSettings = user?.paymentSettings?.stripe;

        if (!stripeSettings?.accountId) {
            return res.json({ connected: false });
        }

        // Get account details from Stripe
        const account = await stripe.accounts.retrieve(stripeSettings.accountId);

        res.json({
            connected: true,
            accountId: stripeSettings.accountId,
            livemode: stripeSettings.livemode,
            connectedAt: stripeSettings.connectedAt,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted
        });
    } catch (err) {
        console.error('Stripe account status error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/payments/stripe/verify-session
 * Verify Checkout Session and update sponsorship status
 */
router.get('/verify-session', async (req, res) => {
    const { sessionId } = req.query;

    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            const sponsorshipIds = session.metadata.sponsorshipIds ? JSON.parse(session.metadata.sponsorshipIds) : [];

            if (sponsorshipIds.length > 0) {
                // Update sponsorships to paid
                await Sponsorship.updateMany(
                    { _id: { $in: sponsorshipIds } },
                    {
                        $set: {
                            status: 'paid',
                            paymentId: session.payment_intent
                        }
                    }
                );
            }

            res.json({ verified: true, count: sponsorshipIds.length });
        } else {
            res.json({ verified: false, status: session.payment_status });
        }
    } catch (err) {
        console.error('Stripe verification error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
