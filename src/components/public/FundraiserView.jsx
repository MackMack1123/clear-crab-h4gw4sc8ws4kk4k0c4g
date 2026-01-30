import React, { useState } from 'react';
import { Ticket, Minus, Plus, Heart } from 'lucide-react';

export default function FundraiserView({ campaign, onCheckout }) {
    const [quantity, setQuantity] = useState(1);
    const price = campaign.price || 5; // Default $5 if not set

    const increment = () => setQuantity(q => q + 1);
    const decrement = () => setQuantity(q => Math.max(1, q - 1));

    const total = quantity * price;

    return (
        <div className="bg-white rounded-3xl shadow-glow border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-accent/10 rounded-2xl text-accent">
                    <Ticket className="w-6 h-6" />
                </div>
                <h2 className="font-heading text-2xl font-bold text-gray-900">
                    Make a Contribution
                </h2>
            </div>

            <div className="flex flex-col items-center justify-center py-4 space-y-8">
                <div className="text-center space-y-1">
                    <div className="text-6xl font-heading font-extrabold text-gray-900 tracking-tight">${price}</div>
                    <div className="text-gray-500 font-medium">per contribution unit</div>
                </div>

                <div className="flex items-center gap-6 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <button
                        onClick={decrement}
                        className="w-14 h-14 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-600 transition active:scale-95"
                    >
                        <Minus className="w-6 h-6" />
                    </button>
                    <div className="w-20 text-center font-heading font-bold text-4xl text-gray-900">{quantity}</div>
                    <button
                        onClick={increment}
                        className="w-14 h-14 flex items-center justify-center bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition active:scale-95"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>

                {/* Quick Select Options */}
                <div className="flex gap-3">
                    {[5, 10, 20].map(amt => (
                        <button
                            key={amt}
                            onClick={() => setQuantity(amt)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${quantity === amt ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {amt} Units
                        </button>
                    ))}
                </div>

                <div className="w-full max-w-sm pt-4">
                    <button
                        onClick={() => onCheckout(quantity, total)}
                        className="w-full bg-gray-900 text-white py-5 rounded-2xl font-bold text-xl shadow-xl shadow-gray-900/20 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 group"
                    >
                        <Heart className="w-6 h-6 text-red-500 fill-current group-hover:scale-110 transition" />
                        Contribute ${total}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-4 font-medium">
                        50% allocated to the distribution recipient, 50% to the team fund.
                    </p>
                </div>

            </div>
        </div>
    );
}
