const Sponsorship = require('../models/Sponsorship');
const Package = require('../models/Package');
const FunnelDailyStat = require('../models/FunnelDailyStat');
const PageViewEvent = require('../models/PageViewEvent');

/**
 * Get date range based on period string
 */
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

/**
 * Get organization overview metrics
 * Returns { overview, packageStats, topSponsors, recentActivity }
 */
async function getOrgOverview(orgId, period = '30d') {
    const { start, end } = getDateRange(period);

    const sponsorships = await Sponsorship.find({
        organizerId: orgId,
        status: { $in: ['paid', 'branding-submitted'] }
    });

    const packages = await Package.find({ organizerId: orgId });

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
            sponsorMap[key] = { name: s.sponsorName, email: s.sponsorEmail, totalAmount: 0, count: 0 };
        }
        sponsorMap[key].totalAmount += s.amount || 0;
        sponsorMap[key].count += 1;
    });
    const topSponsors = Object.values(sponsorMap)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10);

    // This period
    const periodSponsorships = sponsorships.filter(s =>
        new Date(s.createdAt) >= start && new Date(s.createdAt) <= end
    );
    const thisPeriodRevenue = periodSponsorships.reduce((sum, s) => sum + (s.amount || 0), 0);

    // Recent activity
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

    return {
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
    };
}

/**
 * Get org revenue trends (daily data)
 */
async function getOrgTrends(orgId, period = '30d') {
    const { start } = getDateRange(period);

    const sponsorships = await Sponsorship.find({
        organizerId: orgId,
        status: { $in: ['paid', 'branding-submitted'] },
        createdAt: { $gte: start }
    }).sort({ createdAt: 1 });

    const dailyData = {};
    sponsorships.forEach(s => {
        const day = new Date(s.createdAt).toISOString().split('T')[0];
        if (!dailyData[day]) {
            dailyData[day] = { date: day, revenue: 0, count: 0 };
        }
        dailyData[day].revenue += s.amount || 0;
        dailyData[day].count += 1;
    });

    const result = [];
    const current = new Date(start);
    const end = new Date();
    while (current <= end) {
        const day = current.toISOString().split('T')[0];
        result.push(dailyData[day] || { date: day, revenue: 0, count: 0 });
        current.setDate(current.getDate() + 1);
    }

    return result;
}

/**
 * Get widget performance metrics
 */
async function getWidgetMetrics(orgId, period = '30d') {
    const { start } = getDateRange(period);
    const startDate = start.toISOString().split('T')[0];
    const WidgetDailyStat = require('../models/WidgetDailyStat');

    const dailyStats = await WidgetDailyStat.find({
        organizerId: orgId,
        date: { $gte: startDate }
    }).sort({ date: 1 }).lean();

    if (dailyStats.length === 0) {
        return {
            overview: { totalImpressions: 0, totalClicks: 0, clickThroughRate: 0, uniqueReferrers: 0 },
            trends: [],
            topSponsorsClicked: [],
            topReferrers: []
        };
    }

    let totalImpressions = 0;
    let totalClicks = 0;
    const referrerCounts = {};
    const sponsorClickMap = {};

    dailyStats.forEach(day => {
        totalImpressions += day.impressions || 0;
        totalClicks += day.clicks || 0;
        (day.referrers || []).forEach(r => {
            referrerCounts[r] = (referrerCounts[r] || 0) + (day.impressions || 1);
        });
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

    const trends = [];
    const current = new Date(start);
    const end = new Date();
    const dailyMap = {};
    dailyStats.forEach(d => { dailyMap[d.date] = d; });
    while (current <= end) {
        const dayStr = current.toISOString().split('T')[0];
        const stat = dailyMap[dayStr];
        trends.push({ date: dayStr, impressions: stat?.impressions || 0, clicks: stat?.clicks || 0 });
        current.setDate(current.getDate() + 1);
    }

    const topSponsorsClicked = Object.values(sponsorClickMap)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);

    const topReferrers = Object.entries(referrerCounts)
        .map(([url, count]) => ({ url, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const uniqueReferrers = new Set();
    dailyStats.forEach(d => (d.referrers || []).forEach(r => uniqueReferrers.add(r)));

    return {
        overview: { totalImpressions, totalClicks, clickThroughRate, uniqueReferrers: uniqueReferrers.size },
        trends,
        topSponsorsClicked,
        topReferrers
    };
}

/**
 * Get funnel performance metrics
 * Overview uses distinct sessions (via PageViewEvent aggregation).
 * Trends/referrers/packages still use FunnelDailyStat for speed.
 */
async function getFunnelMetrics(orgId, period = '30d') {
    const { start } = getDateRange(period);
    const startDate = start.toISOString().split('T')[0];

    // --- Overview: distinct sessions from PageViewEvent ---
    const distinctCounts = await PageViewEvent.aggregate([
        {
            $match: {
                organizerId: orgId,
                timestamp: { $gte: start },
                sessionId: { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: { page: '$page', sessionId: '$sessionId' }
            }
        },
        {
            $group: {
                _id: '$_id.page',
                uniqueSessions: { $sum: 1 }
            }
        }
    ]);

    const sessionMap = {};
    distinctCounts.forEach(d => { sessionMap[d._id] = d.uniqueSessions; });

    const landing = sessionMap['landing'] || 0;
    const addToCart = sessionMap['add_to_cart'] || 0;
    const review = sessionMap['review'] || 0;
    const checkout = sessionMap['checkout'] || 0;
    const success = sessionMap['success'] || 0;

    if (landing === 0 && addToCart === 0 && review === 0 && checkout === 0 && success === 0) {
        return {
            overview: {
                landing: 0, addToCart: 0, review: 0, checkout: 0, success: 0,
                landingToAddToCart: 0, addToCartToReview: 0, reviewToCheckout: 0, checkoutToSuccess: 0, overallConversion: 0
            },
            trends: [],
            topReferrers: [],
            topPackages: []
        };
    }

    const pct = (num, den) => den > 0 ? Math.min(Math.round((num / den) * 1000) / 10, 100) : 0;
    const landingToAddToCart = pct(addToCart, landing);
    const addToCartToReview = pct(review, addToCart);
    const reviewToCheckout = pct(checkout, review);
    const checkoutToSuccess = pct(success, checkout);
    const overallConversion = pct(success, landing);

    // --- Trends / referrers / packages: from FunnelDailyStat (fast) ---
    const dailyStats = await FunnelDailyStat.find({
        organizerId: orgId,
        date: { $gte: startDate }
    }).sort({ date: 1 }).lean();

    const referrerCounts = {};
    const packageMap = {};

    dailyStats.forEach(day => {
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

    const topReferrers = Object.entries(referrerCounts)
        .map(([url, count]) => ({ url, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const topPackages = Object.values(packageMap)
        .sort((a, b) => b.addToCartCount - a.addToCartCount)
        .slice(0, 10);

    return {
        overview: {
            landing, addToCart, review, checkout, success,
            landingToAddToCart, addToCartToReview, reviewToCheckout, checkoutToSuccess, overallConversion
        },
        trends,
        topReferrers,
        topPackages
    };
}

module.exports = {
    getDateRange,
    getOrgOverview,
    getOrgTrends,
    getWidgetMetrics,
    getFunnelMetrics
};
