import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { teamService } from '../services/teamService';
import {
    Building2,
    Shield,
    Eye,
    Check,
    X,
    LogIn,
    UserPlus,
    Loader2,
    AlertCircle,
    Clock,
    ArrowRight
} from 'lucide-react';

export default function AcceptInvite() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { currentUser, refreshProfile } = useAuth();

    const [invitation, setInvitation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accepting, setAccepting] = useState(false);
    const [declining, setDeclining] = useState(false);

    useEffect(() => {
        loadInvitation();
    }, [token]);

    const loadInvitation = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await teamService.getInvitation(token);
            setInvitation(data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!currentUser) {
            // Redirect to login with return URL
            navigate(`/login?redirect=/invite/${token}`);
            return;
        }

        setAccepting(true);
        try {
            await teamService.acceptInvitation(token, currentUser.uid);
            toast.success(`You've joined ${invitation.orgName}!`);

            // Refresh profile to get updated memberOf
            await refreshProfile();

            // Redirect to dashboard
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.message);
            setAccepting(false);
        }
    };

    const handleDecline = async () => {
        if (!window.confirm('Are you sure you want to decline this invitation?')) {
            return;
        }

        setDeclining(true);
        try {
            await teamService.declineInvitation(token);
            toast.success('Invitation declined');
            navigate('/');
        } catch (error) {
            toast.error(error.message);
            setDeclining(false);
        }
    };

    const getRoleInfo = (role) => {
        if (role === 'manager') {
            return {
                icon: Shield,
                color: 'purple',
                title: 'Manager',
                permissions: [
                    'Edit sponsorship packages',
                    'Edit page content',
                    'Manage sponsorships',
                    'View analytics & dashboard'
                ]
            };
        }
        return {
            icon: Eye,
            color: 'blue',
            title: 'Member',
            permissions: [
                'View dashboard',
                'View sponsorships',
                'View analytics'
            ]
        };
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading invitation...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">
                        {error.includes('expired') ? 'Invitation Expired' : 'Invalid Invitation'}
                    </h1>
                    <p className="text-gray-500 mb-6">
                        {error.includes('expired')
                            ? 'This invitation has expired. Please ask the organization owner to send a new invitation.'
                            : 'This invitation link is invalid or has already been used.'}
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition"
                    >
                        Go to Homepage
                    </Link>
                </div>
            </div>
        );
    }

    const roleInfo = getRoleInfo(invitation.role);
    const RoleIcon = roleInfo.icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-lg w-full">
                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white text-center">
                        <div className="w-20 h-20 bg-white rounded-xl mx-auto mb-4 flex items-center justify-center overflow-hidden">
                            {invitation.orgLogo ? (
                                <img
                                    src={invitation.orgLogo}
                                    alt={invitation.orgName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Building2 className="w-10 h-10 text-purple-600" />
                            )}
                        </div>
                        <h1 className="text-2xl font-bold mb-1">You're Invited!</h1>
                        <p className="text-purple-200">
                            Join <span className="text-white font-semibold">{invitation.orgName}</span> on Fundraisr
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Invitation Details */}
                        <div className="text-center">
                            <p className="text-gray-600">
                                <span className="font-semibold text-gray-900">{invitation.invitedByName}</span> has invited you to join their organization as a
                            </p>
                            <div className={`inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-full bg-${roleInfo.color}-100 text-${roleInfo.color}-700`}>
                                <RoleIcon className="w-5 h-5" />
                                <span className="font-bold">{roleInfo.title}</span>
                            </div>
                        </div>

                        {/* Role Permissions */}
                        <div className="bg-gray-50 rounded-xl p-4">
                            <h3 className="text-sm font-bold text-gray-700 mb-3">As a {roleInfo.title}, you'll be able to:</h3>
                            <ul className="space-y-2">
                                {roleInfo.permissions.map((perm, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className={`w-4 h-4 text-${roleInfo.color}-500`} />
                                        {perm}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Expiration Notice */}
                        <div className="flex items-center gap-2 text-sm text-gray-500 justify-center">
                            <Clock className="w-4 h-4" />
                            <span>
                                Expires {new Date(invitation.expiresAt).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </span>
                        </div>

                        {/* Actions */}
                        {currentUser ? (
                            <div className="space-y-3">
                                <button
                                    onClick={handleAccept}
                                    disabled={accepting}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/20"
                                >
                                    {accepting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Joining...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-5 h-5" />
                                            Accept Invitation
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleDecline}
                                    disabled={declining}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition disabled:opacity-50"
                                >
                                    {declining ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Declining...
                                        </>
                                    ) : (
                                        <>
                                            <X className="w-4 h-4" />
                                            Decline
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-center text-gray-600">
                                    Sign in or create an account to accept this invitation.
                                </p>
                                <div className="flex gap-3">
                                    <Link
                                        to={`/login?redirect=/invite/${token}`}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        Sign In
                                    </Link>
                                    <Link
                                        to={`/signup?redirect=/invite/${token}`}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Create Account
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Link */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    Not expecting this invitation?{' '}
                    <Link to="/" className="text-purple-600 hover:underline font-medium">
                        Learn more about Fundraisr
                    </Link>
                </p>
            </div>
        </div>
    );
}
