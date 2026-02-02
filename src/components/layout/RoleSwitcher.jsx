import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, HeartHandshake, Shield, ChevronDown } from 'lucide-react';

const roleConfig = {
    organizer: {
        label: 'Organizer',
        icon: Building2,
        dashboard: '/dashboard',
        color: 'text-primary',
        bgColor: 'bg-primary/10'
    },
    sponsor: {
        label: 'Sponsor',
        icon: HeartHandshake,
        dashboard: '/sponsor/dashboard',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
    },
    admin: {
        label: 'Admin',
        icon: Shield,
        dashboard: '/admin',
        color: 'text-red-600',
        bgColor: 'bg-red-100'
    }
};

export default function RoleSwitcher({ compact = false }) {
    const { activeRole, availableRoles, switchRole } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = React.useState(false);

    // Don't render if user only has one role
    if (availableRoles.length <= 1) {
        return null;
    }

    const currentConfig = roleConfig[activeRole] || roleConfig.organizer;
    const CurrentIcon = currentConfig.icon;

    const handleSwitch = (role) => {
        if (switchRole(role)) {
            setIsOpen(false);
            // Navigate to the appropriate dashboard
            const config = roleConfig[role];
            if (config) {
                navigate(config.dashboard);
            }
        }
    };

    if (compact) {
        return (
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${currentConfig.bgColor} ${currentConfig.color} font-medium text-sm transition hover:opacity-80`}
                >
                    <CurrentIcon className="w-4 h-4" />
                    <span>{currentConfig.label}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                            <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Switch View
                            </div>
                            {availableRoles.map((role) => {
                                const config = roleConfig[role];
                                if (!config) return null;
                                const Icon = config.icon;
                                const isActive = role === activeRole;

                                return (
                                    <button
                                        key={role}
                                        onClick={() => handleSwitch(role)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition ${
                                            isActive
                                                ? `${config.bgColor} ${config.color} font-medium`
                                                : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{config.label}</span>
                                        {isActive && (
                                            <span className="ml-auto text-xs bg-white/50 px-2 py-0.5 rounded">
                                                Active
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Full sidebar version (dark theme to match sidebar)
    return (
        <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                View As
            </div>
            {availableRoles.map((role) => {
                const config = roleConfig[role];
                if (!config) return null;
                const Icon = config.icon;
                const isActive = role === activeRole;

                return (
                    <button
                        key={role}
                        onClick={() => handleSwitch(role)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${
                            isActive
                                ? 'bg-white/10 text-white font-medium'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Icon className={`w-5 h-5 ${isActive ? config.color : ''}`} />
                        <span>{config.label}</span>
                        {isActive && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-current" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
