const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Load Slack credentials from env
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

const slackService = {
    /**
     * Exchange temporary auth code for access token
     * @param {string} code - The code received from Slack redirect
     * @returns {Promise<object>} The full auth response from Slack
     */
    exchangeCodeForToken: async (code) => {
        if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
            throw new Error("Missing Slack Credentials in Server Environment");
        }

        const redirect_uri = process.env.SLACK_REDIRECT_URI || `${API_BASE_URL}/api/slack/callback`;

        const params = new URLSearchParams();
        params.append('client_id', SLACK_CLIENT_ID);
        params.append('client_secret', SLACK_CLIENT_SECRET);
        params.append('code', code);
        params.append('redirect_uri', redirect_uri);

        // Using oauth.v2.access
        const res = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const data = await res.json();
        if (!data.ok) {
            throw new Error(`Slack Auth Failed: ${data.error}`);
        }
        return data;
    },

    /**
     * Send a sponsorship notification to the organizer's connected channel
     * @param {string} webhookUrl - The incoming webhook URL
     * @param {object} sponsorship - The sponsorship details
     * @param {object} packageDetails - The package details
     */
    sendSponsorshipNotification: async (webhookUrl, sponsorship, packageDetails) => {
        if (!webhookUrl) return;

        const companyName = sponsorship.sponsorInfo?.companyName || sponsorship.sponsorName || 'Unknown';
        const contactName = sponsorship.sponsorInfo?.contactName || sponsorship.sponsorName || 'Unknown';
        const contactEmail = sponsorship.sponsorInfo?.email || sponsorship.sponsorEmail || sponsorship.payerEmail || 'Not provided';
        const contactPhone = sponsorship.sponsorInfo?.phone || sponsorship.sponsorPhone || 'Not provided';
        const amount = sponsorship.amount || packageDetails.price || 0;
        const paymentMethod = sponsorship.paymentMethod || 'unknown';
        const status = sponsorship.status || 'unknown';

        // Build status context line
        const methodLabels = { stripe: 'Stripe', square: 'Square', paypal: 'PayPal', check: 'Check', sandbox: 'Sandbox' };
        const statusLabels = { paid: 'Paid', pending: 'Pending', 'branding-submitted': 'Complete' };
        const methodLabel = methodLabels[paymentMethod] || paymentMethod;
        const statusLabel = statusLabels[status] || status;

        // Header varies based on payment status
        const isCheckPledge = paymentMethod === 'check' && status === 'pending';
        const headerText = isCheckPledge ? "New Check Pledge Received" : "New Sponsorship Received";
        const fallbackText = isCheckPledge
            ? `Check Pledge: ${companyName} pledged for ${packageDetails.title}`
            : `New Sponsorship: ${companyName} purchased ${packageDetails.title}`;

        const message = {
            text: fallbackText,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: headerText,
                        emoji: true
                    }
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Company:*\n${companyName}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Package:*\n${packageDetails.title}`
                        }
                    ]
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Contact:*\n${contactName}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Amount:*\n$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        }
                    ]
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Email:*\n${contactEmail}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Phone:*\n${contactPhone}`
                        }
                    ]
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Payment Method:*\n${methodLabel}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Status:*\n${statusLabel}`
                        }
                    ]
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Artwork:*\n${sponsorship.branding?.logoUrl ? 'Submitted' : 'Not submitted'}`
                        }
                    ]
                },
            ]
        };

        try {
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });

            if (!res.ok) {
                console.error("Failed to send Slack notification", await res.text());
            }
        } catch (error) {
            console.error("Error sending Slack notification:", error);
        }
    },

    /**
     * Send a branding update notification to the organizer's connected channel
     * @param {string} webhookUrl - The incoming webhook URL
     * @param {object} sponsorship - The sponsorship details with branding
     */
    /**
     * Send an analytics report to the organizer's connected Slack channel
     * @param {string} webhookUrl - The incoming webhook URL
     * @param {string} orgName - Organization name
     * @param {string} reportImageUrl - Publicly accessible URL for the report image
     * @param {object} metrics - Key metrics to display { totalRevenue, thisPeriodRevenue, sponsorshipCount, avgValue, period }
     */
    sendAnalyticsReport: async (webhookUrl, orgName, reportImageUrl, metrics) => {
        if (!webhookUrl) return;

        const periodLabels = { '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days', '12m': 'Last 12 Months' };
        const periodLabel = periodLabels[metrics.period] || 'Last 30 Days';
        const fmtCurrency = (v) => '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "Analytics Report",
                    emoji: true
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*${orgName}*  |  ${periodLabel}  |  ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                }
            },
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Total Revenue:*\n${fmtCurrency(metrics.totalRevenue)}` },
                    { type: "mrkdwn", text: `*Period Revenue:*\n${fmtCurrency(metrics.thisPeriodRevenue)}` }
                ]
            },
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Sponsorships:*\n${metrics.sponsorshipCount || 0}` },
                    { type: "mrkdwn", text: `*Avg Value:*\n${fmtCurrency(metrics.avgValue)}` }
                ]
            }
        ];

        // Add report image if URL provided
        if (reportImageUrl) {
            blocks.push({
                type: "image",
                image_url: reportImageUrl,
                alt_text: `${orgName} Analytics Report`
            });
        }

        blocks.push({
            type: "context",
            elements: [{ type: "mrkdwn", text: "Generated by Fundraisr | <https://getfundraisr.io|getfundraisr.io>" }]
        });

        const message = {
            text: `Analytics Report for ${orgName} - ${periodLabel}`,
            blocks
        };

        try {
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });

            if (!res.ok) {
                console.error("Failed to send Slack analytics report", await res.text());
            }
        } catch (error) {
            console.error("Error sending Slack analytics report:", error);
        }
    },

    /**
     * Upload a file to a Slack user via DM using the Web API
     * Requires chat:write and files:write scopes
     */
    uploadFileDM: async (botToken, userId, { buffer, filename, title, initialComment }) => {
        if (!botToken) throw new Error('Bot token required for file uploads');

        // Use files.uploadV2 via the legacy upload endpoint (multipart form)
        const FormData = (await import('node-fetch')).FormData || globalThis.FormData;

        // Step 1: Get upload URL
        const getUrlRes = await fetch(`https://slack.com/api/files.getUploadURLExternal`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${botToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                filename,
                length: buffer.length.toString()
            })
        });
        const getUrlData = await getUrlRes.json();
        if (!getUrlData.ok) {
            throw new Error(`Failed to get upload URL: ${getUrlData.error}`);
        }

        // Step 2: Upload the file to the URL
        await fetch(getUrlData.upload_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: buffer
        });

        // Step 3: Complete the upload and share to user DM
        const completeRes = await fetch('https://slack.com/api/files.completeUploadExternal', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${botToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: [{ id: getUrlData.file_id, title: title || filename }],
                channel_id: userId,
                initial_comment: initialComment || ''
            })
        });
        const completeData = await completeRes.json();
        if (!completeData.ok) {
            throw new Error(`Failed to complete file upload: ${completeData.error}`);
        }

        return completeData;
    },

    sendBrandingNotification: async (webhookUrl, sponsorship) => {
        if (!webhookUrl) return;

        const companyName = sponsorship.branding?.businessName || sponsorship.sponsorInfo?.companyName || sponsorship.sponsorName || 'Unknown';
        const logoUrl = sponsorship.branding?.logoUrl;
        const tagline = sponsorship.branding?.tagline || 'No tagline provided';
        const website = sponsorship.branding?.websiteUrl || 'Not provided';

        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🎨 Branding Updated!",
                    emoji: true
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*${companyName}* has submitted their branding.`
                }
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Tagline:*\n${tagline}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Website:*\n${website}`
                    }
                ]
            }
        ];

        // Add logo image if available
        if (logoUrl) {
            blocks.push({
                type: "image",
                image_url: logoUrl,
                alt_text: `${companyName} logo`
            });
        }

        const message = {
            text: `🎨 Branding updated for ${companyName}`,
            blocks
        };

        try {
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });

            if (!res.ok) {
                console.error("Failed to send Slack branding notification", await res.text());
            }
        } catch (error) {
            console.error("Error sending Slack branding notification:", error);
        }
    }
};

module.exports = slackService;
