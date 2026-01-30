import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { userService } from '../services/userService';
import toast from 'react-hot-toast';
import { HeartHandshake, Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react';

export default function SponsorAuth() {
    const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Signup
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);

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
                    role: 'sponsor' // Explicitly mark as sponsor
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
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
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
