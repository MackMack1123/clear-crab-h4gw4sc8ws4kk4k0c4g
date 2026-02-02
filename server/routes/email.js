const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const User = require('../models/User');

// Middleware to protect routes (assuming verifyToken style middleware exists, but simpler for now to trust input or require simple auth)
// For MVP, we'll assume this is protected by frontend logic or basic session checks if integrated. 
// Ideally should use `authenticate` middleware.

// Send Test Email
router.post('/send-test', async (req, res) => {
    try {
        const { to, type, userId, templateOverride } = req.body;

        if (!userId || !to) {
            return res.status(400).json({ error: 'Missing userId or recipient email' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Apply template override if provided (for testing drafts)
        if (templateOverride) {
            if (!user.organizationProfile) user.organizationProfile = {};
            if (!user.organizationProfile.emailTemplates) user.organizationProfile.emailTemplates = {};
            user.organizationProfile.emailTemplates[type] = templateOverride;
        }

        const testVars = {
            donorName: 'John Doe',
            contactName: 'Jane Smith',
            amount: '$50.00',
            userName: 'Sponsor Name',
            transactionId: 'TXN-TEST-12345',
            portalUrl: 'https://getfundraisr.io/portal/test',
            orgName: user.organizationProfile?.orgName || 'Your Organization'
        };

        await emailService.sendTemplateEmail(user, type || 'welcome', to, testVars);
        res.json({ success: true, message: 'Test email sent' });

    } catch (error) {
        console.error('Test Email Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send Welcome Email (for new signups)
router.post('/welcome', async (req, res) => {
    try {
        const { email, userName } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        await emailService.sendWelcomeEmail(email, userName);
        res.json({ success: true, message: 'Welcome email sent' });

    } catch (error) {
        console.error('Welcome Email Route Error:', error);
        // Don't fail the request - welcome email is non-critical
        res.json({ success: false, message: 'Welcome email could not be sent' });
    }
});

module.exports = router;
