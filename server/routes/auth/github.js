const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../../models/User');

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const CALLBACK_URL = `${process.env.API_URL}/api/auth/github/callback`;

// GET /api/auth/github
// Redirects user to GitHub for authorization
// Expects: ?userId=firebaseUid
router.get('/', (req, res) => {
    const { userId } = req.query;

    if (!CLIENT_ID) {
        return res.status(500).send('Generating GitHub Auth URL failed: Missing GITHUB_CLIENT_ID');
    }

    if (!userId) {
        return res.status(400).send('Missing userId parameter. Cannot link account.');
    }

    // We pass the userId as the "state" parameter to GitHub to preserve state across the redirect
    // 'repo' scope is needed to create repositories for the user later
    const scope = 'read:user user:email repo';
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${CALLBACK_URL}&scope=${scope}&state=${userId}`;

    res.redirect(githubAuthUrl);
});

// GET /api/auth/github/callback
// Handles the callback from GitHub
router.get('/callback', async (req, res) => {
    const { code, state } = req.query; // 'state' contains the userId we sent

    if (!code) {
        return res.status(400).send('No code provided');
    }

    if (!state) {
        return res.status(400).send('No state (userId) returned from GitHub. Security check failed.');
    }

    const userId = state;

    try {
        // Exchange code for access token
        const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code,
            redirect_uri: CALLBACK_URL
        }, {
            headers: { Accept: 'application/json' }
        });

        const accessToken = tokenResponse.data.access_token;
        if (!accessToken) {
            console.error('GitHub Auth Error:', tokenResponse.data);
            return res.status(400).send('Failed to get access token');
        }

        // Fetch user profile
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const githubUser = userResponse.data;

        console.log(`GitHub Linked for User ${userId}: ${githubUser.login}`);

        // Update User in MongoDB
        await User.findByIdAndUpdate(userId, {
            $set: {
                githubSettings: {
                    connected: true,
                    username: githubUser.login,
                    accessToken: accessToken,
                    nodeId: githubUser.node_id,
                    connectedAt: new Date()
                }
            }
        }, { upsert: true, new: true });

        // Redirect to Frontend Dashboard with success flag
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/dashboard?status=github_connected`);

    } catch (error) {
        console.error('GitHub Auth Error:', error.response?.data || error.message);
        res.status(500).send('Authentication failed');
    }
});

module.exports = router;
