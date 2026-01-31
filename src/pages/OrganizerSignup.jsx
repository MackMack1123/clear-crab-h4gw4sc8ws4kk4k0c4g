import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowRight, Lock } from 'lucide-react';
import { systemService } from '../services/systemService';

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

    if (!registrationsEnabled) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-md text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full mb-6">
                        <Lock className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Registrations Closed</h2>
                    <p className="text-gray-500 mb-8">New organization signups are currently disabled by the administrator.</p>
                    <Link to="/" className="text-primary font-bold hover:underline">Return Home</Link>
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
