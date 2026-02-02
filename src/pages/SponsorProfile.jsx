import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ExternalLink, Building2, Award, ArrowLeft, Globe, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function SponsorProfile() {
    const { sponsorshipId } = useParams();
    const [sponsor, setSponsor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (sponsorshipId) {
            loadSponsor();
        }
    }, [sponsorshipId]);

    const loadSponsor = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/widget/sponsor/${sponsorshipId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    setError('Sponsor not found');
                } else {
                    setError('Failed to load sponsor');
                }
                return;
            }

            const data = await response.json();
            setSponsor(data);
        } catch (err) {
            console.error('Error loading sponsor:', err);
            setError('Failed to load sponsor');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading sponsor profile...</p>
                </div>
            </div>
        );
    }

    if (error || !sponsor) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Sponsor Not Found</h1>
                    <p className="text-slate-400 mb-6">This sponsor profile doesn't exist or is no longer available.</p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const { organization } = sponsor;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <Link
                        to={organization?.sponsorshipUrl || '/'}
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to {organization?.name || 'Organization'}</span>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl border border-slate-700 overflow-hidden">
                    {/* Sponsor Logo Section */}
                    <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-8 sm:p-12 text-center">
                        {sponsor.logo ? (
                            <div className="inline-block bg-white rounded-2xl p-6 shadow-xl">
                                <img
                                    src={sponsor.logo}
                                    alt={sponsor.name}
                                    className="max-w-[280px] max-h-[160px] object-contain"
                                />
                            </div>
                        ) : (
                            <div className="inline-flex items-center justify-center w-32 h-32 bg-slate-700 rounded-2xl">
                                <Building2 className="w-16 h-16 text-slate-500" />
                            </div>
                        )}
                    </div>

                    {/* Sponsor Details */}
                    <div className="p-8 sm:p-12">
                        {/* Name and Tier */}
                        <div className="text-center mb-8">
                            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                                {sponsor.name}
                            </h1>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 rounded-full">
                                <Award className="w-5 h-5 text-purple-400" />
                                <span className="text-purple-300 font-medium">
                                    {sponsor.tier} of {organization?.name}
                                </span>
                            </div>
                        </div>

                        {/* Tagline */}
                        {sponsor.tagline && (
                            <div className="text-center mb-8">
                                <p className="text-xl text-slate-300 italic">
                                    "{sponsor.tagline}"
                                </p>
                            </div>
                        )}

                        {/* Website Button */}
                        {sponsor.website && (
                            <div className="text-center mb-8">
                                <a
                                    href={sponsor.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition shadow-lg hover:shadow-purple-500/25"
                                >
                                    <Globe className="w-5 h-5" />
                                    Visit Website
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="border-t border-slate-700 my-8" />

                        {/* Organization Info */}
                        <div className="text-center">
                            <p className="text-slate-400 mb-4">
                                Proud sponsor of
                            </p>
                            <Link
                                to={organization?.sponsorshipUrl || '#'}
                                className="inline-flex items-center gap-3 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition group"
                            >
                                {organization?.logo ? (
                                    <img
                                        src={organization.logo}
                                        alt={organization.name}
                                        className="w-10 h-10 object-contain rounded-lg"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                                        <span className="text-white font-bold">
                                            {organization?.name?.[0] || 'O'}
                                        </span>
                                    </div>
                                )}
                                <span className="text-white font-semibold group-hover:text-purple-300 transition">
                                    {organization?.name}
                                </span>
                                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Become a Sponsor CTA */}
                <div className="mt-8 text-center">
                    <p className="text-slate-400 mb-4">
                        Want to support {organization?.name}?
                    </p>
                    <Link
                        to={organization?.sponsorshipUrl || '#'}
                        className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition"
                    >
                        Become a Sponsor
                        <ArrowLeft className="w-4 h-4 rotate-180" />
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 mt-12">
                <div className="max-w-4xl mx-auto px-4 py-6 text-center">
                    <a
                        href="https://getfundraisr.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-slate-400 text-sm transition"
                    >
                        Powered by Fundraisr
                    </a>
                </div>
            </footer>
        </div>
    );
}
