import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, DollarSign, TrendingUp, CreditCard, Users, LayoutDashboard, Megaphone, LogOut, BarChart3 } from 'lucide-react';
import { payoutService } from '../services/payoutService';
import { userService } from '../services/userService';
import { campaignService } from '../services/campaignService';
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
                campaignService.getAllCampaigns()
            ]);

            const [transResult, payoutsResult, usersResult, campaignsResult] = results;

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
                    <SidebarItem icon={Users} label="User Management" active={activeTab === 'users'} onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={Megaphone} label="Campaigns" active={activeTab === 'campaigns'} onClick={() => { setActiveTab('campaigns'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={DollarSign} label="Financials" active={activeTab === 'financials'} onClick={() => { setActiveTab('financials'); setIsSidebarOpen(false); }} />
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
                        {activeTab === 'users' && 'User Management'}
                        {activeTab === 'campaigns' && 'Campaign Management'}
                        {activeTab === 'financials' && 'Financial Reports'}
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
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="p-4">User ID</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-mono text-xs text-gray-500">{u.id}</td>
                                        <td className="p-4 font-medium text-gray-900">{u.email}</td>
                                        <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">{u.role || 'Organizer'}</span></td>
                                        <td className="p-4 text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
            </main>
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
