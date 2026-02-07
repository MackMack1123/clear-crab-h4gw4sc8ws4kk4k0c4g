import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { sponsorshipService } from "../services/sponsorshipService";
import { userService } from "../services/userService";
import { systemService } from "../services/systemService";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { ArrowLeft, ShieldCheck, CreditCard, Loader2, UserCheck, LogIn } from "lucide-react";
import { useSponsorship } from "../context/SponsorshipContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import SquarePaymentForm from "../components/SquarePaymentForm";
import { API_BASE_URL } from "../config";
import { formatCurrency } from "../utils/formatCurrency";
import { saveGuestSponsorSession } from "../utils/guestSponsorSession";

// Debounce helper
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function SponsorshipCheckout() {
  const { packageId } = useParams();

  const navigate = useNavigate();
  const {
    cart,
    cartTotal,
    clearCart,
    cartSubtotal,
    processingFee,
    platformFee,
    originalPlatformFee,
    feesWaived,
    coverFees,
    toggleCoverFees,
  } = useSponsorship();
  const { currentUser, userProfile, addRole } = useAuth();

  // Local state for single-item fallback (backward compatibility)
  const [singlePkg, setSinglePkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [organizerProfile, setOrganizerProfile] = useState(null);
  const [systemSettings, setSystemSettings] = useState(null);
  const [initializingPayment, setInitializingPayment] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // Sponsor details form
  const [sponsorDetails, setSponsorDetails] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    email: ''
  });

  // Payment method selection (for showing fee differences)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');

  // Returning sponsor recognition
  const [returningSponsorship, setReturningSponsor] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const debouncedEmail = useDebounce(sponsorDetails.email, 500);

  // Initialize sponsor details from user profile when available
  useEffect(() => {
    if (currentUser && userProfile) {
      setSponsorDetails(prev => ({
        ...prev,
        email: prev.email || currentUser.email || '',
        contactName: prev.contactName || (userProfile?.firstName && userProfile?.lastName
          ? `${userProfile.firstName} ${userProfile.lastName}`
          : currentUser.displayName || ''),
      }));
    } else if (currentUser) {
      setSponsorDetails(prev => ({
        ...prev,
        email: prev.email || currentUser.email || '',
        contactName: prev.contactName || currentUser.displayName || '',
      }));
    }
  }, [currentUser, userProfile]);

  // Check for returning sponsor when email changes
  useEffect(() => {
    const checkReturningSponsorship = async () => {
      if (!debouncedEmail || debouncedEmail.length < 5 || !debouncedEmail.includes('@')) {
        setReturningSponsor(null);
        return;
      }

      setCheckingEmail(true);
      try {
        const result = await sponsorshipService.lookupSponsorByEmail(debouncedEmail);
        if (result.found) {
          setReturningSponsor(result);
          // Pre-fill form if we have data and fields are empty
          if (result.prefill) {
            setSponsorDetails(prev => ({
              ...prev,
              companyName: prev.companyName || result.prefill.companyName || '',
              contactName: prev.contactName || result.prefill.contactName || '',
              phone: prev.phone || result.prefill.phone || '',
            }));
          }
        } else {
          setReturningSponsor(null);
        }
      } catch (err) {
        console.error('Email lookup failed:', err);
        setReturningSponsor(null);
      } finally {
        setCheckingEmail(false);
      }
    };

    checkReturningSponsorship();
  }, [debouncedEmail]);

  // Fallback logic adjusted to respect fee coverage
  const isCartCheckout = !packageId && cart.length > 0;
  const checkoutItems = isCartCheckout ? cart : singlePkg ? [singlePkg] : [];

  // If not using cart context fully for single item, recalculate locally (simplified for now to rely on context or basic sum)
  // Actually, single package flow doesn't use the context's 'coverFees' unless we force it.
  // For consistency, let's assume this feature is primarily for the Cart flow.
  // But we should support it for single item too if we want.
  // For now, let's use the context's totalAmount if in cart mode.
  const displaySubtotal = isCartCheckout ? cartSubtotal : singlePkg?.price || 0;
  const displayFee = isCartCheckout ? processingFee : 0;

  // Check payments have NO fees - sponsor pays base price, org receives 100%
  const isCheckPayment = selectedPaymentMethod === 'check';
  const displayTotal = isCheckPayment
    ? displaySubtotal
    : (isCartCheckout ? cartTotal : singlePkg?.price || 0);

  // Get the organizer ID from the first item (assuming single organizer cart for now)
  const organizerId =
    checkoutItems.length > 0 ? checkoutItems[0].organizerId : null;

  // Helper: Only link to logged-in user if their email matches the sponsor email
  // This prevents purchases for others from being linked to the wrong account
  const getSponsorUserId = () => {
    if (!currentUser) return null;
    // Compare emails case-insensitively
    const userEmail = currentUser.email?.toLowerCase();
    const sponsorEmail = sponsorDetails.email?.toLowerCase();
    return userEmail && sponsorEmail && userEmail === sponsorEmail ? currentUser.uid : null;
  };

  useEffect(() => {
    systemService.getSettings().then(setSystemSettings);
    if (isFinished) return;
    if (packageId) {
      loadSinglePackage();
    } else if (cart.length > 0) {
      loadOrganizerInfo(cart[0].organizerId); // Load organizer info based on cart
    } else {
      // No package, no cart -> redirect
      navigate("/");
    }
  }, [packageId, cart.length, isFinished]);

  const loadSinglePackage = async () => {
    try {
      const pData = await sponsorshipService.getPackage(packageId);
      setSinglePkg(pData);
      loadOrganizerInfo(pData.organizerId);
    } catch (error) {
      console.error("Error loading package:", error);
      toast.error("Could not load package");
      setLoading(false);
    }
  };

  const loadOrganizerInfo = async (orgId) => {
    try {
      const user = await userService.getUser(orgId);
      setOrganizerProfile(user);
    } catch (error) {
      console.error("Error loading organizer:", error);
    } finally {
      setLoading(false);
    }
  };

  const paymentSettings = organizerProfile?.paymentSettings || {};
  const activeGateway = paymentSettings.activeGateway;

  // Handle Stripe Checkout
  const handleStripeCheckout = async () => {
    // Validate sponsor details
    if (!sponsorDetails.companyName || !sponsorDetails.contactName || !sponsorDetails.email) {
      toast.error("Please fill in all sponsor details");
      return;
    }

    setInitializingPayment(true);
    setPaymentError(null);

    try {
      // 1. Create Pending Sponsorships with sponsor details (guest or logged-in)
      const promises = checkoutItems.map((item) =>
        sponsorshipService.createSponsorship({
          organizerId: item.organizerId,
          packageId: item.id,
          packageTitle: item.title,
          amount: item.price,
          status: "pending", // Pending payment
          payerEmail: sponsorDetails.email,
          sponsorUserId: getSponsorUserId(), // null for guest checkout
          sponsorName: sponsorDetails.contactName,
          sponsorEmail: sponsorDetails.email,
          sponsorPhone: sponsorDetails.phone,
          // Pre-populate sponsorInfo for fulfilment
          sponsorInfo: {
            companyName: sponsorDetails.companyName,
            contactName: sponsorDetails.contactName,
            email: sponsorDetails.email,
            phone: sponsorDetails.phone,
          },
        }),
      );

      const results = await Promise.all(promises);
      // createSponsorship returns the ID directly, not an object
      const sponsorshipIds = results.map((r) => typeof r === 'string' ? r : r.id);

      // 2. Create Stripe Checkout Session
      const session = await sponsorshipService.createStripeCheckoutSession({
        organizerId,
        items: checkoutItems.map((item, i) => ({
          name: item.title,
          description: `Sponsorship for ${item.organizerName || "Fundraiser"}`,
          price: item.price,
          quantity: 1,
        })),
        customerEmail: sponsorDetails.email,
        successUrl: `${window.location.origin}/sponsorship/success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(sponsorDetails.email)}&guest=${currentUser ? 'false' : 'true'}`,
        cancelUrl: `${window.location.origin}/sponsorship/checkout`, // Back to checkout
        metadata: {
          sponsorshipIds: JSON.stringify(sponsorshipIds), // Pass IDs to verify later
          coverFees: coverFees ? "true" : "false",
          sponsorEmail: sponsorDetails.email,
          isGuest: currentUser ? "false" : "true",
        },
        coverFees: coverFees, // Pass to backend logic
      });

      // 3. Redirect to Stripe
      window.location.href = session.url;
    } catch (error) {
      console.error("Stripe Checkout Error:", error);
      setPaymentError("Failed to start payment processing. Please try again.");
      toast.error("Failed to start payment processing");
      setInitializingPayment(false);
    }
  };

  // Handle Square Payment
  const handleSquarePayment = async (nonce) => {
    // Validate sponsor details
    if (!sponsorDetails.companyName || !sponsorDetails.contactName || !sponsorDetails.email) {
      toast.error("Please fill in all sponsor details");
      return;
    }

    setInitializingPayment(true);
    setPaymentError(null);
    let sponsorshipIds = [];

    try {
      // 1. Create Pending Sponsorships with sponsor details (guest or logged-in)
      const promises = checkoutItems.map((item) =>
        sponsorshipService.createSponsorship({
          organizerId: item.organizerId,
          packageId: item.id,
          packageTitle: item.title,
          amount: item.price,
          status: "pending",
          payerEmail: sponsorDetails.email,
          sponsorUserId: getSponsorUserId(),
          sponsorName: sponsorDetails.contactName,
          sponsorEmail: sponsorDetails.email,
          sponsorPhone: sponsorDetails.phone,
          sponsorInfo: {
            companyName: sponsorDetails.companyName,
            contactName: sponsorDetails.contactName,
            email: sponsorDetails.email,
            phone: sponsorDetails.phone,
          },
        }),
      );

      const results = await Promise.all(promises);
      // createSponsorship returns the ID directly, not an object
      sponsorshipIds = results.map((r) => typeof r === 'string' ? r : r.id);

      // 2. Process Payment on Backend
      const response = await fetch(
        `${API_BASE_URL}/api/payments/square/process-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceId: nonce,
            amount: displayTotal,
            organizerId,
            sponsorshipIds,
            payerEmail: sponsorDetails.email,
            coverFees,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Payment failed");
      }

      // 3. Success
      if (isCartCheckout) {
        setIsFinished(true);
        clearCart();
      }

      // Add sponsor role to logged-in user only if they're the sponsor (email matches)
      if (getSponsorUserId() && addRole) {
        addRole('sponsor').catch(err => console.error('Failed to add sponsor role:', err));
      }

      // Save guest session for fulfilment page access (if not logged in)
      if (!currentUser && sponsorDetails.email) {
        saveGuestSponsorSession(sponsorDetails.email, sponsorshipIds);
      }

      toast.success("Payment Successful!");

      // Navigate to success page with sponsorship IDs and guest info
      navigate("/thank-you", {
        state: {
          type: "sponsorship",
          title: "Payment Successful!",
          message: `Thank you for your sponsorship! You purchased ${sponsorshipIds.length} package${sponsorshipIds.length > 1 ? "s" : ""}. You can now design your ad.`,
          sponsorshipIds,
          isGuest: !currentUser,
          sponsorEmail: sponsorDetails.email,
        },
      });
    } catch (error) {
      console.error("Square Payment Error:", error);

      // Clean up pending sponsorships that were created
      if (sponsorshipIds?.length > 0) {
        try {
          await sponsorshipService.deleteSponsorships(sponsorshipIds);
          console.log("Cleaned up pending sponsorships after payment failure");
        } catch (cleanupErr) {
          console.error("Failed to cleanup sponsorships:", cleanupErr);
        }
      }

      setPaymentError(error.message || "Payment processing failed. Please try again.");
      toast.error(error.message || "Payment processing failed");
    } finally {
      setInitializingPayment(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  // Show loading state if payment finished (cart cleared but navigation pending)
  if (isFinished)
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-gray-500 font-medium">Completing your order...</p>
      </div>
    );

  if (checkoutItems.length === 0)
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-4">Add a sponsorship package to continue.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-soft overflow-hidden border border-gray-100">
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="font-bold text-gray-400 text-xs uppercase tracking-wider">
            Secure Checkout
          </span>
        </div>

        <div className="p-8">
          <div className="mb-8 text-center">
            {organizerProfile?.organizationProfile?.logoUrl && (
              <img
                src={organizerProfile.organizationProfile.logoUrl}
                alt="Organization Logo"
                className="h-20 w-auto mx-auto mb-4 object-contain rounded-xl"
              />
            )}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Complete Your Sponsorship
            </h2>
            <div className="text-gray-500 text-sm">
              {currentUser
                ? `Logged in as ${currentUser.email}`
                : "Guest Checkout"}
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl mb-6 border border-gray-200 space-y-4">
            {checkoutItems.map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-gray-600">{item.title}</span>
                <span className="font-bold text-gray-900">${formatCurrency(item.price)}</span>
              </div>
            ))}

            {/* Fee Breakdown - Shows different info for check vs card */}
            <div className="pt-3 border-t border-gray-200 border-dashed space-y-2">
              {isCheckPayment ? (
                <>
                  {/* Check payment - no fees */}
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Processing Fees</span>
                    <span className="text-gray-400">N/A</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Platform Fee</span>
                    <span className="text-gray-400">N/A</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-gray-700 pt-2 border-t border-gray-200">
                    <span>Amount to Team</span>
                    <span>${formatCurrency(displaySubtotal)}</span>
                  </div>
                </>
              ) : (
                <>
                  {/* Card payment - normal fee display */}
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Credit Card Fees</span>
                    <span className={coverFees ? "text-gray-700" : "text-gray-400"}>
                      -${formatCurrency(processingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      Platform Fee
                      {feesWaived && (
                        <span className="text-green-600 font-bold text-xs">
                          (Waived)
                        </span>
                      )}
                    </span>
                    {feesWaived ? (
                      <span className="line-through text-gray-300">
                        -${formatCurrency(originalPlatformFee)}
                      </span>
                    ) : (
                      <span className={coverFees ? "text-gray-700" : "text-gray-400"}>
                        -${formatCurrency(platformFee)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-green-700 pt-2 border-t border-gray-200">
                    <span>Amount to Team</span>
                    <span>
                      ${coverFees
                        ? formatCurrency(displaySubtotal)
                        : formatCurrency(displaySubtotal - processingFee - platformFee)
                      }
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Cover Fees Checkbox - Only show for card payments */}
            {!isCheckPayment && (
              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-primary hover:bg-white transition group bg-white">
                <input
                  type="checkbox"
                  checked={coverFees}
                  onChange={toggleCoverFees}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 group-hover:text-primary transition">
                    Cover the fees (+${formatCurrency(platformFee + processingFee)})
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ensure the team receives the full ${formatCurrency(displaySubtotal)}
                  </p>
                </div>
              </label>
            )}

            <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-lg">
              <span className="font-bold text-gray-900">Your Total</span>
              <span className="font-heading font-bold text-primary text-2xl">
                ${formatCurrency(displayTotal)}
              </span>
            </div>
          </div>

          {/* Payment Error Alert */}
          {paymentError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-red-600 font-bold">!</span>
                </div>
                <div>
                  <h3 className="font-bold text-red-800 text-sm">Payment Failed</h3>
                  <p className="text-red-700 text-sm mt-1">{paymentError}</p>
                  <button
                    onClick={() => setPaymentError(null)}
                    className="mt-2 text-xs font-bold text-red-600 hover:text-red-800"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sponsor Details Form - Always visible (guest or logged in) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Sponsor Information</h3>
              {currentUser && (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Signed in
                </span>
              )}
            </div>

            {/* Email field first - for returning sponsor recognition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  value={sponsorDetails.email}
                  onChange={(e) => setSponsorDetails(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@acmecorp.com"
                />
                {checkingEmail && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400 absolute right-3 top-3.5" />
                )}
              </div>
            </div>

            {/* Returning sponsor recognition */}
            {returningSponsorship && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <UserCheck className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-green-800 text-sm">Welcome back!</p>
                    <p className="text-green-700 text-xs mt-1">
                      We found {returningSponsorship.sponsorshipCount} previous sponsorship{returningSponsorship.sponsorshipCount > 1 ? 's' : ''}
                      {returningSponsorship.organizations?.length > 0 && (
                        <> with {returningSponsorship.organizations.slice(0, 2).join(', ')}{returningSponsorship.organizations.length > 2 ? ` and ${returningSponsorship.organizations.length - 2} more` : ''}</>
                      )}.
                      We've pre-filled your details below.
                    </p>
                    {returningSponsorship.hasAccount && !currentUser && (
                      <button
                        type="button"
                        onClick={() => navigate(`/sponsorship/auth?redirect=${window.location.pathname}`)}
                        className="mt-2 text-xs font-bold text-green-700 hover:text-green-900 flex items-center gap-1"
                      >
                        <LogIn className="w-3 h-3" /> Sign in to your account
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company / Business Name *</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                value={sponsorDetails.companyName}
                onChange={(e) => setSponsorDetails(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Acme Corp"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  value={sponsorDetails.contactName}
                  onChange={(e) => setSponsorDetails(prev => ({ ...prev, contactName: e.target.value }))}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  value={sponsorDetails.phone}
                  onChange={(e) => setSponsorDetails(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* Optional sign-in prompt for guests */}
            {!currentUser && !returningSponsorship?.hasAccount && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => navigate(`/sponsorship/auth?redirect=${window.location.pathname}`)}
                  className="text-xs text-gray-500 hover:text-primary flex items-center gap-1"
                >
                  <LogIn className="w-3 h-3" /> Already have an account? Sign in
                </button>
              </div>
            )}
          </div>

          {/* Payment Method Selection - Show if check is enabled */}
          {organizerProfile?.checkSettings?.enabled && (
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('card')}
                  className={`p-4 rounded-xl border-2 transition text-left ${
                    selectedPaymentMethod === 'card'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className={`w-5 h-5 ${selectedPaymentMethod === 'card' ? 'text-primary' : 'text-gray-400'}`} />
                    <span className={`font-bold ${selectedPaymentMethod === 'card' ? 'text-primary' : 'text-gray-700'}`}>
                      Credit Card
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Pay now online</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('check')}
                  className={`p-4 rounded-xl border-2 transition text-left ${
                    selectedPaymentMethod === 'check'
                      ? 'border-slate-400 bg-slate-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-lg ${selectedPaymentMethod === 'check' ? 'text-slate-600' : 'text-gray-400'}`}>✉</span>
                    <span className={`font-bold ${selectedPaymentMethod === 'check' ? 'text-slate-700' : 'text-gray-700'}`}>
                      Pay by Check
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Mail payment</p>
                </button>
              </div>
            </div>
          )}

          {/* Payment Options */}
          <>
            {/* SANDBOX / TEST MODE */}
            {paymentSettings.sandboxMode ? (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl text-center">
                    <p className="font-bold text-purple-700 text-sm mb-1">
                      🧪 SANDBOX MODE ACTIVE
                    </p>
                    <p className="text-xs text-purple-600">
                      Real payments are disabled. Use a dummy card.
                    </p>
                  </div>

                  <SandboxPaymentForm
                    onSubmit={async (cardDetails) => {
                      // Validate sponsor details
                      if (!sponsorDetails.companyName || !sponsorDetails.contactName || !sponsorDetails.email) {
                        toast.error("Please fill in all sponsor details");
                        return;
                      }

                      setInitializingPayment(true);
                      try {
                        // Create simulated sponsorships with sponsor details (guest or logged-in)
                        const promises = checkoutItems.map((item) =>
                          sponsorshipService.createSponsorship({
                            organizerId: item.organizerId,
                            packageId: item.id,
                            packageTitle: item.title,
                            amount: item.price,
                            status: "paid",
                            isTest: true, // Flag as test data
                            payerEmail: sponsorDetails.email,
                            sponsorUserId: getSponsorUserId(),
                            paymentId: `sim_${Math.random().toString(36).substr(2, 9)}`,
                            sponsorName: sponsorDetails.contactName,
                            sponsorEmail: sponsorDetails.email,
                            sponsorPhone: sponsorDetails.phone,
                            sponsorInfo: {
                              companyName: sponsorDetails.companyName,
                              contactName: sponsorDetails.contactName,
                              email: sponsorDetails.email,
                              phone: sponsorDetails.phone,
                            },
                          }),
                        );

                        const results = await Promise.all(promises);
                        const sponsorshipIds = results;

                        if (isCartCheckout) {
                          setIsFinished(true); // Prevent redirect
                          clearCart();
                        }

                        // Simulate network delay
                        await new Promise((r) => setTimeout(r, 1000));

                        // Save guest session for fulfilment page access (if not logged in)
                        if (!currentUser && sponsorDetails.email) {
                          saveGuestSponsorSession(sponsorDetails.email, sponsorshipIds);
                        }

                        toast.success("Sandbox Payment Successful!");
                        // Navigate to success page with sponsorship IDs and guest info
                        navigate("/thank-you", {
                          state: {
                            type: "sponsorship",
                            title: "Payment Successful!",
                            message: `Thank you for your sponsorship! You purchased ${results.length} package${results.length > 1 ? "s" : ""}. You can now design your ad.`,
                            sponsorshipIds,
                            isGuest: !currentUser,
                            sponsorEmail: sponsorDetails.email,
                          },
                        });
                      } catch (err) {
                        console.error(err);
                        toast.error("Sandbox processing failed");
                        setInitializingPayment(false);
                      }
                    }}
                    loading={initializingPayment}
                  />
                </div>
              ) : (
                <>
                  {/* Card payment options - only show when card is selected */}
                  {selectedPaymentMethod === 'card' && (
                    <>
                      {/* SQUARE CHECKOUT */}
                      {activeGateway === "square" &&
                        systemSettings?.payments?.square !== false && (
                          <div className="mt-4">
                            <SquarePaymentForm
                              amount={displayTotal}
                              onSubmit={handleSquarePayment}
                              loading={initializingPayment}
                              locationId={organizerProfile?.paymentSettings?.square?.mainLocationId}
                            />
                          </div>
                        )}

                      {/* STRIPE CHECKOUT (Real) */}
                      {activeGateway === "stripe" &&
                        systemSettings?.payments?.stripe !== false && (
                          <button
                            onClick={handleStripeCheckout}
                            disabled={initializingPayment}
                            className="w-full bg-[#635BFF] text-white py-4 rounded-xl font-bold hover:bg-[#534be0] transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                          >
                            {initializingPayment ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <CreditCard className="w-5 h-5" />
                            )}
                            Pay with Card
                          </button>
                        )}
                    </>
                  )}

                  {/* PAY BY CHECK OPTION - Show when check is selected */}
                  {organizerProfile?.checkSettings?.enabled &&
                    systemSettings?.payments?.check !== false &&
                    selectedPaymentMethod === 'check' && (
                      <button
                        onClick={async () => {
                          // Validate sponsor details
                          if (!sponsorDetails.companyName || !sponsorDetails.contactName || !sponsorDetails.email) {
                            toast.error("Please fill in all sponsor details");
                            return;
                          }

                          if (
                            window.confirm(
                              `You are pledging to pay $${formatCurrency(displaySubtotal)} by check. Proceed?`,
                            )
                          ) {
                            setInitializingPayment(true);
                            try {
                              const promises = checkoutItems.map((item) =>
                                sponsorshipService.createSponsorship({
                                  organizerId: item.organizerId,
                                  packageId: item.id,
                                  packageTitle: item.title,
                                  amount: item.price, // Base price - no fees for check payments
                                  status: "pending", // Pending payment
                                  paymentMethod: "check",
                                  payerEmail: sponsorDetails.email,
                                  sponsorUserId: getSponsorUserId(),
                                  sponsorName: sponsorDetails.contactName,
                                  sponsorEmail: sponsorDetails.email,
                                  sponsorPhone: sponsorDetails.phone,
                                  sponsorInfo: {
                                    companyName: sponsorDetails.companyName,
                                    contactName: sponsorDetails.contactName,
                                    email: sponsorDetails.email,
                                    phone: sponsorDetails.phone,
                                  },
                                }),
                              );

                              const sponsorshipIds = await Promise.all(promises);
                              if (isCartCheckout) {
                                setIsFinished(true);
                                clearCart();
                              }

                              // Add sponsor role to logged-in user only if they're the sponsor (email matches)
                              if (getSponsorUserId() && addRole) {
                                addRole('sponsor').catch(err => console.error('Failed to add sponsor role:', err));
                              }

                              // Save guest session for fulfilment page access (if not logged in)
                              if (!currentUser && sponsorDetails.email) {
                                saveGuestSponsorSession(sponsorDetails.email, sponsorshipIds);
                              }

                              // Redirect to success page with check instructions and guest info
                              navigate(
                                `/sponsorship/success?payment_method=check&org_id=${organizerId}&email=${encodeURIComponent(sponsorDetails.email)}&guest=${currentUser ? 'false' : 'true'}`,
                              );
                            } catch (err) {
                              console.error(err);
                              toast.error("Failed to record pledge");
                              setInitializingPayment(false);
                            }
                          }
                        }}
                        disabled={initializingPayment}
                        className="w-full bg-slate-700 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                      >
                        {initializingPayment ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            Confirm Check Payment - ${formatCurrency(displaySubtotal)}
                          </>
                        )}
                      </button>
                    )}

                  {/* PAYPAL CHECKOUT (Fallback or Explicit) - only for card payments */}
                  {selectedPaymentMethod === 'card' &&
                    (!activeGateway || activeGateway === "paypal") &&
                    systemSettings?.payments?.paypal !== false && (
                      <div className="space-y-4 pt-4">
                        {/* Default/Legacy PayPal Flow */}
                        <PayPalButtons
                          style={{
                            layout: "vertical",
                            shape: "rect",
                            label: "pay",
                          }}
                          createOrder={(data, actions) => {
                            // Validate sponsor details before creating order
                            if (!sponsorDetails.companyName || !sponsorDetails.contactName || !sponsorDetails.email) {
                              toast.error("Please fill in all sponsor details");
                              return Promise.reject(new Error("Missing sponsor details"));
                            }
                            return actions.order.create({
                              purchase_units: [
                                {
                                  description: `Sponsorship Purchase (${checkoutItems.length} items)`,
                                  amount: {
                                    value: displayTotal.toFixed(2),
                                  },
                                },
                              ],
                            });
                          }}
                          onApprove={async (data, actions) => {
                            try {
                              const details = await actions.order.capture();

                              // Process all items with sponsor details (guest or logged-in)
                              const promises = checkoutItems.map((item) =>
                                sponsorshipService.createSponsorship({
                                  organizerId: item.organizerId,
                                  packageId: item.id,
                                  packageTitle: item.title,
                                  amount: item.price,
                                  status: "paid",
                                  payerEmail: sponsorDetails.email,
                                  sponsorUserId: getSponsorUserId(),
                                  paymentId: details.id,
                                  sponsorName: sponsorDetails.contactName,
                                  sponsorEmail: sponsorDetails.email,
                                  sponsorPhone: sponsorDetails.phone,
                                  sponsorInfo: {
                                    companyName: sponsorDetails.companyName,
                                    contactName: sponsorDetails.contactName,
                                    email: sponsorDetails.email,
                                    phone: sponsorDetails.phone,
                                  },
                                }),
                              );

                              const results = await Promise.all(promises);
                              const sponsorshipIds = results;

                              // Clear Cart
                              if (isCartCheckout) {
                                setIsFinished(true);
                                clearCart();
                              }

                              // Save guest session for fulfilment page access (if not logged in)
                              if (!currentUser && sponsorDetails.email) {
                                saveGuestSponsorSession(sponsorDetails.email, sponsorshipIds);
                              }

                              // Navigate to success page with guest info
                              toast.success("Payment Successful!");
                              navigate("/thank-you", {
                                state: {
                                  type: "sponsorship",
                                  title: "Payment Successful!",
                                  message: `Thank you for your sponsorship! You purchased ${results.length} package${results.length > 1 ? "s" : ""}. You can now design your ad.`,
                                  sponsorshipIds,
                                  isGuest: !currentUser,
                                  sponsorEmail: sponsorDetails.email,
                                },
                              });
                            } catch (error) {
                              console.error("Payment Error: ", error);
                              toast.error(
                                "Payment recorded but server error occurred. Please contact support.",
                              );
                            }
                          }}
                        />
                        {!activeGateway && (
                          <p className="text-center text-xs text-amber-600 bg-amber-50 p-2 rounded">
                            Organizer has not set up a primary payment gateway.
                            Using PayPal fallback.
                          </p>
                        )}
                      </div>
                    )}
                </>
              )}
          </>

          <div className="mt-6 flex justify-center text-xs text-gray-400 gap-1">
            <ShieldCheck className="w-4 h-4" /> Secure payment processing
          </div>
        </div>
      </div>
    </div>
  );
}

function SandboxPaymentForm({ onSubmit, loading }) {
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const handleCardChange = (e) => {
    // Remove non-digits
    let val = e.target.value.replace(/\D/g, "");
    // Limit to 16 digits
    if (val.length > 16) val = val.substring(0, 16);
    // Add spaces for display: 4242 4242 4242 4242
    const formatted = val.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCard(formatted);
  };

  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 4) val = val.substring(0, 4);

    if (val.length >= 2) {
      setExpiry(`${val.substring(0, 2)} / ${val.substring(2)}`);
    } else {
      setExpiry(val);
    }
  };

  const handleCvcChange = (e) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 4) val = val.substring(0, 4);
    setCvc(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ card, expiry, cvc });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        required
        type="text"
        value={card}
        onChange={handleCardChange}
        placeholder="Card Number (4242 4242 4242 4242)"
        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none transition font-mono"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          required
          type="text"
          value={expiry}
          onChange={handleExpiryChange}
          placeholder="MM / YY"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none transition font-mono"
        />
        <input
          required
          type="text"
          value={cvc}
          onChange={handleCvcChange}
          placeholder="CVC"
          maxLength={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none transition font-mono"
        />
      </div>
      <button
        disabled={loading}
        className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 transition shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          "Pay with Test Card"
        )}
      </button>
    </form>
  );
}
