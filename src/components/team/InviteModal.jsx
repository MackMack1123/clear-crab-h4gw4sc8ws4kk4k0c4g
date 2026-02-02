import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { teamService } from '../../services/teamService';
import {
    X,
    Mail,
    Shield,
    Eye,
    Send,
    AlertCircle,
    Check
} from 'lucide-react';

export default function InviteModal({ isOpen, onClose, onInviteSent }) {
    const { currentUser, userProfile } = useAuth();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('member');
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email.trim()) {
            toast.error('Please enter an email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        setSending(true);
        try {
            const inviterName = userProfile?.firstName
                ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
                : userProfile?.email || 'Team Admin';

            await teamService.inviteMember(
                currentUser.uid,
                email.toLowerCase().trim(),
                role,
                inviterName,
                currentUser.uid
            );

            toast.success(`Invitation sent to ${email}`);
            setEmail('');
            setRole('member');
            onInviteSent();
        } catch (error) {
            toast.error(error.message || 'Failed to send invitation');
        } finally {
            setSending(false);
        }
    };

    const roleOptions = [
        {
            value: 'manager',
            label: 'Manager',
            icon: Shield,
            color: 'purple',
            permissions: [
                'Edit sponsorship packages',
                'Edit page content',
                'Manage sponsorships',
                'View analytics & dashboard'
            ]
        },
        {
            value: 'member',
            label: 'Member',
            icon: Eye,
            color: 'blue',
            permissions: [
                'View dashboard',
                'View sponsorships',
                'View analytics'
            ]
        }
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Invite Team Member</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Send an invitation to join {userProfile?.organizationProfile?.orgName || 'your organization'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="colleague@example.com"
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                            Role & Permissions
                        </label>
                        <div className="space-y-3">
                            {roleOptions.map((option) => {
                                const Icon = option.icon;
                                const isSelected = role === option.value;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setRole(option.value)}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected
                                            ? `border-${option.color}-500 bg-${option.color}-50 ring-4 ring-${option.color}-500/10`
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${isSelected
                                                ? `bg-${option.color}-100 text-${option.color}-600`
                                                : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className={`font-bold ${isSelected ? `text-${option.color}-700` : 'text-gray-900'}`}>
                                                        {option.label}
                                                    </span>
                                                    {isSelected && (
                                                        <div className={`w-5 h-5 bg-${option.color}-500 rounded-full flex items-center justify-center`}>
                                                            <Check className="w-3 h-3 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <ul className="mt-2 space-y-1">
                                                    {option.permissions.map((perm, i) => (
                                                        <li key={i} className="text-sm text-gray-500 flex items-center gap-1.5">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? `bg-${option.color}-400` : 'bg-gray-300'}`}></span>
                                                            {perm}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Info Note */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl text-sm">
                        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="text-blue-700">
                            <p className="font-medium">Invitation expires in 7 days</p>
                            <p className="text-blue-600 mt-1">
                                The invitee will receive an email with a link to join. They'll need to create an account or sign in to accept.
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={sending || !email.trim()}
                            className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {sending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Invitation
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
