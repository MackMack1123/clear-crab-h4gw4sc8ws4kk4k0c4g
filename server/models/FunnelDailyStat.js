const mongoose = require('mongoose');

const funnelDailyStatSchema = new mongoose.Schema({
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    organizerId: { type: String, required: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    landing: { type: Number, default: 0 },
    review: { type: Number, default: 0 },
    auth: { type: Number, default: 0 },
    checkout: { type: Number, default: 0 },
    success: { type: Number, default: 0 },
    referrers: { type: [String], default: [] }
});

// One doc per org per day
funnelDailyStatSchema.index({ organizerId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('FunnelDailyStat', funnelDailyStatSchema, 'fr_funnel_daily_stats');
