const mongoose = require('mongoose');

const pageViewEventSchema = new mongoose.Schema({
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    organizerId: { type: String, required: true },
    page: { type: String, required: true, enum: ['landing', 'review', 'auth', 'checkout', 'success'] },
    sessionId: { type: String },
    referrer: { type: String },
    timestamp: { type: Date, default: Date.now }
});

// Auto-delete after 90 days
pageViewEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
// Query index
pageViewEventSchema.index({ organizerId: 1, page: 1, timestamp: 1 });

module.exports = mongoose.model('PageViewEvent', pageViewEventSchema, 'fr_page_view_events');
