const express = require('express');
const router = express.Router();
const User = require('../models/User');
const analyticsDataService = require('../services/analyticsDataService');
const { generateAndSaveReport } = require('../services/analyticsReportService');
const slackService = require('../services/slackService');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// POST /api/analytics/org/:orgId/report - Generate report image
router.post('/org/:orgId/report', async (req, res) => {
    try {
        const { orgId } = req.params;
        const { period = '30d' } = req.body;

        const user = await User.findById(orgId).lean();
        if (!user) return res.status(404).json({ error: 'Organization not found' });

        const orgName = user.organizationProfile?.orgName || 'Organization';

        // Gather analytics data
        const [overview, funnelData] = await Promise.all([
            analyticsDataService.getOrgOverview(orgId, period),
            analyticsDataService.getFunnelMetrics(orgId, period).catch(() => null)
        ]);

        const { filename } = await generateAndSaveReport(orgId, {
            orgName,
            period,
            overview: overview.overview,
            packageStats: overview.packageStats,
            topSponsors: overview.topSponsors,
            funnelOverview: funnelData?.overview || null
        });

        const imageUrl = `${API_BASE_URL}/uploads/reports/${filename}`;
        res.json({ imageUrl, filename });
    } catch (err) {
        console.error('Report generation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/analytics/org/:orgId/report/slack - Generate + send to Slack
router.post('/org/:orgId/report/slack', async (req, res) => {
    try {
        const { orgId } = req.params;
        const { period = '30d' } = req.body;

        const user = await User.findById(orgId).lean();
        if (!user) return res.status(404).json({ error: 'Organization not found' });

        if (!user.slackSettings?.connected || !user.slackSettings?.incomingWebhook?.url) {
            return res.status(400).json({ error: 'Slack is not connected' });
        }

        const orgName = user.organizationProfile?.orgName || 'Organization';
        const webhookUrl = user.slackSettings.incomingWebhook.url;

        // Gather analytics data
        const [overview, funnelData] = await Promise.all([
            analyticsDataService.getOrgOverview(orgId, period),
            analyticsDataService.getFunnelMetrics(orgId, period).catch(() => null)
        ]);

        const { filename } = await generateAndSaveReport(orgId, {
            orgName,
            period,
            overview: overview.overview,
            packageStats: overview.packageStats,
            topSponsors: overview.topSponsors,
            funnelOverview: funnelData?.overview || null
        });

        const imageUrl = `${API_BASE_URL}/uploads/reports/${filename}`;

        // Send to Slack
        await slackService.sendAnalyticsReport(webhookUrl, orgName, imageUrl, {
            ...overview.overview,
            period
        });

        res.json({ success: true, imageUrl });
    } catch (err) {
        console.error('Slack report error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/org/:orgId/report/schedule - Get schedule settings
router.get('/org/:orgId/report/schedule', async (req, res) => {
    try {
        const { orgId } = req.params;
        const user = await User.findById(orgId, 'reportSchedule slackSettings.connected').lean();
        if (!user) return res.status(404).json({ error: 'Organization not found' });

        res.json({
            schedule: user.reportSchedule || {
                enabled: false,
                frequency: 'weekly',
                dayOfWeek: 1,
                hour: 9,
                period: '30d',
                lastSentAt: null
            },
            slackConnected: !!user.slackSettings?.connected
        });
    } catch (err) {
        console.error('Get schedule error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/analytics/org/:orgId/report/schedule - Update schedule
router.put('/org/:orgId/report/schedule', async (req, res) => {
    try {
        const { orgId } = req.params;
        const { enabled, frequency, dayOfWeek, hour, period } = req.body;

        const user = await User.findById(orgId);
        if (!user) return res.status(404).json({ error: 'Organization not found' });

        // Can only enable scheduling if Slack is connected
        if (enabled && (!user.slackSettings?.connected || !user.slackSettings?.incomingWebhook?.url)) {
            return res.status(400).json({ error: 'Slack must be connected to enable scheduled reports' });
        }

        // Validate inputs
        const validFrequencies = ['weekly', 'biweekly', 'monthly'];
        const validPeriods = ['7d', '30d', '90d'];

        if (!user.reportSchedule) {
            user.reportSchedule = {};
        }

        if (typeof enabled === 'boolean') user.reportSchedule.enabled = enabled;
        if (validFrequencies.includes(frequency)) user.reportSchedule.frequency = frequency;
        if (typeof dayOfWeek === 'number' && dayOfWeek >= 0 && dayOfWeek <= 6) user.reportSchedule.dayOfWeek = dayOfWeek;
        if (typeof hour === 'number' && hour >= 0 && hour <= 23) user.reportSchedule.hour = hour;
        if (validPeriods.includes(period)) user.reportSchedule.period = period;

        await user.save();

        res.json({ schedule: user.reportSchedule });
    } catch (err) {
        console.error('Update schedule error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
