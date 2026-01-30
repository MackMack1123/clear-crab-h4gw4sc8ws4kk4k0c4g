import React, { useState } from 'react';
import { sellerService } from '../../services/sellerService';
import { Loader2, Upload, Users } from 'lucide-react';

export default function RosterUpload({ campaignId, onUploadComplete }) {
    const [textInput, setTextInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handleUpload = async () => {
        if (!textInput.trim()) return;

        setLoading(true);
        setStatus('');
        try {
            // Parse input: "Name, Email" or just "Name" per line
            const lines = textInput.split('\n').filter(line => line.trim());
            const sellers = lines.map(line => {
                const [name, email] = line.split(',').map(s => s.trim());
                return { name, email: email || '' };
            });

            await sellerService.addSellersBulk(campaignId, sellers);

            setStatus(`Successfully added ${sellers.length} sellers!`);
            setTextInput('');
            if (onUploadComplete) onUploadComplete();
        } catch (error) {
            console.error("Error uploading roster:", error);
            setStatus('Failed to upload roster. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Add Sellers / Roster</h3>
            </div>

            <p className="text-sm text-gray-500 mb-4">
                Paste your roster below. One player per line. Optional: Add comma and email for notifications.
                <br />
                Example: <code>John Doe, john@example.com</code>
            </p>

            <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={6}
                placeholder="Billy Smith&#10;Sarah Jones, sarah@email.com&#10;..."
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none font-mono text-sm mb-4"
            />

            <button
                onClick={handleUpload}
                disabled={loading || !campaignId}
                className="w-full bg-secondary text-secondary-foreground py-2 rounded-lg font-medium hover:bg-gray-200 transition flex justify-center items-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Upload className="w-4 h-4" /> Upload Roster</>}
            </button>

            {status && (
                <p className={`mt-3 text-sm text-center ${status.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                    {status}
                </p>
            )}
        </div>
    );
}
