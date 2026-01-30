import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { campaignService } from '../services/campaignService';
import { useAuth } from '../context/AuthContext';
import { Loader2, DollarSign, Calendar, Trophy, Grid, ArrowRight, ArrowLeft, Check, X } from 'lucide-react';

export default function CampaignStudio() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!!id);
    const [step, setStep] = useState(1); // 1: Basics, 2: Type, 3: Review
    const [formData, setFormData] = useState({
        title: '',
        goalAmount: '',
        type: '5050', // '5050' or 'blockpool'
        pricePerTicket: '10',
        pricePerBlock: '20',
        endDate: '',
        rules: ''
    });

    useEffect(() => {
        if (isEditing) {
            loadCampaign();
        }
    }, [id]);

    async function loadCampaign() {
        try {
            const campaign = await campaignService.fetchCampaignById(id);
            if (campaign) {
                // Check ownership
                if (campaign.organizerId !== currentUser.uid) {
                    alert("You don't have permission to edit this campaign.");
                    navigate('/dashboard');
                    return;
                }

                setFormData({
                    title: campaign.title,
                    goalAmount: campaign.goalAmount,
                    type: campaign.type,
                    pricePerTicket: campaign.type === '5050' ? campaign.price : '10',
                    pricePerBlock: campaign.type === 'blockpool' ? campaign.price : '20',
                    endDate: campaign.endDate,
                    rules: campaign.rules || ''
                });
            }
        } catch (error) {
            console.error("Error loading campaign:", error);
            alert("Failed to load campaign.");
        } finally {
            setFetching(false);
        }
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const price = formData.type === '5050' ? Number(formData.pricePerTicket) : Number(formData.pricePerBlock);

            if (!price || price < 1) {
                alert("Price must be at least $1");
                setLoading(false);
                return;
            }

            const campaignData = {
                title: formData.title,
                goalAmount: Number(formData.goalAmount),
                type: formData.type,
                endDate: formData.endDate,
                rules: formData.rules,
                price: price
            };

            if (isEditing) {
                await campaignService.updateCampaign(id, campaignData);
            } else {
                await campaignService.createCampaign({
                    ...campaignData,
                    organizerId: currentUser.uid,
                    gridData: formData.type === 'blockpool' ? Array(100).fill({ owner: null, status: 'available' }) : null
                });
            }

            navigate('/dashboard');
        } catch (error) {
            console.error("Error saving campaign:", error);
            alert("Failed to save campaign");
            setLoading(false);
        }
    };

    if (fetching) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    // Live Preview Component
    const CampaignPreview = () => (
        <div className="bg-white rounded-3xl shadow-glow border border-gray-100 p-8 w-full max-w-md mx-auto transform transition-all duration-500 hover:scale-[1.02]">
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                    {formData.type === '5050' ? <Trophy className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                </div>
                <span className="uppercase tracking-wider text-xs font-extrabold">
                    {formData.type === '5050' ? 'Team Fundraiser' : 'Contribution Grid'}
                </span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-gray-900 leading-tight mb-4">
                {formData.title || "Your Campaign Title"}
            </h1>
            <div className="bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100 mb-6">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="text-3xl font-heading font-bold text-gray-900">$0</div>
                        <div className="text-xs font-medium text-gray-500">raised of ${Number(formData.goalAmount || 0).toLocaleString()} goal</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold text-primary">
                            ${formData.type === '5050' ? formData.pricePerTicket : formData.pricePerBlock}
                        </div>
                        <div className="text-xs text-gray-400">per entry</div>
                    </div>
                </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-6 overflow-hidden">
                <div className="bg-primary h-full rounded-full w-0"></div>
            </div>
            <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* Left Panel: Wizard Form */}
            <div className="w-full md:w-1/2 bg-white p-8 md:p-12 flex flex-col justify-between min-h-screen border-r border-gray-100">
                <div>
                    <div className="flex items-center gap-4 mb-12">
                        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-full transition">
                            <X className="w-6 h-6 text-gray-400" />
                        </button>
                        <div className="flex gap-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${step >= i ? 'bg-primary' : 'bg-gray-100'}`} />
                            ))}
                        </div>
                    </div>

                    <div className="max-w-lg mx-auto">
                        {step === 1 && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <h1 className="font-heading text-4xl font-bold text-gray-900 mb-2">Let's start with the basics.</h1>
                                    <p className="text-gray-500">Give your campaign a catchy title and set a goal.</p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Campaign Title</label>
                                        <input
                                            name="title"
                                            value={formData.title}
                                            onChange={handleChange}
                                            placeholder="e.g. Tigers Spring Fundraiser"
                                            className="w-full p-4 text-lg border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Goal Amount</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-4 top-4 w-6 h-6 text-gray-400" />
                                            <input
                                                name="goalAmount"
                                                type="number"
                                                value={formData.goalAmount}
                                                onChange={handleChange}
                                                placeholder="5000"
                                                className="w-full pl-12 p-4 text-lg border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <h1 className="font-heading text-4xl font-bold text-gray-900 mb-2">Choose your fundraiser type.</h1>
                                    <p className="text-gray-500">How do you want to raise funds?</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div
                                        onClick={() => setFormData({ ...formData, type: '5050' })}
                                        className={`cursor-pointer p-6 rounded-2xl border-2 flex items-center gap-4 transition-all ${formData.type === '5050' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <div className={`p-4 rounded-xl ${formData.type === '5050' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                                            <Trophy className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">Team Fundraiser</h3>
                                            <p className="text-sm text-gray-500">Classic 50/50 split. Simple and effective.</p>
                                        </div>
                                        {formData.type === '5050' && <Check className="w-6 h-6 text-primary ml-auto" />}
                                    </div>

                                    <div
                                        onClick={() => setFormData({ ...formData, type: 'blockpool' })}
                                        className={`cursor-pointer p-6 rounded-2xl border-2 flex items-center gap-4 transition-all ${formData.type === 'blockpool' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <div className={`p-4 rounded-xl ${formData.type === 'blockpool' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                                            <Grid className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">Contribution Grid</h3>
                                            <p className="text-sm text-gray-500">Supporters pick squares on a grid.</p>
                                        </div>
                                        {formData.type === 'blockpool' && <Check className="w-6 h-6 text-primary ml-auto" />}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        {formData.type === '5050' ? 'Contribution Per Unit' : 'Contribution Per Position'}
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-4 w-6 h-6 text-gray-400" />
                                        <input
                                            name={formData.type === '5050' ? 'pricePerTicket' : 'pricePerBlock'}
                                            type="number"
                                            value={formData.type === '5050' ? formData.pricePerTicket : formData.pricePerBlock}
                                            onChange={handleChange}
                                            className="w-full pl-12 p-4 text-lg border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <h1 className="font-heading text-4xl font-bold text-gray-900 mb-2">Final details.</h1>
                                    <p className="text-gray-500">Set a deadline and tell your story.</p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-4 w-6 h-6 text-gray-400" />
                                            <input
                                                name="endDate"
                                                type="date"
                                                value={formData.endDate}
                                                onChange={handleChange}
                                                className="w-full pl-12 p-4 text-lg border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Description / Rules</label>
                                        <textarea
                                            name="rules"
                                            value={formData.rules}
                                            onChange={handleChange}
                                            rows={4}
                                            placeholder="Explain how the funds will be used..."
                                            className="w-full p-4 text-lg border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition resize-none"
                                        />
                                        <div className="mt-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                            <p className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                                                <span className="bg-blue-200 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-xs">?</span>
                                                Writing Tips:
                                            </p>
                                            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside ml-1">
                                                <li>Explain <strong>why</strong> you are raising funds (e.g., new uniforms, travel costs).</li>
                                                <li>Mention the <strong>impact</strong> of a contribution.</li>
                                                <li>Keep it clear, concise, and heartfelt.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="max-w-lg mx-auto w-full flex gap-4 pt-8">
                    {step > 1 && (
                        <button
                            onClick={prevStep}
                            className="px-6 py-4 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition"
                        >
                            Back
                        </button>
                    )}
                    {step < 3 ? (
                        <button
                            onClick={nextStep}
                            disabled={!formData.title || !formData.goalAmount}
                            className="flex-1 bg-gray-900 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-gray-900/20 hover:bg-gray-800 transition flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue <ArrowRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:bg-blue-600 transition flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (isEditing ? 'Save Changes' : 'Launch Campaign')}
                        </button>
                    )}
                </div>
            </div>

            {/* Right Panel: Live Preview */}
            <div className="hidden md:flex w-1/2 bg-gray-50 items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
                <div className="relative z-10 w-full">
                    <div className="text-center mb-8">
                        <span className="bg-white px-4 py-1 rounded-full text-xs font-bold text-gray-400 border border-gray-200 uppercase tracking-widest">Live Preview</span>
                    </div>
                    <CampaignPreview />
                </div>
            </div>
        </div>
    );
}
