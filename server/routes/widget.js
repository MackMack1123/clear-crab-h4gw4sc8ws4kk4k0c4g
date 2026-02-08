const express = require('express');
const router = express.Router();
const Sponsorship = require('../models/Sponsorship');
const Package = require('../models/Package');
const User = require('../models/User');
const WidgetEvent = require('../models/WidgetEvent');
const WidgetDailyStat = require('../models/WidgetDailyStat');

// ========================================
// PUBLIC WIDGET API ENDPOINTS
// These endpoints are intentionally public (no auth)
// to allow embedding on external websites
// ========================================

/**
 * GET /api/widget/sponsors/:organizerId
 * Returns sponsors for widget display
 *
 * Query params:
 * - maxSponsors: number (default: 20)
 * - requireLogo: boolean (default: true)
 * - sortBy: 'tier' | 'recent' | 'alphabetical' (default: 'tier')
 */
router.get('/sponsors/:organizerId', async (req, res) => {
    try {
        const { organizerId } = req.params;
        const {
            maxSponsors = 20,
            requireLogo = 'true',
            sortBy = 'tier'
        } = req.query;

        // Get organization info
        const org = await User.findById(organizerId)
            .select('organizationProfile')
            .lean();

        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Build query for active sponsors
        const query = {
            organizerId,
            status: { $in: ['paid', 'branding-submitted'] }
        };

        // Only include sponsors with logos if required
        if (requireLogo === 'true') {
            query['branding.logoUrl'] = { $exists: true, $ne: null, $ne: '' };
        }

        // Get sponsorships
        let sponsorships = await Sponsorship.find(query)
            .select('_id sponsorName sponsorInfo branding amount packageId createdAt')
            .limit(parseInt(maxSponsors))
            .lean();

        // Get package info for tier names
        const packageIds = [...new Set(sponsorships.map(s => s.packageId))];
        const packages = await Package.find({ _id: { $in: packageIds } })
            .select('_id title price')
            .lean();

        const packageMap = packages.reduce((acc, pkg) => {
            acc[pkg._id] = pkg;
            return acc;
        }, {});

        // Transform and sort sponsors
        let sponsors = sponsorships.map(s => {
            const pkg = packageMap[s.packageId];
            return {
                id: s._id,
                name: s.sponsorInfo?.companyName || s.sponsorName,
                logo: s.branding?.logoUrl,
                tagline: s.branding?.tagline || s.sponsorInfo?.adMessage,
                website: s.sponsorInfo?.showPublicWebsite ? (s.sponsorInfo?.publicWebsite || s.branding?.websiteUrl) : null,
                email: s.sponsorInfo?.showPublicEmail ? (s.sponsorInfo?.publicEmail) : null,
                phone: s.sponsorInfo?.showPublicPhone ? (s.sponsorInfo?.publicPhone) : null,
                tier: pkg?.title || 'Sponsor',
                tierPriority: pkg?.price || 0,
                createdAt: s.createdAt
            };
        });

        // Deduplicate: if a sponsor bought multiple packages, show them once with highest tier
        const deduped = {};
        sponsors.forEach(s => {
            const key = (s.name || '').toLowerCase().trim();
            if (!deduped[key] || s.tierPriority > deduped[key].tierPriority) {
                deduped[key] = s;
            }
        });
        sponsors = Object.values(deduped);

        // Sort sponsors
        if (sortBy === 'tier') {
            sponsors.sort((a, b) => b.tierPriority - a.tierPriority);
        } else if (sortBy === 'recent') {
            sponsors.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sortBy === 'alphabetical') {
            sponsors.sort((a, b) => a.name.localeCompare(b.name));
        }

        res.json({
            organization: {
                id: organizerId,
                name: org.organizationProfile?.orgName || 'Organization',
                slug: org.organizationProfile?.slug,
                primaryColor: org.organizationProfile?.primaryColor || '#7c3aed',
                logo: org.organizationProfile?.logoUrl
            },
            sponsors,
            total: sponsors.length
        });
    } catch (error) {
        console.error('Widget Sponsors Error:', error);
        res.status(500).json({ error: 'Failed to fetch sponsors' });
    }
});

/**
 * GET /api/widget/config/:organizerId
 * Returns organization branding for widget styling
 */
router.get('/config/:organizerId', async (req, res) => {
    try {
        const { organizerId } = req.params;

        const org = await User.findById(organizerId)
            .select('organizationProfile')
            .lean();

        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        res.json({
            id: organizerId,
            name: org.organizationProfile?.orgName || 'Organization',
            slug: org.organizationProfile?.slug,
            logo: org.organizationProfile?.logoUrl,
            primaryColor: org.organizationProfile?.primaryColor || '#7c3aed',
            description: org.organizationProfile?.description,
            website: org.organizationProfile?.website
        });
    } catch (error) {
        console.error('Widget Config Error:', error);
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

/**
 * GET /api/widget/sponsor/:sponsorshipId
 * Returns single sponsor profile for public display
 */
router.get('/sponsor/:sponsorshipId', async (req, res) => {
    try {
        const { sponsorshipId } = req.params;

        const sponsorship = await Sponsorship.findById(sponsorshipId)
            .select('_id sponsorName sponsorInfo branding amount packageId organizerId status')
            .lean();

        if (!sponsorship) {
            return res.status(404).json({ error: 'Sponsor not found' });
        }

        // Only show paid/branding-submitted sponsors
        if (!['paid', 'branding-submitted'].includes(sponsorship.status)) {
            return res.status(404).json({ error: 'Sponsor not found' });
        }

        // Get package info for tier name
        const pkg = await Package.findById(sponsorship.packageId)
            .select('title price')
            .lean();

        // Get organization info
        const org = await User.findById(sponsorship.organizerId)
            .select('organizationProfile')
            .lean();

        res.json({
            id: sponsorship._id,
            name: sponsorship.sponsorInfo?.companyName || sponsorship.sponsorName,
            logo: sponsorship.branding?.logoUrl,
            tagline: sponsorship.branding?.tagline || sponsorship.sponsorInfo?.adMessage,
            website: sponsorship.sponsorInfo?.showPublicWebsite ? (sponsorship.sponsorInfo?.publicWebsite || sponsorship.branding?.websiteUrl) : null,
            email: sponsorship.sponsorInfo?.showPublicEmail ? (sponsorship.sponsorInfo?.publicEmail) : null,
            phone: sponsorship.sponsorInfo?.showPublicPhone ? (sponsorship.sponsorInfo?.publicPhone) : null,
            tier: pkg?.title || 'Sponsor',
            organization: {
                id: sponsorship.organizerId,
                name: org?.organizationProfile?.orgName || 'Organization',
                slug: org?.organizationProfile?.slug,
                logo: org?.organizationProfile?.logoUrl,
                sponsorshipUrl: org?.organizationProfile?.slug
                    ? `https://getfundraisr.io/org/${org.organizationProfile.slug}`
                    : `https://getfundraisr.io/org/${sponsorship.organizerId}`
            }
        });
    } catch (error) {
        console.error('Widget Sponsor Profile Error:', error);
        res.status(500).json({ error: 'Failed to fetch sponsor profile' });
    }
});

/**
 * GET /api/widget/packages/:organizerId
 * Returns active packages for widget display, with page builder blocks and org branding
 */
router.get('/packages/:organizerId', async (req, res) => {
    try {
        const { organizerId } = req.params;

        // Get organization info + page builder config
        const org = await User.findById(organizerId)
            .select('organizationProfile publicContent slug')
            .lean();

        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Get active packages sorted by price ascending
        const packages = await Package.find({ organizerId, active: { $ne: false } })
            .sort({ price: 1 })
            .lean();

        // Transform packages
        const transformedPackages = packages.map(pkg => ({
            id: pkg._id,
            title: pkg.title,
            price: pkg.price,
            description: pkg.description,
            features: pkg.features || [],
            imageUrl: pkg.imageUrl
        }));

        // Extract package blocks from publicContent
        const packageBlocks = (org.publicContent || [])
            .filter(block => block.type && block.type.startsWith('package_'))
            .map(block => {
                const out = { type: block.type };
                if (block.packageId) out.packageId = block.packageId;
                if (block.packageIds) out.packageIds = block.packageIds;
                if (block.title) out.title = block.title;
                if (block.showImages !== undefined) out.showImages = block.showImages;
                if (block.listStyle) out.listStyle = block.listStyle;
                return out;
            });

        const slug = org.slug || org.organizationProfile?.slug;

        res.json({
            organization: {
                id: organizerId,
                name: org.organizationProfile?.orgName || 'Organization',
                slug,
                primaryColor: org.organizationProfile?.primaryColor || '#7c3aed',
                logo: org.organizationProfile?.logoUrl
            },
            packages: transformedPackages,
            packageBlocks,
            total: transformedPackages.length
        });
    } catch (error) {
        console.error('Widget Packages Error:', error);
        res.status(500).json({ error: 'Failed to fetch packages' });
    }
});

// ========================================
// WIDGET TRACKING ENDPOINTS
// Public (no auth) — fire-and-forget analytics
// ========================================

/**
 * POST /api/widget/track/impression
 * Track a widget load/view
 */
router.post('/track/impression', async (req, res) => {
    try {
        const { organizerId, widgetType, referrer } = req.body;
        if (!organizerId) return res.sendStatus(400);

        const today = new Date().toISOString().split('T')[0];

        // Fire both writes concurrently
        await Promise.all([
            WidgetEvent.create({
                organizerId,
                eventType: 'impression',
                widgetType,
                referrer
            }),
            WidgetDailyStat.findOneAndUpdate(
                { organizerId, date: today },
                {
                    $inc: { impressions: 1 },
                    $addToSet: { referrers: { $each: referrer ? [referrer] : [] } }
                },
                { upsert: true }
            ).then(async (doc) => {
                // Cap referrers at 50
                if (doc && doc.referrers && doc.referrers.length > 50) {
                    await WidgetDailyStat.updateOne(
                        { organizerId, date: today },
                        { $push: { referrers: { $each: [], $slice: -50 } } }
                    );
                }
            })
        ]);

        res.sendStatus(204);
    } catch (error) {
        // Silently handle — never break widget
        console.error('Widget impression tracking error:', error.message);
        res.sendStatus(204);
    }
});

/**
 * POST /api/widget/track/click
 * Track a sponsor click in the widget
 */
router.post('/track/click', async (req, res) => {
    try {
        const { organizerId, sponsorshipId, sponsorName, widgetType, referrer } = req.body;
        if (!organizerId) return res.sendStatus(400);

        const today = new Date().toISOString().split('T')[0];

        // Fire both writes concurrently
        await Promise.all([
            WidgetEvent.create({
                organizerId,
                eventType: 'click',
                sponsorshipId,
                sponsorName,
                widgetType,
                referrer
            }),
            (async () => {
                // Increment daily click count
                await WidgetDailyStat.findOneAndUpdate(
                    { organizerId, date: today },
                    {
                        $inc: { clicks: 1 },
                        $addToSet: { referrers: { $each: referrer ? [referrer] : [] } }
                    },
                    { upsert: true }
                );

                // Upsert sponsor click count in the sub-array
                const updated = await WidgetDailyStat.updateOne(
                    { organizerId, date: today, 'sponsorClicks.sponsorshipId': sponsorshipId },
                    { $inc: { 'sponsorClicks.$.clicks': 1 } }
                );

                if (updated.matchedCount === 0 && sponsorshipId) {
                    await WidgetDailyStat.updateOne(
                        { organizerId, date: today },
                        { $push: { sponsorClicks: { sponsorshipId, sponsorName, clicks: 1 } } }
                    );
                }
            })()
        ]);

        res.sendStatus(204);
    } catch (error) {
        console.error('Widget click tracking error:', error.message);
        res.sendStatus(204);
    }
});

module.exports = router;
