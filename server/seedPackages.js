require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Package = require('./models/Package');
const { v4: uuidv4 } = require('uuid');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fundraisr')
    .then(() => {
        console.log('MongoDB Connected for Package Seeding');
        seedPackages();
    })
    .catch(err => console.error('MongoDB Connection Error:', err));

const packagesData = [
    {
        title: "In-House Team Sponsorship",
        price: 500,
        description: "Every girl on your team will proudly display your organization's name as their team uniform which each player keeps, offering year-round advertising potential.",
        features: [
            "Organization name on team uniforms",
            "Players keep the uniforms (walking billboards)",
            "Year-round brand visibility",
            "Logo & Website link on NSPL site"
        ]
    },
    {
        title: "Field Sign Sponsorship – 1 Year",
        price: 400,
        description: "Display your organization name proudly on a professional, weather-resistant sign on the NSPL A or B Field.",
        features: [
            "Professional Weather-Resistant Sign",
            "Located on A or B Field",
            "High visibility (Hundreds of families)",
            "Logo & Website link on NSPL site",
            "Duration: 1 Year"
        ]
    },
    {
        title: "Field Sign Sponsorship – 2 Years",
        price: 700,
        description: "Display your organization name proudly on a professional, weather-resistant sign on NSPL A or B Field.",
        features: [
            "Professional Weather-Resistant Sign",
            "Located on A or B Field",
            "Significant Savings vs 1-Year",
            "Logo & Website link on NSPL site",
            "Duration: 2 Years"
        ]
    },
    {
        title: "Field Sign Sponsorship – 3 Years",
        price: 1000,
        description: "Display your organization name proudly on a professional, weather-resistant sign on NSPL's A or B field.",
        features: [
            "Professional Weather-Resistant Sign",
            "Prime Field Location",
            "Best Value (Save $200)",
            "Logo & Website link on NSPL site",
            "Duration: 3 Years"
        ]
    },
    {
        title: "Snack Bar Sponsorship",
        price: 800,
        description: "NSPL will proudly display your organization's name and logo prominently at our high-traffic snack bar area.",
        features: [
            "Prominent Signage at Snack Bar",
            "High-Traffic Central Hub",
            "Seen by every family/guest",
            "Maximum Brand Visibility"
        ]
    },
    {
        title: "Scoreboard Advertising",
        price: 1000,
        description: "NSPL will proudly display your organization's sign, and your sign only, on one of the scoreboards elevated above the outfield fence.",
        features: [
            "Exclusive Scoreboard Signage",
            "Elevated Outfield Visibility",
            "High Impact Location",
            "Limited Availability (Only 3)"
        ]
    },
    {
        title: "Backstop Advertising",
        price: 800,
        description: "NSPL will proudly display your organization's sign (4' x 5'), on one of the backstops, elevated above the batter's box.",
        features: [
            "4' x 5' Professional Sign",
            "Prime Spot above Batter's Box",
            "Center of Action Visibility",
            "Limited Availability (Only 9)"
        ]
    },
    {
        title: "Field Lighting Initiative - Permanent",
        price: 2000,
        description: "Be a sponsor for our field lighting initiative. $2,000 will get your name permanently etched on our field light installations.",
        features: [
            "Name Etched on Light Installation",
            "Permanent / Lifetime Recognition",
            "Supports Vital Field Improvements",
            "Highest Tier Contribution"
        ]
    }
];

async function seedPackages() {
    try {
        const user = await User.findOne();
        if (!user) {
            console.error("No user found! Please log in first.");
            process.exit(1);
        }

        console.log(`Updating packages for organizer: ${user.email} (${user._id})`);

        // Clear existing packages to avoid duplicates
        await Package.deleteMany({ organizerId: user._id });
        console.log("Cleared existing packages.");

        // Create package documents
        const packageDocs = packagesData.map(pkg => ({
            _id: uuidv4(),
            organizerId: user._id,
            ...pkg,
            active: true
        }));

        await Package.insertMany(packageDocs);

        console.log(`Successfully added ${packageDocs.length} packages with features!`);
        process.exit(0);
    } catch (err) {
        console.error("Seeding Failed:", err);
        process.exit(1);
    }
}
