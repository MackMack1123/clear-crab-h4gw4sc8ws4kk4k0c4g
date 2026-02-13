const cron = require('node-cron');
const User = require('../models/User');
const analyticsDataService = require('./analyticsDataService');
const { generateAndSaveReport } = require('./analyticsReportService');
const slackService = require('./slackService');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

/**
 * Check if today is a valid send day for the given schedule
 */
function isSendDay(schedule) {
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sunday

    if (schedule.frequency === 'weekly') {
        return dayOfWeek === (schedule.dayOfWeek ?? 1);
    }

    if (schedule.frequency === 'biweekly') {
        // Send if it's the correct day and at least 13 days since last send
        if (dayOfWeek !== (schedule.dayOfWeek ?? 1)) return false;
        if (!schedule.lastSentAt) return true;
        const daysSinceLastSend = (now - new Date(schedule.lastSentAt)) / (1000 * 60 * 60 * 24);
        return daysSinceLastSend >= 13;
    }

    if (schedule.frequency === 'monthly') {
        // Send on the 1st of each month
        return now.getUTCDate() === 1;
    }

    return false;
}

/**
 * Process a single user's scheduled report
 */
async function processUserReport(user) {
    try {
        const orgId = String(user._id);
        const orgName = user.organizationProfile?.orgName || 'Organization';
        const webhookUrl = user.slackSettings?.incomingWebhook?.url;
        const period = user.reportSchedule?.period || '30d';

        if (!webhookUrl) return;

        // Gather analytics
        const [overview, funnelData] = await Promise.all([
            analyticsDataService.getOrgOverview(orgId, period),
            analyticsDataService.getFunnelMetrics(orgId, period).catch(() => null)
        ]);

        // Generate report image
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

        // Update lastSentAt
        await User.updateOne(
            { _id: user._id },
            { $set: { 'reportSchedule.lastSentAt': new Date() } }
        );

        console.log(`[Scheduler] Report sent for ${orgName}`);
    } catch (err) {
        console.error(`[Scheduler] Failed for user ${user._id}:`, err.message);
    }
}

/**
 * Main hourly job: find and process all scheduled reports due now
 */
async function processScheduledReports() {
    try {
        const currentHour = new Date().getUTCHours();

        // Find users with enabled schedules, matching hour, Slack connected
        const users = await User.find({
            'reportSchedule.enabled': true,
            'reportSchedule.hour': currentHour,
            'slackSettings.connected': true,
            'slackSettings.incomingWebhook.url': { $exists: true, $ne: null }
        }).lean();

        if (users.length === 0) return;

        console.log(`[Scheduler] Found ${users.length} users with schedules at hour ${currentHour} UTC`);

        for (const user of users) {
            // Check day-of-week / frequency
            if (!isSendDay(user.reportSchedule)) continue;

            // Double-send prevention: must be 23+ hours since last send
            if (user.reportSchedule.lastSentAt) {
                const hoursSinceLast = (Date.now() - new Date(user.reportSchedule.lastSentAt).getTime()) / (1000 * 60 * 60);
                if (hoursSinceLast < 23) continue;
            }

            await processUserReport(user);
        }
    } catch (err) {
        console.error('[Scheduler] Error processing scheduled reports:', err.message);
    }
}

/**
 * Start the scheduler
 * Runs every hour at minute 5 (e.g. 9:05, 10:05)
 */
function startScheduler() {
    cron.schedule('5 * * * *', () => {
        processScheduledReports();
    });
    console.log('[Scheduler] Report scheduler started (runs hourly at :05)');
}

module.exports = {
    startScheduler,
    processScheduledReports
};
