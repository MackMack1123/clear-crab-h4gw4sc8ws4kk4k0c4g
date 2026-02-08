const express = require('express');
const router = express.Router();
const Sponsorship = require('../models/Sponsorship');
const Package = require('../models/Package');
const User = require('../models/User');
const PageViewEvent = require('../models/PageViewEvent');
const FunnelDailyStat = require('../models/FunnelDailyStat');

// Helper: Get date range based on period
function getDateRange(period = '30d') {
    const now = new Date();
    const ranges = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '12m': 365
    };
    const days = ranges[period] || 30;
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    return { start, end: now };
}

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
        const { start, end } = getDateRange(period);

        // Get all sponsorships for this org
        const sponsorships = await Sponsorship.find({
            organizerId: orgId,
            status: { $in: ['paid', 'branding-submitted'] }
        });

        // Get packages for this org
        const packages = await Package.find({ organizerId: orgId });

        // Calculate metrics
        const totalRevenue = sponsorships.reduce((sum, s) => sum + (s.amount || 0), 0);
        const sponsorshipCount = sponsorships.length;
        const avgValue = sponsorshipCount > 0 ? totalRevenue / sponsorshipCount : 0;

        // Revenue by package
        const packageStats = packages.map(pkg => {
            const pkgSponsorships = sponsorships.filter(s => s.packageId === pkg._id);
            return {
                id: pkg._id,
                title: pkg.title,
                price: pkg.price,
                count: pkgSponsorships.length,
                revenue: pkgSponsorships.reduce((sum, s) => sum + (s.amount || 0), 0)
            };
        }).sort((a, b) => b.revenue - a.revenue);

        // Top sponsors
        const sponsorMap = {};
        sponsorships.forEach(s => {
            const key = s.sponsorEmail || s.sponsorName;
            if (!sponsorMap[key]) {
                sponsorMap[key] = {
                    name: s.sponsorName,
                    email: s.sponsorEmail,
                    totalAmount: 0,
                    count: 0
                };
            }
            sponsorMap[key].totalAmount += s.amount || 0;
            sponsorMap[key].count += 1;
        });
        const topSponsors = Object.values(sponsorMap)
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 10);

        // This period vs last period comparison
        const periodSponsorships = sponsorships.filter(s =>
            new Date(s.createdAt) >= start && new Date(s.createdAt) <= end
        );
        const thisPeriodRevenue = periodSponsorships.reduce((sum, s) => sum + (s.amount || 0), 0);

        // Recent activity (last 10)
        const recentActivity = sponsorships
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10)
            .map(s => ({
                id: s._id,
                sponsorName: s.sponsorName,
                amount: s.amount,
                packageId: s.packageId,
                status: s.status,
                date: s.createdAt
            }));

        res.json({
            overview: {
                totalRevenue,
                thisPeriodRevenue,
                sponsorshipCount,
                avgValue,
                packageCount: packages.length
            },
            packageStats,
            topSponsors,
            recentActivity
        });

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
        const { start } = getDateRange(period);

        const sponsorships = await Sponsorship.find({
            organizerId: orgId,
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
        console.error('Analytics trends error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/org/:orgId/widget - Widget performance metrics
router.get('/org/:orgId/widget', async (req, res) => {
    try {
        const { orgId } = req.params;
        const { period = '30d' } = req.query;
        const { start } = getDateRange(period);
        const startDate = start.toISOString().split('T')[0];

        const WidgetDailyStat = require('../models/WidgetDailyStat');

        const dailyStats = await WidgetDailyStat.find({
            organizerId: orgId,
            date: { $gte: startDate }
        }).sort({ date: 1 }).lean();

        if (dailyStats.length === 0) {
            return res.json({
                overview: { totalImpressions: 0, totalClicks: 0, clickThroughRate: 0, uniqueReferrers: 0 },
                trends: [],
                topSponsorsClicked: [],
                topReferrers: []
            });
        }

        // Aggregate totals
        let totalImpressions = 0;
        let totalClicks = 0;
        const referrerCounts = {};
        const sponsorClickMap = {};

        dailyStats.forEach(day => {
            totalImpressions += day.impressions || 0;
            totalClicks += day.clicks || 0;

            // Collect referrers
            (day.referrers || []).forEach(r => {
                referrerCounts[r] = (referrerCounts[r] || 0) + (day.impressions || 1);
            });

            // Aggregate sponsor clicks
            (day.sponsorClicks || []).forEach(sc => {
                if (!sc.sponsorshipId) return;
                if (!sponsorClickMap[sc.sponsorshipId]) {
                    sponsorClickMap[sc.sponsorshipId] = { sponsorshipId: sc.sponsorshipId, sponsorName: sc.sponsorName, clicks: 0 };
                }
                sponsorClickMap[sc.sponsorshipId].clicks += sc.clicks || 0;
            });
        });

        const clickThroughRate = totalImpressions > 0
            ? Math.round((totalClicks / totalImpressions) * 10000) / 100
            : 0;

        // Build trends (fill missing days)
        const trends = [];
        const current = new Date(start);
        const end = new Date();
        const dailyMap = {};
        dailyStats.forEach(d => { dailyMap[d.date] = d; });

        while (current <= end) {
            const dayStr = current.toISOString().split('T')[0];
            const stat = dailyMap[dayStr];
            trends.push({
                date: dayStr,
                impressions: stat?.impressions || 0,
                clicks: stat?.clicks || 0
            });
            current.setDate(current.getDate() + 1);
        }

        // Top sponsors by clicks
        const topSponsorsClicked = Object.values(sponsorClickMap)
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10);

        // Top referrers
        const topReferrers = Object.entries(referrerCounts)
            .map(([url, count]) => ({ url, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const uniqueReferrers = new Set();
        dailyStats.forEach(d => (d.referrers || []).forEach(r => uniqueReferrers.add(r)));

        res.json({
            overview: {
                totalImpressions,
                totalClicks,
                clickThroughRate,
                uniqueReferrers: uniqueReferrers.size
            },
            trends,
            topSponsorsClicked,
            topReferrers
        });

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
        const { start } = getDateRange(period);
        const startDate = start.toISOString().split('T')[0];

        const dailyStats = await FunnelDailyStat.find({
            organizerId: orgId,
            date: { $gte: startDate }
        }).sort({ date: 1 }).lean();

        if (dailyStats.length === 0) {
            return res.json({
                overview: {
                    landing: 0, addToCart: 0, review: 0, checkout: 0, success: 0,
                    landingToAddToCart: 0, addToCartToReview: 0, reviewToCheckout: 0, checkoutToSuccess: 0, overallConversion: 0
                },
                trends: [],
                topReferrers: [],
                topPackages: []
            });
        }

        // Aggregate totals
        let landing = 0, addToCart = 0, review = 0, checkout = 0, success = 0;
        const referrerCounts = {};
        const packageMap = {};

        dailyStats.forEach(day => {
            landing += day.landing || 0;
            addToCart += day.add_to_cart || 0;
            review += day.review || 0;
            checkout += day.checkout || 0;
            success += day.success || 0;

            (day.referrers || []).forEach(r => {
                referrerCounts[r] = (referrerCounts[r] || 0) + 1;
            });

            (day.packages || []).forEach(p => {
                if (!p.packageId) return;
                if (!packageMap[p.packageId]) {
                    packageMap[p.packageId] = { packageId: p.packageId, packageTitle: p.packageTitle, packagePrice: p.packagePrice, addToCartCount: 0 };
                }
                packageMap[p.packageId].addToCartCount += p.addToCartCount || 0;
            });
        });

        const landingToAddToCart = landing > 0 ? Math.round((addToCart / landing) * 1000) / 10 : 0;
        const addToCartToReview = addToCart > 0 ? Math.round((review / addToCart) * 1000) / 10 : 0;
        const reviewToCheckout = review > 0 ? Math.round((checkout / review) * 1000) / 10 : 0;
        const checkoutToSuccess = checkout > 0 ? Math.round((success / checkout) * 1000) / 10 : 0;
        const overallConversion = landing > 0 ? Math.round((success / landing) * 1000) / 10 : 0;

        // Build trends (fill missing days)
        const trends = [];
        const current = new Date(start);
        const end = new Date();
        const dailyMap = {};
        dailyStats.forEach(d => { dailyMap[d.date] = d; });

        while (current <= end) {
            const dayStr = current.toISOString().split('T')[0];
            const stat = dailyMap[dayStr];
            trends.push({
                date: dayStr,
                landing: stat?.landing || 0,
                addToCart: stat?.add_to_cart || 0,
                review: stat?.review || 0,
                checkout: stat?.checkout || 0,
                success: stat?.success || 0
            });
            current.setDate(current.getDate() + 1);
        }

        // Top referrers
        const topReferrers = Object.entries(referrerCounts)
            .map(([url, count]) => ({ url, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Top packages by add-to-cart
        const topPackages = Object.values(packageMap)
            .sort((a, b) => b.addToCartCount - a.addToCartCount)
            .slice(0, 10);

        res.json({
            overview: {
                landing, addToCart, review, checkout, success,
                landingToAddToCart, addToCartToReview, reviewToCheckout, checkoutToSuccess, overallConversion
            },
            trends,
            topReferrers,
            topPackages
        });

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
        const { start } = getDateRange(period);

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
        const { start } = getDateRange(period);

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
