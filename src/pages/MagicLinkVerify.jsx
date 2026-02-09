import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../firebase';
import { API_BASE_URL } from '../config';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function MagicLinkVerify() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying | success | error
    const [errorMessage, setErrorMessage] = useState('');
    const verifiedRef = useRef(false);

    const token = searchParams.get('token');

    useEffect(() => {
        if (verifiedRef.current) return;

        if (!token) {
            setStatus('error');
            setErrorMessage('No token found in the link.');
            return;
        }

        verifiedRef.current = true;

        const verify = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/magic-link/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                const data = await res.json();

                if (!res.ok) {
                    setStatus('error');
                    setErrorMessage(data.error || 'Verification failed.');
                    return;
                }

                await signInWithCustomToken(auth, data.customToken);
                setStatus('success');

                // Redirect to sponsor dashboard after brief delay
                setTimeout(() => navigate('/sponsor/dashboard'), 1500);
            } catch (err) {
                console.error('Magic link verify error:', err);
                setStatus('error');
                setErrorMessage('Something went wrong. Please try again.');
            }
        };

        verify();
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md text-center">
                <Link to="/" className="inline-flex items-center gap-2 mb-8">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-glow">
                        F
                    </div>
                    <span className="font-heading font-bold text-xl tracking-tight">Fundraisr</span>
                </Link>

                <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-8">
                    {status === 'verifying' && (
                        <div className="py-8">
                            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying your link...</h2>
                            <p className="text-gray-500">Just a moment while we sign you in.</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">You're signed in!</h2>
                            <p className="text-gray-500">Redirecting to your dashboard...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="py-8">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <XCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Link Invalid</h2>
                            <p className="text-gray-500 mb-6">{errorMessage}</p>
                            <p className="text-sm text-gray-400 mb-6">
                                Links expire after 15 minutes and can only be used once.
                            </p>
                            <Link
                                to="/login"
                                className="inline-block bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition"
                            >
                                Back to Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
