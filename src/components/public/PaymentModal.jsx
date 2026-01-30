import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, Heart } from 'lucide-react';
import { PayPalButtons } from "@paypal/react-paypal-js";

export default function PaymentModal({ isOpen, onClose, baseAmount, venmoHandle, onVenmoConfirm, onStripeStart }) {
    const [activeTab, setActiveTab] = useState('venmo');
    const [tipAmount, setTipAmount] = useState(3); // Default to $3
    const [customTip, setCustomTip] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const PROCESSING_FEE = 0.99;

    useEffect(() => {
        if (isOpen) {
            setTipAmount(3); // Reset to default $3
            setCustomTip('');
            setShowCustomInput(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleTipSelect = (amount) => {
        setTipAmount(amount);
        setCustomTip('');
        setShowCustomInput(false);
    };

    const handleCustomClick = () => {
        setShowCustomInput(true);
        setTipAmount(0); // Optional: clear tip when opening custom? Or keep current? 
        // User said "only way... is by entering 0". So maybe start blank or 0.
        // Let's start with 0 to force them to enter something if they want.
    };

    const handleCustomTipChange = (e) => {
        const val = e.target.value;
        setCustomTip(val);
        setTipAmount(parseFloat(val) || 0);
    };

    const totalAmount = (parseFloat(baseAmount) + PROCESSING_FEE + tipAmount).toFixed(2);

    const getBreakdown = () => ({
        baseAmount: parseFloat(baseAmount),
        processingFee: PROCESSING_FEE,
        tipAmount: tipAmount,
        totalAmount: parseFloat(totalAmount)
    });

    // PayPal Handlers
    const createOrder = (data, actions) => {
        return actions.order.create({
            purchase_units: [
                {
                    amount: {
                        value: totalAmount,
                        breakdown: {
                            item_total: {
                                currency_code: "USD",
                                value: totalAmount // Simplified for now, can break down if needed
                            }
                        }
                    },
                    description: "Fundraiser Donation"
                },
            ],
        });
    };

    const onApprove = async (data, actions) => {
        const details = await actions.order.capture();
        // const name = details.payer.name.given_name;
        // Pass details to parent
        onVenmoConfirm({
            ...getBreakdown(),
            paypalOrderId: data.orderID,
            payerId: data.payerID,
            details: details
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b shrink-0">
                    <h3 className="font-bold text-lg">Complete Payment</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-6 space-y-6">

                    {/* Order Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                        <div className="flex justify-between text-gray-600">
                            <span>Donation</span>
                            <span>${parseFloat(baseAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Processing Fee</span>
                            <span>${PROCESSING_FEE}</span>
                        </div>
                        {tipAmount > 0 && (
                            <div className="flex justify-between text-green-600 font-medium">
                                <span>Platform Tip</span>
                                <span>+${tipAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="border-t pt-2 flex justify-between font-bold text-lg text-gray-900 mt-2">
                            <span>Total</span>
                            <span>${totalAmount}</span>
                        </div>
                    </div>

                    {/* Tip Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            {/* Removed leading Heart icon */}
                            <h4 className="font-semibold text-sm">Optional Tip: Support the free platform we use! ❤️</h4>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                            Tips help us cover platform and payment fees so teams keep more of what they raise.
                        </p>

                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 3, 5].map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => handleTipSelect(amt)}
                                        className={`py-3 rounded-lg border text-sm font-bold transition ${tipAmount === amt && !showCustomInput ? 'bg-pink-50 border-pink-200 text-pink-700 ring-1 ring-pink-200' : 'border-gray-200 hover:border-pink-200 hover:bg-pink-50 text-gray-600'}`}
                                    >
                                        ${amt}
                                    </button>
                                ))}
                            </div>

                            {!showCustomInput ? (
                                <div className="text-center">
                                    <button
                                        onClick={handleCustomClick}
                                        className="text-xs text-gray-400 hover:text-gray-600 underline decoration-dotted"
                                    >
                                        Enter custom amount
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            autoFocus
                                            className="w-full pl-7 pr-4 py-3 rounded-lg border border-gray-200 focus:border-pink-200 focus:ring-2 focus:ring-pink-50 outline-none transition"
                                            value={customTip}
                                            onChange={handleCustomTipChange}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="text-center">
                                        <button
                                            onClick={() => {
                                                setShowCustomInput(false);
                                                setTipAmount(3); // Reset to default
                                            }}
                                            className="text-xs text-gray-400 hover:text-gray-600"
                                        >
                                            Cancel custom amount
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Method Tabs */}
                    <div>
                        <h4 className="font-semibold text-sm mb-3">Payment Method</h4>
                        <div className="flex border rounded-lg overflow-hidden mb-4">
                            <button
                                className={`flex-1 py-3 font-medium text-sm flex items-center justify-center gap-2 transition ${activeTab === 'venmo' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                onClick={() => setActiveTab('venmo')}
                            >
                                <Smartphone className="w-4 h-4" />
                                Venmo
                            </button>
                            <button
                                className={`flex-1 py-3 font-medium text-sm flex items-center justify-center gap-2 transition ${activeTab === 'stripe' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                onClick={() => setActiveTab('stripe')}
                            >
                                <CreditCard className="w-4 h-4" />
                                Card
                            </button>
                        </div>

                        {activeTab === 'venmo' ? (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600 mb-2 text-center">
                                    Securely pay with Venmo.
                                </p>
                                <p className="text-xs text-gray-400 text-center mb-4">
                                    (If the Venmo button doesn't appear, please use Card)
                                </p>
                                <div className="z-0 relative min-h-[50px]"> {/* Ensure z-index doesn't conflict */}
                                    <PayPalButtons
                                        style={{ layout: "vertical" }}
                                        fundingSource="venmo"
                                        createOrder={createOrder}
                                        onApprove={onApprove}
                                        onClick={(data, actions) => {
                                            console.log("Venmo Clicked", data);
                                            // alert("Venmo button clicked..."); // Optional: feedback
                                        }}
                                        onError={(err) => {
                                            console.error("PayPal Error:", err);
                                            alert("Payment Error: " + JSON.stringify(err));
                                        }}
                                        forceReRender={[totalAmount]} // Re-render when amount changes
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="text-sm text-gray-600">
                                    Secure credit card processing via Stripe.
                                </p>
                                <button
                                    onClick={() => onStripeStart(getBreakdown())}
                                    className="w-full mt-4 py-3 rounded-lg font-bold text-white bg-gray-900 hover:bg-gray-800 transition shadow-sm"
                                >
                                    Pay ${totalAmount}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
