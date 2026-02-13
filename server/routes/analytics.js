const express = require('express');
const router = express.Router();
const Sponsorship = require('../models/Sponsorship');
const Package = require('../models/Package');
const User = require('../models/User');
const PageViewEvent = require('../models/PageViewEvent');
const FunnelDailyStat = require('../models/FunnelDailyStat');
const analyticsDataService = require('../services/analyticsDataService');

// ==========================================
// PAGE VIEW TRACKING (public, no auth)
// ==========================================

const VALID_PAGES = ['landing', 'review', 'auth', 'checkout', 'success', 'add_to_cart'];

// POST /api/analytics/track/page-view
router.post('/track/page-view', async (req, res) => {
    try {
        const { organizerId, page, sessionId, referrer, packageId, packageTitle, packagePrice } = req.body;
        if (!organizerId || !page || !VALID_PAGES.includes(page)) {
            return res.sendStatus(204);
        }

        // Insert raw event (include package data if present)
        const eventData = { organizerId, page, sessionId, referrer };
        if (packageId) { eventData.packageId = packageId; eventData.packageTitle = packageTitle; eventData.packagePrice = packagePrice; }
        PageViewEvent.create(eventData).catch(() => {});

        // Upsert daily stat
        const today = new Date().toISOString().split('T')[0];
        const update = { $inc: { [page]: 1 } };
        if (page === 'landing' && referrer) {
            update.$addToSet = { referrers: { $each: [referrer].slice(0, 1) } };
        }
        FunnelDailyStat.findOneAndUpdate(
            { organizerId, date: today },
            update,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).then(doc => {
            // Cap referrers at 50
            if (doc && doc.referrers && doc.referrers.length > 50) {
                FunnelDailyStat.updateOne(
                    { _id: doc._id },
                    { $set: { referrers: doc.referrers.slice(0, 50) } }
                ).catch(() => {});
            }
        }).catch(() => {});

        // Track package interaction for add_to_cart events
        if (page === 'add_to_cart' && packageId) {
            FunnelDailyStat.findOne({ organizerId, date: today }).then(doc => {
                if (!doc) return;
                const existing = (doc.packages || []).find(p => p.packageId === packageId);
                if (existing) {
                    FunnelDailyStat.updateOne(
                        { _id: doc._id, 'packages.packageId': packageId },
                        { $inc: { 'packages.$.addToCartCount': 1 } }
                    ).catch(() => {});
                } else if ((doc.packages || []).length < 50) {
                    FunnelDailyStat.updateOne(
                        { _id: doc._id },
                        { $push: { packages: { packageId, packageTitle, packagePrice, addToCartCount: 1 } } }
                    ).catch(() => {});
                }
            }).catch(() => {});
        }

        res.sendStatus(204);
    } catch (err) {
        // Silent — never break the page
        res.sendStatus(204);
    }
});

// ==========================================
// ORG OWNER ANALYTICS
// ==========================================

// GET /api/analytics/org/:orgId - Organization metrics
router.get('/org/:orgId', async (req, res) => {
    try {
        const { orgId } = req.params;
        const { period = '30d' } = req.query;
        const result = await analyticsDataService.getOrgOverview(orgId, period);
        res.json(result);
    } catch (err) {
        console.error('Analytics org error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/org/:orgId/trends - Time series data
router.get('/org/:orgId/trends', async (req, res) => {
    try {
        const { orgId } = req.params;
        const { period = '30d' } = req.query;
        const result = await analyticsDataService.getOrgTrends(orgId, period);
        res.json(result);
    } catch (err) {
        console.error('Analytics trends error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/org/:orgId/widget - Widget performance metrics
router.get('/org/:orgId/widget', async (req, res) => {
    try {
        const { orgId } = req.params;
        const { period = '30d' } = req.query;
        const result = await analyticsDataService.getWidgetMetrics(orgId, period);
        res.json(result);
    } catch (err) {
        console.error('Widget analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/org/:orgId/funnel - Funnel performance metrics
router.get('/org/:orgId/funnel', async (req, res) => {
    try {
        const { orgId } = req.params;
        const { period = '30d' } = req.query;
        const result = await analyticsDataService.getFunnelMetrics(orgId, period);
        res.json(result);
    } catch (err) {
        console.error('Funnel analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// ADMIN ANALYTICS (Platform-wide)
// ==========================================

// GET /api/analytics/admin - Platform-wide metrics
router.get('/admin', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const { start } = analyticsDataService.getDateRange(period);

        // Get all paid sponsorships
        const allSponsorships = await Sponsorship.find({
            status: { $in: ['paid', 'branding-submitted'] }
        });

        // Get all orgs (users)
        const allOrgs = await User.find({});

        // Platform totals
        const totalGMV = allSponsorships.reduce((sum, s) => sum + (s.amount || 0), 0);
        const totalSponsorships = allSponsorships.length;

        // This period
        const periodSponsorships = allSponsorships.filter(s =>
            new Date(s.createdAt) >= start
        );
        const periodRevenue = periodSponsorships.reduce((sum, s) => sum + (s.amount || 0), 0);

        // Org leaderboard
        const orgRevenue = {};
        allSponsorships.forEach(s => {
            if (!orgRevenue[s.organizerId]) {
                orgRevenue[s.organizerId] = { orgId: s.organizerId, revenue: 0, count: 0 };
            }
            orgRevenue[s.organizerId].revenue += s.amount || 0;
            orgRevenue[s.organizerId].count += 1;
        });

        const orgLeaderboard = Object.values(orgRevenue)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 20)
            .map(o => {
                const org = allOrgs.find(u => String(u._id) === String(o.orgId));
                return {
                    ...o,
                    orgName: org?.organizationProfile?.name || org?.email || 'Unknown'
                };
            });

        // Package popularity
        const packageCounts = {};
        allSponsorships.forEach(s => {
            packageCounts[s.packageId] = (packageCounts[s.packageId] || 0) + 1;
        });
        const allPackages = await Package.find({});
        const packagePopularity = Object.entries(packageCounts)
            .map(([pkgId, count]) => {
                const pkg = allPackages.find(p => String(p._id) === String(pkgId));
                return {
                    packageId: pkgId,
                    title: pkg?.title || 'Unknown',
                    count,
                    avgPrice: pkg?.price || 0
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        res.json({
            overview: {
                totalGMV,
                periodRevenue,
                totalSponsorships,
                periodSponsorships: periodSponsorships.length,
                totalOrgs: allOrgs.length,
                activeOrgs: Object.keys(orgRevenue).length
            },
            orgLeaderboard,
            packagePopularity
        });

    } catch (err) {
        console.error('Admin analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/admin/trends - Platform-wide trends
router.get('/admin/trends', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const { start } = analyticsDataService.getDateRange(period);

        const sponsorships = await Sponsorship.find({
            status: { $in: ['paid', 'branding-submitted'] },
            createdAt: { $gte: start }
        }).sort({ createdAt: 1 });

        // Group by day
        const dailyData = {};
        sponsorships.forEach(s => {
            const day = new Date(s.createdAt).toISOString().split('T')[0];
            if (!dailyData[day]) {
                dailyData[day] = { date: day, revenue: 0, count: 0 };
            }
            dailyData[day].revenue += s.amount || 0;
            dailyData[day].count += 1;
        });

        // Fill in missing days
        const result = [];
        const current = new Date(start);
        const end = new Date();
        while (current <= end) {
            const day = current.toISOString().split('T')[0];
            result.push(dailyData[day] || { date: day, revenue: 0, count: 0 });
            current.setDate(current.getDate() + 1);
        }

        res.json(result);

    } catch (err) {
        console.error('Admin trends error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
