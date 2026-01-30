const express = require('express');
const router = express.Router();
const Sponsorship = require('../models/Sponsorship');
const Package = require('../models/Package');
const User = require('../models/User');

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
                const org = allOrgs.find(u => u._id === o.orgId);
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
                const pkg = allPackages.find(p => p._id === pkgId);
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
