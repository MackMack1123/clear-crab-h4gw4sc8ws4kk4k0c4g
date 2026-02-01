const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const { v4: uuidv4 } = require('uuid');

// Get all packages (filtered by organizerId)
router.get('/', async (req, res) => {
    try {
        const { organizerId } = req.query;
        const query = organizerId ? { organizerId } : {};
        const packages = await Package.find(query);
        res.json(packages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get active packages for a specific organizer (Public endpoint)
router.get('/active/:organizerId', async (req, res) => {
    try {
        const { organizerId } = req.params;
        const packages = await Package.find({
            organizerId,
            active: { $ne: false }  // Include packages where active is true or not set
        });
        res.json(packages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new package
router.post('/', async (req, res) => {
    try {
        const pkgData = req.body;

        // Generate a string ID if not provided (consistency with migration)
        if (!pkgData._id) {
            pkgData._id = uuidv4();
        }

        const newPackage = new Package(pkgData);
        await newPackage.save();
        res.status(201).json(newPackage);
    } catch (err) {
        console.error("Create Package Error:", err);
        res.status(400).json({ error: err.message });
    }
});

// Update package
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updatedPackage = await Package.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        );

        if (!updatedPackage) {
            return res.status(404).json({ message: 'Package not found' });
        }
        res.json(updatedPackage);
    } catch (err) {
        console.error("Update Package Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Delete package
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Package.findByIdAndDelete(id);
        res.json({ message: 'Package deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
