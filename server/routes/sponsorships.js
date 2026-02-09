const express = require("express");
const router = express.Router();
const Package = require("../models/Package");
const Sponsorship = require("../models/Sponsorship");
const { checkOrgAccess, canPerformAction } = require("../middleware/teamAuth");

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

// Get all packages for an organizer (accessible by team members)
router.get("/packages/:organizerId", async (req, res) => {
  try {
    const { userId } = req.query;
    const { organizerId } = req.params;

    // If userId is provided and different from organizerId, verify team access
    if (userId && userId !== organizerId) {
      const { canAccess } = await checkOrgAccess(userId, organizerId);
      if (!canAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const packages = await Package.find({
      organizerId: organizerId,
    });
    const mapped = packages.map((p) => ({ ...p.toObject(), id: p._id }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Package (requires manager permission)
router.post("/packages", async (req, res) => {
  try {
    const { organizerId, userId } = req.body;
    const requesterId = req.headers['x-user-id'] || userId;

    // If requester is different from organizer, verify team access
    if (requesterId && organizerId && requesterId !== organizerId) {
      const { canAccess, role } = await checkOrgAccess(requesterId, organizerId);
      if (!canAccess || !canPerformAction(role, 'editPackages')) {
        return res.status(403).json({ error: "Insufficient permissions to create packages" });
      }
    }

    // Generate a unique ID since schema has _id: false (auto-generation disabled)
    const packageData = {
      ...req.body,
      _id: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const newPackage = new Package(packageData);
    const savedPackage = await newPackage.save();
    res.json({ id: savedPackage._id, ...savedPackage.toObject() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Package (requires manager permission)
router.put("/packages/:id", async (req, res) => {
  try {
    const { userId } = req.body;
    const requesterId = req.headers['x-user-id'] || userId;

    // Find package to get organizerId
    const existingPackage = await Package.findById(req.params.id);
    if (!existingPackage) {
      return res.status(404).json({ error: "Package not found" });
    }

    // Verify team access if requester is different from organizer
    if (requesterId && requesterId !== existingPackage.organizerId) {
      const { canAccess, role } = await checkOrgAccess(requesterId, existingPackage.organizerId);
      if (!canAccess || !canPerformAction(role, 'editPackages')) {
        return res.status(403).json({ error: "Insufficient permissions to update packages" });
      }
    }

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

// Delete Package (requires manager permission)
router.delete("/packages/:id", async (req, res) => {
  try {
    const requesterId = req.headers['x-user-id'] || req.query.userId;

    // Find package to get organizerId
    const existingPackage = await Package.findById(req.params.id);
    if (!existingPackage) {
      return res.status(404).json({ error: "Package not found" });
    }

    // Verify team access if requester is different from organizer
    if (requesterId && requesterId !== existingPackage.organizerId) {
      const { canAccess, role } = await checkOrgAccess(requesterId, existingPackage.organizerId);
      if (!canAccess || !canPerformAction(role, 'editPackages')) {
        return res.status(403).json({ error: "Insufficient permissions to delete packages" });
      }
    }

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

// Lookup sponsor by email (for guest checkout recognition)
router.get("/lookup-by-email/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();

    // Find most recent sponsorship for this email
    const sponsorships = await Sponsorship.find({
      sponsorEmail: { $regex: new RegExp(`^${email}$`, 'i') }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (sponsorships.length === 0) {
      return res.json({ found: false });
    }

    // Get the most recent sponsorship for pre-fill data
    const mostRecent = sponsorships[0];

    // Get unique organizer names they've sponsored
    const organizerIds = [...new Set(sponsorships.map(s => s.organizerId))];
    const organizers = await User.find({ _id: { $in: organizerIds } })
      .select('organizationProfile.orgName')
      .lean();

    const orgNames = organizers
      .map(o => o.organizationProfile?.orgName)
      .filter(Boolean);

    // Don't expose organization names to prevent data leakage
    // Only return that they're a returning sponsor and prefill data
    res.json({
      found: true,
      sponsorshipCount: sponsorships.length,
      // Removed: organizations: orgNames (privacy concern - don't expose who they've sponsored)
      // Pre-fill data from most recent sponsorship
      prefill: {
        companyName: mostRecent.sponsorInfo?.companyName || '',
        contactName: mostRecent.sponsorInfo?.contactName || mostRecent.sponsorName || '',
        phone: mostRecent.sponsorInfo?.phone || mostRecent.sponsorPhone || '',
        email: mostRecent.sponsorEmail || email,
      },
      // Check if they have an account
      hasAccount: !!mostRecent.sponsorUserId
    });
  } catch (err) {
    console.error("[Email Lookup Error]", err);
    res.status(500).json({ error: err.message });
  }
});

// Link all sponsorships with matching email to a new user account
// Security: Only links if the user's verified email matches the sponsorship email
router.post("/link-account", async (req, res) => {
  try {
    const { email, userId } = req.body;

    if (!email || !userId) {
      return res.status(400).json({ error: "Email and userId are required" });
    }

    // Verify that the userId's account email matches the email being linked
    // This prevents malicious users from claiming others' sponsorships
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({
        error: "Email mismatch - can only link sponsorships matching your account email"
      });
    }

    // Update all sponsorships with matching email to include the new userId
    const result = await Sponsorship.updateMany(
      {
        sponsorEmail: { $regex: new RegExp(`^${email}$`, 'i') },
        $or: [
          { sponsorUserId: { $exists: false } },
          { sponsorUserId: null },
          { sponsorUserId: '' }
        ]
      },
      { $set: { sponsorUserId: userId } }
    );

    console.log(`[Link Account] Linked ${result.modifiedCount} sponsorships to user ${userId}`);

    res.json({
      success: true,
      linkedCount: result.modifiedCount
    });
  } catch (err) {
    console.error("[Link Account Error]", err);
    res.status(500).json({ error: err.message });
  }
});

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

// Update Sponsorship (requires authorization)
router.put("/:id", async (req, res) => {
  try {
    // Get existing sponsorship to check ownership and branding changes
    const existingSponsorship = await Sponsorship.findById(req.params.id);
    if (!existingSponsorship) {
      return res.status(404).json({ error: "Sponsorship not found" });
    }

    const requesterId = req.headers['x-user-id'] || req.body.userId;
    const requesterEmail = req.headers['x-user-email'] || req.body.email;

    // Determine who can update:
    // - Organizer (owner) can update anything
    // - Sponsor can update their branding/sponsorInfo (by userId OR email for guest checkout)
    // - Team members with editContent permission can update
    const isOrganizer = requesterId === existingSponsorship.organizerId;
    const isSponsorById = requesterId && requesterId === existingSponsorship.sponsorUserId;
    const isSponsorByEmail = requesterEmail && requesterEmail.toLowerCase() === existingSponsorship.sponsorEmail?.toLowerCase();
    const isSponsor = isSponsorById || isSponsorByEmail;

    let isTeamMember = false;
    if (requesterId && !isOrganizer && !isSponsorById) {
      const { canAccess, role } = await checkOrgAccess(requesterId, existingSponsorship.organizerId);
      isTeamMember = canAccess && canPerformAction(role, 'editContent');
    }

    if (!isOrganizer && !isSponsor && !isTeamMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Sponsors can only update certain fields (branding, sponsorInfo, children)
    if (isSponsor && !isOrganizer) {
      const allowedFields = ['branding', 'sponsorInfo', 'children', 'notes', 'status'];
      const updateKeys = Object.keys(req.body);
      const hasDisallowedFields = updateKeys.some(key => !allowedFields.includes(key) && key !== 'userId');
      if (hasDisallowedFields) {
        return res.status(403).json({ error: "Sponsors can only update branding and contact info" });
      }
      // Sponsors can only set status to 'branding-submitted', not 'paid' etc.
      if (req.body.status && req.body.status !== 'branding-submitted') {
        return res.status(403).json({ error: "Invalid status update" });
      }
    }

    const hadBranding = existingSponsorship?.branding?.logoUrl;
    const isSubmittingBranding = req.body.branding?.logoUrl && !hadBranding;
    const isStatusChangeToBrandingSubmitted = req.body.status === 'branding-submitted' && existingSponsorship?.status !== 'branding-submitted';

    const updatedSponsorship = await Sponsorship.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true },
    );

    // Send Slack notification if branding was just submitted
    if ((isSubmittingBranding || isStatusChangeToBrandingSubmitted) && updatedSponsorship) {
      try {
        const organizer = await User.findById(updatedSponsorship.organizerId);
        if (organizer?.slackSettings?.connected && organizer?.slackSettings?.incomingWebhook?.url) {
          slackService.sendBrandingNotification(
            organizer.slackSettings.incomingWebhook.url,
            updatedSponsorship
          ).catch(err => console.error("Async Slack branding notification error:", err));
        }
      } catch (slackErr) {
        console.error("Error sending branding Slack notification:", slackErr);
      }
    }

    res.json(updatedSponsorship);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Sponsorship (for cleaning up failed payments - organizer only)
router.delete("/:id", async (req, res) => {
  try {
    const sponsorship = await Sponsorship.findById(req.params.id);
    if (!sponsorship) {
      return res.status(404).json({ error: "Sponsorship not found" });
    }

    const requesterId = req.headers['x-user-id'] || req.query.userId;

    // Only organizer can delete sponsorships
    if (requesterId !== sponsorship.organizerId) {
      return res.status(403).json({ error: "Only the organizer can delete sponsorships" });
    }

    // Only allow deletion of pending sponsorships (safety check)
    if (sponsorship.status === 'paid') {
      return res.status(400).json({ error: "Cannot delete a paid sponsorship" });
    }

    await Sponsorship.findByIdAndDelete(req.params.id);
    res.json({ message: "Sponsorship deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all sponsorships for an organizer (accessible by team members)
router.get("/organizer/:organizerId", async (req, res) => {
  try {
    const { userId } = req.query;
    const { organizerId } = req.params;

    // If userId is provided and different from organizerId, verify team access
    if (userId && userId !== organizerId) {
      const { canAccess } = await checkOrgAccess(userId, organizerId);
      if (!canAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const sponsorships = await Sponsorship.find({
      organizerId: organizerId,
    });
    res.json(sponsorships);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get ALL sponsorships (Admin only)
router.get("/admin/all", async (req, res) => {
  try {
    // Require admin API key
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ error: 'Admin access required' });
    }

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

      // Attach populated data and ensure id field exists
      sponsorships = sponsorships.map((s) => ({
        ...s,
        id: s._id, // Ensure id field is present for frontend
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

    // Ensure id field exists even if no population was needed
    const result = sponsorships.map(s => ({ ...s, id: s._id || s.id }));
    res.json(result);
  } catch (err) {
    console.error("[Sponsor Lookup Error]", err);
    res.status(500).json({ error: err.message });
  }
});

// Resend receipt email to sponsor (organizer only)
router.post("/:id/resend-receipt", async (req, res) => {
  try {
    const sponsorship = await Sponsorship.findById(req.params.id);
    if (!sponsorship) {
      return res.status(404).json({ error: "Sponsorship not found" });
    }

    const requesterId = req.headers['x-user-id'] || req.body.userId;

    // Only organizer (or team members with permission) can resend
    const isOrganizer = requesterId === sponsorship.organizerId;
    let isTeamMember = false;
    if (requesterId && !isOrganizer) {
      const { canAccess, role } = await checkOrgAccess(requesterId, sponsorship.organizerId);
      isTeamMember = canAccess && canPerformAction(role, 'editContent');
    }
    if (!isOrganizer && !isTeamMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (sponsorship.status !== 'paid' && sponsorship.status !== 'branding-submitted') {
      return res.status(400).json({ error: "Can only resend receipts for paid sponsorships" });
    }
    if (!sponsorship.sponsorEmail) {
      return res.status(400).json({ error: "Sponsorship has no sponsor email" });
    }

    const organizer = await User.findById(sponsorship.organizerId);
    if (!organizer) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    const pkg = sponsorship.packageId ? await Package.findById(sponsorship.packageId) : null;
    const portalUrl = `${process.env.FRONTEND_URL || "https://getfundraisr.io"}/sponsor/dashboard`;

    await emailService.sendTemplateEmail(
      organizer,
      "sponsorship_confirmation",
      sponsorship.sponsorEmail,
      {
        donorName: sponsorship.sponsorName || "Valued Sponsor",
        contactName: sponsorship.sponsorName || "Valued Sponsor",
        amount: `$${sponsorship.amount}`,
        packageTitle: pkg?.title || sponsorship.packageTitle || "Sponsorship Package",
        portalUrl: portalUrl,
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Resend Receipt Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get specific sponsorship by ID (requires authorization)
// IMPORTANT: This must be AFTER all other specific routes like /organizer/:id, /admin/all, /sponsor/:id
router.get("/:id", async (req, res) => {
  try {
    const sponsorship = await Sponsorship.findById(req.params.id);
    if (!sponsorship) {
      return res.status(404).json({ error: "Sponsorship not found" });
    }

    const requesterId = req.headers['x-user-id'] || req.query.userId;
    const requesterEmail = req.headers['x-user-email'] || req.query.email;

    // Allow access if:
    // 1. Requester is the organizer (owner)
    // 2. Requester is the sponsor (by userId OR by email for guest checkout)
    // 3. Requester is a team member of the organizer
    const isOrganizer = requesterId === sponsorship.organizerId;
    const isSponsorById = requesterId && requesterId === sponsorship.sponsorUserId;
    const isSponsorByEmail = requesterEmail && requesterEmail.toLowerCase() === sponsorship.sponsorEmail?.toLowerCase();

    let isTeamMember = false;
    if (requesterId && !isOrganizer && !isSponsorById) {
      const { canAccess } = await checkOrgAccess(requesterId, sponsorship.organizerId);
      isTeamMember = canAccess;
    }

    if (!isOrganizer && !isSponsorById && !isSponsorByEmail && !isTeamMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(sponsorship);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
