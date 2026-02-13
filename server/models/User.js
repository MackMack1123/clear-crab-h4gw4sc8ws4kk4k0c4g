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
    stats: [{ value: String, label: String }],
    showTiers: Boolean, // For sponsor_wall: group by tier
    layout: String, // For sponsor_wall: 'grid' or 'tiered'
    maxSponsors: Number // For sponsor_wall: limit displayed sponsors
}, { _id: false });

const UserSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Using Firebase UID as _id
    email: { type: String, required: true, unique: true, lowercase: true },
    firstName: String,
    lastName: String,
    teamName: String,
    // slug moved to organizationProfile
    // Support both legacy single role and new multi-role system
    role: { type: String, default: 'organizer' }, // Legacy: organizer, admin, sponsor
    roles: { type: [String], default: [] }, // Multi-role: ['organizer', 'sponsor', 'admin']
    createdAt: { type: Date, default: Date.now },
    payoutMethod: String,
    balance: { type: Number, default: 0 },

    // embedded organization profile
    organizationProfile: {
        orgName: String,
        slug: { type: String, unique: true, sparse: true }, // Public handle for this organization
        contactEmail: String,
        website: String, // Matched to frontend "website"
        logoUrl: String,
        primaryColor: String,
        description: String,
        divisions: [String], // League divisions (e.g. "U8", "U10", "U12")
        waiveFees: { type: Boolean, default: false }, // Admin override to waive fees
        enableFundraising: { type: Boolean, default: true }, // Feature toggle for fundraising tabs
        heroSettings: {
            showBadge: { type: Boolean, default: true },
            badgeText: { type: String, default: 'Official Sponsorship Portal' },
            title: { type: String, default: 'Support Our Mission' }, // If empty, falls back to "Support [OrgName]"
            description: { type: String, default: 'Connect your brand with our community. Choose a package below to make an impact today.' }
        },
        emailTemplates: {
            // Transactional: Payment Success
            sponsorship_confirmation: {
                trigger: { type: String, default: "Sent immediately to the sponsor after a successful checkout." },
                subject: { type: String, default: 'Confirmation: Your sponsorship for {{orgName}}' },
                body: { type: String, default: '<p>Dear {{donorName}},</p><p>Thank you for becoming a sponsor of <strong>{{orgName}}</strong>!</p><p>We have successfully received your payment of <strong>{{amount}}</strong>.</p><p><strong>Important Next Steps:</strong><br>If you haven\'t already, please upload your high-resolution logo and complete your branding profile so we can feature you immediately.</p><p><a href="{{portalUrl}}" style="background-color: {{primaryColor}}; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Sponsor Portal</a></p>' },
                enabled: { type: Boolean, default: true }
            },
            // Reminder: Assets Missing
            assets_needed: {
                trigger: { type: String, default: "Sent automatically if a sponsor has not uploaded their logo/assets within 24 hours." },
                subject: { type: String, default: 'Action Required: We need your logo for {{orgName}}' },
                body: { type: String, default: '<p>Hi {{contactName}},</p><p>Thanks again for your sponsorship!</p><p>We noticed you haven\'t uploaded your brand assets yet. To ensure we can print your materials and feature you on our site, please upload your high-res logo as soon as possible.</p><p><a href="{{portalUrl}}" style="background-color: {{primaryColor}}; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Upload Assets Now</a></p>' },
                enabled: { type: Boolean, default: true }
            },
            // Notification: Admin Approved
            sponsorship_approved: {
                trigger: { type: String, default: "Sent when an organization admin reviews and approves the sponsorship assets." },
                subject: { type: String, default: 'You are live! Sponsorship approved for {{orgName}}' },
                body: { type: String, default: '<p>Great news, {{donorName}}!</p><p>Your sponsorship has been reviewed and approved by the team at <strong>{{orgName}}</strong>.</p><p>Your brand is now visible on our campaign page.</p>' },
                enabled: { type: Boolean, default: true }
            }
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

    // Scheduled analytics report settings
    reportSchedule: {
        enabled: { type: Boolean, default: false },
        frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'], default: 'weekly' },
        dayOfWeek: { type: Number, min: 0, max: 6, default: 1 }, // 0=Sun, 1=Mon
        hour: { type: Number, min: 0, max: 23, default: 9 }, // UTC hour
        period: { type: String, enum: ['7d', '30d', '90d'], default: '30d' },
        lastSentAt: Date
    },

    // GitHub Integration (Automation)
    githubSettings: {
        connected: { type: Boolean, default: false },
        username: String,
        accessToken: String, // Store securely
        nodeId: String,
        connectedAt: Date
    },

    // Team members of this organization
    teamMembers: [{
        memberId: String,        // Firebase UID
        email: String,
        role: { type: String, enum: ['manager', 'member'] },
        joinedAt: Date,
        invitedBy: String,
        status: { type: String, enum: ['active', 'removed'], default: 'active' }
    }],

    // Pending invitations
    teamInvitations: [{
        id: String,
        email: String,
        role: { type: String, enum: ['manager', 'member'] },
        token: String,           // Secure invite link token
        invitedBy: String,
        invitedByName: String,
        expiresAt: Date,
        createdAt: Date,
        status: { type: String, enum: ['pending', 'accepted', 'declined', 'expired'], default: 'pending' }
    }],

    // Organizations this user is a member of (not owner)
    memberOf: [{
        organizationId: String,  // Firebase UID of org owner
        orgName: String,
        role: { type: String, enum: ['manager', 'member'] },
        joinedAt: Date
    }],

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
            mainLocationId: String,
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
