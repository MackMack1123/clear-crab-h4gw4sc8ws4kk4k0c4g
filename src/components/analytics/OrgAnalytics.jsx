import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, DollarSign, Users, Package, TrendingUp, Calendar, Eye, MousePointerClick, Percent, Globe, ArrowRight, Filter, ShoppingCart, Download, Send, Clock } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import AnalyticsCard from './AnalyticsCard';
import RevenueChart from './RevenueChart';
import ReportScheduleModal from './ReportScheduleModal';

export default function OrgAnalytics({ orgId, slackConnected }) {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30d');
    const [data, setData] = useState(null);
    const [trends, setTrends] = useState([]);
    const [widgetMetrics, setWidgetMetrics] = useState(null);
    const [funnelMetrics, setFunnelMetrics] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [sendingSlack, setSendingSlack] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [exportToast, setExportToast] = useState(null);
    const analyticsRef = useRef(null);

    useEffect(() => {
        loadAnalytics();
    }, [orgId, period]);

    async function loadAnalytics() {
        setLoading(true);
        try {
            const [analyticsData, trendsData, widgetData, funnelData] = await Promise.all([
                analyticsService.getOrgAnalytics(orgId, period),
                analyticsService.getOrgTrends(orgId, period),
                analyticsService.getWidgetMetrics(orgId, period).catch(() => null),
                analyticsService.getFunnelMetrics(orgId, period).catch(() => null)
            ]);
            setData(analyticsData);
            setTrends(trendsData);
            setWidgetMetrics(widgetData);
            setFunnelMetrics(funnelData);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        } finally {
            setLoading(false);
        }
    }

    const showToast = useCallback((message, type = 'success') => {
        setExportToast({ message, type });
        setTimeout(() => setExportToast(null), 3000);
    }, []);

    const handleDownloadPng = async () => {
        if (!analyticsRef.current || exporting) return;
        setExporting(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(analyticsRef.current, {
                scale: 2,
                backgroundColor: '#f9fafb',
                useCORS: true,
                logging: false
            });
            const link = document.createElement('a');
            link.download = `analytics-${period}-${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast('Report downloaded');
        } catch (err) {
            console.error('Export failed:', err);
            showToast('Export failed', 'error');
        } finally {
            setExporting(false);
        }
    };

    const handleSendToSlack = async () => {
        if (sendingSlack) return;
        setSendingSlack(true);
        try {
            await analyticsService.sendReportToSlack(orgId, period);
            showToast('Report sent to Slack');
        } catch (err) {
            console.error('Slack send failed:', err);
            showToast('Failed to send to Slack', 'error');
        } finally {
            setSendingSlack(false);
        }
    };

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
    const hasWidgetData = widgetMetrics && widgetMetrics.overview.totalImpressions > 0;
    const hasFunnelData = funnelMetrics && funnelMetrics.overview.landing > 0;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Export Toolbar + Period Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={handleDownloadPng}
                            disabled={exporting}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                            title="Download as PNG"
                        >
                            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">Download</span>
                        </button>
                        {slackConnected && (
                            <>
                                <button
                                    onClick={handleSendToSlack}
                                    disabled={sendingSlack}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                                    title="Send to Slack"
                                >
                                    {sendingSlack ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                    <span className="hidden sm:inline">Slack</span>
                                </button>
                                <button
                                    onClick={() => setShowScheduleModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                    title="Schedule reports"
                                >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Schedule</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
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

            {/* Toast notification */}
            {exportToast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all ${
                    exportToast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                }`}>
                    {exportToast.message}
                </div>
            )}

            {/* Schedule Modal */}
            {showScheduleModal && (
                <ReportScheduleModal
                    orgId={orgId}
                    onClose={() => setShowScheduleModal(false)}
                />
            )}

            {/* Analytics content (captured by screenshot) */}
            <div ref={analyticsRef} className="space-y-8">

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

            {/* Widget Performance */}
            <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">Widget Performance</h3>

                {!hasWidgetData ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                        <Eye className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium mb-1">No widget activity yet</p>
                        <p className="text-sm text-gray-400">Embed the sponsor widget on your website to start tracking impressions and clicks.</p>
                    </div>
                ) : (
                    <>
                        {/* Widget Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <AnalyticsCard
                                title="Widget Views"
                                value={widgetMetrics.overview.totalImpressions.toLocaleString()}
                                subtitle={`Last ${period === '12m' ? '12 months' : period.replace('d', ' days')}`}
                                icon={Eye}
                                color="text-indigo-600"
                                bgColor="bg-indigo-50"
                            />
                            <AnalyticsCard
                                title="Sponsor Clicks"
                                value={widgetMetrics.overview.totalClicks.toLocaleString()}
                                subtitle={`Last ${period === '12m' ? '12 months' : period.replace('d', ' days')}`}
                                icon={MousePointerClick}
                                color="text-emerald-600"
                                bgColor="bg-emerald-50"
                            />
                            <AnalyticsCard
                                title="Click Rate"
                                value={`${widgetMetrics.overview.clickThroughRate}%`}
                                subtitle="Clicks / views"
                                icon={Percent}
                                color="text-amber-600"
                                bgColor="bg-amber-50"
                            />
                            <AnalyticsCard
                                title="Embed Sites"
                                value={widgetMetrics.overview.uniqueReferrers}
                                subtitle="Unique websites"
                                icon={Globe}
                                color="text-sky-600"
                                bgColor="bg-sky-50"
                            />
                        </div>

                        {/* Widget Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-6">Widget Impressions</h3>
                                <RevenueChart
                                    data={widgetMetrics.trends}
                                    type="area"
                                    dataKey="impressions"
                                    color="#6366f1"
                                    height={240}
                                    formatValue={(v) => v.toLocaleString()}
                                    formatYAxis={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                                />
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-6">Sponsor Clicks</h3>
                                <RevenueChart
                                    data={widgetMetrics.trends}
                                    type="bar"
                                    dataKey="clicks"
                                    color="#10b981"
                                    height={240}
                                    formatValue={(v) => v.toLocaleString()}
                                    formatYAxis={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                                />
                            </div>
                        </div>

                        {/* Widget Tables */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Most Clicked Sponsors */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <MousePointerClick className="w-5 h-5 text-emerald-500" />
                                        Most Clicked Sponsors
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {widgetMetrics.topSponsorsClicked.length === 0 ? (
                                        <div className="p-6 text-center text-gray-400">No clicks yet</div>
                                    ) : (
                                        widgetMetrics.topSponsorsClicked.map((sponsor, i) => (
                                            <div key={sponsor.sponsorshipId || i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-sm">
                                                        {i + 1}
                                                    </span>
                                                    <p className="font-medium text-gray-900">{sponsor.sponsorName || 'Unknown'}</p>
                                                </div>
                                                <span className="font-bold text-emerald-600">{sponsor.clicks} clicks</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Top Embed Sites */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Globe className="w-5 h-5 text-sky-500" />
                                        Top Embed Sites
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {widgetMetrics.topReferrers.length === 0 ? (
                                        <div className="p-6 text-center text-gray-400">No referrer data yet</div>
                                    ) : (
                                        widgetMetrics.topReferrers.map((ref, i) => (
                                            <div key={ref.url || i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 font-bold flex items-center justify-center text-sm flex-shrink-0">
                                                        {i + 1}
                                                    </span>
                                                    <p className="font-medium text-gray-900 truncate">{ref.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
                                                </div>
                                                <span className="font-bold text-sky-600 flex-shrink-0 ml-3">~{ref.count} views</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Sponsorship Funnel */}
            <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">Sponsorship Funnel</h3>

                {!hasFunnelData ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                        <Filter className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium mb-1">No page view data yet</p>
                        <p className="text-sm text-gray-400">Page views are tracked automatically when visitors view your sponsorship pages.</p>
                    </div>
                ) : (
                    <>
                        {/* Funnel Visualization */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="space-y-3">
                                {[
                                    { label: 'Landing Page', key: 'landing', color: 'bg-blue-500' },
                                    { label: 'Add to Cart', key: 'addToCart', color: 'bg-cyan-500' },
                                    { label: 'Review Cart', key: 'review', color: 'bg-indigo-500' },
                                    { label: 'Checkout', key: 'checkout', color: 'bg-purple-500' },
                                    { label: 'Success', key: 'success', color: 'bg-green-500' }
                                ].map((step, i, arr) => {
                                    const count = funnelMetrics.overview[step.key];
                                    const maxCount = funnelMetrics.overview.landing || 1;
                                    const widthPct = Math.max((count / maxCount) * 100, 4);
                                    const nextStep = arr[i + 1];
                                    const nextCount = nextStep ? funnelMetrics.overview[nextStep.key] : null;
                                    const dropoff = nextCount !== null && count > 0
                                        ? Math.round((nextCount / count) * 100)
                                        : null;

                                    return (
                                        <div key={step.key}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-gray-700">{step.label}</span>
                                                <span className="text-sm font-bold text-gray-900">{count.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                                                <div
                                                    className={`${step.color} h-6 rounded-full transition-all duration-500`}
                                                    style={{ width: `${widthPct}%` }}
                                                />
                                            </div>
                                            {dropoff !== null && (
                                                <div className="flex items-center justify-center my-1">
                                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                                        <ArrowRight className="w-3 h-3 rotate-90" />
                                                        {dropoff}% continue
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Conversion Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <AnalyticsCard
                                title="Landing → Cart"
                                value={`${funnelMetrics.overview.landingToAddToCart}%`}
                                subtitle="of visitors add to cart"
                                icon={ShoppingCart}
                                color="text-cyan-600"
                                bgColor="bg-cyan-50"
                            />
                            <AnalyticsCard
                                title="Cart → Review"
                                value={`${funnelMetrics.overview.addToCartToReview}%`}
                                subtitle="of cart additions reviewed"
                                icon={ArrowRight}
                                color="text-indigo-600"
                                bgColor="bg-indigo-50"
                            />
                            <AnalyticsCard
                                title="Review → Checkout"
                                value={`${funnelMetrics.overview.reviewToCheckout}%`}
                                subtitle="of reviewers check out"
                                icon={ArrowRight}
                                color="text-purple-600"
                                bgColor="bg-purple-50"
                            />
                            <AnalyticsCard
                                title="Overall Conversion"
                                value={`${funnelMetrics.overview.overallConversion}%`}
                                subtitle="landing to success"
                                icon={TrendingUp}
                                color="text-green-600"
                                bgColor="bg-green-50"
                            />
                        </div>

                        {/* Funnel Trends Chart */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-6">Funnel Trends</h3>
                            <RevenueChart
                                data={funnelMetrics.trends}
                                type="area"
                                dataKey="landing"
                                color="#3b82f6"
                                height={240}
                                formatValue={(v) => `${v.toLocaleString()} views`}
                                formatYAxis={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                            />
                        </div>

                        {/* Top Packages by Add-to-Cart */}
                        {funnelMetrics.topPackages && funnelMetrics.topPackages.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <ShoppingCart className="w-5 h-5 text-cyan-500" />
                                        Most Popular Packages
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {funnelMetrics.topPackages.map((pkg, i) => (
                                        <div key={pkg.packageId || i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-full bg-cyan-50 text-cyan-600 font-bold flex items-center justify-center text-sm flex-shrink-0">
                                                    {i + 1}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-gray-900">{pkg.packageTitle || 'Unknown'}</p>
                                                    {pkg.packagePrice != null && (
                                                        <p className="text-sm text-gray-500">${pkg.packagePrice.toLocaleString()}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="font-bold text-cyan-600">{pkg.addToCartCount} added</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Top Referrers */}
                        {funnelMetrics.topReferrers.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Globe className="w-5 h-5 text-blue-500" />
                                        Top Landing Page Referrers
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {funnelMetrics.topReferrers.map((ref, i) => (
                                        <div key={ref.url || i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm flex-shrink-0">
                                                    {i + 1}
                                                </span>
                                                <p className="font-medium text-gray-900 truncate">{ref.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
                                            </div>
                                            <span className="font-bold text-blue-600 flex-shrink-0 ml-3">{ref.count} visits</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
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

            </div>{/* end analyticsRef */}
        </div>
    );
}
