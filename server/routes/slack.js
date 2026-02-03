const express = require('express');
const router = express.Router();
const slackService = require('../services/slackService');
const User = require('../models/User');

// Get frontend URL from environment (for redirects after OAuth)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Step 1: Redirect to Slack
router.get('/auth', (req, res) => {
    const scopes = 'incoming-webhook'; // We only need incoming webhook for now
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

    if (error) {
        return res.status(400).send(`Slack Auth Error: ${error}`);
    }

    if (!code || !state) {
        return res.status(400).send("Missing code or state (userId)");
    }

    try {
        const data = await slackService.exchangeCodeForToken(code);

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

        await User.findByIdAndUpdate(userId, {
            $set: { slackSettings: slackSettings }
        });

        // Redirect back to dashboard with success param
        res.redirect(`${FRONTEND_URL}/dashboard?slack_success=true`);

    } catch (err) {
        console.error("Slack Callback Error:", err);
        res.status(500).send("Internal Server Error during Slack Auth");
    }
});

module.exports = router;
