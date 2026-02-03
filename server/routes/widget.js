const express = require('express');
const router = express.Router();
const Sponsorship = require('../models/Sponsorship');
const Package = require('../models/Package');
const User = require('../models/User');

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
                website: s.branding?.websiteUrl,
                tier: pkg?.title || 'Sponsor',
                tierPriority: pkg?.price || 0,
                createdAt: s.createdAt
            };
        });

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
            website: sponsorship.branding?.websiteUrl,
            email: sponsorship.sponsorInfo?.publicEmail || null, // Only include if sponsor opted to display
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

module.exports = router;
