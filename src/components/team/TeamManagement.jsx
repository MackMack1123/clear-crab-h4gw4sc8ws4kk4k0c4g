import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { teamService } from '../../services/teamService';
import InviteModal from './InviteModal';
import {
    Users,
    UserPlus,
    Mail,
    Crown,
    Shield,
    Eye,
    MoreVertical,
    Trash2,
    Clock,
    X,
    ChevronDown
} from 'lucide-react';

export default function TeamManagement() {
    const { currentUser, userProfile } = useAuth();
    const [members, setMembers] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);

    useEffect(() => {
        loadTeam();
    }, [currentUser]);

    const loadTeam = async () => {
        if (!currentUser) return;

        try {
            setLoading(true);
            const data = await teamService.getTeam(currentUser.uid, currentUser.uid);
            setMembers(data.members || []);
            setInvitations(data.invitations || []);
        } catch (error) {
            console.error('Error loading team:', error);
            toast.error('Failed to load team members');
        } finally {
            setLoading(false);
        }
    };

    const handleInviteSent = () => {
        loadTeam();
        setIsInviteModalOpen(false);
    };

    const handleCancelInvite = async (inviteId) => {
        try {
            await teamService.cancelInvitation(currentUser.uid, inviteId, currentUser.uid);
            toast.success('Invitation cancelled');
            loadTeam();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleUpdateRole = async (memberId, newRole) => {
        try {
            await teamService.updateMemberRole(currentUser.uid, memberId, newRole, currentUser.uid);
            toast.success('Role updated');
            setActiveDropdown(null);
            loadTeam();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleRemoveMember = async (memberId, memberName) => {
        if (!window.confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
            return;
        }

        try {
            await teamService.removeMember(currentUser.uid, memberId, currentUser.uid);
            toast.success('Member removed');
            setActiveDropdown(null);
            loadTeam();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'owner':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                        <Crown className="w-3 h-3" />
                        Owner
                    </span>
                );
            case 'manager':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                        <Shield className="w-3 h-3" />
                        Manager
                    </span>
                );
            case 'member':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                        <Eye className="w-3 h-3" />
                        Member
                    </span>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="space-y-3 mt-6">
                        <div className="h-16 bg-gray-100 rounded-lg"></div>
                        <div className="h-16 bg-gray-100 rounded-lg"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-600" />
                            Team Members
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            Invite team members to help manage your organization.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition shadow-lg shadow-purple-600/20"
                    >
                        <UserPlus className="w-4 h-4" />
                        Invite Member
                    </button>
                </div>
            </div>

            {/* Permission Legend */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
                <h4 className="text-sm font-bold text-gray-700 mb-3">Role Permissions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="flex items-start gap-2">
                        <Crown className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="font-bold text-amber-700">Owner</span>
                            <p className="text-gray-600">Full access including team & payment settings</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="font-bold text-purple-700">Manager</span>
                            <p className="text-gray-600">Edit packages, content, manage sponsorships</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Eye className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="font-bold text-blue-700">Member</span>
                            <p className="text-gray-600">View-only access to dashboard & analytics</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Members List */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Active Members ({members.length + 1})</h3>
                </div>

                <div className="divide-y divide-gray-50">
                    {/* Owner (Current User) */}
                    <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {userProfile?.firstName?.[0] || userProfile?.email?.[0] || 'O'}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">
                                        {userProfile?.firstName} {userProfile?.lastName}
                                    </span>
                                    <span className="text-xs text-gray-400">(You)</span>
                                </div>
                                <span className="text-sm text-gray-500">{userProfile?.email}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {getRoleBadge('owner')}
                        </div>
                    </div>

                    {/* Team Members */}
                    {members.map((member) => (
                        <div key={member.memberId} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${member.role === 'manager' ? 'bg-gradient-to-br from-purple-400 to-purple-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'
                                    }`}>
                                    {member.firstName?.[0] || member.email?.[0] || 'M'}
                                </div>
                                <div>
                                    <span className="font-medium text-gray-900">
                                        {member.displayName || member.email}
                                    </span>
                                    <p className="text-sm text-gray-500">{member.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {getRoleBadge(member.role)}

                                {/* Actions Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveDropdown(activeDropdown === member.memberId ? null : member.memberId)}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {activeDropdown === member.memberId && (
                                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10">
                                            <div className="px-3 py-2 border-b border-gray-100">
                                                <span className="text-xs font-bold text-gray-500 uppercase">Change Role</span>
                                            </div>
                                            <button
                                                onClick={() => handleUpdateRole(member.memberId, 'manager')}
                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${member.role === 'manager' ? 'text-purple-600 bg-purple-50' : 'text-gray-700'
                                                    }`}
                                            >
                                                <Shield className="w-4 h-4" />
                                                Manager
                                            </button>
                                            <button
                                                onClick={() => handleUpdateRole(member.memberId, 'member')}
                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${member.role === 'member' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                                                    }`}
                                            >
                                                <Eye className="w-4 h-4" />
                                                Member
                                            </button>
                                            <div className="border-t border-gray-100 mt-1 pt-1">
                                                <button
                                                    onClick={() => handleRemoveMember(member.memberId, member.displayName || member.email)}
                                                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {members.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">No team members yet</p>
                            <p className="text-sm">Invite people to help manage your organization.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-amber-50">
                        <h3 className="font-bold text-amber-800 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Pending Invitations ({invitations.length})
                        </h3>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {invitations.map((invite) => (
                            <div key={invite.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-900">{invite.email}</span>
                                        <p className="text-xs text-gray-400">
                                            Invited as {invite.role} • Expires {new Date(invite.expiresAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {getRoleBadge(invite.role)}
                                    <button
                                        onClick={() => handleCancelInvite(invite.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="Cancel invitation"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            <InviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onInviteSent={handleInviteSent}
            />

            {/* Click outside to close dropdown */}
            {activeDropdown && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setActiveDropdown(null)}
                />
            )}
        </div>
    );
}
