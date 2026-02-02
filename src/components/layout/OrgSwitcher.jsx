import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    Building2,
    ChevronDown,
    Check,
    Crown,
    Shield,
    Eye
} from 'lucide-react';

export default function OrgSwitcher() {
    const { activeOrganization, allOrganizations, switchOrganization } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    // Only show if user has access to multiple organizations
    if (!allOrganizations || allOrganizations.length <= 1) {
        return null;
    }

    const getRoleIcon = (role) => {
        switch (role) {
            case 'owner':
                return <Crown className="w-3 h-3 text-amber-500" />;
            case 'manager':
                return <Shield className="w-3 h-3 text-purple-500" />;
            case 'member':
                return <Eye className="w-3 h-3 text-blue-500" />;
            default:
                return null;
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'owner':
                return 'bg-amber-100 text-amber-700';
            case 'manager':
                return 'bg-purple-100 text-purple-700';
            case 'member':
                return 'bg-blue-100 text-blue-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const handleSelect = (orgId) => {
        switchOrganization(orgId);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 transition text-left"
            >
                {/* Org Avatar */}
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden">
                    {activeOrganization?.logoUrl ? (
                        <img
                            src={activeOrganization.logoUrl}
                            alt={activeOrganization.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        activeOrganization?.name?.[0] || 'O'
                    )}
                </div>

                {/* Org Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white truncate">
                            {activeOrganization?.name || 'Select Organization'}
                        </span>
                        {getRoleIcon(activeOrganization?.role)}
                    </div>
                    <span className="text-xs text-slate-400 capitalize">
                        {activeOrganization?.isOwn ? 'Your Organization' : activeOrganization?.role}
                    </span>
                </div>

                {/* Chevron */}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu */}
                    <div className="absolute left-0 right-0 bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden">
                        <div className="p-2 border-b border-slate-700">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
                                Switch Organization
                            </span>
                        </div>

                        <div className="p-1 max-h-64 overflow-y-auto">
                            {allOrganizations.map((org) => {
                                const isActive = activeOrganization?.id === org.id;

                                return (
                                    <button
                                        key={org.id}
                                        onClick={() => handleSelect(org.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${isActive
                                            ? 'bg-purple-600/20 text-white'
                                            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                            }`}
                                    >
                                        {/* Org Avatar */}
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden ${org.isOwn
                                            ? 'bg-gradient-to-br from-amber-500 to-amber-700'
                                            : 'bg-gradient-to-br from-slate-500 to-slate-700'
                                            }`}>
                                            {org.logoUrl ? (
                                                <img
                                                    src={org.logoUrl}
                                                    alt={org.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                org.name?.[0] || 'O'
                                            )}
                                        </div>

                                        {/* Org Info */}
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-medium truncate">
                                                    {org.name}
                                                </span>
                                                {org.isOwn && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                                                        YOURS
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {getRoleIcon(org.role)}
                                                <span className="text-xs text-slate-400 capitalize">
                                                    {org.role}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Check Icon */}
                                        {isActive && (
                                            <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
