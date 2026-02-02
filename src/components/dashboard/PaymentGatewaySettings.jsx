import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrgPermissions } from '../../hooks/useOrgPermissions';
import { CreditCard, Check, X, ExternalLink, Loader2, AlertCircle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../config';

const GATEWAYS = [
    {
        id: 'stripe',
        name: 'Stripe',
        description: 'Accept credit cards, Apple Pay, Google Pay',
        icon: '💳',
        color: 'bg-purple-500',
        available: true
    },
    {
        id: 'square',
        name: 'Square',
        description: 'Accept cards with Square',
        icon: '⬜',
        color: 'bg-black',
        available: true
    },
    {
        id: 'paypal',
        name: 'PayPal',
        description: 'Accept PayPal and Venmo',
        icon: '🅿️',
        color: 'bg-blue-600',
        available: false // Coming soon
    }
];

export default function PaymentGatewaySettings() {
    const { currentUser, userProfile, refreshProfile, activeOrganization } = useAuth();
    const { canConnectPayments, role } = useOrgPermissions();
    const [loading, setLoading] = useState(true);

    // Use activeOrganization.id for team member support
    const orgId = activeOrganization?.id || currentUser?.uid;
    const [connecting, setConnecting] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    const [localSandbox, setLocalSandbox] = useState(false);

    useEffect(() => {
        if (userProfile?.paymentSettings) {
            setLocalSandbox(userProfile.paymentSettings.sandboxMode || false);
        }
    }, [userProfile]);
    const [stripeStatus, setStripeStatus] = useState(null);
    const [squareStatus, setSquareStatus] = useState(null);
    const [activeGateway, setActiveGateway] = useState(null);

    useEffect(() => {
        checkConnectionStatus();
        handleUrlParams();
    }, [currentUser]);

    const handleUrlParams = () => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('stripe_success')) {
            toast.success('Stripe connected successfully!');
            window.history.replaceState({}, '', window.location.pathname);
        }
        if (params.get('stripe_error')) {
            toast.error(`Stripe connection failed: ${params.get('stripe_error')}`);
            window.history.replaceState({}, '', window.location.pathname);
        }
        if (params.get('square_success')) {
            toast.success('Square connected successfully!');
            window.history.replaceState({}, '', window.location.pathname);
        }
        if (params.get('square_error')) {
            toast.error(`Square connection failed: ${params.get('square_error')}`);
            window.history.replaceState({}, '', window.location.pathname);
        }
    };

    const checkConnectionStatus = async () => {
        if (!orgId) return;

        try {
            // Check Stripe
            const resStripe = await fetch(`${API_BASE_URL}/api/payments/stripe/account-status?userId=${orgId}`);

            const dataStripe = await resStripe.json();
            setStripeStatus(dataStripe);

            // Check Square (we can infer from user profile if we don't have a dedicated status endpoint yet, or add one)
            // For now, let's look at userProfile.paymentSettings.square (activeGateway logic below covers it partially)
            // But let's assume we might lack a specific route or just check the profile directly if loaded
            if (userProfile?.paymentSettings?.square?.merchantId) {
                setSquareStatus({ connected: true, merchantId: userProfile.paymentSettings.square.merchantId });
            }

            if (dataStripe.connected && userProfile?.paymentSettings?.activeGateway === 'stripe') {
                setActiveGateway('stripe');
            } else if (userProfile?.paymentSettings?.activeGateway === 'square') {
                setActiveGateway('square');
            }
        } catch (err) {
            console.error('Failed to check payment status:', err);
        } finally {
            setLoading(false);
        }
    };

    const connectStripe = async () => {
        if (!canConnectPayments) {
            toast.error("Only organization owners can connect payment gateways");
            return;
        }
        setConnecting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/payments/stripe/connect?userId=${orgId}`);

            const data = await res.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error('Failed to generate Stripe connection URL');
            }
        } catch (err) {
            console.error('Stripe connect error:', err);
            toast.error('Failed to connect Stripe');
        } finally {
            setConnecting(false);
        }
    };

    const disconnectStripe = async () => {
        if (!canConnectPayments) {
            toast.error("Only organization owners can disconnect payment gateways");
            return;
        }
        if (!confirm('Are you sure you want to disconnect Stripe? Sponsors won\'t be able to pay until you reconnect.')) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/payments/stripe/disconnect`, {

                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: orgId })
            });

            if (res.ok) {
                toast.success('Stripe disconnected');
                setStripeStatus(null);
                setActiveGateway(null);
            } else {
                toast.error('Failed to disconnect Stripe');
            }
        } catch (err) {
            console.error('Disconnect error:', err);
            toast.error('Failed to disconnect Stripe');
        }
        toast.error('Failed to disconnect Stripe');
    }


    const connectSquare = async () => {
        if (!canConnectPayments) {
            toast.error("Only organization owners can connect payment gateways");
            return;
        }
        setConnecting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/payments/square/connect?userId=${orgId}`);

            const data = await res.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error('Failed to generate Square connection URL');
            }
        } catch (err) {
            console.error('Square connect error:', err);
            toast.error('Failed to connect Square');
        } finally {
            setConnecting(false);
        }
    };

    const disconnectSquare = async () => {
        if (!canConnectPayments) {
            toast.error("Only organization owners can disconnect payment gateways");
            return;
        }
        if (!confirm('Are you sure you want to disconnect Square?')) return;
        // TODO: Implement disconnect endpoint or just clear locally if minimal
        // For now, we manually update user or add a disconnect endpoint.
        // Let's assume we can just nullify it via user service for now or add endpoint later.
        toast.error("Disconnect not implemented fully yet.");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Read-only notice for non-owners */}
            {!canConnectPayments && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                    <Lock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-blue-800">View Only</p>
                        <p className="text-xs text-blue-600">Only organization owners can connect payment gateways. You have {role} access.</p>
                    </div>
                </div>
            )}

            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Payment Gateway</h3>
                <p className="text-sm text-gray-500">
                    Connect a payment provider to receive sponsorship payments directly to your account.
                </p>
            </div>

            {!activeGateway && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">No payment gateway connected</p>
                        <p className="text-xs text-amber-700 mt-1">
                            Sponsors won't be able to complete purchases until you connect a payment provider.
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {GATEWAYS.map(gateway => (
                    <div
                        key={gateway.id}
                        className={`border rounded-xl p-4 transition ${gateway.id === activeGateway
                            ? 'border-green-300 bg-green-50'
                            : gateway.available
                                ? 'border-gray-200 hover:border-gray-300'
                                : 'border-gray-100 bg-gray-50 opacity-60'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 ${gateway.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                                    {gateway.icon}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-gray-900">{gateway.name}</h4>
                                        {gateway.id === activeGateway && (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Connected
                                            </span>
                                        )}
                                        {!gateway.available && (
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                                Coming Soon
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500">{gateway.description}</p>
                                </div>
                            </div>

                            <div>
                                {gateway.id === 'stripe' && (
                                    <>
                                        {stripeStatus?.connected ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={disconnectStripe}
                                                    disabled={!canConnectPayments}
                                                    className={`text-sm font-medium ${canConnectPayments ? 'text-red-600 hover:text-red-700' : 'text-gray-400 cursor-not-allowed'}`}
                                                >
                                                    Disconnect
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={connectStripe}
                                                disabled={connecting || !canConnectPayments}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 ${canConnectPayments ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                            >
                                                {connecting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <ExternalLink className="w-4 h-4" />
                                                )}
                                                Connect
                                            </button>
                                        )}
                                    </>
                                )}

                                {gateway.id === 'square' && (
                                    <>
                                        {activeGateway === 'square' ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={disconnectSquare}
                                                    disabled={!canConnectPayments}
                                                    className={`text-sm font-medium ${canConnectPayments ? 'text-red-600 hover:text-red-700' : 'text-gray-400 cursor-not-allowed'}`}
                                                >
                                                    Disconnect
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={connectSquare}
                                                disabled={connecting || !canConnectPayments}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 ${canConnectPayments ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                            >
                                                {connecting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <ExternalLink className="w-4 h-4" />
                                                )}
                                                Connect
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Square Details */}
                        {gateway.id === 'square' && activeGateway === 'square' && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="text-sm">
                                    <span className="text-gray-500">Merchant ID</span>
                                    <p className="font-mono text-xs text-gray-700">{squareStatus?.merchantId || 'Connected'}</p>
                                </div>
                            </div>
                        )}

                        {/* Stripe account details */}
                        {gateway.id === 'stripe' && stripeStatus?.connected && (
                            <div className="mt-4 pt-4 border-t border-green-200">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">Account ID</span>
                                        <p className="font-mono text-xs text-gray-700">{stripeStatus.accountId}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Mode</span>
                                        <p className={`font-medium ${stripeStatus.livemode ? 'text-green-600' : 'text-orange-600'}`}>
                                            {stripeStatus.livemode ? 'Live' : 'Test Mode'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Charges</span>
                                        <p className="flex items-center gap-1">
                                            {stripeStatus.chargesEnabled ? (
                                                <><Check className="w-4 h-4 text-green-600" /> Enabled</>
                                            ) : (
                                                <><X className="w-4 h-4 text-red-500" /> Disabled</>
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Payouts</span>
                                        <p className="flex items-center gap-1">
                                            {stripeStatus.payoutsEnabled ? (
                                                <><Check className="w-4 h-4 text-green-600" /> Enabled</>
                                            ) : (
                                                <><X className="w-4 h-4 text-red-500" /> Disabled</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                {!stripeStatus.detailsSubmitted && (
                                    <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                                        ⚠️ Complete your Stripe account setup to start receiving payments.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div >

            {/* SANDBOX MODE CARD */}
            < div className="border border-purple-200 bg-purple-50 rounded-xl p-4 mt-6" >
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            🧪 Developer Sandbox Mode
                        </h4>
                        <p className="text-sm text-gray-600 mt-1 max-w-sm">
                            Enable dummy payments for testing. <br />
                            <span className="font-bold text-red-600">Warning: Real payments will be disabled.</span>
                        </p>
                    </div>

                    <label className={`relative inline-flex items-center ${canConnectPayments ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={localSandbox}
                            disabled={isToggling || !canConnectPayments}
                            onChange={async (e) => {
                                if (!canConnectPayments) {
                                    toast.error("Only organization owners can change payment settings");
                                    return;
                                }
                                const newVal = e.target.checked;
                                setLocalSandbox(newVal); // Optimistic Update
                                setIsToggling(true);

                                try {
                                    await import('../../services/userService').then(m =>
                                        m.userService.updateUser(orgId, {
                                            paymentSettings: {
                                                ...userProfile.paymentSettings,
                                                sandboxMode: newVal
                                            }
                                        })
                                    );

                                    await refreshProfile();
                                    toast.success(newVal ? "Sandbox Mode ENABLED" : "Sandbox Mode DISABLED");
                                } catch (err) {
                                    console.error(err);
                                    setLocalSandbox(!newVal); // Revert on error
                                    toast.error("Failed to toggle sandbox mode");
                                } finally {
                                    setIsToggling(false);
                                }
                            }}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>
            </div >

            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">💡 How it works</p>
                <ul className="space-y-1 text-gray-500">
                    <li>• Sponsors pay directly to your connected account</li>
                    <li>• A small platform fee ({5}%) is automatically deducted</li>
                    <li>• Funds are available in your account within 2-7 days</li>
                </ul>
            </div>
        </div >
    );
}
