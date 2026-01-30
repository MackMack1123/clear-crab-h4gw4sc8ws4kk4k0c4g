const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Check slug availability (must be before /:id to avoid being caught)
router.get('/check-slug/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const userId = req.query.userId; // Exclude current user from check

        const query = { 'organizationProfile.slug': slug };
        if (userId) {
            query._id = { $ne: userId };
        }

        const existing = await User.findOne(query);
        res.json({ available: !existing });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get User (by ID or Slug)
router.get('/:id', async (req, res) => {
    try {
        const idOrSlug = req.params.id;
        let user;

        // First, try to find by _id (Firebase UID or MongoDB ObjectId)
        user = await User.findById(idOrSlug);

        // If not found by ID, try to find by slug
        if (!user) {
            user = await User.findOne({ 'organizationProfile.slug': idOrSlug });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        // If findById throws a CastError (invalid ObjectId format), try slug lookup
        if (err.name === 'CastError') {
            try {
                const user = await User.findOne({ 'organizationProfile.slug': idOrSlug });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }
                return res.json(user);
            } catch (slugErr) {
                return res.status(500).json({ error: slugErr.message });
            }
        }
        res.status(500).json({ error: err.message });
    }
});

// Update User (or Create if ID provided)
router.post('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Upsert: Create if doesn't exist, Update if it does
        const user = await User.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, upsert: true } // Upsert option
        );
        res.json(user);

    } catch (err) {
        console.error("User Update Error:", err); // Added debug logging
        res.status(500).json({ error: err.message });
    }
});

// Get All Users (Admin)
router.get('/', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
