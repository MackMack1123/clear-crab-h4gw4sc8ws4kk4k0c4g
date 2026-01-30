import React, { useState } from 'react';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function StripeConnect() {
    const { currentUser, userProfile } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleConnect = async () => {
        setLoading(true);
        // In a real app, this would redirect to a Cloud Function that generates the Stripe OAuth link.
        // For MVP/Dev, we'll simulate a successful connection.
        try {
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Update user with a mock Stripe Account ID
            await userService.updateUser(currentUser.uid, {
                stripeAccountId: 'acct_test_123456789'
            });

            // Force reload or context update would happen automatically via onSnapshot if we used it,
            // but our AuthContext uses getDoc once. We might need to trigger a reload or update local state.
            window.location.reload();
        } catch (error) {
            console.error("Error connecting Stripe:", error);
            alert("Failed to connect Stripe");
        } finally {
            setLoading(false);
        }
    };

    if (userProfile?.stripeAccountId) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 font-medium">Stripe Connected</span>
                </div>
                <span className="text-sm text-gray-500 font-mono">{userProfile.stripeAccountId}</span>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Get Paid with Stripe</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                To start creating campaigns and receiving funds, you need to connect a Stripe account.
                We use Stripe to ensure secure and fast payouts directly to your bank account.
            </p>
            <button
                onClick={handleConnect}
                disabled={loading}
                className="bg-[#635bff] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#544de6] transition flex items-center justify-center gap-2 mx-auto"
            >
                {loading ? <Loader2 className="animate-spin" /> : 'Connect with Stripe'}
            </button>
        </div>
    );
}
