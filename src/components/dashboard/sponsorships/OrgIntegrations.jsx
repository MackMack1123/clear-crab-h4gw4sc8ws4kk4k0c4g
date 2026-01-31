import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { userService } from '../../../services/userService';
import PaymentGatewaySettings from '../PaymentGatewaySettings';
import { Mail, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../../config';

export default function OrgIntegrations() {
    const { userProfile: initialProfile, currentUser } = useAuth();
    const slackConnected = initialProfile?.slackSettings?.connected;
    const slackTeam = initialProfile?.slackSettings?.teamName;

    // Check Settings State
    const [checkSettings, setCheckSettings] = useState({
        enabled: false,
        payableTo: '',
        mailingAddress: '',
        instructions: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initialProfile?.checkSettings) {
            setCheckSettings(initialProfile.checkSettings);
        }
    }, [initialProfile]);

    const connectSlack = () => {
        window.location.href = `${API_BASE_URL}/api/slack/auth?userId=${currentUser.uid}`;

    };

    const handleSaveCheckSettings = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await userService.updateUser(currentUser.uid, { checkSettings });
            toast.success('Offline payment settings saved!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };


    return (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-soft space-y-8">
            {/* Payment Gateway Section */}
            <PaymentGatewaySettings />

            {/* Offline Payments Section */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Offline Payments</h3>
                <p className="text-sm text-gray-500">Allow sponsors to pay by check or other offline methods.</p>
            </div>

            <form onSubmit={handleSaveCheckSettings} className="bg-gray-50 p-6 rounded-2xl border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">Pay by Check</h4>
                            <p className="text-xs text-gray-500">Sponsors can pledge now and mail a check.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={checkSettings.enabled}
                            onChange={e => setCheckSettings({ ...checkSettings, enabled: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {checkSettings.enabled && (
                    <div className="pt-4 border-t border-gray-200 grid gap-4 animate-in slide-in-from-top-2 duration-200">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Make Payable To</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                                placeholder="e.g. Westside Little League"
                                value={checkSettings.payableTo}
                                onChange={e => setCheckSettings({ ...checkSettings, payableTo: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mailing Address</label>
                            <textarea
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm min-h-[80px]"
                                placeholder="e.g. 123 League Way, Springfield, IL 62704"
                                value={checkSettings.mailingAddress}
                                onChange={e => setCheckSettings({ ...checkSettings, mailingAddress: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Custom Instructions</label>
                            <textarea
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm min-h-[60px]"
                                placeholder="Instructions for the sponsor..."
                                value={checkSettings.instructions}
                                onChange={e => setCheckSettings({ ...checkSettings, instructions: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition flex items-center gap-2"
                            >
                                {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Settings</>}
                            </button>
                        </div>
                    </div>
                )}
            </form>

            {/* Divider */}
            <hr className="border-gray-200" />

            {/* Notifications Section */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Notifications</h3>
                <p className="text-sm text-gray-500">Get notified when sponsors make purchases.</p>
            </div>

            <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                        <img src="https://cdn.iconscout.com/icon/free/png-256/free-slack-logo-icon-download-in-svg-png-gif-file-formats--social-media-company-brand-vol-6-pack-logos-icons-2945115.png?f=webp" alt="Slack" className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Slack</h3>
                        <p className="text-sm text-gray-500 max-w-sm">Get real-time notifications in your team's channel whenever a new sponsorship is purchased.</p>
                    </div>
                </div>

                {slackConnected ? (
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-sm font-bold text-green-600 flex items-center gap-1 justify-end">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                Connected
                            </div>
                            <div className="text-xs text-gray-400">to {slackTeam}</div>
                        </div>
                        <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-100 transition">
                            Configure
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={connectSlack}
                        className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-lg shadow-gray-900/10 flex items-center gap-2"
                    >
                        Connect Slack
                    </button>
                )}
            </div>
        </div>
    );
}
