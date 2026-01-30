import React, { useState } from 'react';
import { Grid, Check, Heart } from 'lucide-react';

export default function ContributionGrid({ campaign, onCheckout }) {
    const [selectedBlocks, setSelectedBlocks] = useState([]);
    const price = campaign.price || 10;

    // Mock grid data if not present (for dev)
    const gridData = campaign.gridData || Array(100).fill({ status: 'available' });

    const toggleBlock = (index) => {
        if (gridData[index].status !== 'available') return;

        if (selectedBlocks.includes(index)) {
            setSelectedBlocks(selectedBlocks.filter(i => i !== index));
        } else {
            setSelectedBlocks([...selectedBlocks, index]);
        }
    };

    const total = selectedBlocks.length * price;

    return (
        <div className="bg-white rounded-3xl shadow-glow border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <Grid className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="font-heading text-2xl font-bold text-gray-900">Select Positions</h2>
                    <p className="text-sm text-gray-500">Choose your lucky spots on the grid.</p>
                </div>
            </div>

            <div className="mb-8 flex justify-between items-center text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white border border-gray-300 rounded shadow-sm"></div>
                        <span className="font-medium text-gray-600">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-primary border border-primary rounded shadow-sm shadow-primary/30"></div>
                        <span className="font-medium text-gray-900">Selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-200 rounded border border-gray-200"></div>
                        <span className="font-medium text-gray-400">Taken</span>
                    </div>
                </div>
                <div className="font-bold text-primary bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100">
                    ${price} <span className="text-gray-400 font-normal">/ spot</span>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-10 gap-1.5 mb-8 max-w-md mx-auto aspect-square p-4 bg-gray-50 rounded-2xl border border-gray-100">
                {gridData.map((block, index) => {
                    const isSelected = selectedBlocks.includes(index);
                    const isTaken = block.status !== 'available';

                    return (
                        <button
                            key={index}
                            disabled={isTaken}
                            onClick={() => toggleBlock(index)}
                            className={`
                w-full h-full rounded-md text-[10px] font-bold flex items-center justify-center transition-all duration-200
                ${isTaken ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                                    isSelected ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/30 ring-2 ring-offset-2 ring-primary z-10' :
                                        'bg-white hover:bg-blue-50 border border-gray-200 text-gray-400 hover:border-blue-200 hover:text-blue-400 shadow-sm'}
              `}
                        >
                            {isSelected ? <Check className="w-3 h-3" /> : (isTaken ? '' : index + 1)}
                        </button>
                    );
                })}
            </div>

            <div className="w-full max-w-sm mx-auto">
                <button
                    onClick={() => onCheckout(selectedBlocks.length, total, selectedBlocks)}
                    disabled={selectedBlocks.length === 0}
                    className={`
            w-full py-5 rounded-2xl font-bold text-xl shadow-xl transition-all flex items-center justify-center gap-3 group
            ${selectedBlocks.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:shadow-2xl hover:-translate-y-1 shadow-gray-900/20'}
          `}
                >
                    <Heart className={`w-6 h-6 ${selectedBlocks.length > 0 ? 'text-red-500 fill-current group-hover:scale-110 transition' : 'text-gray-400'}`} />
                    Contribute ${total}
                </button>
            </div>

        </div>
    );
}
