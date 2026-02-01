const mongoose = require('mongoose');

const WaitlistSchema = new mongoose.Schema({
    orgName: { type: String, required: true },
    contactName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    website: { type: String },
    orgType: {
        type: String,
        enum: ['Club', 'Team', 'League', 'School', 'Non-Profit', 'Other'],
        required: true
    },
    sport: { type: String, required: true },
    teamCount: { type: String }, // e.g., "1-5", "5-20", "20+"
    fundraisingGoals: { type: String },
    createdAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['pending', 'approved', 'contacted'],
        default: 'pending'
    }
});

module.exports = mongoose.model('Waitlist', WaitlistSchema);
