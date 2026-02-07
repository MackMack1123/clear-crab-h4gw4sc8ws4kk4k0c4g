import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowRight, Github, Mail, ArrowLeft, CheckCircle, Sparkles, X } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function OrganizerLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState('');
    const [magicLinkLoading, setMagicLinkLoading] = useState(false);
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [magicLinkEmail, setMagicLinkEmail] = useState('');
    const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/dashboard';

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate(redirectTo);
        } catch (err) {
            console.error("Login error:", err);
            // If user not found or invalid credential (which might mean not found), try creating it for dev purposes
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
                // Try to CREATE the user if login fails (Dev convenience)
                try {
                    const { createUserWithEmailAndPassword } = await import('firebase/auth');
                    await createUserWithEmailAndPassword(auth, email, password);
                    navigate(redirectTo);
                    return;
                } catch (createErr) {
                    console.error("Create error:", createErr);
                    setError('Failed to log in. Please check credentials or sign up.');
                }
            } else {
                setError('Failed to log in. Check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

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
            console.error("Password reset error:", err);
            setResetError(err.message || 'Failed to send reset email. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    const handleMagicLink = async (e) => {
        e.preventDefault();
        setMagicLinkLoading(true);
        try {
            await fetch(`${API_BASE_URL}/api/auth/magic-link/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: magicLinkEmail, role: 'organizer' })
            });
            setMagicLinkSent(true);
        } catch (err) {
            console.error("Magic link error:", err);
        } finally {
            setMagicLinkLoading(false);
        }
    };



    // Forgot Password View
    if (showForgotPassword) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <Link to="/" className="inline-flex items-center gap-2 mb-6">
                            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-glow">
                                F
                            </div>
                            <span className="font-heading font-bold text-xl tracking-tight">Fundraisr</span>
                        </Link>
                        <h2 className="font-heading text-3xl font-bold text-gray-900">Reset Password</h2>
                        <p className="text-gray-500 mt-2">We'll send you a link to reset your password.</p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-8">
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
                                                placeholder="coach@example.com"
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

    // Main Login View
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 mb-6">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-glow">
                            F
                        </div>
                        <span className="font-heading font-bold text-xl tracking-tight">Fundraisr</span>
                    </Link>
                    <h2 className="font-heading text-3xl font-bold text-gray-900">Welcome back</h2>
                    <p className="text-gray-500 mt-2">Manage your team's fundraising success.</p>
                </div>

                <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-8">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition bg-gray-50 focus:bg-white"
                                placeholder="coach@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-bold text-gray-700">Password</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForgotPassword(true);
                                        setResetEmail(email); // Pre-fill with login email
                                    }}
                                    className="text-sm text-primary hover:text-primary/80 font-medium"
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition bg-gray-50 focus:bg-white"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Log In <ArrowRight className="w-5 h-5" /></>}
                        </button>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                Don't have an account?{' '}
                                <Link to={redirectTo !== '/dashboard' ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : '/signup'} className="font-medium text-primary hover:text-primary/80">
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    </form>

                    {/* Magic Link Trigger */}
                    <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setMagicLinkEmail(email);
                                setShowMagicLinkModal(true);
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700 font-medium inline-flex items-center gap-1.5"
                        >
                            <Sparkles className="w-4 h-4" />
                            Sign in with email link (no password)
                        </button>
                    </div>
                </div>
            </div>

            {/* Magic Link Modal */}
            {showMagicLinkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowMagicLinkModal(false); setMagicLinkSent(false); }} />
                    <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100 p-8 w-full max-w-md">
                        <button
                            onClick={() => { setShowMagicLinkModal(false); setMagicLinkSent(false); }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {magicLinkSent ? (
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="font-bold text-xl text-gray-900 mb-2">Check your email</h3>
                                <p className="text-gray-500 mb-4">
                                    We sent a sign-in link to <strong>{magicLinkEmail}</strong>
                                </p>
                                <p className="text-sm text-gray-400 mb-6">
                                    Click the link in the email to sign in instantly. Check spam if you don't see it.
                                </p>
                                <button
                                    onClick={() => { setMagicLinkSent(false); setMagicLinkEmail(''); }}
                                    className="text-sm text-primary font-medium hover:underline"
                                >
                                    Try a different email
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-6">
                                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Sparkles className="w-7 h-7 text-primary" />
                                    </div>
                                    <h3 className="font-bold text-xl text-gray-900 mb-1">Sign in with email link</h3>
                                    <p className="text-sm text-gray-500">No password needed. We'll email you a magic link.</p>
                                </div>
                                <form onSubmit={handleMagicLink} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="email"
                                                required
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition bg-gray-50 focus:bg-white"
                                                placeholder="coach@example.com"
                                                value={magicLinkEmail}
                                                onChange={(e) => setMagicLinkEmail(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={magicLinkLoading}
                                        className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {magicLinkLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Sparkles className="w-5 h-5" /> Send Sign-In Link</>}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
