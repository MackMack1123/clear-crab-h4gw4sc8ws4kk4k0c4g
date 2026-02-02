import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Copy, Check, Code, Grid, LayoutList, Sun, Moon, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../config';

export default function WidgetGenerator() {
    const { currentUser, userProfile } = useAuth();
    const [copied, setCopied] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(true);
    const [sponsors, setSponsors] = useState([]);

    // Widget configuration
    const [config, setConfig] = useState({
        type: 'carousel',
        theme: 'light',
        logoSize: 'medium',
        showNames: true,
        maxSponsors: 12,
        rotationSpeed: 5
    });

    const organizerId = currentUser?.uid;

    // Fetch sponsors for preview
    useEffect(() => {
        if (organizerId) {
            fetchSponsorsPreview();
        }
    }, [organizerId]);

    const fetchSponsorsPreview = async () => {
        try {
            setPreviewLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/widget/sponsors/${organizerId}?maxSponsors=${config.maxSponsors}`);
            if (response.ok) {
                const data = await response.json();
                setSponsors(data.sponsors || []);
            }
        } catch (error) {
            console.error('Failed to fetch sponsors for preview:', error);
        } finally {
            setPreviewLoading(false);
        }
    };

    // Generate embed code
    const generateEmbedCode = () => {
        const attrs = [
            `data-org="${organizerId}"`,
            `data-type="${config.type}"`,
            `data-theme="${config.theme}"`,
            `data-logo-size="${config.logoSize}"`,
            `data-show-names="${config.showNames}"`,
            `data-max-sponsors="${config.maxSponsors}"`,
        ];

        if (config.type === 'carousel') {
            attrs.push(`data-rotation-speed="${config.rotationSpeed}"`);
        }

        return `<!-- Fundraisr Sponsor Widget -->
<div id="fundraisr-sponsors"
     ${attrs.join('\n     ')}>
</div>
<script src="https://getfundraisr.io/widget/sponsors.js" async></script>`;
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(generateEmbedCode());
        setCopied(true);
        toast.success('Embed code copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const logoSizes = {
        small: { width: 80, height: 60 },
        medium: { width: 120, height: 80 },
        large: { width: 160, height: 100 }
    };

    const currentSize = logoSizes[config.logoSize];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Sponsor Widget</h2>
                <p className="text-gray-600">
                    Embed a sponsor gallery on your website to showcase your sponsors. Works on WordPress, Squarespace, Wix, and any HTML site.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Configuration Panel */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Code className="w-5 h-5 text-purple-600" />
                            Widget Settings
                        </h3>

                        {/* Widget Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Layout Type</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setConfig({ ...config, type: 'carousel' })}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition ${config.type === 'carousel'
                                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                        }`}
                                >
                                    <LayoutList className="w-5 h-5" />
                                    <span className="font-medium">Carousel</span>
                                </button>
                                <button
                                    onClick={() => setConfig({ ...config, type: 'grid' })}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition ${config.type === 'grid'
                                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                        }`}
                                >
                                    <Grid className="w-5 h-5" />
                                    <span className="font-medium">Grid</span>
                                </button>
                            </div>
                        </div>

                        {/* Theme */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setConfig({ ...config, theme: 'light' })}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition ${config.theme === 'light'
                                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                        }`}
                                >
                                    <Sun className="w-5 h-5" />
                                    <span className="font-medium">Light</span>
                                </button>
                                <button
                                    onClick={() => setConfig({ ...config, theme: 'dark' })}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition ${config.theme === 'dark'
                                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                        }`}
                                >
                                    <Moon className="w-5 h-5" />
                                    <span className="font-medium">Dark</span>
                                </button>
                            </div>
                        </div>

                        {/* Logo Size */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Logo Size</label>
                            <div className="flex gap-2">
                                {['small', 'medium', 'large'].map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setConfig({ ...config, logoSize: size })}
                                        className={`flex-1 px-4 py-2 rounded-xl border-2 transition capitalize ${config.logoSize === size
                                            ? 'border-purple-600 bg-purple-50 text-purple-700 font-medium'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                            }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Show Names Toggle */}
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Show Business Names</label>
                            <button
                                onClick={() => setConfig({ ...config, showNames: !config.showNames })}
                                className={`relative w-12 h-6 rounded-full transition ${config.showNames ? 'bg-purple-600' : 'bg-gray-300'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.showNames ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        {/* Max Sponsors */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Max Sponsors: <span className="text-purple-600">{config.maxSponsors}</span>
                            </label>
                            <input
                                type="range"
                                min="4"
                                max="30"
                                value={config.maxSponsors}
                                onChange={(e) => setConfig({ ...config, maxSponsors: parseInt(e.target.value) })}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                            />
                        </div>

                        {/* Rotation Speed (Carousel only) */}
                        {config.type === 'carousel' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rotation Speed: <span className="text-purple-600">{config.rotationSpeed}s</span>
                                </label>
                                <input
                                    type="range"
                                    min="2"
                                    max="10"
                                    value={config.rotationSpeed}
                                    onChange={(e) => setConfig({ ...config, rotationSpeed: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                />
                            </div>
                        )}
                    </div>

                    {/* Embed Code */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Embed Code</h3>
                            <button
                                onClick={handleCopyCode}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${copied
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                    }`}
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        Copy Code
                                    </>
                                )}
                            </button>
                        </div>
                        <pre className="bg-slate-900 text-slate-300 p-4 rounded-xl text-sm overflow-x-auto">
                            <code>{generateEmbedCode()}</code>
                        </pre>
                        <p className="text-xs text-gray-500 mt-3">
                            Paste this code into your website's HTML where you want the sponsor widget to appear.
                        </p>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Live Preview</h3>
                        {sponsors.length > 0 && (
                            <span className="text-sm text-gray-500">{sponsors.length} sponsors</span>
                        )}
                    </div>

                    <div className={`rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden ${config.theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                        {previewLoading ? (
                            <div className="p-12 text-center">
                                <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-gray-500">Loading preview...</p>
                            </div>
                        ) : sponsors.length === 0 ? (
                            <div className="p-12 text-center">
                                <p className={`${config.theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mb-4`}>
                                    No sponsors to display yet.
                                </p>
                                <p className={`text-sm ${config.theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                                    Sponsors will appear here once they've completed their sponsorship and uploaded their logo.
                                </p>
                            </div>
                        ) : (
                            <div className="p-6">
                                {/* Simulated Widget Preview */}
                                {config.type === 'grid' ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {sponsors.slice(0, config.maxSponsors).map((sponsor) => (
                                            <div key={sponsor.id} className="text-center">
                                                <div
                                                    className={`rounded-lg p-3 mb-2 flex items-center justify-center ${config.theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`}
                                                    style={{ width: currentSize.width, height: currentSize.height, margin: '0 auto' }}
                                                >
                                                    {sponsor.logo ? (
                                                        <img
                                                            src={sponsor.logo}
                                                            alt={sponsor.name}
                                                            className="max-w-full max-h-full object-contain"
                                                        />
                                                    ) : (
                                                        <div className={`text-2xl font-bold ${config.theme === 'dark' ? 'text-slate-600' : 'text-gray-300'}`}>
                                                            {sponsor.name?.[0] || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                                {config.showNames && (
                                                    <>
                                                        <p className={`text-sm font-semibold truncate ${config.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                            {sponsor.name}
                                                        </p>
                                                        <p className={`text-xs ${config.theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                                            {sponsor.tier}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="overflow-hidden">
                                        <div className="flex gap-4 animate-pulse">
                                            {sponsors.slice(0, 5).map((sponsor) => (
                                                <div key={sponsor.id} className="flex-shrink-0 text-center">
                                                    <div
                                                        className={`rounded-lg p-3 mb-2 flex items-center justify-center ${config.theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`}
                                                        style={{ width: currentSize.width, height: currentSize.height }}
                                                    >
                                                        {sponsor.logo ? (
                                                            <img
                                                                src={sponsor.logo}
                                                                alt={sponsor.name}
                                                                className="max-w-full max-h-full object-contain"
                                                            />
                                                        ) : (
                                                            <div className={`text-2xl font-bold ${config.theme === 'dark' ? 'text-slate-600' : 'text-gray-300'}`}>
                                                                {sponsor.name?.[0] || '?'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {config.showNames && (
                                                        <>
                                                            <p className={`text-sm font-semibold truncate ${config.theme === 'dark' ? 'text-white' : 'text-gray-900'}`} style={{ maxWidth: currentSize.width }}>
                                                                {sponsor.name}
                                                            </p>
                                                            <p className={`text-xs ${config.theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                                                {sponsor.tier}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Powered by footer */}
                                <div className={`mt-4 pt-4 border-t text-center ${config.theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                                    <span className={`text-xs ${config.theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                                        Powered by Fundraisr
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Instructions */}
                    <div className="bg-purple-50 rounded-xl p-4">
                        <h4 className="font-medium text-purple-900 mb-2">How to use</h4>
                        <ol className="text-sm text-purple-800 space-y-1 list-decimal list-inside">
                            <li>Configure your widget settings above</li>
                            <li>Copy the embed code</li>
                            <li>Paste it into your website's HTML</li>
                            <li>The widget will automatically display your sponsors</li>
                        </ol>
                    </div>

                    {/* Test on external site */}
                    <div className="text-center">
                        <a
                            href={`/sponsor/${sponsors[0]?.id || ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 ${sponsors.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <ExternalLink className="w-4 h-4" />
                            Preview a sponsor profile page
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
