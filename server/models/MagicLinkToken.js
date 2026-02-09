const mongoose = require('mongoose');

const magicLinkTokenSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true },
    role: { type: String, default: 'organizer' },
    redirectTo: { type: String, default: null },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date }
}, { timestamps: true });

// Auto-delete expired tokens
magicLinkTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('MagicLinkToken', magicLinkTokenSchema, 'fr_magic_link_tokens');
