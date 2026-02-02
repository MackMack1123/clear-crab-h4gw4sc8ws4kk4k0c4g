const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { checkOrgAccess, canPerformAction } = require('../middleware/teamAuth');

// Helper to determine what permission level is needed for specific fields
function getRequiredPermissionForUpdate(updates) {
    const ownerOnlyFields = [
        'organizationProfile.orgName',
        'organizationProfile.contactEmail',
        'organizationProfile.website',
        'organizationProfile.primaryColor',
        'organizationProfile.logoUrl',
        'organizationProfile.slug',
        'organizationProfile.emailTemplates',
        'paymentSettings',
        'slug',
        'email',
        'teamMembers',
        'teamInvitations'
    ];

    const managerFields = [
        'publicContent',
        'organizationProfile.description'
    ];

    const updateKeys = Object.keys(updates);

    // Check for owner-only fields
    for (const key of updateKeys) {
        if (ownerOnlyFields.some(f => key.startsWith(f))) {
            return 'editSettings';
        }
    }

    // Check for manager-level fields
    for (const key of updateKeys) {
        if (managerFields.some(f => key.startsWith(f))) {
            return 'editContent';
        }
    }

    // Default to owner for safety
    return 'editSettings';
}

// Check slug availability (must be before /:id to avoid being caught)
router.get('/check-slug/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const userId = req.query.userId; // Exclude current user from check

        const query = {
            $and: [
                {
                    $or: [
                        { slug: slug },
                        { 'organizationProfile.slug': slug }
                    ]
                }
            ]
        };

        if (userId) {
            query.$and.push({ _id: { $ne: userId } });
        }

        const existing = await User.findOne(query);
        res.json({ available: !existing });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get User (by ID or Slug)
router.get('/:id', async (req, res) => {
    const idOrSlug = req.params.id;
    try {
        let user;

        // First, try to find by _id (Firebase UID or MongoDB ObjectId)
        user = await User.findById(idOrSlug).lean();

        // If not found by ID, try to find by slug (root or nested)
        if (!user) {
            user = await User.findOne({
                $or: [
                    { slug: idOrSlug },
                    { 'organizationProfile.slug': idOrSlug }
                ]
            }).lean();
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        // If findById throws a CastError (invalid ObjectId format), try slug lookup
        if (err.name === 'CastError') {
            try {
                const user = await User.findOne({
                    $or: [
                        { slug: idOrSlug },
                        { 'organizationProfile.slug': idOrSlug }
                    ]
                });
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
        const requesterId = req.headers['x-user-id'] || req.body._requesterId;

        // Remove _requesterId from updates if present (it's metadata, not actual data)
        delete updates._requesterId;

        // If a requester ID is provided, verify they have permission
        if (requesterId && requesterId !== id) {
            const { canAccess, role } = await checkOrgAccess(requesterId, id);

            if (!canAccess) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Determine what permission is needed for this update
            const requiredAction = getRequiredPermissionForUpdate(updates);
            if (!canPerformAction(role, requiredAction)) {
                return res.status(403).json({
                    error: 'Insufficient permissions for this action',
                    required: requiredAction,
                    current: role
                });
            }
        }

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
