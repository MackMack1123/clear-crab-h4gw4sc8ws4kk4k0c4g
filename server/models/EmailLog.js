const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, // Organization ID (Firebase UID)
    toEmail: { type: String, required: true },
    type: { type: String, required: true }, // e.g., 'sponsorship_confirmation'
    subject: { type: String, required: true },
    htmlBody: { type: String, required: true }, // Storing full rendered HTML as requested
    sentAt: { type: Date, default: Date.now },
    status: { type: String, default: 'sent' }, // 'sent', 'failed'
    metadata: { type: Map, of: String } // Optional extra data
});

module.exports = mongoose.model('EmailLog', EmailLogSchema, 'fr_email_logs');
