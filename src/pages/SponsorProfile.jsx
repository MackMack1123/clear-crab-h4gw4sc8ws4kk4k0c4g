import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ExternalLink, Building2, Award, ArrowLeft, Globe, Loader2, Sparkles, Heart } from 'lucide-react';
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
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin mx-auto mb-6" />
                        <Sparkles className="w-6 h-6 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-slate-400 font-medium">Loading sponsor profile...</p>
                </div>
            </div>
        );
    }

    if (error || !sponsor) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-24 h-24 bg-slate-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-700">
                        <Building2 className="w-12 h-12 text-slate-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">Sponsor Not Found</h1>
                    <p className="text-slate-400 mb-8">This sponsor profile doesn't exist or is no longer available.</p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition"
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
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Decorative Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
            </div>

            {/* Header */}
            <header className="relative z-10 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/50">
                <div className="max-w-5xl mx-auto px-6 py-5">
                    <Link
                        to={organization?.sponsorshipUrl || '/'}
                        className="inline-flex items-center gap-2.5 text-slate-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Back to {organization?.name || 'Organization'}</span>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
                <div className="bg-gradient-to-b from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-slate-700/50 overflow-hidden shadow-2xl shadow-black/20">

                    {/* Hero Section with Logo */}
                    <div className="relative">
                        {/* Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-pink-600/10" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />

                        <div className="relative px-8 pt-16 pb-12 sm:px-16 sm:pt-20 sm:pb-16 text-center">
                            {/* Logo Container */}
                            <div className="inline-block mb-8">
                                <div className="relative">
                                    {/* Glow Effect */}
                                    <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-xl" />

                                    {sponsor.logo ? (
                                        <div className="relative bg-white rounded-2xl p-8 shadow-2xl shadow-black/20 border border-white/20">
                                            <img
                                                src={sponsor.logo}
                                                alt={sponsor.name}
                                                className="max-w-[320px] max-h-[180px] object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="relative w-40 h-40 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center border border-slate-600">
                                            <Building2 className="w-20 h-20 text-slate-500" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sponsor Name */}
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
                                {sponsor.name}
                            </h1>

                            {/* Tier Badge */}
                            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-full border border-purple-500/20">
                                <Award className="w-5 h-5 text-purple-400" />
                                <span className="text-purple-200 font-semibold">
                                    {sponsor.tier}
                                </span>
                                <span className="text-purple-400/60">•</span>
                                <span className="text-purple-300/80">
                                    {organization?.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Details Section */}
                    <div className="px-8 pb-12 sm:px-16 sm:pb-16">
                        {/* Tagline */}
                        {sponsor.tagline && (
                            <div className="text-center mb-10 -mt-2">
                                <blockquote className="text-xl sm:text-2xl text-slate-300 italic font-light leading-relaxed max-w-2xl mx-auto">
                                    "{sponsor.tagline}"
                                </blockquote>
                            </div>
                        )}

                        {/* Website CTA */}
                        {sponsor.website && (
                            <div className="text-center mb-12">
                                <a
                                    href={sponsor.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5"
                                >
                                    <Globe className="w-5 h-5" />
                                    Visit Website
                                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </a>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="flex items-center gap-4 my-10">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                            <Heart className="w-5 h-5 text-slate-600" />
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                        </div>

                        {/* Organization Attribution */}
                        <div className="text-center">
                            <p className="text-slate-500 font-medium mb-5 uppercase tracking-wider text-sm">
                                Proud Sponsor of
                            </p>
                            <Link
                                to={organization?.sponsorshipUrl || '#'}
                                className="inline-flex items-center gap-4 px-8 py-4 bg-slate-800/50 hover:bg-slate-700/50 rounded-2xl transition-all group border border-slate-700/50 hover:border-slate-600/50"
                            >
                                {organization?.logo ? (
                                    <img
                                        src={organization.logo}
                                        alt={organization.name}
                                        className="w-14 h-14 object-contain rounded-xl bg-white p-1"
                                    />
                                ) : (
                                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                                        <span className="text-white font-bold text-xl">
                                            {organization?.name?.[0] || 'O'}
                                        </span>
                                    </div>
                                )}
                                <div className="text-left">
                                    <span className="block text-white font-bold text-lg group-hover:text-purple-300 transition-colors">
                                        {organization?.name}
                                    </span>
                                    <span className="text-slate-400 text-sm">View sponsorship opportunities</span>
                                </div>
                                <ExternalLink className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors ml-2" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Become a Sponsor CTA */}
                <div className="mt-12 text-center">
                    <p className="text-slate-500 mb-4 font-medium">
                        Want to support {organization?.name}?
                    </p>
                    <Link
                        to={organization?.sponsorshipUrl || '#'}
                        className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-semibold transition-colors group"
                    >
                        Become a Sponsor
                        <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-slate-800/50 mt-16">
                <div className="max-w-5xl mx-auto px-6 py-8 text-center">
                    <a
                        href="https://getfundraisr.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-slate-500 hover:text-white text-sm font-medium transition-all hover:bg-slate-800/50 rounded-full"
                    >
                        <Sparkles className="w-4 h-4" />
                        Powered by Fundraisr
                    </a>
                </div>
            </footer>
        </div>
    );
}
