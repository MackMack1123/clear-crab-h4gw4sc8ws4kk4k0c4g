require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fundraisr')
    .then(() => {
        console.log('MongoDB Connected for Seeding');
        seedContent();
    })
    .catch(err => console.error('MongoDB Connection Error:', err));

async function seedContent() {
    try {
        // Find the first user (likely the one the user just created via login)
        const user = await User.findOne();

        if (!user) {
            console.log("No user found! Log in to the app first.");
            process.exit(1);
        }

        console.log(`Seeding content for user: ${user.email} (${user._id})`);

        const newContent = [
            {
                id: 'hero-1',
                type: 'hero',
                title: 'Welcome to Our Sponsorship Portal',
                body: 'Help us achieve our goals by partnering with our organization. Your support makes a difference.',
                imageUrl: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&q=80&w=2000',
                overlayColor: 'black',
                overlayOpacity: 60
            },
            {
                id: 'spotlight-1',
                type: 'package_highlight',
                title: 'Featured Sponsorship',
                body: 'Our most popular package provides maximum visibility for your brand.',
                // We leave packageId empty or mock it. The UI defaults to select box if empty.
                packageId: ''
            },
            {
                id: 'footer-1',
                type: 'cta', // Acts as a footer/call-to-action
                title: 'Ready to make an impact?',
                body: 'Contact our team today to discuss custom opportunities.',
                buttonText: 'Get in Touch',
                buttonLink: `mailto:${user.email}`
            }
        ];

        user.publicContent = newContent;
        await user.save();

        console.log("Content successfully added!");
        process.exit(0);

    } catch (error) {
        console.error('Seeding Failed:', error);
        process.exit(1);
    }
}
