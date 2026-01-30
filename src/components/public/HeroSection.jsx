import React from 'react';
import { Trophy, Grid, Users, CheckCircle } from 'lucide-react';

export default function HeroSection({ campaign, sellers, selectedSellerId, onSellerChange }) {
    const progress = Math.min((campaign.currentAmount / campaign.goalAmount) * 100, 100);

    return (
        <div className="bg-white rounded-3xl shadow-glow border border-gray-100 p-8 mb-8 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-primary font-bold mb-2">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                                {campaign.type === '5050' ? <Trophy className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                            </div>
                            <span className="uppercase tracking-wider text-xs font-extrabold">{campaign.type === '5050' ? 'Team Fundraiser' : 'Contribution Grid'}</span>
                        </div>
                        <h1 className="font-heading text-4xl md:text-5xl font-bold text-gray-900 leading-tight">{campaign.title}</h1>
                    </div>
                    <div className="text-right bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100">
                        <div className="text-4xl font-heading font-bold text-gray-900">${campaign.currentAmount?.toLocaleString()}</div>
                        <div className="text-sm font-medium text-gray-500">raised of ${campaign.goalAmount?.toLocaleString()} goal</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm font-bold text-gray-500 mb-2">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden shadow-inner mb-2">
                        <div
                            className="bg-primary h-full rounded-full transition-all duration-1000 ease-out relative"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12"></div>
                        </div>
                    </div>
                    <p className="text-center text-sm font-medium text-primary animate-pulse">
                        {progress < 10 && "Off to a great start! 🚀"}
                        {progress >= 10 && progress < 50 && "We're moving! Keep it up! 💪"}
                        {progress >= 50 && progress < 80 && "Halfway there! Amazing! ⭐"}
                        {progress >= 80 && progress < 100 && "So close to the goal! 🔥"}
                        {progress >= 100 && "Goal reached! You're incredible! 🎉"}
                    </p>
                </div>

                {/* Seller Selector */}
                {sellers.length > 0 && (
                    <div className="bg-gray-50/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-200/50">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                            <Users className="w-4 h-4 text-gray-500" />
                            Support a specific player
                        </label>

                        <div className="relative group">
                            {/* Search Input */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search for a player..."
                                    className="w-full p-3 pl-10 pr-4 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none bg-white font-medium text-gray-900 transition-all shadow-sm"
                                    onChange={(e) => {
                                        // We can't easily filter the parent's state without a new prop, 
                                        // so let's just use a local state for filtering the dropdown list if we were building a full combobox.
                                        // But here, we are just replacing the select.
                                        // Let's make this a "Filter" that updates the visible list below.
                                        const term = e.target.value.toLowerCase();
                                        const list = document.getElementById('player-list');
                                        const items = list.getElementsByTagName('button');
                                        Array.from(items).forEach(item => {
                                            const name = item.textContent.toLowerCase();
                                            if (name.includes(term)) {
                                                item.style.display = 'flex';
                                            } else {
                                                item.style.display = 'none';
                                            }
                                        });
                                    }}
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </div>
                            </div>

                            {/* Player List (Scrollable) */}
                            <div id="player-list" className="mt-2 max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                <button
                                    onClick={() => onSellerChange('')}
                                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${!selectedSellerId ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${!selectedSellerId ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <span>General Campaign Fund</span>
                                    {!selectedSellerId && <CheckCircle className="w-4 h-4 ml-auto" />}
                                </button>

                                {sellers.map(seller => (
                                    <button
                                        key={seller.id}
                                        onClick={() => onSellerChange(seller.id)}
                                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${selectedSellerId === seller.id ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedSellerId === seller.id ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                                            {seller.name.charAt(0)}
                                        </div>
                                        <span className="truncate">{seller.name}</span>
                                        {selectedSellerId === seller.id && <CheckCircle className="w-4 h-4 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
