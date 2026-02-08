import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Copy, Check, Code, Grid, LayoutList, Sun, Moon, ExternalLink, Sparkles, MousePointerClick, Palette, Type, Layers } from 'lucide-react';
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
        scrollSpeed: 30,
        // Wall-specific options
        showTiers: true,
        // Banner-specific options
        buttonText: 'View Sponsorship Packages',
        buttonColor: '#6366f1'
    });

    const organizerId = currentUser?.uid;
    const orgSlug = userProfile?.organizationProfile?.slug;

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

    // Generate embed code based on widget type
    const generateEmbedCode = () => {
        const baseAttrs = [
            `data-org="${organizerId}"`,
            `data-type="${config.type}"`,
            `data-theme="${config.theme}"`,
        ];

        // Widget-specific attributes
        if (config.type === 'carousel' || config.type === 'grid' || config.type === 'gallery' || config.type === 'wall') {
            baseAttrs.push(
                `data-logo-size="${config.logoSize}"`,
                `data-show-names="${config.showNames}"`,
                `data-max-sponsors="${config.maxSponsors}"`
            );
        }

        if (config.type === 'carousel') {
            baseAttrs.push(`data-scroll-speed="${config.scrollSpeed}"`);
        }

        if (config.type === 'wall') {
            baseAttrs.push(`data-show-tiers="${config.showTiers}"`);
        }

        if (config.type === 'banner') {
            baseAttrs.push(
                `data-button-text="${config.buttonText}"`,
                `data-button-color="${config.buttonColor}"`
            );
        }

        // Use API_BASE_URL for widget script (widget is served from API server)
        const widgetScriptUrl = `${API_BASE_URL}/widget/sponsors.js`;

        return `<!-- Fundraisr Sponsor Widget -->
<div id="fundraisr-sponsors"
     ${baseAttrs.join('\n     ')}>
</div>
<script src="${widgetScriptUrl}" async></script>`;
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

    // Widget type descriptions
    const widgetTypes = [
        { id: 'carousel', name: 'Carousel', icon: LayoutList, description: 'Auto-scrolling row of sponsor logos' },
        { id: 'grid', name: 'Grid', icon: Grid, description: 'Responsive grid layout' },
        { id: 'wall', name: 'Sponsor Wall', icon: Layers, description: 'Tier-grouped sponsor showcase' },
        { id: 'gallery', name: 'Gallery', icon: Sparkles, description: 'Full page sponsor showcase' },
        { id: 'banner', name: 'Banner CTA', icon: MousePointerClick, description: 'Call-to-action button' },
    ];

    // Preset button colors
    const presetColors = [
        { name: 'Indigo', value: '#6366f1' },
        { name: 'Purple', value: '#9333ea' },
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Green', value: '#22c55e' },
        { name: 'Red', value: '#ef4444' },
        { name: 'Orange', value: '#f97316' },
    ];

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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Widget Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {widgetTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setConfig({ ...config, type: type.id })}
                                        className={`flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl border-2 transition ${config.type === type.id
                                            ? 'border-purple-600 bg-purple-50 text-purple-700'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                            }`}
                                    >
                                        <type.icon className="w-5 h-5" />
                                        <span className="font-medium text-sm">{type.name}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {widgetTypes.find(t => t.id === config.type)?.description}
                            </p>
                        </div>

                        {/* Theme - Show for all widget types */}
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

                        {/* Sponsor Display Options - Not for banner */}
                        {config.type !== 'banner' && (
                            <>
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
                                        max="50"
                                        value={config.maxSponsors}
                                        onChange={(e) => setConfig({ ...config, maxSponsors: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                    />
                                </div>
                            </>
                        )}

                        {/* Carousel-specific: Scroll Speed */}
                        {config.type === 'carousel' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Scroll Speed: <span className="text-purple-600">{config.scrollSpeed}s</span>
                                </label>
                                <input
                                    type="range"
                                    min="15"
                                    max="60"
                                    value={config.scrollSpeed}
                                    onChange={(e) => setConfig({ ...config, scrollSpeed: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                />
                                <p className="text-xs text-gray-500 mt-1">Lower = faster scrolling</p>
                            </div>
                        )}

                        {/* Wall-specific: Show Tiers Toggle */}
                        {config.type === 'wall' && (
                            <div>
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-700">Show Sponsorship Levels</label>
                                    <button
                                        onClick={() => setConfig({ ...config, showTiers: !config.showTiers })}
                                        className={`relative w-12 h-6 rounded-full transition ${config.showTiers ? 'bg-purple-600' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.showTiers ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {config.showTiers
                                        ? 'Sponsors are grouped by sponsorship level, highest to lowest.'
                                        : 'Sponsors are displayed in a randomized order each time.'}
                                </p>
                            </div>
                        )}

                        {/* Banner-specific options */}
                        {config.type === 'banner' && (
                            <>
                                {/* Button Text */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <Type className="w-4 h-4" />
                                        Button Text
                                    </label>
                                    <input
                                        type="text"
                                        value={config.buttonText}
                                        onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                        placeholder="View Sponsorship Packages"
                                    />
                                </div>

                                {/* Button Color */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <Palette className="w-4 h-4" />
                                        Button Color
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {presetColors.map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => setConfig({ ...config, buttonColor: color.value })}
                                                className={`w-8 h-8 rounded-lg border-2 transition ${config.buttonColor === color.value ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={config.buttonColor}
                                            onChange={(e) => setConfig({ ...config, buttonColor: e.target.value })}
                                            className="w-10 h-10 rounded-lg cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={config.buttonColor}
                                            onChange={(e) => setConfig({ ...config, buttonColor: e.target.value })}
                                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 font-mono text-sm"
                                            placeholder="#6366f1"
                                        />
                                    </div>
                                </div>
                            </>
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
                            Paste this code into your website's HTML where you want the widget to appear.
                        </p>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Live Preview</h3>
                        {config.type !== 'banner' && sponsors.length > 0 && (
                            <span className="text-sm text-gray-500">{sponsors.length} sponsors</span>
                        )}
                    </div>

                    <div className={`rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden ${config.theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                        {/* Banner Preview */}
                        {config.type === 'banner' ? (
                            <div className="p-8">
                                <div className={`text-center py-8 px-6 rounded-xl ${config.theme === 'dark' ? 'bg-slate-800' : 'bg-gray-50'}`}>
                                    <p className={`text-sm mb-4 ${config.theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                        Support our organization!
                                    </p>
                                    <button
                                        className="px-6 py-3 rounded-lg text-white font-semibold transition hover:opacity-90"
                                        style={{ backgroundColor: config.buttonColor }}
                                    >
                                        {config.buttonText}
                                    </button>
                                    <div className={`mt-4 pt-4 border-t ${config.theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                                        <span
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium"
                                            style={{ backgroundColor: '#6366f1' }}
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            Powered by Fundraisr
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : previewLoading ? (
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
                                {/* Gallery Preview */}
                                {config.type === 'gallery' ? (
                                    <div className="space-y-6">
                                        <div className="text-center mb-6">
                                            <h4 className={`text-xl font-bold ${config.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                Our Sponsors
                                            </h4>
                                            <p className={`text-sm ${config.theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                                Thank you to all our amazing sponsors
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {sponsors.slice(0, config.maxSponsors).map((sponsor) => (
                                                <div key={sponsor.id} className={`p-4 rounded-xl text-center ${config.theme === 'dark' ? 'bg-slate-800' : 'bg-gray-50'}`}>
                                                    <div
                                                        className="mb-3 flex items-center justify-center mx-auto"
                                                        style={{ width: currentSize.width, height: currentSize.height }}
                                                    >
                                                        {sponsor.logo ? (
                                                            <img
                                                                src={sponsor.logo}
                                                                alt={sponsor.name}
                                                                className="max-w-full max-h-full object-contain"
                                                            />
                                                        ) : (
                                                            <div className={`w-full h-full flex items-center justify-center text-2xl font-bold rounded-lg ${config.theme === 'dark' ? 'bg-slate-700 text-slate-500' : 'bg-gray-200 text-gray-400'}`}>
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
                                    </div>
                                ) : config.type === 'wall' ? (
                                    /* Wall Preview */
                                    <div className="space-y-6">
                                        {(() => {
                                            let wallSponsors = sponsors.slice(0, config.maxSponsors);

                                            if (!config.showTiers) {
                                                // Shuffle for preview
                                                wallSponsors = [...wallSponsors].sort(() => Math.random() - 0.5);
                                                return (
                                                    <div className="flex flex-wrap justify-center gap-4">
                                                        {wallSponsors.map(sponsor => (
                                                            <div key={sponsor.id} className="text-center">
                                                                <div
                                                                    className={`rounded-lg p-3 mb-2 flex items-center justify-center ${config.theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`}
                                                                    style={{ width: currentSize.width, height: currentSize.height }}
                                                                >
                                                                    {sponsor.logo ? (
                                                                        <img src={sponsor.logo} alt={sponsor.name} className="max-w-full max-h-full object-contain" />
                                                                    ) : (
                                                                        <div className={`text-2xl font-bold ${config.theme === 'dark' ? 'text-slate-600' : 'text-gray-300'}`}>
                                                                            {sponsor.name?.[0] || '?'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {config.showNames && (
                                                                    <p className={`text-sm font-semibold truncate ${config.theme === 'dark' ? 'text-white' : 'text-gray-900'}`} style={{ maxWidth: currentSize.width }}>
                                                                        {sponsor.name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }

                                            const tiers = {};
                                            const tierOrder = [];
                                            wallSponsors.forEach(s => {
                                                const tier = s.tier || 'Sponsor';
                                                if (!tiers[tier]) { tiers[tier] = []; tierOrder.push(tier); }
                                                tiers[tier].push(s);
                                            });
                                            return tierOrder.map(tierName => (
                                                <div key={tierName}>
                                                    <p className={`text-xs font-bold uppercase tracking-wider text-center border-b pb-2 mb-3 ${config.theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-gray-400 border-gray-200'}`}>
                                                        {tierName}
                                                    </p>
                                                    <div className="flex flex-wrap justify-center gap-4">
                                                        {tiers[tierName].map(sponsor => (
                                                            <div key={sponsor.id} className="text-center">
                                                                <div
                                                                    className={`rounded-lg p-3 mb-2 flex items-center justify-center ${config.theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`}
                                                                    style={{ width: currentSize.width, height: currentSize.height }}
                                                                >
                                                                    {sponsor.logo ? (
                                                                        <img src={sponsor.logo} alt={sponsor.name} className="max-w-full max-h-full object-contain" />
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
                                            ));
                                        })()}
                                    </div>
                                ) : config.type === 'grid' ? (
                                    /* Grid Preview */
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
                                    /* Carousel Preview */
                                    <div className="overflow-hidden">
                                        <div className="flex gap-4">
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
                                        <p className={`text-xs text-center mt-3 ${config.theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                                            ← Continuous scroll animation →
                                        </p>
                                    </div>
                                )}

                                {/* Powered by footer */}
                                <div className={`mt-4 pt-4 border-t text-center ${config.theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                                    <span
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium"
                                        style={{ backgroundColor: '#6366f1' }}
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        Powered by Fundraisr
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Widget-specific instructions */}
                    <div className="bg-purple-50 rounded-xl p-4">
                        <h4 className="font-medium text-purple-900 mb-2">
                            {config.type === 'carousel' && 'Carousel Widget'}
                            {config.type === 'grid' && 'Grid Widget'}
                            {config.type === 'wall' && 'Sponsor Wall Widget'}
                            {config.type === 'gallery' && 'Gallery Widget'}
                            {config.type === 'banner' && 'Banner CTA Widget'}
                        </h4>
                        <p className="text-sm text-purple-800 mb-3">
                            {config.type === 'carousel' && 'Displays sponsors in a continuously scrolling row. Perfect for headers or footers.'}
                            {config.type === 'grid' && 'Shows all sponsors in a responsive grid layout. Great for sidebar or dedicated sponsor sections.'}
                            {config.type === 'wall' && 'Groups sponsors by tier with scaled logo sizes. Top-tier sponsors get larger logos. Ideal for a dedicated sponsors page or section.'}
                            {config.type === 'gallery' && 'Full-featured sponsor showcase with headers. Ideal for a dedicated sponsors page.'}
                            {config.type === 'banner' && 'A call-to-action button linking to your sponsorship page. Perfect for attracting new sponsors.'}
                        </p>
                        <ol className="text-sm text-purple-800 space-y-1 list-decimal list-inside">
                            <li>Configure your widget settings above</li>
                            <li>Copy the embed code</li>
                            <li>Paste it into your website's HTML</li>
                        </ol>
                    </div>

                    {/* Test on external site */}
                    {config.type !== 'banner' && sponsors.length > 0 && (
                        <div className="text-center">
                            <a
                                href={`/sponsor/${sponsors[0]?.id || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Preview a sponsor profile page
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
