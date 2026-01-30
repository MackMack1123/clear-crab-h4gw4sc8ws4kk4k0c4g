require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Package = require('./models/Package');
const { v4: uuidv4 } = require('uuid');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fundraisr')
    .then(() => {
        console.log('MongoDB Connected for Optimization');
        optimizeContent();
    })
    .catch(err => console.error('MongoDB Connection Error:', err));

async function optimizeContent() {
    try {
        const user = await User.findOne();
        if (!user) {
            console.error("No user found!");
            process.exit(1);
        }

        console.log(`Optimizing content for: ${user.email}`);

        // Fetch all packages to get their IDs
        const packages = await Package.find({ organizerId: user._id });
        const allPackageIds = packages.map(p => p._id);

        const HighConversionContent = [
            // 1. HERO: Strong Hook
            {
                id: uuidv4(),
                type: 'hero',
                title: "Get Your Brand in Front of 500+ Local Families",
                body: "Partner with our league to build community loyalty and drive local traffic. We provide the audience, you provide the support.",
                imageUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&q=80&w=2000', // A generic sports action shot
                overlayColor: 'primary',
                overlayOpacity: 60
            },

            // 2. SOCIAL PROOF: Stats
            {
                id: uuidv4(),
                type: 'stats',
                stats: [
                    { value: '500+', label: 'Local Families' },
                    { value: '50+', label: 'Active Teams' },
                    { value: '12k', label: 'Annual Views' },
                    { value: '100%', label: 'Tax Deductible' }
                ]
            },

            // 3. INTRO TEXT: Why Sponsor?
            {
                id: uuidv4(),
                type: 'text',
                alignment: 'center',
                title: "Why Partner With Us?",
                body: "Our sponsorship packages are designed to give you maximum visibility while providing essential equipment and facilities for our youth athletes. It's a win-win for local business and local sports."
            },

            // 4. THE PRODUCT: Package Gallery
            {
                id: uuidv4(),
                type: 'package_gallery',
                title: "Choose Your Level of Support",
                packageIds: allPackageIds // Auto-include all packages
            },

            // 5. CTA: Final Push
            {
                id: uuidv4(),
                type: 'cta',
                title: "Have a Custom Idea?",
                body: "We are flexible! If you have a specific marketing goal or budget, reach out to our team to discuss meaningful ways to collaborate.",
                buttonText: "Contact Sponsorship Director",
                buttonLink: `mailto:${user.email}`
            }
        ];

        // Update User Profile
        user.publicContent = HighConversionContent;
        // Also update 'organizationProfile' if needed, but 'publicContent' is what renders blocks.

        // Mongoose Mixed type detection requires marking modified sometimes
        user.markModified('publicContent');

        await user.save();

        console.log("Optimization Complete! The page now has a Hero, Stats, Grid, and CTA.");
        process.exit(0);

    } catch (err) {
        console.error("Optimization Failed:", err);
        process.exit(1);
    }
}
