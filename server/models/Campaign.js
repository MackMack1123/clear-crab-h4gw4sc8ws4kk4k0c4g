const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
    _id: { type: String },
    organizerId: { type: String, required: true, ref: 'User' },
    title: { type: String, required: true },
    description: String,
    goalAmount: { type: Number, default: 0 },
    currentAmount: { type: Number, default: 0 },
    imageUrl: String,
    type: { type: String, enum: ['5050', 'grid', 'standard'], default: 'standard' },
    deadline: Date,
    status: { type: String, default: 'active' }, // active, paused, ended
    createdAt: { type: Date, default: Date.now },
    settings: {
        allowTips: { type: Boolean, default: true },
        coverFees: { type: Boolean, default: true }
    }
}, { _id: false });

module.exports = mongoose.model('Campaign', CampaignSchema, 'fr_campaigns');
