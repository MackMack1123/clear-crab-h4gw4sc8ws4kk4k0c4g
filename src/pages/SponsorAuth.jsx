import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { userService } from '../services/userService';
import toast from 'react-hot-toast';
import { HeartHandshake, Loader2, Mail, Lock, User, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function SponsorAuth() {
    const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Signup
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [magicLinkLoading, setMagicLinkLoading] = useState(false);
    const [magicLinkSent, setMagicLinkSent] = useState(false);

    const [searchParams] = useSearchParams();
    const redirectPath = searchParams.get('redirect') || '/sponsorship/checkout'; // Default to checkout
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                toast.success("Welcome back!");
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // Create User Record in MongoDB (updateUser does upsert)
                await userService.updateUser(userCredential.user.uid, {
                    email,
                    firstName,
                    lastName,
                    role: 'sponsor',
                    roles: ['sponsor']
                });
                toast.success("Account created!");
            }
            // Redirect back to intended flow
            navigate(redirectPath);
        } catch (error) {
            console.error("Auth Error:", error);
            if (error.code === 'auth/email-already-in-use') {
                toast.error("Email already in use. Try logging in.");
                setIsLogin(true);
            } else if (error.code === 'auth/wrong-password') {
                toast.error("Incorrect password.");
            } else {
                toast.error(error.message || "Authentication failed");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        const targetEmail = resetEmail || email;
        if (!targetEmail) { toast.error('Please enter your email address first.'); return; }
        setResetLoading(true);
        try {
            await fetch(`${API_BASE_URL}/api/auth/magic-link/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail })
            });
            setResetSent(true);
            setResetEmail(targetEmail);
        } catch (err) {
            toast.error('Failed to send reset email. Try again.');
        } finally {
            setResetLoading(false);
        }
    };

    const handleMagicLink = async () => {
        const targetEmail = resetEmail || email;
        if (!targetEmail) { toast.error('Please enter your email address first.'); return; }
        setMagicLinkLoading(true);
        try {
            await fetch(`${API_BASE_URL}/api/auth/magic-link/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail, role: 'sponsor' })
            });
            setMagicLinkSent(true);
            setResetEmail(targetEmail);
        } catch (err) {
            toast.error('Failed to send sign-in link. Try again.');
        } finally {
            setMagicLinkLoading(false);
        }
    };

    // Forgot Password / Magic Link View
    if (showForgotPassword) {
        const emailSent = resetSent || magicLinkSent;
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-soft p-8 border border-gray-100">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                            <HeartHandshake className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {emailSent ? 'Check Your Email' : 'Trouble Signing In?'}
                        </h1>
                    </div>

                    {emailSent ? (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <p className="text-gray-600 mb-2">
                                We sent {resetSent ? 'a password reset link' : 'a sign-in link'} to
                            </p>
                            <p className="font-bold text-gray-900 mb-4">{resetEmail}</p>
                            <p className="text-sm text-gray-400 mb-6">Check your spam folder if you don't see it.</p>
                            <button
                                onClick={() => {
                                    setShowForgotPassword(false);
                                    setResetSent(false);
                                    setMagicLinkSent(false);
                                }}
                                className="text-primary font-bold hover:underline flex items-center gap-2 mx-auto"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to login
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                                    <input
                                        type="email"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
                                        placeholder="you@company.com"
                                        value={resetEmail}
                                        onChange={e => setResetEmail(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleResetPassword}
                                    disabled={resetLoading}
                                    className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4" /> Send Password Reset Link</>}
                                </button>
                                <button
                                    onClick={handleMagicLink}
                                    disabled={magicLinkLoading}
                                    className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {magicLinkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Send Sign-In Link (No Password)</>}
                                </button>
                            </div>

                            <button
                                onClick={() => setShowForgotPassword(false)}
                                className="w-full mt-4 text-gray-400 hover:text-gray-600 text-sm font-bold flex items-center justify-center gap-1"
                            >
                                <ArrowLeft className="w-3 h-3" /> Back to login
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-soft p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                        <HeartHandshake className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{isLogin ? 'Log in to Sponsor' : 'Create Sponsor Account'}</h1>
                    <p className="text-gray-500 text-sm mt-2">
                        {isLogin ? 'Welcome back! Log in to access your sponsorships.' : 'Create an account to manage your ads and payments.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">First Name</label>
                                <div className="relative">
                                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
                                        placeholder="Jane"
                                        value={firstName}
                                        onChange={e => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Last Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
                                    placeholder="Doe"
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                            <input
                                type="email"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
                                placeholder="you@company.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Password</label>
                            {isLogin && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForgotPassword(true);
                                        setResetEmail(email);
                                    }}
                                    className="text-xs text-primary hover:text-primary/80 font-medium"
                                >
                                    Forgot password?
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                            <input
                                type="password"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary-700 transition shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isLogin ? 'Sign In & Continue' : 'Create Account & Continue'}
                    </button>
                </form>

                {/* Magic Link Option */}
                {isLogin && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <button
                            onClick={() => {
                                setShowForgotPassword(true);
                                setResetEmail(email);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:border-primary hover:text-primary transition"
                        >
                            <Sparkles className="w-4 h-4" />
                            Sign in with Email Link (No Password)
                        </button>
                        <p className="text-xs text-gray-400 text-center mt-2">
                            Perfect if you checked out as a guest
                        </p>
                    </div>
                )}

                <div className="mt-6 text-center text-sm text-gray-500">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-primary font-bold hover:underline"
                    >
                        {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-xs font-bold flex items-center justify-center gap-1">
                        <ArrowLeft className="w-3 h-3" /> Back to Cart
                    </button>
                </div>
            </div>
        </div>
    );
}
