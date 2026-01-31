const mongoose = require('mongoose');

const PublicContentSchema = new mongoose.Schema({
    id: String,
    type: String, // hero, text, cta, etc.
    variant: String, // For hero blocks: 'card' or 'full'
    title: String,
    body: String,
    imageUrl: String,
    imagePosition: String,
    alignment: String,
    buttonText: String,
    buttonAction: String, // For CTA: 'link' or 'contact'
    buttonLink: String,
    packageId: String,
    packageIds: [String],
    listStyle: String,
    overlayColor: String,
    overlayOpacity: Number,
    blurAmount: Number, // For hero image blur effect (0-20)
    showImages: Boolean,
    showBadge: Boolean, // For hero_standard
    badgeText: String, // For hero_standard
    stats: [{ value: String, label: String }]
}, { _id: false });

const UserSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Using Firebase UID as _id
    email: { type: String, required: true },
    firstName: String,
    lastName: String,
    teamName: String,
    slug: { type: String, unique: true, sparse: true }, // Custom URL handle for public page
    role: { type: String, default: 'organizer' }, // organizer, admin
    createdAt: { type: Date, default: Date.now },
    payoutMethod: String,
    balance: { type: Number, default: 0 },

    // embedded organization profile
    organizationProfile: {
        orgName: String,
        contactEmail: String,
        website: String, // Matched to frontend "website"
        logoUrl: String,
        primaryColor: String,
        description: String,
        heroSettings: {
            showBadge: { type: Boolean, default: true },
            badgeText: { type: String, default: 'Official Sponsorship Portal' },
            title: { type: String, default: 'Support Our Mission' }, // If empty, falls back to "Support [OrgName]"
            description: { type: String, default: 'Connect your brand with our community. Choose a package below to make an impact today.' }
        }
    },

    // embedded public content blocks
    publicContent: [PublicContentSchema],

    // Slack Integration Settings
    checkSettings: {
        enabled: { type: Boolean, default: false },
        payableTo: { type: String, default: '' },
        mailingAddress: { type: String, default: '' },
        instructions: { type: String, default: 'Please mail your check to the address above. Your sponsorship will be marked as paid once received.' }
    },
    slackSettings: {
        connected: { type: Boolean, default: false },
        teamName: String,
        teamId: String,
        accessToken: String, // Store securely in production
        incomingWebhook: {
            url: String,
            channel: String,
            configurationUrl: String
        }
    },

    // GitHub Integration (Automation)
    githubSettings: {
        connected: { type: Boolean, default: false },
        username: String,
        accessToken: String, // Store securely
        nodeId: String,
        connectedAt: Date
    },

    // Payment Gateway Settings
    paymentSettings: {
        sandboxMode: { type: Boolean, default: false }, // Sandbox Toggle
        activeGateway: String, // 'stripe' | 'square' | 'paypal' | null

        // Stripe Connect
        stripe: {
            accountId: String,        // acct_xxx
            accessToken: String,      // OAuth token
            refreshToken: String,
            livemode: Boolean,
            connectedAt: Date
        },

        // Square
        square: {
            merchantId: String,
            accessToken: String,
            refreshToken: String,
            expiresAt: Date,
            connectedAt: Date
        },

        // PayPal Commerce Platform
        paypal: {
            merchantId: String,
            trackingId: String,
            emailConfirmed: Boolean,
            paymentsReceivable: Boolean,
            connectedAt: Date
        }
    }
}, { _id: false }); // Disable auto-generation of _id since we provide it

module.exports = mongoose.model('User', UserSchema, 'fr_users');
