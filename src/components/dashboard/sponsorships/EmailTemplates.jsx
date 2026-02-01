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
        receipt: {
            subject: 'Receipt: Your contribution to {{orgName}}',
            body: 'Dear {{donorName}},\n\nThank you for your generous contribution of {{amount}} to {{orgName}}.\n\nYour support makes a real difference.\n\nSincerely,\n{{orgName}}',
            enabled: true
        },
        welcome: {
            subject: 'Welcome to {{orgName}}',
            body: 'Hi {{userName}},\n\nWelcome to {{orgName}}! We are thrilled to have you with us.',
            enabled: true
        }
    });

    const [activeTab, setActiveTab] = useState('receipt'); // 'receipt' | 'welcome'

    useEffect(() => {
        const loadData = async () => {
            if (!currentUser?.uid) return;
            try {
                const user = await userService.getUser(currentUser.uid);
                if (user?.organizationProfile?.emailTemplates) {
                    setTemplates(prev => ({
                        ...prev,
                        ...user.organizationProfile.emailTemplates
                    }));
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

    const handleSave = async () => {
        setSaving(true);
        try {
            // Update via userService using partial update
            await userService.updateUser(currentUser.uid, {
                'organizationProfile.emailTemplates': templates
            });
            toast.success("Email templates saved successfully!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save templates");
        } finally {
            setSaving(false);
        }
    };

    const handleSendTest = async () => {
        if (!testEmail) return toast.error("Please enter an email address");
        setTesting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/email/send-test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.uid,
                    to: testEmail,
                    type: activeTab
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Test ${activeTab} email sent!`);
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            toast.error("Failed to send test email: " + err.message);
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading templates...</div>;

    const currentTemplate = templates[activeTab];

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
                    onClick={() => setActiveTab('receipt')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'receipt' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Donation Receipt
                </button>
                <button
                    onClick={() => setActiveTab('welcome')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'welcome' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Welcome Email
                </button>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${currentTemplate.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm font-medium text-gray-700">Enable this email?</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={currentTemplate.enabled}
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
                            {activeTab === 'receipt'
                                ? '{{donorName}}, {{amount}}, {{transactionId}}, {{orgName}}, {{date}}'
                                : '{{userName}}, {{orgName}}'
                            }
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Subject Line</label>
                    <input
                        type="text"
                        value={currentTemplate.subject}
                        onChange={(e) => updateCurrent('subject', e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Email Body (HTML supported)</label>
                    <textarea
                        value={currentTemplate.body}
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
