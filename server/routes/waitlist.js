const express = require('express');
const router = express.Router();
const Waitlist = require('../models/Waitlist');
const emailService = require('../services/emailService');

// POST /api/waitlist - Join the waitlist
router.post('/', async (req, res) => {
    try {
        const { orgName, contactName, email, orgType, sport, teamCount, fundraisingGoals, phone, website } = req.body;

        if (!orgName || !contactName || !email || !orgType || !sport) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check for duplicates
        const existing = await Waitlist.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'This email is already on the waitlist.' });
        }

        const newEntry = new Waitlist({
            orgName,
            contactName,
            email,
            phone,
            website,
            orgType,
            sport,
            teamCount,
            fundraisingGoals
        });

        await newEntry.save();

        // Send Auto-Reply (Dual Email)
        // 1. To User
        await emailService.sendRawEmail(
            email,
            "You're on the Fundraisr Waitlist!",
            `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                <h2 style="color: #1e293b;">Thank you for your interest!</h2>
                <p>Hi ${contactName},</p>
                <p>We've added <strong>${orgName}</strong> to our exclusive waitlist.</p>
                <p>We are currently onboarding sports organizations in batches to ensure the best possible experience. We will reach out to you shortly to get you set up.</p>
                <br>
                <p>Best,</p>
                <p><strong>The Fundraisr Team</strong></p>
            </div>
            `
        );

        // 2. To Admin (Notification)
        // Ideally retrieve admin email from settings, but for now hardcode or use generic
        /* 
        await emailService.sendRawEmail(
            process.env.ADMIN_EMAIL || 'hello@getfundraisr.io',
            `New Waitlist Sign Up: ${orgName}`,
            `<p>New sign up from ${contactName} (${email}) for ${orgName} - ${sport} ${orgType}.</p>`
        );
        */

        res.json({ success: true, message: 'Added to waitlist successfully' });

    } catch (error) {
        console.error('Waitlist error:', error);
        res.status(500).json({ error: 'Failed to join waitlist' });
    }
});

module.exports = router;
