import React, { useState, useEffect } from 'react';
import { X, Loader2, Clock } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FREQUENCIES = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 Weeks' },
    { value: 'monthly', label: 'Monthly (1st)' }
];
const PERIODS = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
];
const HOURS = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i === 0 ? '12' : i > 12 ? i - 12 : i}:00 ${i < 12 ? 'AM' : 'PM'} UTC`
}));

export default function ReportScheduleModal({ orgId, onClose }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [schedule, setSchedule] = useState({
        enabled: false,
        frequency: 'weekly',
        dayOfWeek: 1,
        hour: 9,
        period: '30d'
    });

    useEffect(() => {
        loadSchedule();
    }, [orgId]);

    async function loadSchedule() {
        try {
            const data = await analyticsService.getReportSchedule(orgId);
            if (data.schedule) {
                setSchedule(prev => ({ ...prev, ...data.schedule }));
            }
        } catch (err) {
            console.error('Failed to load schedule:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            await analyticsService.updateReportSchedule(orgId, schedule);
            onClose();
        } catch (err) {
            console.error('Failed to save schedule:', err);
        } finally {
            setSaving(false);
        }
    }

    function getNextSendDescription() {
        if (!schedule.enabled) return 'Scheduling is disabled';

        const now = new Date();
        const dayName = DAYS_OF_WEEK[schedule.dayOfWeek];
        const hourLabel = HOURS.find(h => h.value === schedule.hour)?.label || `${schedule.hour}:00 UTC`;

        if (schedule.frequency === 'monthly') {
            return `Next report: 1st of next month at ${hourLabel}`;
        }
        return `Next report: ${dayName} at ${hourLabel} (${schedule.frequency})`;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Schedule Reports</h3>
                            <p className="text-sm text-gray-500">Auto-send analytics to Slack</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="p-6 space-y-5">
                        {/* Enable/Disable Toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Enable scheduled reports</span>
                            <button
                                onClick={() => setSchedule(s => ({ ...s, enabled: !s.enabled }))}
                                className={`relative w-11 h-6 rounded-full transition-colors ${
                                    schedule.enabled ? 'bg-purple-600' : 'bg-gray-200'
                                }`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                    schedule.enabled ? 'translate-x-5' : ''
                                }`} />
                            </button>
                        </div>

                        {schedule.enabled && (
                            <>
                                {/* Frequency */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Frequency</label>
                                    <select
                                        value={schedule.frequency}
                                        onChange={e => setSchedule(s => ({ ...s, frequency: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        {FREQUENCIES.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Day of Week (hidden for monthly) */}
                                {schedule.frequency !== 'monthly' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Day of Week</label>
                                        <select
                                            value={schedule.dayOfWeek}
                                            onChange={e => setSchedule(s => ({ ...s, dayOfWeek: Number(e.target.value) }))}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        >
                                            {DAYS_OF_WEEK.map((day, i) => (
                                                <option key={i} value={i}>{day}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Hour */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Time (UTC)</label>
                                    <select
                                        value={schedule.hour}
                                        onChange={e => setSchedule(s => ({ ...s, hour: Number(e.target.value) }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        {HOURS.map(h => (
                                            <option key={h.value} value={h.value}>{h.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Report Period */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Report Period</label>
                                    <select
                                        value={schedule.period}
                                        onChange={e => setSchedule(s => ({ ...s, period: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        {PERIODS.map(p => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Next send info */}
                                <div className="bg-gray-50 rounded-lg px-4 py-3">
                                    <p className="text-sm text-gray-600">{getNextSendDescription()}</p>
                                </div>
                            </>
                        )}

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Schedule
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
