import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { userService } from '../services/userService';
import { sponsorshipService } from '../services/sponsorshipService';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { saveGuestSponsorSession } from '../utils/guestSponsorSession';

export default function SponsorshipSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { currentUser, addRole } = useAuth();
    const sessionId = searchParams.get('session_id');
    const paymentMethod = searchParams.get('payment_method');
    const orgId = searchParams.get('org_id');
    const sponsorEmail = searchParams.get('email');
    const isGuest = searchParams.get('guest') === 'true';

    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [count, setCount] = useState(0);
    const [organizer, setOrganizer] = useState(null);

    // Account creation state for guest checkout
    const [showAccountForm, setShowAccountForm] = useState(false);
    const [creatingAccount, setCreatingAccount] = useState(false);
    const [accountCreated, setAccountCreated] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [existingAccount, setExistingAccount] = useState(false); // true if email already has a Firebase account
    const [checkingAccount, setCheckingAccount] = useState(false);

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

                // Save guest session for fulfilment page access (if not logged in)
                if (isGuest && sponsorEmail && data.sponsorshipIds?.length > 0) {
                    saveGuestSponsorSession(sponsorEmail, data.sponsorshipIds);
                }

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

    // Check if account already exists when user clicks "Create Account"
    const handleShowAccountForm = async () => {
        setCheckingAccount(true);
        try {
            const methods = await fetchSignInMethodsForEmail(auth, sponsorEmail);
            if (methods.length > 0) {
                setExistingAccount(true);
            }
        } catch (err) {
            // If check fails, default to create flow
            console.warn('Could not check existing account:', err);
        } finally {
            setCheckingAccount(false);
            setShowAccountForm(true);
        }
    };

    // Handle account creation for guest checkout
    const handleCreateAccount = async (e) => {
        e.preventDefault();
        if (!sponsorEmail || !password) {
            toast.error('Please enter a password');
            return;
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setCreatingAccount(true);
        try {
            // Create Firebase account
            const userCredential = await createUserWithEmailAndPassword(auth, sponsorEmail, password);

            // Create user record in MongoDB
            await userService.updateUser(userCredential.user.uid, {
                email: sponsorEmail,
                role: 'sponsor',
                roles: ['sponsor']
            });

            // Link all existing sponsorships with this email to the new account
            await sponsorshipService.linkSponsorshipsToAccount(sponsorEmail, userCredential.user.uid);

            setAccountCreated(true);
            toast.success('Account created! Your sponsorships are now linked.');
        } catch (error) {
            console.error('Account creation error:', error);
            if (error.code === 'auth/email-already-in-use') {
                setExistingAccount(true);
                toast.error('An account with this email already exists. Please sign in below.');
            } else {
                toast.error(error.message || 'Failed to create account');
            }
        } finally {
            setCreatingAccount(false);
        }
    };

    // Handle sign-in for existing accounts
    const handleSignIn = async (e) => {
        e.preventDefault();
        if (!sponsorEmail || !password) {
            toast.error('Please enter your password');
            return;
        }

        setCreatingAccount(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, sponsorEmail, password);

            // Link any unlinked sponsorships to this account
            await sponsorshipService.linkSponsorshipsToAccount(sponsorEmail, userCredential.user.uid);

            setAccountCreated(true);
            toast.success('Signed in! Your sponsorships are linked.');
        } catch (error) {
            console.error('Sign-in error:', error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                toast.error('Incorrect password. Please try again.');
            } else {
                toast.error(error.message || 'Failed to sign in');
            }
        } finally {
            setCreatingAccount(false);
        }
    };

    // Account Creation UI Component
    const AccountCreationSection = () => {
        if (!isGuest || !sponsorEmail || currentUser || accountCreated) return null;

        if (accountCreated) {
            return (
                <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-green-800 font-medium">Account linked successfully!</p>
                    <p className="text-sm text-green-600">You can now access your sponsor dashboard anytime.</p>
                </div>
            );
        }

        if (!showAccountForm) {
            return (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <div className="flex items-start gap-3">
                        <UserPlus className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium text-blue-900">Sign in or create an account to manage your sponsorship</p>
                            <p className="text-sm text-blue-700 mt-1">Track your sponsorships, upload ad materials, and more.</p>
                            <button
                                onClick={handleShowAccountForm}
                                disabled={checkingAccount}
                                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {checkingAccount && <Loader2 className="w-4 h-4 animate-spin" />}
                                {checkingAccount ? 'Checking...' : 'Continue'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // Sign-in form for existing accounts
        if (existingAccount) {
            return (
                <form onSubmit={handleSignIn} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                    <div className="text-center">
                        <h3 className="font-bold text-gray-900">Welcome Back!</h3>
                        <p className="text-sm text-gray-500">Sign in to link this sponsorship to your account</p>
                        <p className="text-sm font-medium text-gray-700 mt-1">{sponsorEmail}</p>
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => { setShowAccountForm(false); setExistingAccount(false); setPassword(''); }}
                            className="flex-1 py-3 rounded-xl border border-gray-200 font-medium text-gray-600 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creatingAccount}
                            className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {creatingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {creatingAccount ? 'Signing in...' : 'Sign In'}
                        </button>
                    </div>
                </form>
            );
        }

        // Create account form for new users
        return (
            <form onSubmit={handleCreateAccount} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                <div className="text-center">
                    <h3 className="font-bold text-gray-900">Create Your Account</h3>
                    <p className="text-sm text-gray-500">Using: {sponsorEmail}</p>
                </div>

                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Choose a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                        minLength={6}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => { setShowAccountForm(false); setPassword(''); }}
                        className="flex-1 py-3 rounded-xl border border-gray-200 font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={creatingAccount}
                        className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {creatingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {creatingAccount ? 'Creating...' : 'Create Account'}
                    </button>
                </div>
            </form>
        );
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

                    {/* Account Creation for Guest Checkout */}
                    <AccountCreationSection />

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

    // STANDARD SUCCESS UI (STRIPE/SQUARE)
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

                {/* Account Creation for Guest Checkout */}
                <AccountCreationSection />

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
