import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, DollarSign, TrendingUp, CreditCard, Users, LayoutDashboard, Megaphone, LogOut, BarChart3, Settings, Percent, Search, Building2, X, Check, ExternalLink, Eye, Edit2, Handshake } from 'lucide-react';
import { payoutService } from '../services/payoutService';
import { userService } from '../services/userService';
import { campaignService } from '../services/campaignService';
import { systemService } from '../services/systemService';
import { sponsorshipService } from '../services/sponsorshipService';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminAnalytics from '../components/analytics/AdminAnalytics';

export default function AdminDashboard() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    // Data States
    const [transactions, setTransactions] = useState([]);
    const [payouts, setPayouts] = useState([]);
    const [users, setUsers] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [systemSettings, setSystemSettings] = useState(null);
    const [sponsorships, setSponsorships] = useState([]);

    // Search/Filter States
    const [userSearch, setUserSearch] = useState('');
    const [sponsorshipFilter, setSponsorshipFilter] = useState('all'); // all, pending, paid, branding-submitted
    const [sponsorshipOrgFilter, setSponsorshipOrgFilter] = useState('all');

    // Organization Editor Modal State
    const [editingOrg, setEditingOrg] = useState(null);
    const [orgEditForm, setOrgEditForm] = useState({});

    // Metrics State
    const [metrics, setMetrics] = useState({
        grossVolume: 0,
        netToTeams: 0,
        totalRevenue: 0,
        totalCosts: 0,
        netProfit: 0,
        totalUsers: 0,
        activeCampaigns: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            // Parallel data fetching with error isolation
            const results = await Promise.allSettled([
                getDocs(query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(50))),
                payoutService.getPendingPayouts(),
                userService.getAllUsers(),
                campaignService.getAllCampaigns(),
                systemService.getSettings(),
                sponsorshipService.getAllSponsorships()
            ]);

            const [transResult, payoutsResult, usersResult, campaignsResult, settingsResult, sponsorshipsResult] = results;

            // Handle Transactions
            let transData = [];
            if (transResult.status === 'fulfilled') {
                transData = transResult.value.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTransactions(transData);
            } else {
                console.error("Failed to load transactions:", transResult.reason);
            }

            // Handle Payouts
            if (payoutsResult.status === 'fulfilled') {
                setPayouts(payoutsResult.value);
            } else {
                console.error("Failed to load payouts:", payoutsResult.reason);
            }

            // Handle Users
            let allUsers = [];
            if (usersResult.status === 'fulfilled') {
                allUsers = usersResult.value;
                setUsers(allUsers);
            } else {
                console.error("Failed to load users:", usersResult.reason);
            }

            // Handle Campaigns
            let allCampaigns = [];
            if (campaignsResult.status === 'fulfilled') {
                allCampaigns = campaignsResult.value;
                setCampaigns(allCampaigns);
            } else {
                console.error("Failed to load campaigns:", campaignsResult.reason);
            }

            // Handle System Settings
            if (settingsResult.status === 'fulfilled') {
                setSystemSettings(settingsResult.value);
            } else {
                console.error("Failed to load settings:", settingsResult.reason);
            }

            // Handle Sponsorships
            if (sponsorshipsResult.status === 'fulfilled') {
                setSponsorships(sponsorshipsResult.value);
            } else {
                console.error("Failed to load sponsorships:", sponsorshipsResult.reason);
            }

            // Calculate Metrics
            const stats = transData.reduce((acc, t) => {
                acc.grossVolume += (t.amount || 0);
                acc.netToTeams += (t.baseAmount || 0);
                acc.totalRevenue += ((t.processingFee || 0) + (t.tipAmount || 0));
                acc.totalCosts += (t.paymentCost || 0);
                acc.netProfit += (t.netMargin || 0);
                return acc;
            }, { grossVolume: 0, netToTeams: 0, totalRevenue: 0, totalCosts: 0, netProfit: 0 });

            stats.totalUsers = allUsers.length;
            stats.activeCampaigns = allCampaigns.filter(c => c.status === 'active').length;

            setMetrics(stats);
        } catch (error) {
            console.error("Failed to load admin data", error);
        } finally {
            setLoading(false);
        }
    }

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const handleUpdateSystemSettings = async (section, key, value) => {
        if (!systemSettings) return;

        const newSettings = {
            ...systemSettings,
            [section]: {
                ...systemSettings[section],
                [key]: value
            }
        };

        setSystemSettings(newSettings); // Optimistic update
        try {
            await systemService.updateSettings(newSettings);
            toast.success("System settings updated");
        } catch (error) {
            console.error("Failed to update settings:", error);
            toast.error("Failed to save settings");
            setSystemSettings(systemSettings); // Revert
        }
    };

    const handleToggleFeeWaiver = async (user) => {
        const currentVal = user.organizationProfile?.waiveFees || false;
        const newVal = !currentVal;

        // Optimistic Update
        const updatedUsers = users.map(u =>
            u.id === user.id
                ? { ...u, organizationProfile: { ...u.organizationProfile, waiveFees: newVal } }
                : u
        );
        setUsers(updatedUsers);

        try {
            // Use dot notation to update only the specific field
            await userService.updateUser(user._id || user.id, { "organizationProfile.waiveFees": newVal });
            toast.success(`Fee waiver ${newVal ? 'enabled' : 'disabled'} for ${user.email}`);
        } catch (error) {
            console.error("Failed to update fee waiver:", error);
            toast.error("Failed to update status");
            setUsers(users); // Revert
        }
    };

    const handleUpdateSponsorshipStatus = async (sponsorshipId, newStatus) => {
        try {
            await sponsorshipService.updateSponsorship(sponsorshipId, { status: newStatus });
            setSponsorships(prev => prev.map(s =>
                s.id === sponsorshipId ? { ...s, status: newStatus } : s
            ));
            toast.success(`Sponsorship status updated to ${newStatus}`);
        } catch (error) {
            console.error("Failed to update sponsorship:", error);
            toast.error("Failed to update sponsorship");
        }
    };

    const openOrgEditor = (user) => {
        setEditingOrg(user);
        setOrgEditForm({
            orgName: user.organizationProfile?.orgName || '',
            slug: user.organizationProfile?.slug || '',
            contactEmail: user.organizationProfile?.contactEmail || user.email || '',
            website: user.organizationProfile?.website || '',
            description: user.organizationProfile?.description || '',
            logoUrl: user.organizationProfile?.logoUrl || '',
            primaryColor: user.organizationProfile?.primaryColor || '#3B82F6',
            waiveFees: user.organizationProfile?.waiveFees || false,
            enableFundraising: user.organizationProfile?.enableFundraising !== false
        });
    };

    const handleSaveOrgProfile = async () => {
        if (!editingOrg) return;
        try {
            const updateData = {
                "organizationProfile.orgName": orgEditForm.orgName,
                "organizationProfile.slug": orgEditForm.slug,
                "organizationProfile.contactEmail": orgEditForm.contactEmail,
                "organizationProfile.website": orgEditForm.website,
                "organizationProfile.description": orgEditForm.description,
                "organizationProfile.logoUrl": orgEditForm.logoUrl,
                "organizationProfile.primaryColor": orgEditForm.primaryColor,
                "organizationProfile.waiveFees": orgEditForm.waiveFees,
                "organizationProfile.enableFundraising": orgEditForm.enableFundraising
            };
            await userService.updateUser(editingOrg._id || editingOrg.id, updateData);

            // Update local state
            setUsers(prev => prev.map(u =>
                (u._id || u.id) === (editingOrg._id || editingOrg.id)
                    ? { ...u, organizationProfile: { ...u.organizationProfile, ...orgEditForm } }
                    : u
            ));

            toast.success("Organization profile updated");
            setEditingOrg(null);
        } catch (error) {
            console.error("Failed to update organization:", error);
            toast.error("Failed to save changes");
        }
    };

    // Filtered data using useMemo for performance
    const filteredUsers = useMemo(() => {
        if (!userSearch) return users;
        const search = userSearch.toLowerCase();
        return users.filter(u =>
            u.email?.toLowerCase().includes(search) ||
            u.organizationProfile?.orgName?.toLowerCase().includes(search) ||
            u.organizationProfile?.slug?.toLowerCase().includes(search) ||
            (u._id || u.id)?.toLowerCase().includes(search)
        );
    }, [users, userSearch]);

    const filteredSponsorships = useMemo(() => {
        let filtered = sponsorships;
        if (sponsorshipFilter !== 'all') {
            filtered = filtered.filter(s => s.status === sponsorshipFilter);
        }
        if (sponsorshipOrgFilter !== 'all') {
            filtered = filtered.filter(s => s.organizerId === sponsorshipOrgFilter);
        }
        return filtered;
    }, [sponsorships, sponsorshipFilter, sponsorshipOrgFilter]);

    const uniqueOrganizers = useMemo(() => {
        const orgMap = new Map();
        sponsorships.forEach(s => {
            if (s.organizer && !orgMap.has(s.organizerId)) {
                orgMap.set(s.organizerId, s.organizer);
            }
        });
        return Array.from(orgMap.entries());
    }, [sponsorships]);

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-20">
                <div className="flex items-center gap-2 text-primary font-bold text-lg">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">A</div>
                    Admin
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    {isSidebarOpen ? <LogOut className="w-6 h-6 rotate-180" /> : <LayoutDashboard className="w-6 h-6" />}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
                md:translate-x-0 md:static md:inset-auto
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-gray-100 hidden md:block">
                    <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">A</div>
                        Admin
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 mt-16 md:mt-0">
                    <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={BarChart3} label="Analytics" active={activeTab === 'analytics'} onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={Users} label="Users & Orgs" active={activeTab === 'users'} onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={Handshake} label="Sponsorships" active={activeTab === 'sponsorships'} onClick={() => { setActiveTab('sponsorships'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={Megaphone} label="Campaigns" active={activeTab === 'campaigns'} onClick={() => { setActiveTab('campaigns'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={DollarSign} label="Financials" active={activeTab === 'financials'} onClick={() => { setActiveTab('financials'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={Settings} label="System" active={activeTab === 'system'} onClick={() => { setActiveTab('system'); setIsSidebarOpen(false); }} />
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all w-full font-medium">
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 mt-16 md:mt-0 overflow-x-hidden">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        {activeTab === 'overview' && 'Dashboard Overview'}
                        {activeTab === 'analytics' && 'Platform Analytics'}
                        {activeTab === 'users' && 'Users & Organizations'}
                        {activeTab === 'sponsorships' && 'Sponsorship Management'}
                        {activeTab === 'campaigns' && 'Campaign Management'}
                        {activeTab === 'financials' && 'Financial Reports'}
                        {activeTab === 'system' && 'System Controls'}
                    </h1>
                </header>

                {activeTab === 'analytics' && <AdminAnalytics />}

                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-fadeIn">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <MetricCard title="Gross Volume" value={`$${metrics.grossVolume.toFixed(2)}`} icon={DollarSign} color="text-gray-900" />
                            <MetricCard title="Net Profit" value={`$${metrics.netProfit.toFixed(2)}`} icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
                            <MetricCard title="Total Users" value={metrics.totalUsers} icon={Users} color="text-blue-600" />
                            <MetricCard title="Active Campaigns" value={metrics.activeCampaigns} icon={Megaphone} color="text-purple-600" />
                        </div>

                        {/* Recent Activity Preview */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h3 className="font-bold text-lg mb-4">Recent Transactions</h3>
                                <div className="space-y-4">
                                    {transactions.slice(0, 5).map(t => (
                                        <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                            <div>
                                                <div className="font-medium text-gray-900">{t.donorName || 'Anonymous'}</div>
                                                <div className="text-xs text-gray-500">{new Date(t.timestamp).toLocaleDateString()}</div>
                                            </div>
                                            <div className="font-bold text-green-600">+${t.amount?.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h3 className="font-bold text-lg mb-4">Pending Payouts</h3>
                                <div className="space-y-4">
                                    {payouts.slice(0, 5).map(p => (
                                        <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                            <div>
                                                <div className="font-medium text-gray-900">User: {p.userId.slice(0, 8)}...</div>
                                                <div className="text-xs text-gray-500">{p.method}</div>
                                            </div>
                                            <div className="font-bold text-gray-900">${p.amount?.toFixed(2)}</div>
                                        </div>
                                    ))}
                                    {payouts.length === 0 && <div className="text-gray-400 text-sm">No pending payouts.</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Search and Stats Bar */}
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by email, organization, or ID..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                                />
                            </div>
                            <div className="flex gap-4 text-sm">
                                <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                                    {users.length} Total Users
                                </div>
                                <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium">
                                    {users.filter(u => u.organizationProfile?.waiveFees).length} Fee Waivers
                                </div>
                            </div>
                        </div>

                        {/* Users Grid/Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="p-4">Organization</th>
                                        <th className="p-4">Contact</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4 text-center">Fee Status</th>
                                        <th className="p-4">Joined</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredUsers.map(u => (
                                        <tr key={u._id || u.id} className="hover:bg-gray-50">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    {u.organizationProfile?.logoUrl ? (
                                                        <img
                                                            src={u.organizationProfile.logoUrl}
                                                            alt=""
                                                            className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                                            <Building2 className="w-5 h-5 text-gray-400" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-gray-900">
                                                            {u.organizationProfile?.orgName || 'Unnamed Org'}
                                                        </div>
                                                        {u.organizationProfile?.slug && (
                                                            <div className="text-xs text-gray-500">
                                                                /{u.organizationProfile.slug}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">{u.email}</div>
                                                <div className="text-xs text-gray-400 font-mono">{(u._id || u.id).slice(0, 12)}...</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === 'admin'
                                                    ? 'bg-purple-50 text-purple-700'
                                                    : 'bg-blue-50 text-blue-700'
                                                    }`}>
                                                    {u.role || 'Organizer'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleToggleFeeWaiver(u)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${u.organizationProfile?.waiveFees
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200 ring-2 ring-green-200'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {u.organizationProfile?.waiveFees ? (
                                                        <>
                                                            <Check className="w-3.5 h-3.5" />
                                                            Fees Waived
                                                        </>
                                                    ) : (
                                                        'Standard Fees'
                                                    )}
                                                </button>
                                            </td>
                                            <td className="p-4 text-gray-500 text-sm">
                                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openOrgEditor(u)}
                                                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                                                        title="Edit Organization"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {u.organizationProfile?.slug && (
                                                        <a
                                                            href={`/sponsor/${u.organizationProfile.slug}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                            title="View Public Page"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredUsers.length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    No users found matching your search.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'sponsorships' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Filter Bar */}
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="flex flex-wrap gap-3">
                                <select
                                    value={sponsorshipFilter}
                                    onChange={(e) => setSponsorshipFilter(e.target.value)}
                                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                    <option value="branding-submitted">Branding Submitted</option>
                                </select>
                                <select
                                    value={sponsorshipOrgFilter}
                                    onChange={(e) => setSponsorshipOrgFilter(e.target.value)}
                                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white"
                                >
                                    <option value="all">All Organizations</option>
                                    {uniqueOrganizers.map(([id, org]) => (
                                        <option key={id} value={id}>
                                            {org.organizationProfile?.orgName || org.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-4 text-sm">
                                <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                                    {sponsorships.length} Total
                                </div>
                                <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium">
                                    ${sponsorships.reduce((sum, s) => sum + (s.amount || 0), 0).toLocaleString()} Value
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <MetricCard
                                title="Pending"
                                value={sponsorships.filter(s => s.status === 'pending').length}
                                icon={Handshake}
                                color="text-yellow-600"
                                bg="bg-yellow-50"
                            />
                            <MetricCard
                                title="Paid"
                                value={sponsorships.filter(s => s.status === 'paid').length}
                                icon={Check}
                                color="text-green-600"
                                bg="bg-green-50"
                            />
                            <MetricCard
                                title="Branding Done"
                                value={sponsorships.filter(s => s.status === 'branding-submitted').length}
                                icon={Building2}
                                color="text-blue-600"
                                bg="bg-blue-50"
                            />
                            <MetricCard
                                title="Total Revenue"
                                value={`$${sponsorships.filter(s => s.status !== 'pending').reduce((sum, s) => sum + (s.amount || 0), 0).toLocaleString()}`}
                                icon={DollarSign}
                                color="text-primary"
                            />
                        </div>

                        {/* Sponsorships Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="p-4">Sponsor</th>
                                        <th className="p-4">Organization</th>
                                        <th className="p-4">Package</th>
                                        <th className="p-4">Amount</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredSponsorships.map(s => (
                                        <tr key={s.id || s._id} className="hover:bg-gray-50">
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">{s.sponsorName}</div>
                                                <div className="text-xs text-gray-500">{s.sponsorEmail}</div>
                                                {s.sponsorInfo?.companyName && (
                                                    <div className="text-xs text-primary font-medium">{s.sponsorInfo.companyName}</div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">
                                                    {s.organizer?.organizationProfile?.orgName || 'Unknown Org'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-600">
                                                {s.package?.title || 'Unknown Package'}
                                            </td>
                                            <td className="p-4 font-bold text-gray-900">
                                                ${s.amount?.toLocaleString()}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.status === 'paid'
                                                    ? 'bg-green-50 text-green-700'
                                                    : s.status === 'branding-submitted'
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'bg-yellow-50 text-yellow-700'
                                                    }`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500 text-sm">
                                                {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    <select
                                                        value={s.status}
                                                        onChange={(e) => handleUpdateSponsorshipStatus(s.id || s._id, e.target.value)}
                                                        className="text-xs px-2 py-1 rounded-lg border border-gray-200 bg-white"
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="paid">Paid</option>
                                                        <option value="branding-submitted">Branding Done</option>
                                                    </select>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredSponsorships.length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    No sponsorships found matching your filters.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'campaigns' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="p-4">Title</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Goal</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {campaigns.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold text-gray-900">{c.title}</td>
                                        <td className="p-4 text-gray-600 capitalize">{c.type === '5050' ? 'Team Fundraiser' : 'Grid'}</td>
                                        <td className="p-4 text-gray-900">${c.goalAmount?.toLocaleString()}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {c.status || 'Active'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'financials' && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <MetricCard title="Total Revenue" value={`$${metrics.totalRevenue.toFixed(2)}`} icon={DollarSign} color="text-green-600" />
                            <MetricCard title="Net to Teams" value={`$${metrics.netToTeams.toFixed(2)}`} icon={TrendingUp} color="text-blue-600" />
                            <MetricCard title="Est. Costs" value={`$${metrics.totalCosts.toFixed(2)}`} icon={CreditCard} color="text-red-500" />
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="font-bold text-lg">All Transactions</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-medium">
                                        <tr>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Donor</th>
                                            <th className="p-4">Amount</th>
                                            <th className="p-4">Fee</th>
                                            <th className="p-4">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {transactions.map(t => (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="p-4 text-gray-500">{new Date(t.timestamp).toLocaleDateString()}</td>
                                                <td className="p-4 font-medium">{t.donorName}</td>
                                                <td className="p-4">${t.amount?.toFixed(2)}</td>
                                                <td className="p-4 text-gray-500">${t.processingFee?.toFixed(2)}</td>
                                                <td className="p-4 font-bold text-green-600">${t.netMargin?.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'system' && systemSettings && (
                    <div className="space-y-8 animate-fadeIn">
                        {/* Global Payment Controls */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                    <CreditCard className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Global Payment Methods</h2>
                                    <p className="text-gray-500">Enable or disable specific payment gateways across the entire platform. This overrides individual organizer settings.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ToggleCard
                                    label="Stripe Payments"
                                    description="Allow credit card processing via Stripe."
                                    checked={systemSettings.payments?.stripe}
                                    onChange={(checked) => handleUpdateSystemSettings('payments', 'stripe', checked)}
                                />
                                <ToggleCard
                                    label="Square Payments"
                                    description="Allow payments via Square integration."
                                    checked={systemSettings.payments?.square}
                                    onChange={(checked) => handleUpdateSystemSettings('payments', 'square', checked)}
                                />
                                <ToggleCard
                                    label="PayPal"
                                    description="Allow PayPal checkout flow."
                                    checked={systemSettings.payments?.paypal}
                                    onChange={(checked) => handleUpdateSystemSettings('payments', 'paypal', checked)}
                                />
                                <ToggleCard
                                    label="Pay by Check"
                                    description="Allow manual check verification flow."
                                    checked={systemSettings.payments?.check}
                                    onChange={(checked) => handleUpdateSystemSettings('payments', 'check', checked)}
                                />
                            </div>
                        </div>

                        {/* Platform Fee Controls */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                                    <Percent className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Platform Fee Configuration</h2>
                                    <p className="text-gray-500">Configure the fees charged on sponsorships. These rates apply platform-wide.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FeeInputCard
                                    label="Platform Fee"
                                    description="Percentage charged as platform fee"
                                    value={systemSettings.fees?.platformFeePercent ?? 5}
                                    suffix="%"
                                    onChange={(value) => handleUpdateSystemSettings('fees', 'platformFeePercent', value)}
                                />
                                <FeeInputCard
                                    label="Processing Fee Rate"
                                    description="Credit card processing percentage"
                                    value={systemSettings.fees?.processingFeePercent ?? 2.9}
                                    suffix="%"
                                    step={0.1}
                                    onChange={(value) => handleUpdateSystemSettings('fees', 'processingFeePercent', value)}
                                />
                                <FeeInputCard
                                    label="Processing Fixed Fee"
                                    description="Fixed fee per transaction"
                                    value={systemSettings.fees?.processingFeeFixed ?? 0.30}
                                    prefix="$"
                                    step={0.01}
                                    onChange={(value) => handleUpdateSystemSettings('fees', 'processingFeeFixed', value)}
                                />
                            </div>

                            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                                <p className="text-sm text-amber-800">
                                    <strong>Note:</strong> Changes apply immediately to new checkouts. Example: A $100 sponsorship with current settings would have fees of <strong>${((systemSettings.fees?.platformFeePercent ?? 5) + (systemSettings.fees?.processingFeePercent ?? 2.9)).toFixed(1)}% + ${(systemSettings.fees?.processingFeeFixed ?? 0.30).toFixed(2)}</strong> = <strong>${(100 * ((systemSettings.fees?.platformFeePercent ?? 5) + (systemSettings.fees?.processingFeePercent ?? 2.9)) / 100 + (systemSettings.fees?.processingFeeFixed ?? 0.30)).toFixed(2)}</strong>
                                </p>
                            </div>
                        </div>

                        {/* Registration Controls */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Registration Controls</h2>
                                    <p className="text-gray-500">Manage new user signups and organization onboarding.</p>
                                </div>
                            </div>

                            <div className="max-w-xl">
                                <ToggleCard
                                    label="Allow New Organization Signups"
                                    description="If disabled, the /signup page will show a closed message. Existing users can still log in."
                                    checked={systemSettings.registrations?.organizationsEnabled}
                                    onChange={(checked) => handleUpdateSystemSettings('registrations', 'organizationsEnabled', checked)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Organization Editor Modal */}
            {editingOrg && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
                            <h2 className="text-xl font-bold text-gray-900">Edit Organization</h2>
                            <button
                                onClick={() => setEditingOrg(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                                    <input
                                        type="text"
                                        value={orgEditForm.orgName}
                                        onChange={(e) => setOrgEditForm(prev => ({ ...prev, orgName: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                                        placeholder="e.g., Eastside Youth Soccer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                                    <div className="flex items-center">
                                        <span className="text-gray-400 text-sm mr-1">/sponsor/</span>
                                        <input
                                            type="text"
                                            value={orgEditForm.slug}
                                            onChange={(e) => setOrgEditForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                                            placeholder="eastside-soccer"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                                    <input
                                        type="email"
                                        value={orgEditForm.contactEmail}
                                        onChange={(e) => setOrgEditForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                                    <input
                                        type="url"
                                        value={orgEditForm.website}
                                        onChange={(e) => setOrgEditForm(prev => ({ ...prev, website: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={orgEditForm.description}
                                    onChange={(e) => setOrgEditForm(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition resize-none"
                                    placeholder="Brief description of the organization..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                                    <input
                                        type="url"
                                        value={orgEditForm.logoUrl}
                                        onChange={(e) => setOrgEditForm(prev => ({ ...prev, logoUrl: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={orgEditForm.primaryColor}
                                            onChange={(e) => setOrgEditForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                                            className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={orgEditForm.primaryColor}
                                            onChange={(e) => setOrgEditForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Feature Toggles */}
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="font-bold text-gray-900 mb-4">Settings & Features</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                                        <div>
                                            <span className="font-medium text-gray-900">Waive Platform Fees</span>
                                            <p className="text-xs text-gray-500">Organization won't be charged platform fees</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={orgEditForm.waiveFees}
                                            onChange={(e) => setOrgEditForm(prev => ({ ...prev, waiveFees: e.target.checked }))}
                                            className="w-5 h-5 rounded text-primary focus:ring-primary/20"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                                        <div>
                                            <span className="font-medium text-gray-900">Enable Fundraising Features</span>
                                            <p className="text-xs text-gray-500">Show fundraising campaign tabs in organizer dashboard</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={orgEditForm.enableFundraising}
                                            onChange={(e) => setOrgEditForm(prev => ({ ...prev, enableFundraising: e.target.checked }))}
                                            className="w-5 h-5 rounded text-primary focus:ring-primary/20"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                            <button
                                onClick={() => setEditingOrg(null)}
                                className="px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveOrgProfile}
                                className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition font-medium flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SidebarItem({ icon: Icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full font-medium ${active ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
        >
            <Icon className="w-5 h-5" />
            {label}
        </button>
    );
}

function MetricCard({ title, value, icon: Icon, color, bg = "bg-white" }) {
    return (
        <div className={`${bg} p-6 rounded-2xl shadow-sm border border-gray-200`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">{title}</span>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
    );
}

function ToggleCard({ label, description, checked, onChange }) {
    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
                <p className="font-bold text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-gray-300'}`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
                />
            </button>
        </div>
    );
}

function FeeInputCard({ label, description, value, onChange, prefix, suffix, step = 1 }) {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleBlur = () => {
        const numValue = parseFloat(localValue) || 0;
        if (numValue !== value) {
            onChange(numValue);
        }
    };

    return (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="font-bold text-gray-900 text-sm mb-1">{label}</p>
            <p className="text-xs text-gray-500 mb-3">{description}</p>
            <div className="relative">
                {prefix && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                        {prefix}
                    </span>
                )}
                <input
                    type="number"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={handleBlur}
                    step={step}
                    min={0}
                    className={`w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-right font-mono ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-8' : ''}`}
                />
                {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                        {suffix}
                    </span>
                )}
            </div>
        </div>
    );
}
