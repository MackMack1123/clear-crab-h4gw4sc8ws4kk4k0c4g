import React from 'react';
import { DollarSign } from 'lucide-react';

export default function PayoutView({ campaigns }) {
    // Calculate totals
    const totalRaised = campaigns.reduce((sum, c) => sum + (c.currentAmount || 0), 0);
    const platformFees = totalRaised * 0.05; // 5% fee
    const netPayout = totalRaised - platformFees;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold">Financial Overview</h2>
                <div className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                    <DollarSign className="w-4 h-4" />
                    <span>Net Payout: ${netPayout.toFixed(2)}</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase">
                        <tr>
                            <th className="px-6 py-3">Campaign</th>
                            <th className="px-6 py-3">Total Raised</th>
                            <th className="px-6 py-3">Platform Fee (5%)</th>
                            <th className="px-6 py-3">Net Payout</th>
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                    No campaigns yet.
                                </td>
                            </tr>
                        ) : (
                            campaigns.map(campaign => {
                                const raised = campaign.currentAmount || 0;
                                const fee = raised * 0.05;
                                return (
                                    <tr key={campaign.id} className="border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{campaign.title}</td>
                                        <td className="px-6 py-4">${raised.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-red-500">-${fee.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-green-600 font-bold">${(raised - fee).toFixed(2)}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
