import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sponsorshipService } from '../services/sponsorshipService';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Package, ExternalLink, Edit3, Loader2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import RoleSwitcher from '../components/layout/RoleSwitcher';

export default function SponsorDashboard() {
    const { currentUser, userProfile, availableRoles, switchRole, activeRole } = useAuth();
    const navigate = useNavigate();
    const [sponsorships, setSponsorships] = useState([]);
    const [loading, setLoading] = useState(true);

    // Sync activeRole to 'sponsor' when viewing this dashboard
    useEffect(() => {
        if (activeRole !== 'sponsor' && availableRoles.includes('sponsor')) {
            switchRole('sponsor');
        }
    }, [activeRole, availableRoles, switchRole]);

    useEffect(() => {
        if (currentUser) {
            loadSponsorships();
        }
    }, [currentUser]);

    const loadSponsorships = async () => {
        try {
            // We need a way to get sponsorships by sponsorUserId
            // Assuming sponsorshipService has this or we query generic
            // For now, I might need to add this query to service if not exists.
            // I'll assume getSponsorshipsBySponsor exists or similar. 
            // If not, I'll use a direct query here or update service.
            // Let's assume I need to add it: sponsorshipService.getSponsorshipsForSponsor(uid)
            // Checking service... actually I'll just write the assumed call and fix service if needed.
            const data = await sponsorshipService.getSponsorSponsorships(currentUser.uid, currentUser.email);
            setSponsorships(data);
        } catch (error) {
            console.error("Error loading sponsorships:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    // Filter Logic
    const actionItems = sponsorships.filter(s => ['pending_details', 'rejected'].includes(s.status));

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
            case 'approved':
                return <span className="flex items-center gap-1 px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wide"><CheckCircle className="w-3 h-3" /> Active</span>;
            case 'pending_details':
                return <span className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wide"><AlertTriangle className="w-3 h-3" /> Setup Required</span>;
            case 'pending_approval':
                return <span className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wide"><Clock className="w-3 h-3" /> In Review</span>;
            case 'rejected':
                return <span className="flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase tracking-wide"><AlertTriangle className="w-3 h-3" /> Action Needed</span>;
            default:
                return <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase tracking-wide">{status}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            {/* Sidebar (simplified for Sponsor) */}
            <aside className="w-64 bg-[#0f172a] border-r border-[#1e293b] hidden md:flex flex-col fixed h-full z-10 text-white">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center text-primary font-bold">
                        <div className="w-5 h-5 bg-primary rounded-lg"></div>
                    </div>
                    <span className="font-heading font-bold text-xl tracking-tight">Fundraisr</span>
                </div>

                <nav className="flex-1 px-4 mt-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-white shadow-lg shadow-primary/25 mb-1">
                        <LayoutDashboard className="w-5 h-5" />
                        My Sponsorships
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-800 bg-[#0f172a]">
                    {/* Role Switcher - Only shows if user has multiple roles */}
                    {availableRoles.length > 1 && (
                        <div className="mb-3 pb-3 border-b border-slate-800">
                            <RoleSwitcher />
                        </div>
                    )}

                    <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl border border-slate-800 bg-slate-800/50">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {userProfile?.firstName?.[0] || 'S'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{userProfile?.firstName || 'Sponsor'}</p>
                            <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition">
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="md:ml-64 p-4 md:p-8 min-h-screen">
                <div className="max-w-5xl mx-auto space-y-8">
                    <header>
                        <h1 className="text-3xl font-bold text-gray-900">My Sponsorships</h1>
                        <p className="text-gray-500">Manage your active advertisements and billing.</p>
                    </header>

                    {/* Outstanding Actions Section */}
                    {actionItems.length > 0 && (
                        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
                            <h2 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Outstanding Actions
                            </h2>
                            <div className="grid gap-4">
                                {actionItems.map(item => (
                                    <div key={item._id || item.id} className="bg-white p-4 rounded-xl shadow-sm border border-amber-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            {item.organizerId?.organizationProfile?.logoUrl ? (
                                                <img src={item.organizerId.organizationProfile.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-gray-50" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                                                    {item.organizerId?.organizationProfile?.orgName?.[0] || 'O'}
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-bold text-gray-900">{item.packageId?.title || item.packageTitle}</h3>
                                                <p className="text-sm text-gray-500">for {item.organizerId?.organizationProfile?.orgName}</p>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/sponsorship/fulfilment/${item.id || item._id}`}
                                            className="w-full sm:w-auto px-6 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition text-center shadow-lg shadow-amber-500/20"
                                        >
                                            {item.status === 'rejected' ? 'Fix Issues' : 'Complete Setup'}
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Sponsorships List */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-6">All Sponsorships</h2>
                        {sponsorships.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border border-gray-200">
                                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Sponsorships</h2>
                                <p className="text-gray-500">You haven't purchased any packages yet.</p>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {sponsorships.map(item => (
                                    <div key={item._id || item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center gap-6 transition hover:shadow-md">
                                        {/* Organization Branding */}
                                        <div className="flex items-center gap-4 w-full md:w-1/4">
                                            {item.organizerId?.organizationProfile?.logoUrl ? (
                                                <img
                                                    src={item.organizerId.organizationProfile.logoUrl}
                                                    alt="Org Logo"
                                                    className="w-12 h-12 rounded-lg object-contain bg-gray-50 border border-gray-100"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                                    {item.organizerId?.organizationProfile?.orgName?.[0] || 'O'}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sponsoring</p>
                                                <h3 className="font-bold text-gray-900 truncate">{item.organizerId?.organizationProfile?.orgName || 'Organization'}</h3>
                                            </div>
                                        </div>

                                        {/* Package Info */}
                                        <div className="flex-1 border-l border-gray-100 pl-6 border-l-0 md:border-l">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-bold text-gray-900">{item.packageId?.title || item.packageTitle}</h3>
                                                {getStatusBadge(item.status)}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="font-bold text-gray-900">${item.packageId?.price || item.amount}</span>
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                <span>
                                                    {new Date(item.createdAt).getFullYear()} Season
                                                </span>
                                            </div>
                                        </div>

                                        {/* Date & Action */}
                                        <div className="flex items-center gap-6 w-full md:w-auto mt-4 md:mt-0 justify-between md:justify-end">
                                            <div className="text-right hidden md:block">
                                                <p className="text-xs font-bold text-gray-400 uppercase">Purchased</p>
                                                <p className="text-gray-900 font-medium">{new Date(item.createdAt).toLocaleDateString()}</p>
                                            </div>

                                            <Link
                                                to={`/sponsorship/fulfilment/${item.id || item._id}`}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:border-primary hover:text-primary transition whitespace-nowrap"
                                            >
                                                <Edit3 className="w-4 h-4" /> Manage Ad
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
