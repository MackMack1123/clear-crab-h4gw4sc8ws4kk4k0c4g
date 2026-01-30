import React, { useEffect, useState } from 'react';
import { Loader2, DollarSign, Users, Package, TrendingUp, Calendar } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import AnalyticsCard from './AnalyticsCard';
import RevenueChart from './RevenueChart';

export default function OrgAnalytics({ orgId }) {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30d');
    const [data, setData] = useState(null);
    const [trends, setTrends] = useState([]);

    useEffect(() => {
        loadAnalytics();
    }, [orgId, period]);

    async function loadAnalytics() {
        setLoading(true);
        try {
            const [analyticsData, trendsData] = await Promise.all([
                analyticsService.getOrgAnalytics(orgId, period),
                analyticsService.getOrgTrends(orgId, period)
            ]);
            setData(analyticsData);
            setTrends(trendsData);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20 text-gray-500">
                No analytics data available yet.
            </div>
        );
    }

    const { overview, packageStats, topSponsors, recentActivity } = data;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Period Selector */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                    {[
                        { value: '7d', label: '7 Days' },
                        { value: '30d', label: '30 Days' },
                        { value: '90d', label: '90 Days' },
                        { value: '12m', label: '12 Months' }
                    ].map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setPeriod(opt.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === opt.value
                                    ? 'bg-white text-gray-900 shadow'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnalyticsCard
                    title="Total Revenue"
                    value={`$${overview.totalRevenue.toLocaleString()}`}
                    subtitle="All time"
                    icon={DollarSign}
                    color="text-green-600"
                    bgColor="bg-green-50"
                />
                <AnalyticsCard
                    title="This Period"
                    value={`$${overview.thisPeriodRevenue.toLocaleString()}`}
                    subtitle={`Last ${period === '12m' ? '12 months' : period.replace('d', ' days')}`}
                    icon={Calendar}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                />
                <AnalyticsCard
                    title="Sponsorships"
                    value={overview.sponsorshipCount}
                    subtitle="Total received"
                    icon={Users}
                    color="text-purple-600"
                    bgColor="bg-purple-50"
                />
                <AnalyticsCard
                    title="Avg Value"
                    value={`$${overview.avgValue.toFixed(0)}`}
                    subtitle="Per sponsorship"
                    icon={TrendingUp}
                    color="text-orange-600"
                    bgColor="bg-orange-50"
                />
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue Trend</h3>
                <RevenueChart data={trends} type="area" height={280} />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Package Performance */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            Package Performance
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {packageStats.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">No packages yet</div>
                        ) : (
                            packageStats.map(pkg => (
                                <div key={pkg.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-900">{pkg.title}</p>
                                        <p className="text-sm text-gray-500">${pkg.price} · {pkg.count} sold</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">${pkg.revenue.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Top Sponsors */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            Top Sponsors
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {topSponsors.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">No sponsors yet</div>
                        ) : (
                            topSponsors.slice(0, 8).map((sponsor, i) => (
                                <div key={sponsor.email || i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                                            {i + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-gray-900">{sponsor.name}</p>
                                            <p className="text-sm text-gray-500">{sponsor.count} sponsorship{sponsor.count > 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">${sponsor.totalAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {recentActivity.length === 0 ? (
                        <div className="p-6 text-center text-gray-400">No recent activity</div>
                    ) : (
                        recentActivity.map(activity => (
                            <div key={activity.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{activity.sponsorName}</p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(activity.date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-green-600">+${activity.amount.toLocaleString()}</p>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${activity.status === 'paid' ? 'bg-green-50 text-green-700' :
                                            activity.status === 'branding-submitted' ? 'bg-blue-50 text-blue-700' :
                                                'bg-yellow-50 text-yellow-700'
                                        }`}>
                                        {activity.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
