import React, { useState } from 'react';
import { campaignService } from '../../services/campaignService';
import { useAuth } from '../../context/AuthContext';
import { Loader2, DollarSign, Calendar, Trophy, Grid } from 'lucide-react';

export default function CampaignWizard({ onCampaignCreated }) {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        title: '',
        goalAmount: '',
        type: '5050', // '5050' or 'blockpool'
        pricePerTicket: '10', // Default $10
        pricePerBlock: '20', // Default $20
        endDate: '',
        rules: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const price = formData.type === '5050' ? Number(formData.pricePerTicket) : Number(formData.pricePerBlock);

            if (!price || price < 1) {
                alert("Price must be at least $1");
                setLoading(false);
                return;
            }

            const campaignData = {
                organizerId: currentUser.uid,
                title: formData.title,
                goalAmount: Number(formData.goalAmount),
                type: formData.type,
                endDate: formData.endDate,
                rules: formData.rules,
                price: price,
                gridData: formData.type === 'blockpool' ? Array(100).fill({ owner: null, status: 'available' }) : null
            };

            console.log("Creating campaign:", campaignData); // Debug log

            await campaignService.createCampaign(campaignData);
            if (onCampaignCreated) onCampaignCreated();
            // Reset form
            setFormData({
                title: '',
                goalAmount: '',
                type: '5050',
                pricePerTicket: '10',
                pricePerBlock: '20',
                endDate: '',
                rules: ''
            });
            setStep(1);
        } catch (error) {
            console.error("Error creating campaign:", error);
            alert("Failed to create campaign");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100"> {/* Removed overflow-hidden */}
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold">Create New Campaign</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Campaign Type Selection */}
                <div className="grid grid-cols-2 gap-4">
                    <div
                        onClick={() => setFormData({ ...formData, type: '5050' })}
                        className={`cursor-pointer p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition ${formData.type === '5050' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        <Trophy className={`w-8 h-8 ${formData.type === '5050' ? 'text-primary' : 'text-gray-400'}`} />
                        <span className="font-semibold">Team Fundraiser</span>
                    </div>
                    <div
                        onClick={() => setFormData({ ...formData, type: 'blockpool' })}
                        className={`cursor-pointer p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition ${formData.type === 'blockpool' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        <Grid className={`w-8 h-8 ${formData.type === 'blockpool' ? 'text-primary' : 'text-gray-400'}`} />
                        <span className="font-semibold">Contribution Grid</span>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="campaignTitle" className="block text-sm font-medium mb-1">Campaign Title</label>
                        <input
                            id="campaignTitle"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Tigers Spring Fundraiser"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="goalAmount" className="block text-sm font-medium mb-1">Goal Amount ($)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    id="goalAmount"
                                    name="goalAmount"
                                    type="number"
                                    value={formData.goalAmount}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-8 p-2 border rounded focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium mb-1">End Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    id="endDate"
                                    name="endDate"
                                    type="date"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-8 p-2 border rounded focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="pricePerItem" className="block text-sm font-medium mb-1">
                            {formData.type === '5050' ? 'Contribution Per Unit ($)' : 'Contribution Per Position ($)'}
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                id="pricePerItem"
                                name={formData.type === '5050' ? 'pricePerTicket' : 'pricePerBlock'}
                                type="number"
                                value={formData.type === '5050' ? formData.pricePerTicket : formData.pricePerBlock}
                                onChange={handleChange}
                                required
                                min="1"
                                className="w-full pl-8 p-2 border rounded focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Rules / Description</label>
                        <textarea
                            name="rules"
                            value={formData.rules}
                            onChange={handleChange}
                            rows={3}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Explain how the funds will be used..."
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-blue-700 transition flex justify-center items-center"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'Launch Campaign'}
                </button>
            </form>
        </div>
    );
}
