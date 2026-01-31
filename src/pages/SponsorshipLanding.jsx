import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sponsorshipService } from '../services/sponsorshipService';
import { userService } from '../services/userService';
import { Check, ArrowRight, HeartHandshake, Star, ShoppingCart, Loader2 } from 'lucide-react';
import ContactModal from '../components/public/ContactModal';
import { useSponsorship } from '../context/SponsorshipContext';
import { API_BASE_URL } from '../config';

export default function SponsorshipLanding() {
    const { organizerId } = useParams(); // Note: Route param might strictly be 'organizerId' in App.jsx, but we treat it as idOrSlug
    const navigate = useNavigate();
    const [packages, setPackages] = useState([]);
    const [organizer, setOrganizer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showContactModal, setShowContactModal] = useState(false);
    const { addToCart, cart } = useSponsorship();
    const [addingId, setAddingId] = useState(null);

    const handleAddToCart = (pkg) => {
        setAddingId(pkg.id);
        // Simulate small delay for feedback
        setTimeout(() => {
            addToCart(pkg, organizer);
            setAddingId(null);
        }, 500);
    };

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http://localhost:3001')) {
            return url.replace('http://localhost:3001', API_BASE_URL);
        }
        return url;
    };

    useEffect(() => {
        if (organizerId) {
            loadData();
        }
    }, [organizerId]);

    const loadData = async () => {
        try {
            // First get the user to resolve the ID (if slug was provided)
            const userData = await userService.getUser(organizerId);

            if (!userData) {
                // specific error handling
                return;
            }
            setOrganizer(userData);

            // Now that we have the real ID (userData._id), fetch packages
            // Note: getActivePackages expects a real ID
            const pkgData = await sponsorshipService.getActivePackages(userData._id);
            setPackages(pkgData);
        } catch (error) {
            console.error("Error loading sponsorship data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
        </div>
    );

    const orgProfile = organizer?.organizationProfile || {};
    const primaryColor = orgProfile.primaryColor || '#0f172a'; // Default to Slate-900 if missing

    return (
        <div className="min-h-screen bg-gray-50/50 font-sans text-slate-900 selection:bg-primary/20 selection:text-primary">

            {/* Professional Sticky Utility Header */}
            <header className="bg-white fixed top-0 left-0 right-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    {/* Logo Only */}
                    <div className="flex items-center">
                        {orgProfile.logoUrl ? (
                            <img src={getImageUrl(orgProfile.logoUrl)} alt="Logo" className="h-10 w-auto object-contain" />
                        ) : (
                            <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center text-white font-bold">
                                {orgProfile.orgName?.charAt(0) || 'F'}
                            </div>
                        )}
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowContactModal(true)}
                            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition hidden sm:block"
                        >
                            Contact Support
                        </button>

                        <button
                            onClick={() => navigate('/sponsorship/review')}
                            className="relative p-2 text-gray-600 hover:text-primary transition"
                        >
                            <ShoppingCart className="w-6 h-6" />
                            {cart.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {cart.length}
                                </span>
                            )}
                        </button>

                        {orgProfile.websiteUrl && (
                            <a
                                href={orgProfile.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden md:block px-4 py-2 text-sm font-bold border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition"
                            >
                                Visit Main League Site
                            </a>
                        )}
                    </div>
                </div>
            </header>

            {/* Spacer for fixed header */}
            <div className="h-16"></div>

            <main className="space-y-24 pb-24">



                {/* Dynamic Content Blocks */}
                <div className="space-y-32">
                    {(organizer?.publicContent?.length ? organizer.publicContent : []).map((block, index) => {
                        // WRAPPER FOR CONSTRAINED BLOCKS (Everything except full-width heroes)
                        const isFullWidth = block.type === 'hero' && block.variant === 'full';
                        const Wrapper = isFullWidth ? React.Fragment : ({ children }) => <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>;

                        // STANDARD HERO (Text Only)
                        if (block.type === 'hero_standard') {
                            return (
                                <Wrapper key={block.id}>
                                    <section className="relative py-20 overflow-hidden px-4 text-center space-y-8">
                                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-100 via-gray-50 to-white opacity-50"></div>
                                        <div className="max-w-4xl mx-auto">
                                            {(block.showBadge !== false) && (
                                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm text-sm font-semibold text-gray-600 animate-in fade-in slide-in-from-bottom-4 duration-700 mb-8">
                                                    <HeartHandshake className="w-4 h-4 text-primary" />
                                                    {block.badgeText || 'Official Sponsorship Portal'}
                                                </div>
                                            )}
                                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 mb-6">
                                                {block.title || <>Support <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">{orgProfile.orgName || 'Our Mission'}</span></>}
                                            </h1>
                                            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                                                {block.body || 'Connect your brand with our community. Choose a package below to make an impact today.'}
                                            </p>
                                        </div>
                                    </section>
                                </Wrapper>
                            );
                        }

                        // IMAGE HERO
                        if (block.type === 'hero') {
                            const overlayColor = block.overlayColor === 'primary' ? primaryColor : (block.overlayColor || 'black');
                            const opacity = (block.overlayOpacity ?? 50) / 100;
                            const isCard = block.variant !== 'full' && block.variant !== 'gradient';
                            const isGradient = block.variant === 'gradient';
                            const isFullWidth = block.variant === 'full' || isGradient;

                            const HeroContent = (
                                <div className={`relative overflow-hidden group ${isCard ? 'rounded-[2.5rem] aspect-[16/9] md:aspect-[21/9] shadow-2xl shadow-gray-200/50' : 'min-h-[85vh] w-screen relative left-1/2 -translate-x-1/2'}`}>

                                    {/* Background: Either Image or Gradient */}
                                    {isGradient ? (
                                        /* Modern 2025 Mesh Gradient Background */
                                        <div
                                            className="absolute inset-0"
                                            style={{
                                                background: `
                                                    linear-gradient(135deg, ${overlayColor} 0%, ${overlayColor}dd 25%, ${overlayColor}aa 50%, ${overlayColor}88 75%, ${overlayColor}66 100%),
                                                    radial-gradient(ellipse 120% 80% at 10% 20%, rgba(255,255,255,0.15) 0%, transparent 50%),
                                                    radial-gradient(ellipse 80% 60% at 90% 80%, rgba(0,0,0,0.3) 0%, transparent 50%),
                                                    radial-gradient(circle at 50% 50%, ${overlayColor}ee 0%, ${overlayColor}cc 30%, ${overlayColor}99 60%, ${overlayColor}66 100%)
                                                `
                                            }}
                                        />
                                    ) : (
                                        /* Background Image */
                                        block.imageUrl && (
                                            <img
                                                src={getImageUrl(block.imageUrl)}
                                                alt="Hero"
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                                style={{ filter: block.blurAmount ? `blur(${block.blurAmount}px)` : 'none' }}
                                            />
                                        )
                                    )}

                                    {/* Primary Color Overlay (only for image variants) */}
                                    {!isGradient && (
                                        <div className="absolute inset-0" style={{ backgroundColor: overlayColor, opacity }} />
                                    )}

                                    {/* Modern 2025 Mesh Gradient Overlay - Enhanced for gradient variant */}
                                    <div
                                        className="absolute inset-0 pointer-events-none"
                                        style={{
                                            background: isGradient
                                                ? `
                                                    radial-gradient(ellipse 100% 80% at 0% 0%, rgba(255,255,255,0.12) 0%, transparent 40%),
                                                    radial-gradient(ellipse 80% 60% at 100% 100%, rgba(0,0,0,0.25) 0%, transparent 50%),
                                                    radial-gradient(ellipse 60% 40% at 70% 30%, rgba(255,255,255,0.08) 0%, transparent 40%),
                                                    radial-gradient(circle at 30% 70%, rgba(0,0,0,0.15) 0%, transparent 35%)
                                                `
                                                : `
                                                    radial-gradient(ellipse 80% 50% at 20% 40%, ${overlayColor}40 0%, transparent 50%),
                                                    radial-gradient(ellipse 60% 40% at 80% 60%, ${overlayColor}30 0%, transparent 45%),
                                                    radial-gradient(ellipse 100% 60% at 50% 100%, rgba(0,0,0,0.4) 0%, transparent 50%)
                                                `
                                        }}
                                    />

                                    {/* Subtle top vignette for depth */}
                                    <div className={`absolute inset-0 bg-gradient-to-b ${isGradient ? 'from-white/5' : 'from-black/20'} via-transparent to-transparent pointer-events-none`} />

                                    {/* Bottom fade for modern look */}
                                    <div className={`absolute inset-0 bg-gradient-to-t ${isGradient ? 'from-black/20' : 'from-black/30'} via-transparent to-transparent pointer-events-none`} />

                                    {/* Animated mesh pattern for gradient variant */}
                                    {isGradient && (
                                        <div
                                            className="absolute inset-0 pointer-events-none opacity-30"
                                            style={{
                                                backgroundImage: `
                                                    radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1) 0%, transparent 25%),
                                                    radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08) 0%, transparent 30%),
                                                    radial-gradient(circle at 40% 80%, rgba(255,255,255,0.06) 0%, transparent 20%)
                                                `
                                            }}
                                        />
                                    )}

                                    {/* Content Container with Enhanced Glassmorphism */}
                                    <div className="absolute inset-0 flex items-center justify-center p-8 md:p-16">
                                        <div className={`max-w-4xl text-center backdrop-blur-xl ${isGradient ? 'bg-white/[0.06]' : 'bg-white/[0.08]'} p-8 md:p-12 rounded-3xl border border-white/20 shadow-2xl`}
                                            style={{
                                                boxShadow: isCard
                                                    ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                                                    : `0 25px 80px -12px ${overlayColor}40, 0 8px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)`
                                            }}
                                        >
                                            <h2 className="text-4xl md:text-7xl font-bold text-white drop-shadow-lg tracking-tight">{block.title}</h2>
                                            {block.body && <p className="text-xl md:text-2xl text-white/90 font-medium leading-relaxed drop-shadow-md mt-6">{block.body}</p>}
                                        </div>
                                    </div>

                                    {/* View Packages Button - Positioned at bottom, doesn't affect layout */}
                                    <button
                                        onClick={() => {
                                            const packagesSection = document.getElementById('packages-section');
                                            if (packagesSection) {
                                                packagesSection.scrollIntoView({ behavior: 'smooth' });
                                            }
                                        }}
                                        className="absolute bottom-10 left-1/2 -translate-x-1/2 group flex flex-col items-center gap-2 text-white/90 hover:text-white transition-all duration-300"
                                    >
                                        <span className="text-sm font-medium tracking-wide uppercase">View Our Packages</span>
                                        <span
                                            className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-white/40 group-hover:border-white/80 transition-all duration-300 group-hover:scale-110"
                                            style={{
                                                backgroundColor: `${primaryColor}40`,
                                                boxShadow: `0 0 30px ${primaryColor}50`
                                            }}
                                        >
                                            <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </span>
                                    </button>
                                </div>
                            );

                            if (isCard) {
                                return <Wrapper key={block.id}>{HeroContent}</Wrapper>;
                            }

                            return <div key={block.id} className="-mt-16">{HeroContent}</div>;
                        }

                        // TEXT BLOCK
                        if (block.type === 'text') {
                            return (
                                <Wrapper key={block.id}>
                                    <div className={`max-w-3xl mx-auto ${block.alignment === 'center' ? 'text-center' : 'text-left'}`}>
                                        <h2 className="text-3xl font-bold text-gray-900 mb-6 tracking-tight">{block.title}</h2>
                                        <p className="text-lg text-gray-600 leading-relaxed whitespace-pre-wrap">{block.body}</p>
                                    </div>
                                </Wrapper>
                            );
                        }

                        // CTA BLOCK
                        if (block.type === 'cta') {
                            return (
                                <Wrapper key={block.id}>
                                    <div className="bg-slate-900 rounded-[2.5rem] p-12 md:p-16 text-center space-y-8 relative overflow-hidden shadow-2xl shadow-slate-900/20">
                                        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-slate-800 rounded-full blur-3xl opacity-50"></div>
                                        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-slate-800 rounded-full blur-3xl opacity-50"></div>

                                        <div className="relative z-10 max-w-2xl mx-auto">
                                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 tracking-tight">{block.title}</h2>
                                            <p className="text-xl text-slate-300 mb-10">{block.body}</p>
                                            <button
                                                onClick={() => {
                                                    if (block.buttonAction === 'contact') {
                                                        setShowContactModal(true);
                                                    } else {
                                                        window.location.href = block.buttonLink;
                                                    }
                                                }}
                                                className="inline-flex items-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 hover:scale-105 transition duration-300 shadow-xl shadow-white/10"
                                            >
                                                {block.buttonText} <ArrowRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </Wrapper>
                            );
                        }

                        // IMPACT STATS BLOCK (New)
                        if (block.type === 'stats') {
                            return (
                                <Wrapper key={block.id}>
                                    <div className="max-w-7xl mx-auto px-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 py-12 border-y border-gray-100">
                                            {(block.stats && block.stats.length > 0 ? block.stats : [
                                                { value: '500+', label: 'Local Families' },
                                                { value: '50+', label: 'Active Teams' },
                                                { value: '12k', label: 'Annual Visitors' },
                                                { value: '100%', label: 'Community Focused' }
                                            ]).map((stat, i) => (
                                                <div key={i} className="text-center group cursor-default">
                                                    <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors duration-300 tracking-tight">{stat.value}</div>
                                                    <div className="text-sm md:text-base text-gray-500 font-medium uppercase tracking-wider">{stat.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Wrapper>
                            );
                        }

                        // PACKAGE SPOTLIGHT
                        if (block.type === 'package_highlight' && block.packageId) {
                            const pkg = packages.find(p => p.id === block.packageId);
                            if (!pkg) return null;
                            return (
                                <Wrapper key={block.id}>
                                    <div id="packages-section" className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col lg:flex-row group">
                                        <div className="lg:w-1/2 relative min-h-[400px] overflow-hidden">
                                            {pkg.imageUrl ? (
                                                <img src={getImageUrl(pkg.imageUrl)} alt={pkg.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                                    <HeartHandshake className="w-16 h-16 text-slate-200" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/20"></div>
                                        </div>
                                        <div className="lg:w-1/2 p-12 flex flex-col justify-center relative">
                                            <div className="absolute top-12 right-12">
                                                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 text-white text-sm font-bold rounded-full">
                                                    <Star className="w-3 h-3 fill-white text-white" /> Featured
                                                </div>
                                            </div>
                                            <h2 className="text-3xl font-bold text-gray-900 mb-2 mt-8 lg:mt-0">{pkg.title}</h2>
                                            <div className="flex items-baseline gap-2 mb-6">
                                                <span className="text-5xl font-bold text-gray-900 tracking-tight">${pkg.price}</span>
                                                <span className="text-gray-500 font-medium">/ season</span>
                                            </div>
                                            <p className="text-gray-600 mb-8 text-lg leading-relaxed border-l-4 border-gray-100 pl-4">{pkg.description}</p>

                                            <div className="grid sm:grid-cols-2 gap-4 mb-10">
                                                {pkg.features?.slice(0, 4).map((f, i) => (
                                                    <div key={i} className="flex items-start gap-3 text-slate-700 font-medium">
                                                        <div className="mt-0.5 p-1 bg-green-100 text-green-700 rounded-full">
                                                            <Check className="w-3 h-3" />
                                                        </div>
                                                        {f}
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => handleAddToCart(pkg)}
                                                className="w-full sm:w-auto py-4 px-8 rounded-xl font-bold text-lg text-white transition-all hover:opacity-90 hover:shadow-lg shadow-md flex items-center justify-center gap-2"
                                                style={{ backgroundColor: primaryColor }}
                                                disabled={addingId === pkg.id}
                                            >
                                                {addingId === pkg.id ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    cart.find(i => i.id === pkg.id) ? 'Added to Cart' : 'Secure Sponsorship'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </Wrapper>
                            );
                        }

                        // PACKAGE GALLERY (New Premium Grid Design)
                        if (block.type === 'package_gallery' && block.packageIds?.length > 0) {
                            const galleryPackages = packages.filter(p => block.packageIds.includes(p.id));
                            if (galleryPackages.length === 0) return null;

                            return (
                                <Wrapper key={block.id}>
                                    <div>
                                        {block.title && (
                                            <div className="text-center max-w-3xl mx-auto mb-16">
                                                <h2 className="text-3xl font-bold text-gray-900 mb-4">{block.title}</h2>
                                                <p className="text-lg text-gray-600">Select the option that best fits your marketing goals.</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {galleryPackages.map(pkg => (
                                                <div
                                                    key={pkg.id}
                                                    className="group relative bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-300 transition-all duration-300 flex flex-col"
                                                >
                                                    <div className="mb-6">
                                                        <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.title}</h3>
                                                        <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">{pkg.description}</p>
                                                    </div>

                                                    <div className="mb-8 pb-8 border-b border-gray-100">
                                                        <span className="text-4xl font-bold text-gray-900 tracking-tight">${pkg.price}</span>
                                                        <span className="text-gray-400 text-sm font-medium ml-2">/ season</span>
                                                    </div>

                                                    <ul className="space-y-4 mb-8 flex-1">
                                                        {pkg.features?.map((f, i) => (
                                                            <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                                                <Check className="w-5 h-5 text-green-500 shrink-0" />
                                                                {f}
                                                            </li>
                                                        ))}
                                                        {(!pkg.features || pkg.features.length === 0) && (
                                                            <li className="text-sm text-gray-400 italic">No specific features listed.</li>
                                                        )}
                                                    </ul>

                                                    <button
                                                        onClick={() => handleAddToCart(pkg)}
                                                        className="w-full py-3.5 rounded-xl font-bold text-white transition-all transform group-hover:translate-y-[-2px] shadow-md group-hover:shadow-lg flex items-center justify-center gap-2"
                                                        style={{ backgroundColor: primaryColor }}
                                                        disabled={addingId === pkg.id}
                                                    >
                                                        {addingId === pkg.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                {cart.find(i => i.id === pkg.id) ? 'In Cart' : 'Select Package'}
                                                                {!cart.find(i => i.id === pkg.id) && <ArrowRight className="w-4 h-4" />}
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Wrapper>
                            );
                        }

                        // PACKAGE LIST (New Premium List Design)
                        if (block.type === 'package_list' && block.packageIds?.length > 0) {
                            const listPackages = packages.filter(p => block.packageIds.includes(p.id));
                            if (listPackages.length === 0) return null;

                            return (
                                <Wrapper key={block.id}>
                                    <div className="space-y-8">
                                        {block.title && <h2 className="text-3xl font-heading font-bold text-gray-900 text-center mb-12">{block.title}</h2>}
                                        {listPackages.map(pkg => (
                                            <div key={pkg.id} className={`relative bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row gap-8 items-center ${block.listStyle === 'image_left' ? '' : 'lg:flex-row-reverse'}`}>
                                                {block.showImages !== false && block.showImages !== 'false' && pkg.imageUrl && (
                                                    <div className="w-full lg:w-1/3 aspect-[4/3] rounded-2xl overflow-hidden shadow-inner">
                                                        <img src={getImageUrl(pkg.imageUrl)} alt={pkg.title} className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <div className="flex-1 w-full text-center lg:text-left">
                                                    <div className="flex flex-col lg:flex-row justify-between items-center lg:items-start mb-6 gap-4">
                                                        <div>
                                                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.title}</h3>
                                                            <p className="text-gray-600 max-w-xl">{pkg.description}</p>
                                                        </div>
                                                        <div className="text-4xl font-heading font-bold text-gray-900 whitespace-nowrap">${pkg.price}</div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-x-6 gap-y-3 mb-8 justify-center lg:justify-start">
                                                        {pkg.features?.slice(0, 4).map((f, i) => (
                                                            <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                                                <Check className="w-4 h-4 text-green-500" />
                                                                {f}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <button
                                                        onClick={() => handleAddToCart(pkg)}
                                                        className="px-8 py-3 rounded-xl font-bold text-white transition hover:opacity-90 shadow-sm hover:shadow-md lg:w-auto w-full flex items-center justify-center gap-2"
                                                        style={{ backgroundColor: primaryColor }}
                                                        disabled={addingId === pkg.id}
                                                    >
                                                        {addingId === pkg.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            cart.find(i => i.id === pkg.id) ? 'Added' : 'Select Package'
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Wrapper>
                            );
                        }

                        return null;
                    })}
                </div>
            </main>

            {/* Floating Cart Button (Mobile/Desktop) if Cart has items */}
            {cart.length > 0 && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-6 fade-in duration-300">
                    <button
                        onClick={() => navigate('/sponsorship/review')}
                        className="bg-gray-900 text-white shadow-2xl px-6 py-4 rounded-full flex items-center gap-3 hover:scale-105 transition-all outline outline-4 outline-white"
                    >
                        <div className="relative">
                            <ShoppingCart className="w-5 h-5" />
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{cart.length}</span>
                        </div>
                        <span className="font-bold pr-1">Review Cart</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Powered by Badge - Moved to left to avoid collision */}
            <a href="/" target="_blank" className="fixed bottom-6 left-6 z-40 bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl px-4 py-2 rounded-full flex items-center gap-2.5 hover:scale-105 transition-all duration-300 group">
                <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-900 transition-colors">Powered by</span>
                <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-gray-900 rounded flex items-center justify-center text-white text-[10px] font-bold">F</div>
                    <span className="font-bold text-gray-900 text-sm tracking-tight">Fundraisr</span>
                </div>
            </a>

            {/* Contact Modal */}
            <ContactModal
                isOpen={showContactModal}
                onClose={() => setShowContactModal(false)}
                toEmail={orgProfile.contactEmail}
                orgName={orgProfile.orgName}
            />
        </div>
    );
}
