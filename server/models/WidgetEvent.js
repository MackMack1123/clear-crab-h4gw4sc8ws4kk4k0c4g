const mongoose = require('mongoose');

const widgetEventSchema = new mongoose.Schema({
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    organizerId: { type: String, required: true, index: true },
    eventType: { type: String, enum: ['impression', 'click'], required: true },
    sponsorshipId: String,
    sponsorName: String,
    widgetType: String,
    referrer: String,
    timestamp: { type: Date, default: Date.now }
});

// Auto-delete after 90 days
widgetEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Query index
widgetEventSchema.index({ organizerId: 1, eventType: 1, timestamp: 1 });

module.exports = mongoose.model('WidgetEvent', widgetEventSchema, 'fr_widget_events');
