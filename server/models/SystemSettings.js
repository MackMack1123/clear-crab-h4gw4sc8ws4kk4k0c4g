const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema({
    _id: { type: String, default: 'global' }, // Single global settings document
    payments: {
        stripe: { type: Boolean, default: true },
        square: { type: Boolean, default: true },
        paypal: { type: Boolean, default: true },
        check: { type: Boolean, default: true }
    },
    registrations: {
        organizationsEnabled: { type: Boolean, default: true }
    },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: String } // Firebase UID of admin who last updated
}, { _id: false });

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema, 'fr_system_settings');
