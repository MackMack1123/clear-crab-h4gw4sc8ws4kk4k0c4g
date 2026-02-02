const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema({
    _id: { type: String, default: 'global' }, // Single global settings document
    payments: {
        stripe: { type: Boolean, default: true },
        square: { type: Boolean, default: true },
        paypal: { type: Boolean, default: true },
        check: { type: Boolean, default: true }
    },
    fees: {
        platformFeePercent: { type: Number, default: 5, min: 0, max: 100 }, // Platform fee as percentage (e.g., 5 = 5%)
        processingFeePercent: { type: Number, default: 2.9, min: 0, max: 100 }, // CC processing fee percent
        processingFeeFixed: { type: Number, default: 0.30, min: 0 } // CC fixed fee per transaction
    },
    registrations: {
        organizationsEnabled: { type: Boolean, default: true }
    },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: String } // Firebase UID of admin who last updated
}, { _id: false });

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema, 'fr_system_settings');
