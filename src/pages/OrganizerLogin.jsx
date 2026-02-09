import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowRight, Mail, ArrowLeft, CheckCircle, Sparkles, Lock } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export default function OrganizerLogin() {
    const { currentUser, activeRole } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/dashboard';

    // Redirect already-authenticated users to their dashboard
    useEffect(() => {
        if (currentUser) {
            if (redirectTo !== '/dashboard') {
                navigate(redirectTo, { replace: true });
            } else if (activeRole === 'sponsor') {
                navigate('/sponsor/dashboard', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [currentUser, activeRole, redirectTo, navigate]);

    // Step flow
    const [step, setStep] = useState('email'); // 'email' | 'auth'
    const [userType, setUserType] = useState(null); // 'sponsor' | 'organizer' | 'both' | 'unknown'
    const [hasPassword, setHasPassword] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [identifyLoading, setIdentifyLoading] = useState(false);

    // Forgot password
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState('');

    // Magic link
    const [magicLinkLoading, setMagicLinkLoading] = useState(false);
    const [magicLinkSent, setMagicLinkSent] = useState(false);

    // Step 1: Identify the email
    const handleIdentify = async (e) => {
        e.preventDefault();
        setIdentifyLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/magic-link/identify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to identify account');

            setUserType(data.type);
            setHasPassword(data.hasPassword);
            setStep('auth');
        } catch (err) {
            console.error('Identify error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setIdentifyLoading(false);
        }
    };

    // Password login for organizers
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate(redirectTo);
        } catch (err) {
            console.error('Login error:', err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials' || err.code === 'auth/wrong-password') {
                setError('Incorrect password. Please try again or use an email link.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please try again later or use an email link.');
            } else {
                setError('Failed to log in. Please check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Send magic link
    const handleSendMagicLink = async () => {
        setMagicLinkLoading(true);
        setError('');
        try {
            const role = (userType === 'sponsor') ? 'sponsor' : 'organizer';
            await fetch(`${API_BASE_URL}/api/auth/magic-link/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    role,
                    redirectTo: redirectTo !== '/dashboard' ? redirectTo : null
                })
            });
            setMagicLinkSent(true);
        } catch (err) {
            console.error('Magic link error:', err);
            setError('Failed to send sign-in link. Please try again.');
        } finally {
            setMagicLinkLoading(false);
        }
    };

    // Forgot password
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setResetLoading(true);
        setResetError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/magic-link/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to send reset email');
            }
            setResetSent(true);
        } catch (err) {
            console.error('Password reset error:', err);
            setResetError(err.message || 'Failed to send reset email. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    const goBackToEmail = () => {
        setStep('email');
        setUserType(null);
        setHasPassword(false);
        setPassword('');
        setError('');
        setMagicLinkSent(false);
    };

    // Header component shared across views
    const PageHeader = ({ title, subtitle }) => (
        <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-glow">
                    F
                </div>
                <span className="font-heading font-bold text-xl tracking-tight">Fundraisr</span>
            </Link>
            <h2 className="font-heading text-3xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-gray-500 mt-2">{subtitle}</p>}
        </div>
    );

    // Forgot Password View
    if (showForgotPassword) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-md">
                    <PageHeader title="Reset Password" subtitle="We'll send you a link to reset your password." />

                    <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-4 sm:p-8">
                        {resetSent ? (
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="font-bold text-xl text-gray-900 mb-2">Check your email</h3>
                                <p className="text-gray-500 mb-6">
                                    We've sent a password reset link to <strong>{resetEmail}</strong>
                                </p>
                                <p className="text-sm text-gray-400 mb-6">
                                    Didn't receive the email? Check your spam folder or try again.
                                </p>
                                <button
                                    onClick={() => {
                                        setShowForgotPassword(false);
                                        setResetSent(false);
                                        setResetEmail('');
                                    }}
                                    className="text-primary font-bold hover:underline flex items-center gap-2 mx-auto"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to login
                                </button>
                            </div>
                        ) : (
                            <>
                                {resetError && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100">
                                        {resetError}
                                    </div>
                                )}
                                <form onSubmit={handleForgotPassword} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="email"
                                                required
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition bg-gray-50 focus:bg-white"
                                                placeholder="you@example.com"
                                                value={resetEmail}
                                                onChange={(e) => setResetEmail(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={resetLoading}
                                        className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {resetLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Send Reset Link'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForgotPassword(false);
                                            setResetError('');
                                        }}
                                        className="w-full text-gray-500 font-medium hover:text-gray-700 flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back to login
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Magic link sent confirmation
    if (magicLinkSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-md">
                    <PageHeader title="Check your email" />
                    <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-4 sm:p-8">
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="font-bold text-xl text-gray-900 mb-2">Sign-in link sent</h3>
                            <p className="text-gray-500 mb-4">
                                We sent a sign-in link to <strong>{email}</strong>
                            </p>
                            <p className="text-sm text-gray-400 mb-6">
                                Click the link in the email to sign in instantly. Check spam if you don't see it.
                            </p>
                            <button
                                onClick={goBackToEmail}
                                className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Try a different email
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Step 1: Email entry
    if (step === 'email') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-md">
                    <PageHeader title="Welcome back" subtitle="Sign in to your Fundraisr account." />

                    <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-4 sm:p-8">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleIdentify} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition bg-gray-50 focus:bg-white"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={identifyLoading}
                                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {identifyLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Continue <ArrowRight className="w-5 h-5" /></>}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                Don't have an account?{' '}
                                <Link to={redirectTo !== '/dashboard' ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : '/signup'} className="font-medium text-primary hover:text-primary/80">
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Auth method based on userType
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md">
                <PageHeader
                    title={userType === 'unknown' ? 'No account found' : 'Sign in'}
                    subtitle={userType === 'unknown' ? undefined : undefined}
                />

                <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-4 sm:p-8">
                    {/* Email display with change link */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <Mail className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-sm text-gray-700 font-medium truncate">{email}</span>
                        </div>
                        <button
                            onClick={goBackToEmail}
                            className="text-sm text-primary font-medium hover:underline flex-shrink-0 ml-2"
                        >
                            Change
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Unknown: no account found */}
                    {userType === 'unknown' && (
                        <div className="text-center py-4">
                            <p className="text-gray-500 mb-6">
                                We couldn't find an account with this email. Would you like to create one?
                            </p>
                            <Link
                                to={redirectTo !== '/dashboard' ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : '/signup'}
                                className="inline-block bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition"
                            >
                                Sign Up
                            </Link>
                            <button
                                onClick={goBackToEmail}
                                className="block mx-auto mt-4 text-sm text-gray-500 hover:text-gray-700 font-medium"
                            >
                                Try a different email
                            </button>
                        </div>
                    )}

                    {/* Sponsor only: magic link */}
                    {userType === 'sponsor' && (
                        <div className="text-center">
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-7 h-7 text-primary" />
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-2">Sign in with email link</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                We'll send a secure sign-in link to your email. No password needed.
                            </p>
                            <button
                                onClick={handleSendMagicLink}
                                disabled={magicLinkLoading}
                                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {magicLinkLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Sparkles className="w-5 h-5" /> Send Sign-In Link</>}
                            </button>
                        </div>
                    )}

                    {/* Organizer or Both: password form + magic link option */}
                    {(userType === 'organizer' || userType === 'both') && (
                        <>
                            <form onSubmit={handleLogin} className="space-y-5">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-bold text-gray-700">Password</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowForgotPassword(true);
                                                setResetEmail(email);
                                            }}
                                            className="text-sm text-primary hover:text-primary/80 font-medium"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="password"
                                            required
                                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition bg-gray-50 focus:bg-white"
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Log In <ArrowRight className="w-5 h-5" /></>}
                                </button>
                            </form>

                            {/* Magic link alternative */}
                            <div className="mt-5 pt-5 border-t border-gray-100 text-center">
                                <button
                                    type="button"
                                    onClick={handleSendMagicLink}
                                    disabled={magicLinkLoading}
                                    className="text-sm text-gray-500 hover:text-gray-700 font-medium inline-flex items-center gap-1.5"
                                >
                                    {magicLinkLoading ? (
                                        <Loader2 className="animate-spin w-4 h-4" />
                                    ) : (
                                        <Sparkles className="w-4 h-4" />
                                    )}
                                    Sign in with email link instead
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
