const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
    _id: { type: String }, // For migration compatibility
    organizerId: { type: String, required: true, ref: 'User' },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    description: String,
    features: [String],
    imageUrl: String,
    // Sign location preview images for sponsors to visualize their logos
    signPreviewImages: [{
        url: String,
        name: String, // e.g., "Outfield Banner", "Snack Bar Sign"
        placementZone: {
            x: { type: Number, default: 10 },      // % from left
            y: { type: Number, default: 10 },      // % from top
            width: { type: Number, default: 80 },  // % of image width
            height: { type: Number, default: 30 }  // % of image height
        }
    }],
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
}, { _id: false }); // Disable auto-generated ObjectId

module.exports = mongoose.model('Package', PackageSchema, 'fr_packages');
