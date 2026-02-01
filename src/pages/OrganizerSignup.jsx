import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowRight, Lock } from 'lucide-react';
import { systemService } from '../services/systemService';
import { API_BASE_URL } from '../config';

export default function OrganizerSignup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [venmoHandle, setVenmoHandle] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const [registrationsEnabled, setRegistrationsEnabled] = useState(true);
    const [checkingSettings, setCheckingSettings] = useState(true);

    useEffect(() => {
        checkRegistrationStatus();
    }, []);

    const checkRegistrationStatus = async () => {
        try {
            const settings = await systemService.getSettings();
            if (settings?.registrations?.organizationsEnabled === false) {
                setRegistrationsEnabled(false);
            }
        } catch (error) {
            console.error("Failed to check registration settings:", error);
        } finally {
            setCheckingSettings(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user doc
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                venmoHandle: venmoHandle,
                role: 'organizer',
                createdAt: new Date().toISOString()
            });

            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError('Failed to create account. Email may be in use.');
        } finally {
            setLoading(false);
        }
    };

    if (checkingSettings) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    // Waitlist Form State
    const [waitlistData, setWaitlistData] = useState({
        orgName: '',
        contactName: '',
        email: '',
        phone: '',
        website: '',
        orgType: 'Club',
        sport: '',
        teamCount: '',
        fundraisingGoals: ''
    });
    const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
    const [waitlistLoading, setWaitlistLoading] = useState(false);

    const handleWaitlistSubmit = async (e) => {
        e.preventDefault();
        setWaitlistLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/waitlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(waitlistData)
            });

            if (response.ok) {
                setWaitlistSubmitted(true);
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to join waitlist');
            }
        } catch (err) {
            console.error(err);
            alert('Something went wrong. Please try again.');
        } finally {
            setWaitlistLoading(false);
        }
    };

    if (!registrationsEnabled) {
        if (waitlistSubmitted) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="w-full max-w-md text-center bg-white p-8 rounded-3xl shadow-soft border border-gray-100">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                            <span className="text-3xl">🎉</span>
                        </div>
                        <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">You're on the list!</h2>
                        <p className="text-gray-500 mb-6">
                            Thanks for your interest in Fundraisr. We've added <strong>{waitlistData.orgName}</strong> to our priority waitlist. We'll be in touch shortly!
                        </p>
                        <Link to="/" className="text-primary font-bold hover:underline">Return Home</Link>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-lg">
                    <div className="text-center mb-8">
                        <Link to="/" className="inline-flex items-center gap-2 mb-6">
                            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-glow">F</div>
                            <span className="font-heading font-bold text-xl tracking-tight">Fundraisr</span>
                        </Link>
                        <h2 className="font-heading text-3xl font-bold text-gray-900">Join the Waitlist</h2>
                        <p className="text-gray-500 mt-2">We're currently onboarding sports organizations in batches.</p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-8">
                        <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Org Name *</label>
                                    <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none bg-gray-50"
                                        value={waitlistData.orgName} onChange={e => setWaitlistData({ ...waitlistData, orgName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Contact Name *</label>
                                    <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none bg-gray-50"
                                        value={waitlistData.contactName} onChange={e => setWaitlistData({ ...waitlistData, contactName: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email *</label>
                                <input required type="email" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none bg-gray-50"
                                    value={waitlistData.email} onChange={e => setWaitlistData({ ...waitlistData, email: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Org Type *</label>
                                    <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none bg-gray-50"
                                        value={waitlistData.orgType} onChange={e => setWaitlistData({ ...waitlistData, orgType: e.target.value })}>
                                        <option value="Club">Club</option>
                                        <option value="Team">Team</option>
                                        <option value="League">League</option>
                                        <option value="School">School</option>
                                        <option value="Non-Profit">Non-Profit</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Sport *</label>
                                    <input required type="text" placeholder="e.g. Soccer, Baseball" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none bg-gray-50"
                                        value={waitlistData.sport} onChange={e => setWaitlistData({ ...waitlistData, sport: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Team/Athlete Count</label>
                                    <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none bg-gray-50"
                                        value={waitlistData.teamCount} onChange={e => setWaitlistData({ ...waitlistData, teamCount: e.target.value })}>
                                        <option value="">Select...</option>
                                        <option value="1-5 Teams">1-5 Teams</option>
                                        <option value="5-20 Teams">5-20 Teams</option>
                                        <option value="20+ Teams">20+ Teams</option>
                                        <option value="1-50 Athletes">1-50 Athletes</option>
                                        <option value="50-200 Athletes">50-200 Athletes</option>
                                        <option value="200+ Athletes">200+ Athletes</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Phone (Optional)</label>
                                    <input type="tel" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none bg-gray-50"
                                        value={waitlistData.phone} onChange={e => setWaitlistData({ ...waitlistData, phone: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Fundraising Goals (Optional)</label>
                                <textarea rows="2" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none bg-gray-50 resize-none"
                                    placeholder="What are you hoping to achieve?"
                                    value={waitlistData.fundraisingGoals} onChange={e => setWaitlistData({ ...waitlistData, fundraisingGoals: e.target.value })} />
                            </div>

                            <button
                                type="submit"
                                disabled={waitlistLoading}
                                className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {waitlistLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Join Waitlist'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 mb-6">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-glow">
                            T
                        </div>
                        <span className="font-heading font-bold text-xl tracking-tight">Fundraisr</span>
                    </Link>
                    <h2 className="font-heading text-3xl font-bold text-gray-900">Create Account</h2>
                    <p className="text-gray-500 mt-2">Start your team's fundraising journey.</p>
                </div>

                <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-8">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-5">
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
                            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition bg-gray-50 focus:bg-white"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Venmo Handle (Optional)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition bg-gray-50 focus:bg-white"
                                placeholder="@YourTeamHandle"
                                value={venmoHandle}
                                onChange={(e) => setVenmoHandle(e.target.value)}
                            />
                            <p className="text-xs text-gray-400 mt-1">For receiving payouts (can add later).</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Sign Up <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-8 text-gray-500">
                    Already have an account?{' '}
                    <Link to="/login" className="font-bold text-primary hover:text-primary-700 transition">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
}
