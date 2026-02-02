const mongoose = require("mongoose");

const SponsorshipSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    // Use String for ref because we are keeping Firebase IDs
    packageId: { type: String, ref: "Package", required: true },
    organizerId: { type: String, required: true, ref: "User" },
    // Sponsor user info - links to Firebase Auth user
    sponsorUserId: { type: String, index: true }, // Firebase UID of sponsor
    sponsorName: { type: String, required: true },
    sponsorEmail: { type: String, required: true, index: true },
    sponsorPhone: String,
    childName: String, // Child attribution
    amount: { type: Number, required: true },
    paymentId: String,
    paymentMethod: {
      type: String,
      enum: ["stripe", "paypal", "square", "check", "sandbox"],
      default: "stripe",
    },
    isTest: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "paid", "branding-submitted"],
      default: "pending",
    },
    branding: {
      logoUrl: String,
      websiteUrl: String,
      tagline: String,
    },
    // Captured during Fulfilment
    sponsorInfo: {
      companyName: String,
      contactName: String,
      adMessage: String,
      email: String,
      phone: String,
    },
    children: [
      {
        name: String,
        division: String,
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

module.exports = mongoose.model(
  "Sponsorship",
  SponsorshipSchema,
  "fr_sponsorships",
);
