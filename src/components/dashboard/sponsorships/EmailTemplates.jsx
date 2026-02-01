import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { userService } from '../../../services/userService';
import { Mail, Save, Info, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../../config';

export default function EmailTemplates() {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testEmail, setTestEmail] = useState('');

    const [templates, setTemplates] = useState({
        sponsorship_confirmation: {
            trigger: "Sent immediately to the sponsor after a successful checkout.",
            subject: 'Confirmation: Your sponsorship for {{orgName}}',
            body: '<p>Dear {{donorName}},</p><p>Thank you for becoming a sponsor of <strong>{{orgName}}</strong>!</p>',
            enabled: true
        },
        assets_needed: {
            trigger: "Sent automatically if a sponsor has not uploaded their logo/assets within 24 hours.",
            subject: 'Action Required: We need your logo for {{orgName}}',
            body: '<p>Hi {{contactName}},</p><p>Please upload your assets.</p>',
            enabled: true
        },
        sponsorship_approved: {
            trigger: "Sent when an organization admin reviews and approves the sponsorship assets.",
            subject: 'You are live! Sponsorship approved for {{orgName}}',
            body: '<p>Great news, {{donorName}}!</p><p>Your sponsorship is approved.</p>',
            enabled: true
        }
    });

    const [activeTab, setActiveTab] = useState('sponsorship_confirmation');

    useEffect(() => {
        const loadData = async () => {
            if (!currentUser?.uid) return;
            try {
                const user = await userService.getUser(currentUser.uid);
                if (user?.organizationProfile?.emailTemplates) {
                    setTemplates(prev => {
                        // Merge server data but keep defaults for missing keys to avoid errors
                        const serverData = user.organizationProfile.emailTemplates;
                        return {
                            ...prev,
                            // Carefully merge only if the key exists in serverData
                            ...(serverData.sponsorship_confirmation && { sponsorship_confirmation: serverData.sponsorship_confirmation }),
                            ...(serverData.assets_needed && { assets_needed: serverData.assets_needed }),
                            ...(serverData.sponsorship_approved && { sponsorship_approved: serverData.sponsorship_approved })
                        };
                    });
                }
                setTestEmail(user?.email || '');
            } catch (err) {
                console.error("Failed to load templates", err);
                toast.error("Failed to load email templates");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [currentUser?.uid]);

    // ... handleSave ...

    // ... handleSendTest ...

    if (loading) return <div className="p-8 text-center text-gray-500">Loading templates...</div>;

    const currentTemplate = templates[activeTab] || {};

    const updateCurrent = (field, value) => {
        setTemplates(prev => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                [field]: value
            }
        }));
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-soft space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gray-400" /> Email Templates
                </h2>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-black transition text-sm font-bold shadow-lg shadow-gray-900/10 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
            </div>

            <div className="flex gap-2 border-b border-gray-100 overflow-x-auto pb-1">
                <button
                    onClick={() => setActiveTab('sponsorship_confirmation')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'sponsorship_confirmation' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Confirmation
                </button>
                <button
                    onClick={() => setActiveTab('assets_needed')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'assets_needed' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Request Assets
                </button>
                <button
                    onClick={() => setActiveTab('sponsorship_approved')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'sponsorship_approved' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Approved
                </button>
            </div>

            {/* Trigger Description */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-600 flex gap-3">
                <Info className="w-5 h-5 flex-shrink-0 text-gray-400" />
                <div>
                    <span className="font-bold text-gray-900">Trigger:</span> {currentTemplate.trigger || "Custom trigger"}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${currentTemplate.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm font-medium text-gray-700">Enable this email?</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={currentTemplate.enabled || false}
                            onChange={(e) => updateCurrent('enabled', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-sm text-blue-800">
                    <Info className="w-5 h-5 flex-shrink-0 text-blue-500" />
                    <div>
                        <p className="font-bold mb-1">Available Variables:</p>
                        <p className="opacity-80 font-mono text-xs">
                            {{
                                sponsorship_confirmation: '{{donorName}}, {{amount}}, {{orgName}}, {{portalUrl}}',
                                assets_needed: '{{contactName}}, {{orgName}}, {{portalUrl}}',
                                sponsorship_approved: '{{donorName}}, {{orgName}}'
                            }[activeTab] || '{{orgName}}'}
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Subject Line</label>
                    <input
                        type="text"
                        value={currentTemplate.subject || ''}
                        onChange={(e) => updateCurrent('subject', e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Email Body (HTML supported)</label>
                    <textarea
                        value={currentTemplate.body || ''}
                        onChange={(e) => updateCurrent('body', e.target.value)}
                        rows={8}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none font-mono text-sm"
                    />
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                        <input
                            type="email"
                            placeholder="Test email address"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                        <button
                            onClick={handleSendTest}
                            disabled={testing || !testEmail}
                            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {testing ? 'Sending...' : <><Send className="w-3 h-3" /> Send Test</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
