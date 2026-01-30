const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');

// Create Campaign
router.post('/', async (req, res) => {
    try {
        const newCampaign = new Campaign(req.body);
        const savedCampaign = await newCampaign.save();
        res.json({ id: savedCampaign._id, ...savedCampaign.toObject() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Campaign by ID
router.get('/:id', async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        res.json({ id: campaign._id, ...campaign.toObject() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Campaign
router.put('/:id', async (req, res) => {
    try {
        const updatedCampaign = await Campaign.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.json(updatedCampaign);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Campaigns by Organizer
router.get('/organizer/:organizerId', async (req, res) => {
    try {
        const campaigns = await Campaign.find({ organizerId: req.params.organizerId });
        res.json(campaigns.map(c => ({ id: c._id, ...c.toObject() })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Campaigns (Admin)
router.get('/', async (req, res) => {
    try {
        const campaigns = await Campaign.find();
        res.json(campaigns.map(c => ({ id: c._id, ...c.toObject() })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
