import React, { useEffect, useState } from 'react';
import { Loader2, DollarSign, Users, Building2, TrendingUp, Calendar, Award } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import AnalyticsCard from './AnalyticsCard';
import RevenueChart from './RevenueChart';

export default function AdminAnalytics() {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30d');
    const [data, setData] = useState(null);
    const [trends, setTrends] = useState([]);

    useEffect(() => {
        loadAnalytics();
    }, [period]);

    async function loadAnalytics() {
        setLoading(true);
        try {
            const [analyticsData, trendsData] = await Promise.all([
                analyticsService.getAdminAnalytics(period),
                analyticsService.getAdminTrends(period)
            ]);
            setData(analyticsData);
            setTrends(trendsData);
        } catch (err) {
            console.error('Failed to load admin analytics:', err);
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

    const { overview, orgLeaderboard, packagePopularity } = data;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Period Selector */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Platform Analytics</h2>
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
                    title="Total GMV"
                    value={`$${overview.totalGMV.toLocaleString()}`}
                    subtitle="All time"
                    icon={DollarSign}
                    color="text-green-600"
                    bgColor="bg-green-50"
                />
                <AnalyticsCard
                    title="This Period"
                    value={`$${overview.periodRevenue.toLocaleString()}`}
                    subtitle={`${overview.periodSponsorships} sponsorships`}
                    icon={Calendar}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                />
                <AnalyticsCard
                    title="Total Orgs"
                    value={overview.totalOrgs}
                    subtitle={`${overview.activeOrgs} with revenue`}
                    icon={Building2}
                    color="text-purple-600"
                    bgColor="bg-purple-50"
                />
                <AnalyticsCard
                    title="Sponsorships"
                    value={overview.totalSponsorships}
                    subtitle="All time"
                    icon={Users}
                    color="text-orange-600"
                    bgColor="bg-orange-50"
                />
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Platform Revenue Trend</h3>
                <RevenueChart data={trends} type="bar" height={320} color="#10b981" />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Org Leaderboard */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-500" />
                            Organization Leaderboard
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                        {orgLeaderboard.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">No organizations with revenue yet</div>
                        ) : (
                            orgLeaderboard.map((org, i) => (
                                <div key={org.orgId} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                i === 1 ? 'bg-gray-100 text-gray-600' :
                                                    i === 2 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-gray-50 text-gray-500'
                                            }`}>
                                            {i + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-gray-900">{org.orgName}</p>
                                            <p className="text-sm text-gray-500">{org.count} sponsorship{org.count > 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">${org.revenue.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Package Popularity */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Most Popular Packages
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                        {packagePopularity.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">No package data yet</div>
                        ) : (
                            packagePopularity.map((pkg, i) => (
                                <div key={pkg.packageId} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                                            {i + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-gray-900">{pkg.title}</p>
                                            <p className="text-sm text-gray-500">${pkg.avgPrice} avg price</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">{pkg.count} sold</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
