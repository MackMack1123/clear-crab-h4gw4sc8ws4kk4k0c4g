import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Mail } from 'lucide-react';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';

export default function SponsorshipSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { currentUser, addRole } = useAuth();
    const sessionId = searchParams.get('session_id');
    const paymentMethod = searchParams.get('payment_method');
    const orgId = searchParams.get('org_id');

    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [count, setCount] = useState(0);
    const [organizer, setOrganizer] = useState(null);

    useEffect(() => {
        if (paymentMethod === 'check' && orgId) {
            verifyCheckPledge();
        } else if (sessionId) {
            verifySession();
        } else {
            setStatus('error');
        }
    }, [sessionId, paymentMethod, orgId]);

    const verifyCheckPledge = async () => {
        try {
            // Fetch organizer settings to display instructions
            const user = await userService.getUser(orgId);
            setOrganizer(user);
            setStatus('success');
            // Check specific count logic if needed, but for now we assume success
            setCount(1);
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    };

    const verifySession = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/payments/stripe/verify-session?sessionId=${sessionId}`);
            const data = await res.json();

            if (data.verified) {
                setStatus('success');
                setCount(data.count || 1);

                // Add sponsor role to logged-in user (if they're an organizer, they now have both roles)
                if (currentUser && addRole) {
                    addRole('sponsor').catch(err => console.error('Failed to add sponsor role:', err));
                }

                toast.success('Payment verified successfully!');
            } else {
                setStatus('error');
                toast.error('Payment verification failed.');
            }
        } catch (error) {
            console.error('Verification error:', error);
            setStatus('error');
        }
    };

    if (status === 'verifying') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <h2 className="text-xl font-bold text-gray-900">Verifying...</h2>
                <p className="text-gray-500">Please wait while we confirm your sponsorship.</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-3xl shadow-soft max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
                    <p className="text-gray-600">
                        We couldn't verify your session. Please contact support.
                    </p>
                    <div className="pt-4">
                        <Link
                            to="/sponsorship/checkout"
                            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition block w-full"
                        >
                            Try Again
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // CHECK PAYMENT SUCCESS UI
    if (paymentMethod === 'check' && organizer) {
        const { payableTo, mailingAddress, instructions } = organizer?.checkSettings || {};
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-3xl shadow-soft max-w-lg w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600 animate-in zoom-in duration-300">
                        <Mail className="w-10 h-10" />
                    </div>

                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Pledge Recorded!</h2>
                        <p className="text-gray-600">
                            Thank you for your pledge. Your sponsorship is currently <span className="font-bold text-amber-600">Pending</span>.
                        </p>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-2xl text-left border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-4 uppercase text-xs tracking-wider">Payment Instructions</h3>
                        <div className="space-y-4 text-sm text-gray-700">
                            <p>{instructions || "Please mail your check to:"}</p>

                            <div className="bg-white p-4 rounded-xl border border-gray-200 font-mono">
                                {payableTo && <div className="font-bold mb-1">Make Payable To: {payableTo}</div>}
                                <div className="whitespace-pre-wrap">{mailingAddress}</div>
                            </div>

                            <p className="text-xs text-gray-500">Your ad spots are reserved. They will become active once the organizer receives and marks your payment as paid.</p>
                        </div>
                    </div>

                    <div className="pt-2 space-y-3">
                        <Link
                            to="/sponsor/dashboard"
                            className="bg-primary text-white px-6 py-4 rounded-xl font-bold hover:bg-primary-700 transition flex items-center justify-center gap-2 w-full shadow-lg shadow-primary/20"
                        >
                            Go to Dashboard <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // STANDARD SUCCESS UI (STRIPE/PAYPAL)
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
            <div className="bg-white p-8 rounded-3xl shadow-soft max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 animate-in zoom-in duration-300">
                    <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Thank You!</h2>
                    <p className="text-gray-600">
                        Your sponsorship is confirmed. <br />
                        <span className="font-semibold text-gray-900">{count} package{count > 1 ? 's' : ''} purchased.</span>
                    </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-500">
                    A receipt has been sent to your email. You can now upload your ad materials and track your sponsorship performance.
                </div>

                <div className="pt-2 space-y-3">
                    <Link
                        to="/sponsor/dashboard"
                        className="bg-primary text-white px-6 py-4 rounded-xl font-bold hover:bg-primary-700 transition flex items-center justify-center gap-2 w-full shadow-lg shadow-primary/20"
                    >
                        Go to Dashboard <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link
                        to="/"
                        className="text-gray-500 font-bold text-sm hover:text-gray-900 transition block"
                    >
                        Return Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
