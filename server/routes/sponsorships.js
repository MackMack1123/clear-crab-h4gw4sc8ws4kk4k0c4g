const express = require("express");
const router = express.Router();
const Package = require("../models/Package");
const Sponsorship = require("../models/Sponsorship");

// --- PACKAGES ---

// Get active packages for an organizer (Public)
router.get("/packages/active/:organizerId", async (req, res) => {
  try {
    const packages = await Package.find({
      organizerId: req.params.organizerId,
      active: true,
    });
    // Ensure frontend gets 'id'
    const mapped = packages.map((p) => ({ ...p.toObject(), id: p._id }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all packages for an organizer (Admin)
router.get("/packages/:organizerId", async (req, res) => {
  try {
    const packages = await Package.find({
      organizerId: req.params.organizerId,
    });
    const mapped = packages.map((p) => ({ ...p.toObject(), id: p._id }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Package
router.post("/packages", async (req, res) => {
  try {
    const newPackage = new Package(req.body);
    const savedPackage = await newPackage.save();
    res.json({ id: savedPackage._id, ...savedPackage.toObject() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Package
router.put("/packages/:id", async (req, res) => {
  try {
    const updatedPackage = await Package.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true },
    );
    res.json(updatedPackage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Package by ID (Public)
router.get("/package/:id", async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ error: "Package not found" });
    const mapped = { ...pkg.toObject(), id: pkg._id };
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Package
router.delete("/packages/:id", async (req, res) => {
  try {
    await Package.findByIdAndDelete(req.params.id);
    res.json({ message: "Package deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SPONSORSHIPS ---

const slackService = require("../services/slackService");
const emailService = require("../services/emailService");
const User = require("../models/User");

// Create Sponsorship (Purchase)
router.post("/", async (req, res) => {
  try {
    const newSponsorship = new Sponsorship(req.body);
    const savedSponsorship = await newSponsorship.save();

    // --- Slack Notification Trigger ---
    // 1. Get the Package details (for title/price)
    const pkg = await Package.findById(savedSponsorship.packageId);

    // 2. Get the Organizer (to check Slack settings)
    const organizer = await User.findById(savedSponsorship.organizerId);

    if (
      organizer &&
      organizer.slackSettings &&
      organizer.slackSettings.connected
    ) {
      console.log(`Sending Slack notification for Organizer ${organizer._id}`);
      // Fire and forget - don't block the response
      slackService
        .sendSponsorshipNotification(
          organizer.slackSettings.incomingWebhook.url,
          savedSponsorship,
          pkg || { title: "Unknown Package", price: "0" },
        )
        .catch((err) => console.error("Async Slack Error:", err));
    }

    // --- Email Confirmation to Sponsor ---
    if (
      organizer &&
      savedSponsorship.sponsorEmail &&
      savedSponsorship.status === "paid"
    ) {
      console.log(
        `Sending sponsorship confirmation email to ${savedSponsorship.sponsorEmail}`,
      );
      // Fire and forget - don't block the response
      const portalUrl = `${process.env.FRONTEND_URL || "https://getfundraisr.io"}/sponsor/dashboard`;
      emailService
        .sendTemplateEmail(
          organizer,
          "sponsorship_confirmation",
          savedSponsorship.sponsorEmail,
          {
            donorName: savedSponsorship.sponsorName || "Valued Sponsor",
            contactName: savedSponsorship.sponsorName || "Valued Sponsor",
            amount: `$${savedSponsorship.amount}`,
            packageTitle:
              pkg?.title ||
              savedSponsorship.packageTitle ||
              "Sponsorship Package",
            portalUrl: portalUrl,
          },
        )
        .catch((err) => console.error("Async Email Error:", err));
    }
    // ----------------------------------

    res.json({ id: savedSponsorship._id, ...savedSponsorship.toObject() });
  } catch (err) {
    console.error("Sponsorship Creation Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update Sponsorship
router.put("/:id", async (req, res) => {
  try {
    const updatedSponsorship = await Sponsorship.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true },
    );
    res.json(updatedSponsorship);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific sponsorship
router.get("/:id", async (req, res) => {
  try {
    const sponsorship = await Sponsorship.findById(req.params.id);
    res.json(sponsorship);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all sponsorships for an organizer
router.get("/organizer/:organizerId", async (req, res) => {
  try {
    const sponsorships = await Sponsorship.find({
      organizerId: req.params.organizerId,
    });
    res.json(sponsorships);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get ALL sponsorships (Admin only)
router.get("/admin/all", async (req, res) => {
  try {
    // TODO: Add admin authentication check
    const sponsorships = await Sponsorship.find({})
      .sort({ createdAt: -1 })
      .lean();

    // Manually populate organizer and package data
    if (sponsorships.length > 0) {
      const organizerIds = [
        ...new Set(sponsorships.map((s) => s.organizerId).filter(Boolean)),
      ];
      const packageIds = [
        ...new Set(sponsorships.map((s) => s.packageId).filter(Boolean)),
      ];

      // Fetch organizers
      const organizers = await User.find({ _id: { $in: organizerIds } })
        .select("email organizationProfile.orgName")
        .lean();
      const organizerMap = {};
      organizers.forEach((o) => {
        organizerMap[o._id] = o;
      });

      // Fetch packages
      const packages = await Package.find({ _id: { $in: packageIds } })
        .select("title price")
        .lean();
      const packageMap = {};
      packages.forEach((p) => {
        packageMap[p._id] = p;
      });

      // Attach populated data
      const populatedSponsorships = sponsorships.map((s) => ({
        ...s,
        id: s._id,
        organizer: organizerMap[s.organizerId] || null,
        package: packageMap[s.packageId] || null,
      }));

      return res.json(populatedSponsorships);
    }

    res.json(sponsorships);
  } catch (err) {
    console.error("[Admin Sponsorships Error]", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all sponsorships for a specific sponsor (User)
router.get("/sponsor/:userId", async (req, res) => {
  try {
    const { email } = req.query;
    const userId = req.params.userId;

    console.log(`[Sponsor Lookup] userId: ${userId}, email: ${email}`);

    // Always search by both userId AND email to catch all cases
    const query = email
      ? { $or: [{ sponsorUserId: userId }, { sponsorEmail: email }] }
      : { sponsorUserId: userId };

    let sponsorships = await Sponsorship.find(query)
      .sort({ createdAt: -1 })
      .lean(); // Use lean for better performance and easier manipulation

    console.log(`[Sponsor Lookup] Found ${sponsorships.length} sponsorships`);

    // Manually populate organizer and package data if needed
    // This handles cases where refs might not match due to string ID issues
    if (sponsorships.length > 0) {
      const organizerIds = [
        ...new Set(sponsorships.map((s) => s.organizerId).filter(Boolean)),
      ];
      const packageIds = [
        ...new Set(sponsorships.map((s) => s.packageId).filter(Boolean)),
      ];

      // Fetch organizers
      const organizers = await User.find({ _id: { $in: organizerIds } })
        .select("organizationProfile")
        .lean();
      const organizerMap = {};
      organizers.forEach((o) => {
        organizerMap[o._id] = o;
      });

      // Fetch packages
      const packages = await Package.find({ _id: { $in: packageIds } })
        .select("title price")
        .lean();
      const packageMap = {};
      packages.forEach((p) => {
        packageMap[p._id] = p;
      });

      // Attach populated data
      sponsorships = sponsorships.map((s) => ({
        ...s,
        organizerId: organizerMap[s.organizerId] || {
          _id: s.organizerId,
          organizationProfile: null,
        },
        packageId: packageMap[s.packageId] || {
          _id: s.packageId,
          title: s.packageTitle,
          price: s.amount,
        },
      }));
    }

    res.json(sponsorships);
  } catch (err) {
    console.error("[Sponsor Lookup Error]", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
