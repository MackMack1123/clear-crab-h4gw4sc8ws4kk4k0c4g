import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Users, Trophy, Heart, Handshake, Building2, Megaphone, X, Check, Layers, CreditCard, Globe, Clock, Mail, Code } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-glow">
                            T
                        </div>
                        <span className="font-heading font-bold text-xl tracking-tight">Fundraisr</span>
                    </div>
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

            {/* Hero Section */}
            <main className="flex-grow">
                <section className="relative pt-20 pb-32 overflow-hidden">
                    <div className="absolute inset-0 -z-10">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-3xl opacity-50" />
                        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-accent-teal/10 rounded-full blur-3xl opacity-30" />
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs font-medium text-gray-600">Built for youth sports organizations</span>
                        </div>

                        <h1 className="font-heading text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-6 leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                            Fundraising made <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">effortless & fun.</span>
                        </h1>

                        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                            The modern platform for youth sports teams to raise funds securely.
                            No more spreadsheets. No more chasing payments.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                            <Link
                                to="/signup"
                                className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                            >
                                Start a Fundraiser <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                to="/demo" // Placeholder
                                className="w-full sm:w-auto bg-white text-gray-700 border border-gray-200 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                            >
                                View Demo
                            </Link>
                        </div>

                        {/* Hero Visual */}
                        <div className="mt-20 relative max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
                            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 md:p-4">
                                <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-[16/9] border border-gray-100">
                                    <img
                                        src="/dashboard-preview.png"
                                        alt="Fundraisr Dashboard - Track campaigns, donations, and team progress"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Why teams love us</h2>
                            <p className="text-gray-600 max-w-2xl mx-auto">We've reimagined fundraising to be simple, transparent, and compliant.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: <ShieldCheck className="w-8 h-8 text-primary" />,
                                    title: "100% Compliant",
                                    desc: "Built strictly for private, team-managed events. No gambling, just community support."
                                },
                                {
                                    icon: <Users className="w-8 h-8 text-accent" />,
                                    title: "Team Managed",
                                    desc: "Empower parents and players to contribute easily via Venmo or PayPal."
                                },
                                {
                                    icon: <Trophy className="w-8 h-8 text-secondary" />,
                                    title: "Automated Tracking",
                                    desc: "Forget the spreadsheets. We track every contribution and distribution automatically."
                                }
                            ].map((feature, i) => (
                                <div key={i} className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-soft transition-all group">
                                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        {feature.icon}
                                    </div>
                                    <h3 className="font-heading text-xl font-bold mb-3">{feature.title}</h3>
                                    <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Before & After Comparison */}
                <section className="py-24 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
                                Stop running your sponsorships from a spreadsheet.
                            </h2>
                            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                                You volunteered to coach, not to become a full-time fundraising coordinator.
                            </p>
                        </div>

                        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4">
                                <div className="text-center font-heading font-bold text-gray-400 text-sm uppercase tracking-wider">The Old Way</div>
                                <div className="text-center font-heading font-bold text-primary text-sm uppercase tracking-wider">The Fundraisr Way</div>
                            </div>
                            {[
                                { old: "Emailing sponsors for logos", new: "Self-service sponsor portal" },
                                { old: "Chasing checks & Venmo requests", new: "Online payments (Stripe / Square / PayPal)" },
                                { old: "Tracking payments in a Google Sheet", new: "Automatic payment recording" },
                                { old: "Writing thank-you emails one by one", new: "Branded auto-emails" },
                                { old: "Copy-pasting logos into your website", new: "One embed code, auto-updating widget" },
                            ].map((row, i) => (
                                <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 mb-3 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${200 + i * 80}ms` }}>
                                    <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-200">
                                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                            <X className="w-4 h-4 text-red-500" />
                                        </div>
                                        <span className="text-gray-500 text-sm">{row.old}</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-primary/20 shadow-sm">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-4 h-4 text-green-600" />
                                        </div>
                                        <span className="text-gray-900 font-medium text-sm">{row.new}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="text-center mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                            <Link to="/signup" className="inline-flex items-center gap-2 text-primary font-bold hover:underline text-sm">
                                Ditch the spreadsheet <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* How It Works — 3-Step Walkthrough */}
                <section className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
                                From setup to sponsors in under 10 minutes.
                            </h2>
                            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                                Create your packages, share your page, and let sponsors come to you.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                {
                                    step: "01",
                                    icon: <Layers className="w-7 h-7 text-primary" />,
                                    title: "Set Up Your Packages",
                                    points: [
                                        "Custom tiers & pricing",
                                        "Feature lists per level",
                                        "Sign preview photos",
                                    ],
                                },
                                {
                                    step: "02",
                                    icon: <Globe className="w-7 h-7 text-primary" />,
                                    title: "Share & Collect",
                                    points: [
                                        "Branded landing page",
                                        "3 payment methods built in",
                                        "Instant Slack & email notifications",
                                    ],
                                },
                                {
                                    step: "03",
                                    icon: <Code className="w-7 h-7 text-primary" />,
                                    title: "Sit Back & Show Off",
                                    points: [
                                        "Self-service sponsor portal",
                                        "Embeddable sponsor widget",
                                        "Auto thank-you emails",
                                    ],
                                },
                            ].map((card, i) => (
                                <div
                                    key={i}
                                    className="relative p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-soft transition-all group animate-in fade-in slide-in-from-bottom-8 duration-700"
                                    style={{ animationDelay: `${150 + i * 150}ms` }}
                                >
                                    <span className="font-heading text-5xl font-extrabold text-gray-100 group-hover:text-primary/10 transition-colors absolute top-6 right-8">
                                        {card.step}
                                    </span>
                                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        {card.icon}
                                    </div>
                                    <h3 className="font-heading text-xl font-bold mb-4">{card.title}</h3>
                                    <ul className="space-y-2">
                                        {card.points.map((pt, j) => (
                                            <li key={j} className="flex items-start gap-2 text-gray-600 text-sm leading-relaxed">
                                                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                {pt}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* By the Numbers — Time Savings Stats */}
                <section className="py-24 bg-gradient-to-br from-gray-50 via-white to-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
                                Hours back in your week. Dollars into your league.
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                            {[
                                {
                                    stat: "10 min",
                                    label: "Average setup time",
                                    desc: "Create packages and share your page before halftime.",
                                    icon: <Clock className="w-6 h-6 text-primary" />,
                                },
                                {
                                    stat: "0",
                                    label: "Emails chasing logos",
                                    desc: "Sponsors submit their own branding.",
                                    icon: <Mail className="w-6 h-6 text-primary" />,
                                },
                                {
                                    stat: "100%",
                                    label: "Payments tracked",
                                    desc: "Every transaction logged automatically.",
                                    icon: <CreditCard className="w-6 h-6 text-primary" />,
                                },
                                {
                                    stat: "1",
                                    label: "Line of code",
                                    desc: "Paste one snippet. Sponsor logos update forever.",
                                    icon: <Code className="w-6 h-6 text-primary" />,
                                },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="text-center p-6 md:p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-soft transition-all animate-in fade-in slide-in-from-bottom-8 duration-700"
                                    style={{ animationDelay: `${150 + i * 100}ms` }}
                                >
                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        {item.icon}
                                    </div>
                                    <div className="font-heading text-4xl md:text-5xl font-extrabold text-primary mb-2">{item.stat}</div>
                                    <div className="font-heading font-bold text-gray-900 mb-2">{item.label}</div>
                                    <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Sponsorship Section */}
                <section className="py-24 bg-gradient-to-br from-purple-900 via-primary to-purple-800 relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl" />
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
                                <Handshake className="w-4 h-4 text-white" />
                                <span className="text-xs font-medium text-white/90">Local Business Partnerships</span>
                            </div>
                            <h2 className="font-heading text-3xl md:text-5xl font-bold text-white mb-4">
                                Sponsor a Local Team
                            </h2>
                            <p className="text-xl text-white/80 max-w-2xl mx-auto">
                                Support youth athletes in your community while getting your business in front of engaged local families.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 mb-12">
                            {[
                                {
                                    icon: <Building2 className="w-7 h-7 text-primary" />,
                                    title: "Community Visibility",
                                    desc: "Get your logo on jerseys, banners, and materials seen by hundreds of local families every game day."
                                },
                                {
                                    icon: <Megaphone className="w-7 h-7 text-primary" />,
                                    title: "Direct Engagement",
                                    desc: "Connect with families who actively support their community — your ideal customers."
                                },
                                {
                                    icon: <Heart className="w-7 h-7 text-primary" />,
                                    title: "Make an Impact",
                                    desc: "Help kids play the sports they love while building goodwill for your brand."
                                }
                            ].map((benefit, i) => (
                                <div key={i} className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all group">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                        {benefit.icon}
                                    </div>
                                    <h3 className="font-heading text-lg font-bold text-white mb-2">{benefit.title}</h3>
                                    <p className="text-white/70 leading-relaxed text-sm">{benefit.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="text-center">
                            <Link
                                to="/sponsors"
                                className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
                            >
                                Become a Sponsor <ArrowRight className="w-5 h-5" />
                            </Link>
                            <p className="text-white/60 text-sm mt-4">
                                Flexible packages starting at $100
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-white border-t border-gray-100 py-12">
                <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} Fundraisr. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
