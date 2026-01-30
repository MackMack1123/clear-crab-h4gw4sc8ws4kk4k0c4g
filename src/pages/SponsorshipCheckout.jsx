
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sponsorshipService } from '../services/sponsorshipService';
import { userService } from '../services/userService';
import { PayPalButtons } from "@paypal/react-paypal-js";
import { ArrowLeft, ShieldCheck, CreditCard, Loader2 } from 'lucide-react';
import { useSponsorship } from '../context/SponsorshipContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import SquarePaymentForm from '../components/SquarePaymentForm';

export default function SponsorshipCheckout() {
    const { packageId } = useParams();
    const navigate = useNavigate();
    const { cart, cartTotal, clearCart, cartSubtotal, processingFee, coverFees } = useSponsorship();
    const { currentUser, userProfile } = useAuth();

    // Local state for single-item fallback (backward compatibility)
    const [singlePkg, setSinglePkg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [organizerProfile, setOrganizerProfile] = useState(null);
    const [initializingPayment, setInitializingPayment] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    // Fallback logic adjusted to respect fee coverage
    const isCartCheckout = !packageId && cart.length > 0;
    const checkoutItems = isCartCheckout ? cart : (singlePkg ? [singlePkg] : []);

    // If not using cart context fully for single item, recalculate locally (simplified for now to rely on context or basic sum)
    // Actually, single package flow doesn't use the context's 'coverFees' unless we force it.
    // For consistency, let's assume this feature is primarily for the Cart flow.
    // But we should support it for single item too if we want.
    // For now, let's use the context's totalAmount if in cart mode.
    const displayTotal = isCartCheckout ? cartTotal : (singlePkg?.price || 0);
    const displaySubtotal = isCartCheckout ? cartSubtotal : (singlePkg?.price || 0);
    const displayFee = isCartCheckout ? processingFee : 0;

    // Get the organizer ID from the first item (assuming single organizer cart for now)
    const organizerId = checkoutItems.length > 0 ? checkoutItems[0].organizerId : null;

    useEffect(() => {
        if (isFinished) return;
        if (packageId) {
            loadSinglePackage();
        } else if (cart.length > 0) {
            loadOrganizerInfo(cart[0].organizerId); // Load organizer info based on cart
        } else {
            // No package, no cart -> redirect
            navigate('/');
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
        setInitializingPayment(true);
        try {
            // 1. Create Pending Sponsorships
            const promises = checkoutItems.map(item => sponsorshipService.createSponsorship({
                organizerId: item.organizerId,
                packageId: item.id,
                packageTitle: item.title,
                amount: item.price,
                status: 'pending', // Pending payment
                payerEmail: currentUser.email,
                sponsorUserId: currentUser.uid,
                sponsorName: (userProfile?.firstName && userProfile?.lastName) ? `${userProfile.firstName} ${userProfile.lastName}` : (currentUser.displayName || 'Guest Sponsor'),
                sponsorEmail: currentUser.email
            }));

            const sponsorships = await Promise.all(promises);
            const sponsorshipIds = sponsorships.map(s => s.id);

            // 2. Create Stripe Checkout Session
            const session = await sponsorshipService.createStripeCheckoutSession({
                organizerId,
                items: checkoutItems.map((item, i) => ({
                    name: item.title,
                    description: `Sponsorship for ${item.organizerName || 'Fundraiser'}`,
                    price: item.price,
                    quantity: 1
                })),
                customerEmail: currentUser.email,
                successUrl: `${window.location.origin}/sponsorship/success?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${window.location.origin}/sponsorship/checkout`, // Back to checkout
                metadata: {
                    sponsorshipIds: JSON.stringify(sponsorshipIds), // Pass IDs to verify later
                    coverFees: coverFees ? 'true' : 'false'
                },
                coverFees: coverFees // Pass to backend logic
            });

            // 3. Redirect to Stripe
            window.location.href = session.url;

        } catch (error) {
            console.error("Stripe Checkout Error:", error);
            toast.error("Failed to start payment processing");
            setInitializingPayment(false);
        }
    };

    // Handle Square Payment
    const handleSquarePayment = async (nonce) => {
        setInitializingPayment(true);
        try {
            // 1. Create Pending Sponsorships (if not already exists?)
            // We usually create them as 'pending' before payment.
            const promises = checkoutItems.map(item => sponsorshipService.createSponsorship({
                organizerId: item.organizerId,
                packageId: item.id,
                packageTitle: item.title,
                amount: item.price,
                status: 'pending',
                payerEmail: currentUser.email,
                sponsorUserId: currentUser.uid,
                sponsorName: (userProfile?.firstName && userProfile?.lastName) ? `${userProfile.firstName} ${userProfile.lastName}` : (currentUser.displayName || 'Guest Sponsor'),
                sponsorEmail: currentUser.email
            }));

            const sponsorships = await Promise.all(promises);
            const sponsorshipIds = sponsorships.map(s => s.id);

            // 2. Process Payment on Backend
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payments/square/process-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceId: nonce,
                    amount: displayTotal,
                    organizerId,
                    sponsorshipIds,
                    payerEmail: currentUser.email,
                    coverFees
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Payment failed');
            }

            // 3. Success
            if (isCartCheckout) {
                setIsFinished(true);
                clearCart();
            }

            toast.success("Payment Successful!");

            if (sponsorshipIds.length === 1) {
                navigate(`/sponsorship/fulfilment/${sponsorshipIds[0]}`);
            } else {
                navigate('/sponsor/dashboard');
            }

        } catch (error) {
            console.error("Square Payment Error:", error);
            toast.error(error.message || "Payment processing failed");
        } finally {
            setInitializingPayment(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (checkoutItems.length === 0) return <div className="min-h-screen flex items-center justify-center">No items to checkout</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-soft overflow-hidden border border-gray-100">
                <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm font-bold">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <span className="font-bold text-gray-400 text-xs uppercase tracking-wider">Secure Checkout</span>
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
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Sponsorship</h2>
                        <div className="text-gray-500 text-sm">
                            {currentUser ? `Logged in as ${currentUser.email}` : 'Guest Checkout'}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-200 space-y-4">
                        {checkoutItems.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">{item.title}</span>
                                <span className="font-bold text-gray-900">${item.price}</span>
                            </div>
                        ))}

                        {coverFees && (
                            <div className="flex justify-between items-center text-sm text-gray-500 pt-2 border-t border-gray-200 border-dashed">
                                <span>Processing Fee (Covered)</span>
                                <span>${displayFee.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-lg">
                            <span className="font-bold text-gray-900">Total</span>
                            <span className="font-heading font-bold text-primary text-2xl">${displayTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    {currentUser ? (
                        <>
                            {/* SANDBOX / TEST MODE */}
                            {paymentSettings.sandboxMode ? (
                                <div className="space-y-4">
                                    <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl text-center">
                                        <p className="font-bold text-purple-700 text-sm mb-1">🧪 SANDBOX MODE ACTIVE</p>
                                        <p className="text-xs text-purple-600">Real payments are disabled. Use a dummy card.</p>
                                    </div>

                                    <SandboxPaymentForm
                                        onSubmit={async (cardDetails) => {
                                            setInitializingPayment(true);
                                            try {
                                                // Create simulated sponsorships
                                                const promises = checkoutItems.map(item => sponsorshipService.createSponsorship({
                                                    organizerId: item.organizerId,
                                                    packageId: item.id,
                                                    packageTitle: item.title,
                                                    amount: item.price,
                                                    status: 'paid',
                                                    isTest: true, // Flag as test data
                                                    payerEmail: currentUser.email,
                                                    sponsorUserId: currentUser.uid,
                                                    paymentId: `sim_${Math.random().toString(36).substr(2, 9)}`,
                                                    sponsorName: (userProfile?.firstName && userProfile?.lastName) ? `${userProfile.firstName} ${userProfile.lastName}` : (currentUser.displayName || 'Guest Sponsor'),
                                                    sponsorEmail: currentUser.email
                                                }));

                                                const results = await Promise.all(promises);

                                                if (isCartCheckout) {
                                                    setIsFinished(true); // Prevent redirect
                                                    clearCart();
                                                }

                                                // Simulate network delay
                                                await new Promise(r => setTimeout(r, 1000));

                                                toast.success("Sandbox Payment Successful!");
                                                if (results.length === 1) {
                                                    navigate(`/sponsorship/fulfilment/${results[0]}`);
                                                } else {
                                                    navigate('/sponsor/dashboard');
                                                }
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
                                    {/* SQUARE CHECKOUT */}
                                    {
                                        activeGateway === 'square' && (
                                            <div className="mt-4">
                                                <SquarePaymentForm
                                                    amount={displayTotal}
                                                    onSubmit={handleSquarePayment}
                                                    loading={initializingPayment}
                                                />
                                            </div>
                                        )
                                    }

                                    {/* STRIPE CHECKOUT (Real) */}
                                    {
                                        activeGateway === 'stripe' && (
                                            <button
                                                onClick={handleStripeCheckout}
                                                disabled={initializingPayment}
                                                className="w-full bg-[#635BFF] text-white py-4 rounded-xl font-bold hover:bg-[#534be0] transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                                            >
                                                {initializingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                                                Pay with Card
                                            </button>
                                        )
                                    }

                                    {/* PAY BY CHECK OPTION */}
                                    {organizerProfile?.checkSettings?.enabled && (
                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`You are pledging to pay $${totalAmount} by check. Proceed?`)) {
                                                    setInitializingPayment(true);
                                                    try {
                                                        const promises = checkoutItems.map(item => sponsorshipService.createSponsorship({
                                                            organizerId: item.organizerId,
                                                            packageId: item.id,
                                                            packageTitle: item.title,
                                                            amount: item.price,
                                                            status: 'pending', // Pending payment
                                                            paymentMethod: 'check',
                                                            payerEmail: currentUser.email,
                                                            sponsorUserId: currentUser.uid,
                                                            sponsorName: (userProfile?.firstName && userProfile?.lastName) ? `${userProfile.firstName} ${userProfile.lastName}` : (currentUser.displayName || 'Guest Sponsor'),
                                                            sponsorEmail: currentUser.email
                                                        }));

                                                        await Promise.all(promises);
                                                        if (isCartCheckout) {
                                                            setIsFinished(true);
                                                            clearCart();
                                                        }

                                                        // Redirect to success page with check instructions
                                                        navigate(`/sponsorship/success?payment_method=check&org_id=${organizerId}`);
                                                    } catch (err) {
                                                        console.error(err);
                                                        toast.error("Failed to record pledge");
                                                        setInitializingPayment(false);
                                                    }
                                                }
                                            }}
                                            disabled={initializingPayment}
                                            className="w-full bg-white border-2 border-slate-200 text-slate-700 py-4 rounded-xl font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2 mt-3"
                                        >
                                            Pay by Check / Verification
                                        </button>
                                    )}

                                    {/* PAYPAL CHECKOUT (Fallback or Explicit) */}
                                    {(!activeGateway || activeGateway === 'paypal') && (
                                        <div className="space-y-4 pt-4">
                                            {/* Default/Legacy PayPal Flow */}
                                            <PayPalButtons
                                                style={{ layout: "vertical", shape: "rect", label: "pay" }}
                                                createOrder={(data, actions) => {
                                                    return actions.order.create({
                                                        purchase_units: [{
                                                            description: `Sponsorship Purchase (${checkoutItems.length} items)`,
                                                            amount: {
                                                                value: totalAmount.toString()
                                                            }
                                                        }]
                                                    });
                                                }}
                                                onApprove={async (data, actions) => {
                                                    try {
                                                        const details = await actions.order.capture();

                                                        // Process all items
                                                        const promises = checkoutItems.map(item => sponsorshipService.createSponsorship({
                                                            organizerId: item.organizerId,
                                                            packageId: item.id,
                                                            packageTitle: item.title,
                                                            amount: item.price,
                                                            status: 'paid',
                                                            payerEmail: currentUser.email, // Use authenticated email
                                                            sponsorUserId: currentUser.uid, // Link to User account
                                                            paymentId: details.id,
                                                            sponsorName: (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName}` : (currentUser.displayName || `${details.payer.name.given_name} ${details.payer.name.surname}`)).trim(),
                                                            sponsorEmail: currentUser.email || details.payer.email_address
                                                        }));

                                                        const results = await Promise.all(promises);

                                                        // Clear Cart
                                                        if (isCartCheckout) {
                                                            setIsFinished(true);
                                                            clearCart();
                                                        }

                                                        // Redirect to Sponsor Dashboard or First Fulfilment
                                                        toast.success("Payment Successful!");
                                                        // If multiple, go to dashboard. If single, go to fulfilment
                                                        if (results.length === 1) {
                                                            navigate(`/sponsorship/fulfilment/${results[0]}`);
                                                        } else {
                                                            navigate('/sponsor/dashboard');
                                                        }

                                                    } catch (error) {
                                                        console.error("Payment Error: ", error);
                                                        toast.error("Payment recorded but server error occurred. Please contact support.");
                                                    }
                                                }}
                                            />
                                            {!activeGateway && (
                                                <p className="text-center text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                                    Organizer has not set up a primary payment gateway. Using PayPal fallback.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <div className="text-center space-y-4">
                            <p className="text-sm text-gray-500">Please sign in to complete your purchase so you can manage your ad materials later.</p>
                            <button
                                onClick={() => navigate(`/sponsorship/auth?redirect=${window.location.pathname}${window.location.search}`)}
                                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition"
                            >
                                Sign In / Create Account
                            </button>
                        </div>
                    )}

                    <div className="mt-6 flex justify-center text-xs text-gray-400 gap-1">
                        <ShieldCheck className="w-4 h-4" /> Secure payment processing
                    </div>
                </div>
            </div>
        </div >
    );
}

function SandboxPaymentForm({ onSubmit, loading }) {
    const [card, setCard] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');

    const handleCardChange = (e) => {
        // Remove non-digits
        let val = e.target.value.replace(/\D/g, '');
        // Limit to 16 digits
        if (val.length > 16) val = val.substring(0, 16);
        // Add spaces for display: 4242 4242 4242 4242
        const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
        setCard(formatted);
    };

    const handleExpiryChange = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 4) val = val.substring(0, 4);

        if (val.length >= 2) {
            setExpiry(`${val.substring(0, 2)} / ${val.substring(2)}`);
        } else {
            setExpiry(val);
        }
    };

    const handleCvcChange = (e) => {
        let val = e.target.value.replace(/\D/g, '');
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
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Pay with Test Card'}
            </button>
        </form>
    );
}
