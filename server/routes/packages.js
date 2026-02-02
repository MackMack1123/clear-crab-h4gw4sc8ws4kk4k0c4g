const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const { v4: uuidv4 } = require('uuid');
const { checkOrgAccess, canPerformAction } = require('../middleware/teamAuth');

// Get all packages (filtered by organizerId) - accessible by team members
router.get('/', async (req, res) => {
    try {
        const { organizerId, userId } = req.query;
        const query = organizerId ? { organizerId } : {};

        // If userId is provided, verify access
        if (organizerId && userId) {
            const { canAccess } = await checkOrgAccess(userId, organizerId);
            if (!canAccess) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

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

// Create new package - requires manager permission
router.post('/', async (req, res) => {
    try {
        const pkgData = req.body;
        const userId = req.headers['x-user-id'] || req.body.userId;
        const organizerId = pkgData.organizerId;

        // Verify user has permission to create packages for this org
        if (userId && organizerId) {
            const { canAccess, role } = await checkOrgAccess(userId, organizerId);
            if (!canAccess || !canPerformAction(role, 'editPackages')) {
                return res.status(403).json({ error: 'Insufficient permissions to create packages' });
            }
        }

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

// Update package - requires manager permission
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.headers['x-user-id'] || req.body.userId || req.query.userId;

        // First, find the package to get the organizerId
        const existingPackage = await Package.findById(id);
        if (!existingPackage) {
            return res.status(404).json({ message: 'Package not found' });
        }

        // Verify user has permission to update packages for this org
        if (userId) {
            const { canAccess, role } = await checkOrgAccess(userId, existingPackage.organizerId);
            if (!canAccess || !canPerformAction(role, 'editPackages')) {
                return res.status(403).json({ error: 'Insufficient permissions to update packages' });
            }
        }

        const updatedPackage = await Package.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        );

        res.json(updatedPackage);
    } catch (err) {
        console.error("Update Package Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Delete package - requires manager permission
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.headers['x-user-id'] || req.query.userId;

        // First, find the package to get the organizerId
        const existingPackage = await Package.findById(id);
        if (!existingPackage) {
            return res.status(404).json({ message: 'Package not found' });
        }

        // Verify user has permission to delete packages for this org
        if (userId) {
            const { canAccess, role } = await checkOrgAccess(userId, existingPackage.organizerId);
            if (!canAccess || !canPerformAction(role, 'editPackages')) {
                return res.status(403).json({ error: 'Insufficient permissions to delete packages' });
            }
        }

        await Package.findByIdAndDelete(id);
        res.json({ message: 'Package deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
