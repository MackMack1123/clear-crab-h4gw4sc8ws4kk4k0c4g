import React, { useEffect } from 'react';
import { useSponsorship } from '../context/SponsorshipContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, ShieldCheck, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { usePageTracking } from '../hooks/usePageTracking';

export default function SponsorshipReview() {
    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    const { cart, removeFromCart, cartTotal, cartSubtotal, processingFee, platformFee, originalPlatformFee, coverFees, toggleCoverFees, feesWaived } = useSponsorship();
    const navigate = useNavigate();
    usePageTracking('review', cart[0]?.organizerId);

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900">Your cart is empty</h2>
                    <p className="text-gray-500">Go back to the landing page to select a sponsorship package.</p>
                    <button onClick={() => navigate(-1)} className="text-primary font-bold hover:underline">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const handleProceed = () => {
        // Go directly to checkout - it supports both guest and logged-in users
        navigate('/sponsorship/checkout');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-8">
                    <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm font-bold">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 ml-2">Review Selection</h1>
                </div>

                {cart.length > 0 && cart[0].organizerData?.organizationProfile?.logoUrl && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex items-center gap-4">
                        <img
                            src={cart[0].organizerData.organizationProfile.logoUrl}
                            alt="Organization Logo"
                            className="w-16 h-16 rounded-xl object-contain border border-gray-100 bg-white"
                        />
                        <div>
                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">You are supporting</p>
                            <h2 className="text-xl font-bold text-gray-900">{cart[0].organizerData.organizationProfile.orgName}</h2>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 space-y-4">
                        {cart.map((item, index) => (
                            <div key={`${item.id}-${index}`} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                                {item.imageUrl && (
                                    <div className="w-24 h-24 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                                    <p className="text-sm text-gray-500 mb-2">Supporting {item.organizerData?.organizationProfile?.orgName}</p>
                                    <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>
                                </div>
                                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-4 sm:gap-1">
                                    <span className="text-xl font-bold text-gray-900">${formatCurrency(item.price)}</span>
                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="text-gray-400 hover:text-red-500 transition p-2"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl shadow-soft p-6 border border-gray-100 sticky top-6">
                            <h3 className="font-bold text-lg text-gray-900 mb-4">Summary</h3>
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Subtotal ({cart.length} item{cart.length > 1 ? 's' : ''})</span>
                                    <span>${formatCurrency(cartSubtotal)}</span>
                                </div>

                                {/* Fee Breakdown - Always visible */}
                                <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-500">
                                        <span>Credit Card Fees</span>
                                        <span className={coverFees ? "text-gray-900" : "text-gray-400"}>
                                            -${formatCurrency(processingFee)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-gray-500">
                                        <span className="flex items-center gap-1">
                                            Platform Fee
                                            {feesWaived && (
                                                <span className="text-green-600 font-bold text-xs">(Waived)</span>
                                            )}
                                        </span>
                                        {feesWaived ? (
                                            <span className="line-through text-gray-300">-${formatCurrency(originalPlatformFee)}</span>
                                        ) : (
                                            <span className={coverFees ? "text-gray-900" : "text-gray-400"}>
                                                -${formatCurrency(platformFee)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-between font-medium text-green-700 pt-2 border-t border-gray-200">
                                        <span>Amount to Team</span>
                                        <span>
                                            ${coverFees
                                                ? formatCurrency(cartSubtotal)
                                                : formatCurrency(cartSubtotal - processingFee - platformFee)
                                            }
                                        </span>
                                    </div>
                                </div>

                                {/* Cover Fees Checkbox */}
                                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-primary hover:bg-primary/5 transition group">
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
                                            Ensure the team receives the full ${formatCurrency(cartSubtotal)}
                                        </p>
                                    </div>
                                </label>

                                <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-lg text-gray-900">
                                    <span>Your Total</span>
                                    <span className="text-primary">${formatCurrency(cartTotal)}</span>
                                </div>

                                <button
                                    onClick={handleProceed}
                                    className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-xl shadow-gray-900/10 flex items-center justify-center gap-2"
                                >
                                    Proceed to Checkout <ArrowRight className="w-4 h-4" />
                                </button>

                                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                                    <ShieldCheck className="w-4 h-4" /> Secure SSL Encryption
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
