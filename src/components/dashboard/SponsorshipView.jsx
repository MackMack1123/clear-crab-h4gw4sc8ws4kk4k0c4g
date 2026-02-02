import React, { useState } from 'react';
import ManagePackages from './sponsorships/ManagePackages';
import SponsorshipList from './sponsorships/SponsorshipList';
import SponsorshipSettings from './sponsorships/SponsorshipSettings';
import PageContentBuilder from './sponsorships/PageContentBuilder';
import EmailTemplates from './sponsorships/EmailTemplates';
import WidgetGenerator from './WidgetGenerator';
import OrgAnalytics from '../analytics/OrgAnalytics';
import { useAuth } from '../../context/AuthContext';
import { Package, Users, Settings, Share2, Copy, ExternalLink, Check, LayoutTemplate, BarChart3, Mail, Code2 } from 'lucide-react';

export default function SponsorshipView({ currentTab = 'sales', onTabChange }) {
    const { currentUser } = useAuth();
    const [copied, setCopied] = useState(false);

    // If no onTabChange provided, fallback to local state (though we intend to control it from Dashboard)
    const [localTab, setLocalTab] = useState('sales');
    const activeTab = onTabChange ? currentTab : localTab;
    const handleTabChange = (tab) => {
        if (onTabChange) onTabChange(tab);
        else setLocalTab(tab);
    };

    const currentUserProfile = useAuth().userProfile;
    const orgSlug = currentUserProfile?.organizationProfile?.slug;

    const handleCopyLink = () => {
        const path = `${window.location.origin}/org/${orgSlug || currentUser.uid}`;
        navigator.clipboard.writeText(path);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Sponsorships</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleCopyLink}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-bold text-xs hover:bg-gray-50 transition shadow-sm"
                    >
                        {copied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-green-600">Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy Link
                            </>
                        )}
                    </button>
                    <a
                        href={`/org/${orgSlug || currentUser?.uid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg font-bold text-xs hover:bg-primary-700 transition shadow-sm"
                    >
                        View Page <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>
            </header>

            {/* Internal Tabs */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => handleTabChange('sales')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'sales' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}
                >
                    <Users className="w-4 h-4" /> Sales
                </button>
                <button
                    onClick={() => handleTabChange('packages')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'packages' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}
                >
                    <Package className="w-4 h-4" /> Packages
                </button>
                <button
                    onClick={() => handleTabChange('content')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'content' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}
                >
                    <LayoutTemplate className="w-4 h-4" /> Content
                </button>
                <button
                    onClick={() => handleTabChange('settings')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}
                >
                    <Settings className="w-4 h-4" /> Settings
                </button>
                <button
                    onClick={() => handleTabChange('analytics')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'analytics' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}
                >
                    <BarChart3 className="w-4 h-4" /> Analytics
                </button>
                <button
                    onClick={() => handleTabChange('emails')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'emails' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}
                >
                    <Mail className="w-4 h-4" /> Emails
                </button>
                <button
                    onClick={() => handleTabChange('widget')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'widget' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}
                >
                    <Code2 className="w-4 h-4" /> Widget
                </button>
            </div>

            {/* Content Area */}
            {activeTab === 'sales' && <SponsorshipList />}
            {activeTab === 'packages' && <ManagePackages />}
            {activeTab === 'content' && <PageContentBuilder setActiveTab={handleTabChange} />}
            {activeTab === 'settings' && <SponsorshipSettings />}
            {activeTab === 'analytics' && <OrgAnalytics orgId={currentUser?.uid} />}
            {activeTab === 'emails' && <EmailTemplates />}
            {activeTab === 'widget' && <WidgetGenerator />}
        </div>
    );
}
