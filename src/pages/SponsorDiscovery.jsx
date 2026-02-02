import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2, Package, ArrowRight, Loader2, Handshake } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function SponsorDiscovery() {
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch organizations
    useEffect(() => {
        fetchOrganizations();
    }, [debouncedSearch]);

    const fetchOrganizations = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.append('search', debouncedSearch);

            const res = await fetch(`${API_BASE_URL}/api/discover/organizations?${params}`);
            const data = await res.json();
            setOrganizations(data.organizations || []);
        } catch (err) {
            console.error('Error fetching organizations:', err);
            setOrganizations([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-glow">
                            T
                        </div>
                        <span className="font-heading font-bold text-xl tracking-tight">Fundraisr</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-primary transition">
                            Log in
                        </Link>
                        <Link
                            to="/signup"
                            className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
                        >
                            Start Fundraising
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Header */}
            <div className="bg-gradient-to-br from-purple-900 via-primary to-purple-800 py-16 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl" />
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-4">
                            <Handshake className="w-4 h-4 text-white" />
                            <span className="text-xs font-medium text-white/90">Support Local Youth Sports</span>
                        </div>
                        <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4">
                            Find a Team to Sponsor
                        </h1>
                        <p className="text-lg text-white/80 max-w-2xl mx-auto">
                            Browse local youth sports organizations and choose a sponsorship package that fits your business.
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="max-w-xl mx-auto">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search teams by name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl border-0 shadow-xl text-lg focus:ring-4 focus:ring-white/20 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : organizations.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Building2 className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="font-heading text-xl font-bold text-gray-900 mb-2">
                            {debouncedSearch ? 'No teams found' : 'No teams available yet'}
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            {debouncedSearch
                                ? `We couldn't find any teams matching "${debouncedSearch}". Try a different search term.`
                                : 'Check back soon! Teams are being added to our platform.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <p className="text-gray-600 mb-8">
                            {organizations.length} {organizations.length === 1 ? 'organization' : 'organizations'} with sponsorship packages
                        </p>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {organizations.map((org) => (
                                <div
                                    key={org.id}
                                    className="bg-white rounded-2xl border border-gray-100 shadow-soft hover:shadow-lg transition-all group overflow-hidden"
                                >
                                    {/* Header with logo */}
                                    <div
                                        className="h-24 flex items-center justify-center"
                                        style={{ backgroundColor: org.primaryColor || '#7c3aed' }}
                                    >
                                        {org.logoUrl ? (
                                            <img
                                                src={org.logoUrl}
                                                alt={org.orgName}
                                                className="h-16 w-auto object-contain"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                                                <Building2 className="w-8 h-8 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-6">
                                        <h3 className="font-heading text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                                            {org.orgName}
                                        </h3>
                                        {org.description && (
                                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                                {org.description}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                                            <div className="flex items-center gap-1">
                                                <Package className="w-4 h-4" />
                                                <span>{org.packageCount} {org.packageCount === 1 ? 'package' : 'packages'}</span>
                                            </div>
                                            <span className="font-semibold text-gray-900">
                                                From ${org.startingPrice}
                                            </span>
                                        </div>

                                        <Link
                                            to={`/org/${org.slug}`}
                                            className="w-full bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                                        >
                                            View Packages <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-100 py-12">
                <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} Fundraisr. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
