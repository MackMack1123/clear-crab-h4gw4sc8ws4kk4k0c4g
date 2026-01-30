const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Load Slack credentials from env
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;

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

        const message = {
            text: `🎉 New Sponsorship! ${sponsorship.sponsorName} purchased ${packageDetails.title}`,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "🎉 New Sponsorship Recieved!",
                        emoji: true
                    }
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Sponsor:*\n${sponsorship.sponsorName}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Package:*\n${packageDetails.title} ($${packageDetails.price})`
                        }
                    ]
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Contact Email:*\n${sponsorship.email}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Amount:*\n$${packageDetails.price}`
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
                            url: "http://localhost:5173/dashboard", // TODO: Update with Real URL
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
    }
};

module.exports = slackService;
