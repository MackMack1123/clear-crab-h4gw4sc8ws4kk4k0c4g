import React, { useState } from 'react';
import OrgBranding from './OrgBranding';
import OrgIntegrations from './OrgIntegrations';

export default function SponsorshipSettings() {
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'integrations'

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Organization Settings</h2>

            <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-xl max-w-md">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'general' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    General & Branding
                </button>
                <button
                    onClick={() => setActiveTab('integrations')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'integrations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Integrations
                </button>
            </div>

            {activeTab === 'general' ? <OrgBranding /> : <OrgIntegrations />}
        </div>
    );
}
