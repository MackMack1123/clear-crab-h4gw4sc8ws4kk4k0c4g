const mongoose = require('mongoose');
require('dotenv').config({ path: '../server/.env' });

const User = require('./models/User');
const Sponsorship = require('./models/Sponsorship');
const Package = require('./models/Package');

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        console.log("\n=== USERS ===");
        const users = await User.find({});
        users.forEach(u => console.log(`${u.email} -> ${u._id} (${u.firstName} ${u.lastName})`));

        console.log("\n=== SPONSORSHIPS ===");
        const sponsorships = await Sponsorship.find({});
        sponsorships.forEach(async s => {
            console.log(`ID: ${s._id}`);
            console.log(`  Package: ${s.packageId}`);
            console.log(`  Organizer: ${s.organizerId}`);

            const org = await User.findById(s.organizerId);
            console.log(`  -> Org Name: ${org?.organizationProfile?.orgName}`);
            console.log(`  -> Org Logo: ${org?.organizationProfile?.logoUrl}`);
            console.log('---');
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
