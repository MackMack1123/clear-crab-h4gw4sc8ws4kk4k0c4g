const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const slackService = require('../services/slackService');
const User = require('../models/User');
const Sponsorship = require('../models/Sponsorship');
const Package = require('../models/Package');

// Get frontend URL from environment (for redirects after OAuth)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

/**
 * Verify Slack request signature (prevents unauthorized access to slash commands)
 */
function verifySlackSignature(req, res, next) {
    if (!SLACK_SIGNING_SECRET) {
        console.warn('[Slack] SLACK_SIGNING_SECRET not set, skipping signature verification');
        return next();
    }

    const timestamp = req.headers['x-slack-request-timestamp'];
    const slackSignature = req.headers['x-slack-signature'];

    if (!timestamp || !slackSignature) {
        return res.status(401).json({ error: 'Missing Slack signature headers' });
    }

    // Reject requests older than 5 minutes to prevent replay attacks
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
    if (parseInt(timestamp) < fiveMinutesAgo) {
        return res.status(401).json({ error: 'Request too old' });
    }

    const sigBasestring = `v0:${timestamp}:${req.rawBody || ''}`;
    const mySignature = 'v0=' + crypto.createHmac('sha256', SLACK_SIGNING_SECRET).update(sigBasestring).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(slackSignature))) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
}

// Middleware to parse urlencoded body and capture raw body for signature verification
const slackCommandParser = express.urlencoded({
    extended: true,
    verify: (req, _res, buf) => { req.rawBody = buf.toString(); }
});

// Step 1: Redirect to Slack
router.get('/auth', (req, res) => {
    const scopes = 'incoming-webhook,commands,chat:write,files:write,im:write';
    const client_id = process.env.SLACK_CLIENT_ID;
    const redirect_uri = process.env.SLACK_REDIRECT_URI || `${API_BASE_URL}/api/slack/callback`;

    // State should be random, but for MVP we might pass user ID if needed, 
    // though usually we relying on frontend handle the token or storing state in session.
    // For this implementation, we'll ask the frontend to pass the userID in the state param
    // so we know WHO is connecting.
    const state = req.query.userId;

    if (!client_id) return res.status(500).send("Server missing Slack Client ID");

    const url = `https://slack.com/oauth/v2/authorize?client_id=${client_id}&scope=${scopes}&redirect_uri=${redirect_uri}&state=${state}`;
    res.redirect(url);
});

// Step 2: Callback
router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query; // state is the userId

    console.log('[Slack OAuth] Callback received:', { hasCode: !!code, state, error });

    if (error) {
        console.error('[Slack OAuth] Error from Slack:', error);
        return res.redirect(`${FRONTEND_URL}/dashboard?slack_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
        console.error('[Slack OAuth] Missing code or state');
        return res.redirect(`${FRONTEND_URL}/dashboard?slack_error=missing_params`);
    }

    try {
        console.log('[Slack OAuth] Exchanging code for token...');
        const data = await slackService.exchangeCodeForToken(code);
        console.log('[Slack OAuth] Token exchange successful, team:', data.team?.name);

        // Data contains: access_token, app_id, team, incoming_webhook, etc.
        const userId = state;

        // Update User Profile with Slack Settings
        const slackSettings = {
            connected: true,
            teamName: data.team.name,
            teamId: data.team.id,
            accessToken: data.access_token,
            incomingWebhook: {
                url: data.incoming_webhook.url,
                channel: data.incoming_webhook.channel,
                configurationUrl: data.incoming_webhook.configuration_url
            }
        };

        console.log('[Slack OAuth] Updating user:', userId);
        console.log('[Slack OAuth] slackSettings to save:', JSON.stringify(slackSettings, null, 2));

        const updateResult = await User.findByIdAndUpdate(userId, {
            $set: { slackSettings: slackSettings }
        }, { new: true });

        if (!updateResult) {
            console.error('[Slack OAuth] User not found:', userId);
            return res.redirect(`${FRONTEND_URL}/dashboard?slack_error=user_not_found`);
        }

        console.log('[Slack OAuth] Update successful, slackSettings saved:', updateResult.slackSettings?.connected);
        console.log('[Slack OAuth] Success! Redirecting to dashboard');
        // Redirect back to dashboard with success param
        res.redirect(`${FRONTEND_URL}/dashboard?slack_success=true`);

    } catch (err) {
        console.error("[Slack OAuth] Callback Error:", err.message);
        res.redirect(`${FRONTEND_URL}/dashboard?slack_error=${encodeURIComponent(err.message)}`);
    }
});

/**
 * POST /api/slack/send-history
 * Send Slack notifications for all existing paid sponsorships
 */
router.post('/send-history', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        const organizer = await User.findById(userId);
        if (!organizer) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!organizer.slackSettings?.connected || !organizer.slackSettings?.incomingWebhook?.url) {
            return res.status(400).json({ error: 'Slack is not connected' });
        }

        const webhookUrl = organizer.slackSettings.incomingWebhook.url;

        const sponsorships = await Sponsorship.find({
            organizerId: userId,
            $or: [
                { status: 'paid' },
                { status: 'branding-submitted' },
                { paymentMethod: 'check' }
            ]
        });

        if (sponsorships.length === 0) {
            return res.json({ success: true, sent: 0, message: 'No sponsorships found' });
        }

        // Collect unique package IDs and fetch them in one query
        const packageIds = [...new Set(sponsorships.map(s => s.packageId).filter(Boolean))];
        const packages = await Package.find({ _id: { $in: packageIds } });
        const packageMap = {};
        for (const pkg of packages) {
            packageMap[pkg._id.toString()] = pkg;
        }

        let sent = 0;
        for (const sp of sponsorships) {
            const pkg = sp.packageId ? packageMap[sp.packageId.toString()] : null;

            // Send sponsorship notification
            await slackService.sendSponsorshipNotification(
                webhookUrl,
                sp,
                pkg || { title: 'Unknown Package', price: '0' }
            );
            sent++;

            // Send branding notification if branding exists
            if (sp.branding && (sp.branding.logoUrl || sp.branding.businessName)) {
                // Small delay to avoid Slack rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
                await slackService.sendBrandingNotification(webhookUrl, sp);
                sent++;
            }

            // Small delay between sponsorships to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        res.json({ success: true, sent, sponsorships: sponsorships.length });
    } catch (err) {
        console.error('[Slack Send History] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/slack/notify/:sponsorshipId
 * Send a Slack notification for a single sponsorship on demand
 */
router.post('/notify/:sponsorshipId', async (req, res) => {
    const { userId } = req.body;
    const { sponsorshipId } = req.params;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        const organizer = await User.findById(userId);
        if (!organizer) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!organizer.slackSettings?.connected || !organizer.slackSettings?.incomingWebhook?.url) {
            return res.status(400).json({ error: 'Slack is not connected' });
        }

        const sponsorship = await Sponsorship.findById(sponsorshipId);
        if (!sponsorship) {
            return res.status(404).json({ error: 'Sponsorship not found' });
        }

        // Verify this sponsorship belongs to the organizer
        if (sponsorship.organizerId.toString() !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const webhookUrl = organizer.slackSettings.incomingWebhook.url;
        const pkg = sponsorship.packageId ? await Package.findById(sponsorship.packageId) : null;

        // Send sponsorship notification
        await slackService.sendSponsorshipNotification(
            webhookUrl,
            sponsorship,
            pkg || { title: sponsorship.packageTitle || 'Unknown Package', price: '0' }
        );

        // Send branding notification if branding exists
        if (sponsorship.branding && (sponsorship.branding.logoUrl || sponsorship.branding.businessName)) {
            await new Promise(resolve => setTimeout(resolve, 500));
            await slackService.sendBrandingNotification(webhookUrl, sponsorship);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[Slack Notify Single] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/slack/commands
 * Handles Slack slash commands (e.g. /sponsors)
 * Slack sends application/x-www-form-urlencoded data
 */
router.post('/commands', slackCommandParser, verifySlackSignature, async (req, res) => {
    const { team_id, text, command } = req.body;

    try {
        // Look up the organizer by Slack team ID
        const organizer = await User.findOne({ 'slackSettings.teamId': team_id, 'slackSettings.connected': true });

        if (!organizer) {
            return res.json({
                response_type: 'ephemeral',
                text: 'No Fundraisr organization is connected to this Slack workspace. Connect Slack from your Fundraisr dashboard first.'
            });
        }

        const subcommand = (text || '').trim().toLowerCase();
        const orgName = organizer.organizationProfile?.orgName || 'Your Organization';

        // Build query based on subcommand
        let filter = { organizerId: organizer._id.toString() };
        let filterLabel = 'All';

        if (subcommand === 'pending') {
            filter.status = 'pending';
            filterLabel = 'Pending';
        } else if (subcommand === 'paid') {
            filter.status = 'paid';
            filterLabel = 'Paid';
        } else if (subcommand === 'complete' || subcommand === 'completed') {
            filter.status = 'branding-submitted';
            filterLabel = 'Complete';
        } else if (subcommand === 'help') {
            return res.json({
                response_type: 'ephemeral',
                blocks: [
                    { type: 'header', text: { type: 'plain_text', text: 'Fundraisr Commands', emoji: true } },
                    {
                        type: 'section', text: {
                            type: 'mrkdwn',
                            text: [
                                `\`${command}\` — Show sponsorship summary`,
                                `\`${command} list\` — List all sponsorships`,
                                `\`${command} pending\` — List pending sponsorships`,
                                `\`${command} paid\` — List paid sponsorships`,
                                `\`${command} complete\` — List completed sponsorships`,
                                `\`${command} export\` — Export all sponsorships as Excel (DM)`,
                                `\`${command} help\` — Show this help message`,
                            ].join('\n')
                        }
                    }
                ]
            });
        } else if (subcommand === 'export') {
            // Respond immediately, then generate and DM the file async
            const { user_id } = req.body;
            res.json({
                response_type: 'ephemeral',
                text: ':hourglass_flowing_sand: Generating your sponsorship export... Check your DMs in a moment.'
            });

            // Fire and forget — generate Excel and DM to user
            (async () => {
                try {
                    const allSponsorships = await Sponsorship.find({ organizerId: organizer._id.toString() }).sort({ createdAt: -1 });

                    if (allSponsorships.length === 0) {
                        // Use response_url to follow up ephemerally
                        const { response_url } = req.body;
                        if (response_url) {
                            await fetch(response_url, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ response_type: 'ephemeral', text: 'No sponsorships to export.', replace_original: false })
                            });
                        }
                        return;
                    }

                    // Fetch packages for titles
                    const packageIds = [...new Set(allSponsorships.map(s => s.packageId).filter(Boolean))];
                    const packages = await Package.find({ _id: { $in: packageIds } });
                    const packageMap = {};
                    for (const pkg of packages) {
                        packageMap[pkg._id.toString()] = pkg;
                    }

                    // Build Excel workbook
                    const ExcelJS = require('exceljs');
                    const workbook = new ExcelJS.Workbook();
                    workbook.creator = 'Fundraisr';
                    workbook.created = new Date();
                    const sheet = workbook.addWorksheet('Sponsorships');

                    // Define columns
                    sheet.columns = [
                        { header: 'Company', key: 'company', width: 28 },
                        { header: 'Contact Name', key: 'contact', width: 22 },
                        { header: 'Email', key: 'email', width: 28 },
                        { header: 'Phone', key: 'phone', width: 18 },
                        { header: 'Package', key: 'package', width: 22 },
                        { header: 'Amount', key: 'amount', width: 12 },
                        { header: 'Payment Method', key: 'method', width: 16 },
                        { header: 'Status', key: 'status', width: 14 },
                        { header: 'Date', key: 'date', width: 14 },
                        { header: 'Artwork', key: 'artwork', width: 14 },
                        { header: 'Website', key: 'website', width: 28 },
                        { header: 'Tagline', key: 'tagline', width: 30 },
                    ];

                    // Style header row
                    const headerRow = sheet.getRow(1);
                    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
                    headerRow.alignment = { vertical: 'middle' };

                    const statusLabels = { paid: 'Paid', pending: 'Pending', 'branding-submitted': 'Complete' };
                    const methodLabels = { stripe: 'Stripe', square: 'Square', paypal: 'PayPal', check: 'Check', sandbox: 'Sandbox' };

                    for (const sp of allSponsorships) {
                        const pkg = sp.packageId ? packageMap[sp.packageId.toString()] : null;
                        sheet.addRow({
                            company: sp.sponsorInfo?.companyName || sp.sponsorName || 'Unknown',
                            contact: sp.sponsorInfo?.contactName || sp.sponsorName || '',
                            email: sp.sponsorInfo?.email || sp.sponsorEmail || sp.payerEmail || '',
                            phone: sp.sponsorInfo?.phone || sp.sponsorPhone || '',
                            package: pkg?.title || sp.packageTitle || '',
                            amount: sp.amount || 0,
                            method: methodLabels[sp.paymentMethod] || sp.paymentMethod || '',
                            status: statusLabels[sp.status] || sp.status || '',
                            date: new Date(sp.createdAt).toLocaleDateString('en-US'),
                            artwork: sp.branding?.logoUrl ? 'Submitted' : 'Missing',
                            website: sp.branding?.websiteUrl || '',
                            tagline: sp.branding?.tagline || '',
                        });
                    }

                    // Format amount column as currency
                    sheet.getColumn('amount').numFmt = '$#,##0.00';

                    // Add auto-filter
                    sheet.autoFilter = { from: 'A1', to: `L${allSponsorships.length + 1}` };

                    // Generate buffer
                    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
                    const dateStr = new Date().toISOString().split('T')[0];
                    const filename = `${orgName.replace(/[^a-zA-Z0-9]/g, '_')}_Sponsorships_${dateStr}.xlsx`;

                    const paidCount = allSponsorships.filter(s => s.status === 'paid' || s.status === 'branding-submitted').length;
                    const pendingCount = allSponsorships.filter(s => s.status === 'pending').length;
                    const totalRevenue = allSponsorships.filter(s => s.status === 'paid' || s.status === 'branding-submitted').reduce((sum, s) => sum + (s.amount || 0), 0);
                    const fmtCurrency = (v) => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 });

                    await slackService.uploadFileDM(
                        organizer.slackSettings.accessToken,
                        user_id,
                        {
                            buffer,
                            filename,
                            title: `${orgName} Sponsorship Export`,
                            initialComment: `:bar_chart: *${orgName} Sponsorship Export*\n${allSponsorships.length} sponsorships | ${paidCount} paid | ${pendingCount} pending | ${fmtCurrency(totalRevenue)} confirmed revenue`
                        }
                    );
                } catch (err) {
                    console.error('[Slack Export] Error:', err);
                    // Try to notify user of failure via response_url
                    const { response_url } = req.body;
                    if (response_url) {
                        await fetch(response_url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ response_type: 'ephemeral', text: `Export failed: ${err.message}`, replace_original: false })
                        }).catch(() => {});
                    }
                }
            })();
            return; // Already responded
        }

        const sponsorships = await Sponsorship.find(filter).sort({ createdAt: -1 });

        // Default or "summary" subcommand — show aggregate stats
        if (!subcommand || subcommand === 'summary') {
            const allSponsorships = sponsorships;
            const totalCount = allSponsorships.length;
            const paidCount = allSponsorships.filter(s => s.status === 'paid' || s.status === 'branding-submitted').length;
            const pendingCount = allSponsorships.filter(s => s.status === 'pending').length;
            const totalRevenue = allSponsorships.filter(s => s.status === 'paid' || s.status === 'branding-submitted').reduce((sum, s) => sum + (s.amount || 0), 0);
            const pendingRevenue = allSponsorships.filter(s => s.status === 'pending').reduce((sum, s) => sum + (s.amount || 0), 0);
            const artworkCount = allSponsorships.filter(s => s.branding?.logoUrl).length;
            const missingArtCount = totalCount - artworkCount;
            const fmtCurrency = (v) => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 });

            return res.json({
                response_type: 'in_channel',
                blocks: [
                    { type: 'header', text: { type: 'plain_text', text: `📊 ${orgName} — Sponsorship Summary`, emoji: true } },
                    {
                        type: 'section', fields: [
                            { type: 'mrkdwn', text: `*Total Sponsorships:*\n${totalCount}` },
                            { type: 'mrkdwn', text: `*Confirmed Revenue:*\n${fmtCurrency(totalRevenue)}` }
                        ]
                    },
                    {
                        type: 'section', fields: [
                            { type: 'mrkdwn', text: `*Paid / Complete:*\n:white_check_mark: ${paidCount}` },
                            { type: 'mrkdwn', text: `*Pending:*\n:hourglass_flowing_sand: ${pendingCount} (${fmtCurrency(pendingRevenue)})` }
                        ]
                    },
                    {
                        type: 'section', fields: [
                            { type: 'mrkdwn', text: `*Artwork Submitted:*\n:art: ${artworkCount}` },
                            { type: 'mrkdwn', text: `*Artwork Missing:*\n:x: ${missingArtCount}` }
                        ]
                    },
                    {
                        type: 'context', elements: [
                            { type: 'mrkdwn', text: `Use \`${command} list\` to see individual sponsorships | <https://getfundraisr.io|Fundraisr Dashboard>` }
                        ]
                    }
                ]
            });
        }

        // "list", "pending", "paid", "complete" — show individual sponsorships
        if (sponsorships.length === 0) {
            return res.json({
                response_type: 'ephemeral',
                text: `No ${filterLabel.toLowerCase()} sponsorships found.`
            });
        }

        // Slack blocks have a max of 50 blocks; show up to 15 sponsorships
        const display = sponsorships.slice(0, 15);
        const statusEmojis = { paid: ':white_check_mark:', 'branding-submitted': ':star:', pending: ':hourglass_flowing_sand:' };
        const statusLabels = { paid: 'Paid', 'branding-submitted': 'Complete', pending: 'Pending' };
        const fmtCurrency = (v) => '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

        const blocks = [
            { type: 'header', text: { type: 'plain_text', text: `📋 ${orgName} — ${filterLabel} Sponsorships (${sponsorships.length})`, emoji: true } },
            { type: 'divider' }
        ];

        for (const sp of display) {
            const company = sp.sponsorInfo?.companyName || sp.sponsorName || 'Unknown';
            const statusEmoji = statusEmojis[sp.status] || ':grey_question:';
            const statusLabel = statusLabels[sp.status] || sp.status;
            const method = sp.paymentMethod || 'N/A';
            const date = new Date(sp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            blocks.push({
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*${company}*\n${sp.packageTitle || 'Package'}` },
                    { type: 'mrkdwn', text: `${fmtCurrency(sp.amount)} — ${statusEmoji} ${statusLabel}\n${method} · ${date} · ${sp.branding?.logoUrl ? ':art: Art' : ':x: No art'}` }
                ]
            });
        }

        if (sponsorships.length > 15) {
            blocks.push({
                type: 'context', elements: [
                    { type: 'mrkdwn', text: `_Showing 15 of ${sponsorships.length}. View all in the <https://getfundraisr.io|Fundraisr Dashboard>._` }
                ]
            });
        }

        return res.json({ response_type: 'in_channel', blocks });

    } catch (err) {
        console.error('[Slack Command] Error:', err);
        return res.json({
            response_type: 'ephemeral',
            text: `Something went wrong: ${err.message}`
        });
    }
});

module.exports = router;
