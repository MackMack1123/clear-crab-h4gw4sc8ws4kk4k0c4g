const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Package = require('../models/Package');

// Get all organizations with active sponsorship packages (Public)
router.get('/organizations', async (req, res) => {
    try {
        const { search, limit = 20, offset = 0 } = req.query;

        // Find all organizers with organization profiles
        let query = {
            role: 'organizer',
            'organizationProfile.orgName': { $exists: true, $ne: '' },
            'organizationProfile.slug': { $exists: true, $ne: '' }
        };

        // Add search filter if provided
        if (search) {
            query['organizationProfile.orgName'] = {
                $regex: search,
                $options: 'i'
            };
        }

        // Get users with org profiles
        const users = await User.find(query)
            .select('_id organizationProfile')
            .limit(parseInt(limit))
            .skip(parseInt(offset))
            .lean();

        // Get package counts for each organizer
        const organizerIds = users.map(u => u._id);
        const packageCounts = await Package.aggregate([
            {
                $match: {
                    organizerId: { $in: organizerIds },
                    active: true
                }
            },
            {
                $group: {
                    _id: '$organizerId',
                    count: { $sum: 1 },
                    minPrice: { $min: '$price' }
                }
            }
        ]);

        // Create a map for quick lookup
        const packageMap = {};
        packageCounts.forEach(p => {
            packageMap[p._id] = { count: p.count, minPrice: p.minPrice };
        });

        // Filter users to only those with active packages and combine data
        const organizations = users
            .filter(u => packageMap[u._id] && packageMap[u._id].count > 0)
            .map(user => ({
                id: user._id,
                orgName: user.organizationProfile?.orgName || '',
                slug: user.organizationProfile?.slug || '',
                logoUrl: user.organizationProfile?.logoUrl || '',
                description: user.organizationProfile?.description || '',
                primaryColor: user.organizationProfile?.primaryColor || '#7c3aed',
                packageCount: packageMap[user._id]?.count || 0,
                startingPrice: packageMap[user._id]?.minPrice || 0
            }));

        // Get total count for pagination
        const total = organizations.length;

        res.json({
            organizations,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (err) {
        console.error('Discover Organizations Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
