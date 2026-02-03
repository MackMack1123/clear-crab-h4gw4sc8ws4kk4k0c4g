const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Load Slack credentials from env
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

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

        const params = new URLSearchParams();
        params.append('client_id', SLACK_CLIENT_ID);
        params.append('client_secret', SLACK_CLIENT_SECRET);
        params.append('code', code);

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

        const message = {
            text: `🎉 New Sponsorship! ${companyName} purchased ${packageDetails.title}`,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "🎉 New Sponsorship Received!",
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
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "View in Dashboard",
                                emoji: true
                            },
                            url: `${FRONTEND_URL}/dashboard`,
                            style: "primary"
                        }
                    ]
                }
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

        blocks.push({
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Review Branding",
                        emoji: true
                    },
                    url: `${FRONTEND_URL}/dashboard`,
                    style: "primary"
                }
            ]
        });

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
