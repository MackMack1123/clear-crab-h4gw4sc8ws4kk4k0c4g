const express = require('express');
const router = express.Router();
const SystemSettings = require('../models/SystemSettings');
const User = require('../models/User');

// Helper: Check if user is admin
const isAdmin = async (userId) => {
    if (!userId) return false;
    try {
        const user = await User.findById(userId);
        return user?.role === 'admin';
    } catch (err) {
        return false;
    }
};

// GET /api/system/settings - Public (used by signup page to check registrations)
router.get('/settings', async (req, res) => {
    try {
        let settings = await SystemSettings.findById('global');

        // If no settings exist, create defaults
        if (!settings) {
            settings = await SystemSettings.create({
                _id: 'global',
                payments: {
                    stripe: true,
                    square: true,
                    paypal: true,
                    check: true
                },
                registrations: {
                    organizationsEnabled: true
                }
            });
        }

        res.json(settings);
    } catch (err) {
        console.error('Error fetching system settings:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/system/settings - Admin only
router.put('/settings', async (req, res) => {
    try {
        // Get userId from request (could be in header, body, or query)
        const userId = req.body.userId || req.headers['x-user-id'];

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Check if user is admin
        const admin = await isAdmin(userId);
        if (!admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const updates = req.body.settings || req.body;

        // Remove userId from updates if present
        delete updates.userId;

        // Update settings with merge
        const settings = await SystemSettings.findByIdAndUpdate(
            'global',
            {
                $set: {
                    ...updates,
                    updatedAt: new Date(),
                    updatedBy: userId
                }
            },
            { new: true, upsert: true }
        );

        res.json(settings);
    } catch (err) {
        console.error('Error updating system settings:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
