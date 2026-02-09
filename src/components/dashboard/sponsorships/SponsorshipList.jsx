import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { sponsorshipService } from '../../../services/sponsorshipService';
import { CheckCircle, Clock, XCircle, ExternalLink, Mail, Loader2 } from 'lucide-react';

export default function SponsorshipList() {
    const { currentUser, activeOrganization } = useAuth();
    const [sponsorships, setSponsorships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resendingId, setResendingId] = useState(null);

    // Use activeOrganization.id for team member support
    const orgId = activeOrganization?.id || currentUser?.uid;

    useEffect(() => {
        if (orgId) {
            loadData();
        }
    }, [orgId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await sponsorshipService.getOrganizerSponsorships(orgId);
            setSponsorships(data);
        } catch (error) {
            console.error("Error loading sponsorships:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleResendReceipt = async (sponsorship) => {
        const id = sponsorship._id || sponsorship.id;
        setResendingId(id);
        try {
            await sponsorshipService.resendReceipt(id);
            toast.success(`Receipt sent to ${sponsorship.sponsorEmail}!`);
        } catch (err) {
            toast.error(err.message || 'Failed to resend receipt');
        } finally {
            setResendingId(null);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'paid': return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Paid</span>;
            case 'branding-submitted': return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Complete</span>;
            case 'pending': return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
            default: return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold">{status}</span>;
        }
    };

    if (loading) return <p className="text-gray-500">Loading sponsorships...</p>;

    if (sponsorships.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-gray-500 font-medium">No sponsorships sold yet.</p>
                <p className="text-sm text-gray-400 mt-1">Share your sponsorship page to get started!</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Sponsor</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Package</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Children</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {sponsorships.map((s) => (
                            <tr key={s._id || s.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {s.branding?.logoUrl ? (
                                            <img src={s.branding.logoUrl} alt="Logo" className="w-8 h-8 rounded object-contain bg-white border border-gray-200" />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">?</div>
                                        )}
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{(s.sponsorName && s.sponsorName !== 'undefined undefined') ? s.sponsorName : (s.sponsorInfo?.companyName || 'Guest Sponsor')}</p>
                                            <p className="text-xs text-gray-500">{s.sponsorInfo?.contactName || s.sponsorEmail}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {s.packageTitle || 'Standard'}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                    ${s.amount}
                                </td>
                                <td className="px-6 py-4">
                                    {getStatusBadge(s.status)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(s.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {s.children?.map(c => c.name).join(', ') || '-'}
                                </td>
                                <td className="px-6 py-4">
                                    {(s.status === 'paid' || s.status === 'branding-submitted') && s.sponsorEmail && (
                                        <button
                                            onClick={() => handleResendReceipt(s)}
                                            disabled={resendingId === (s._id || s.id)}
                                            title={`Resend receipt to ${s.sponsorEmail}`}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {resendingId === (s._id || s.id) ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Mail className="w-4 h-4" />
                                            )}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
