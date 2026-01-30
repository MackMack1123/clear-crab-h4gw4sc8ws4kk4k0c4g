const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const Sponsorship = require('../models/Sponsorship');

// --- PACKAGES ---

// Get active packages for an organizer (Public)
router.get('/packages/active/:organizerId', async (req, res) => {
    try {
        const packages = await Package.find({
            organizerId: req.params.organizerId,
            active: true
        });
        // Ensure frontend gets 'id'
        const mapped = packages.map(p => ({ ...p.toObject(), id: p._id }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all packages for an organizer (Admin)
router.get('/packages/:organizerId', async (req, res) => {
    try {
        const packages = await Package.find({ organizerId: req.params.organizerId });
        const mapped = packages.map(p => ({ ...p.toObject(), id: p._id }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Package
router.post('/packages', async (req, res) => {
    try {
        const newPackage = new Package(req.body);
        const savedPackage = await newPackage.save();
        res.json({ id: savedPackage._id, ...savedPackage.toObject() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Package
router.put('/packages/:id', async (req, res) => {
    try {
        const updatedPackage = await Package.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.json(updatedPackage);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Single Package by ID (Public)
router.get('/package/:id', async (req, res) => {
    try {
        const pkg = await Package.findById(req.params.id);
        if (!pkg) return res.status(404).json({ error: 'Package not found' });
        const mapped = { ...pkg.toObject(), id: pkg._id };
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Package
router.delete('/packages/:id', async (req, res) => {
    try {
        await Package.findByIdAndDelete(req.params.id);
        res.json({ message: 'Package deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SPONSORSHIPS ---

const slackService = require('../services/slackService');
const User = require('../models/User');

// Create Sponsorship (Purchase)
router.post('/', async (req, res) => {
    try {
        const newSponsorship = new Sponsorship(req.body);
        const savedSponsorship = await newSponsorship.save();

        // --- Slack Notification Trigger ---
        // 1. Get the Package details (for title/price)
        const pkg = await Package.findById(savedSponsorship.packageId);

        // 2. Get the Organizer (to check Slack settings)
        const organizer = await User.findById(savedSponsorship.organizerId);

        if (organizer && organizer.slackSettings && organizer.slackSettings.connected) {
            console.log(`Sending Slack notification for Organizer ${organizer._id}`);
            // Fire and forget - don't block the response
            slackService.sendSponsorshipNotification(
                organizer.slackSettings.incomingWebhook.url,
                savedSponsorship,
                pkg || { title: 'Unknown Package', price: '0' }
            ).catch(err => console.error("Async Slack Error:", err));
        }
        // ----------------------------------

        res.json({ id: savedSponsorship._id, ...savedSponsorship.toObject() });
    } catch (err) {
        console.error("Sponsorship Creation Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Update Sponsorship
router.put('/:id', async (req, res) => {
    try {
        const updatedSponsorship = await Sponsorship.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.json(updatedSponsorship);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get specific sponsorship
router.get('/:id', async (req, res) => {
    try {
        const sponsorship = await Sponsorship.findById(req.params.id);
        res.json(sponsorship);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all sponsorships for an organizer
router.get('/organizer/:organizerId', async (req, res) => {
    try {
        const sponsorships = await Sponsorship.find({ organizerId: req.params.organizerId });
        res.json(sponsorships);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all sponsorships for a specific sponsor (User)
router.get('/sponsor/:userId', async (req, res) => {
    try {
        const { email } = req.query;
        const query = { sponsorUserId: req.params.userId };

        if (email) {
            // Find by ID OR Email
            const sponsorships = await Sponsorship.find({
                $or: [
                    { sponsorUserId: req.params.userId },
                    { sponsorEmail: email }
                ]
            })
                .populate('organizerId', 'organizationProfile')
                .populate('packageId', 'title price')
                .sort({ createdAt: -1 });
            return res.json(sponsorships);
        }

        const sponsorships = await Sponsorship.find(query)
            .populate('organizerId', 'organizationProfile')
            .populate('packageId', 'title price')
            .sort({ createdAt: -1 });
        res.json(sponsorships);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
