const mongoose = require('mongoose');

const widgetDailyStatSchema = new mongoose.Schema({
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    organizerId: { type: String, required: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    referrers: { type: [String], default: [] },
    sponsorClicks: [{
        sponsorshipId: String,
        sponsorName: String,
        clicks: { type: Number, default: 0 }
    }]
});

// One doc per org per day
widgetDailyStatSchema.index({ organizerId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WidgetDailyStat', widgetDailyStatSchema, 'fr_widget_daily_stats');
