const express = require('express');
const router = express.Router();
const Waitlist = require('../models/Waitlist');
const emailService = require('../services/emailService');

// GET /api/waitlist - Get all waitlist entries (admin only)
router.get('/', async (req, res) => {
    try {
        // Simple admin check - in production, use proper auth middleware
        const adminKey = req.headers['x-admin-key'];
        if (adminKey !== process.env.ADMIN_API_KEY) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const entries = await Waitlist.find().sort({ createdAt: -1 });
        res.json({
            total: entries.length,
            entries
        });
    } catch (error) {
        console.error('Waitlist fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch waitlist' });
    }
});

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

// PATCH /api/waitlist/:id/status - Update entry status (admin only)
router.patch('/:id/status', async (req, res) => {
    try {
        const adminKey = req.headers['x-admin-key'];
        if (adminKey !== process.env.ADMIN_API_KEY) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'approved', 'contacted'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const entry = await Waitlist.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        res.json({ success: true, entry });
    } catch (error) {
        console.error('Update waitlist status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// DELETE /api/waitlist/:id - Delete entry (admin only)
router.delete('/:id', async (req, res) => {
    try {
        const adminKey = req.headers['x-admin-key'];
        if (adminKey !== process.env.ADMIN_API_KEY) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { id } = req.params;
        const entry = await Waitlist.findByIdAndDelete(id);

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete waitlist error:', error);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

module.exports = router;
