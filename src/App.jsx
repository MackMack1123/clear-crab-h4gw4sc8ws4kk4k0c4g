import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SponsorshipProvider } from './context/SponsorshipContext';
import PrivateRoute from './components/layout/PrivateRoute';
import AdminRoute from './components/layout/AdminRoute';
import OrganizerLogin from './pages/OrganizerLogin';
import OrganizerSignup from './pages/OrganizerSignup';
import Dashboard from './pages/Dashboard';
import CampaignPage from './pages/CampaignPage';
import AdminDashboard from './pages/AdminDashboard';
import CampaignStudio from './pages/CampaignStudio';
import ThankYou from './pages/ThankYou';

import SponsorshipLanding from './pages/SponsorshipLanding';
import SponsorshipCheckout from './pages/SponsorshipCheckout';
import SponsorshipFulfilment from './pages/SponsorshipFulfilment';
import SponsorshipReview from './pages/SponsorshipReview';
import SponsorAuth from './pages/SponsorAuth';
import SponsorDashboard from './pages/SponsorDashboard';
import SponsorshipSuccess from './pages/SponsorshipSuccess';

import { PayPalScriptProvider } from "@paypal/react-paypal-js";

import ComplianceFooter from './components/layout/ComplianceFooter';

import LandingPage from './pages/LandingPage';
import SponsorDiscovery from './pages/SponsorDiscovery';

import { Toaster } from 'react-hot-toast';

function App() {
    const initialOptions = {
        "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID,
        currency: "USD",
        intent: "capture",
        components: "buttons",
        "enable-funding": "venmo",
        "buyer-country": "US", // Force US for sandbox Venmo eligibility
    };

    return (
        <PayPalScriptProvider options={initialOptions}>
            <SponsorshipProvider>
                <AuthProvider>
                    <Router>
                        <div className="flex flex-col min-h-screen font-sans text-foreground bg-background">
                            <Toaster position="top-right" />
                            <Routes>
                                <Route path="/" element={<LandingPage />} />
                                <Route path="/login" element={<OrganizerLogin />} />
                                <Route path="/signup" element={<OrganizerSignup />} />
                                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                                <Route path="/campaign/new" element={<PrivateRoute><CampaignStudio /></PrivateRoute>} />
                                <Route path="/campaign/edit/:id" element={<PrivateRoute><CampaignStudio /></PrivateRoute>} />
                                <Route path="/campaign/:id" element={<CampaignPage />} />
                                <Route path="/thank-you" element={<ThankYou />} />

                                {/* Sponsor Discovery */}
                                <Route path="/sponsors" element={<SponsorDiscovery />} />

                                {/* Sponsorship Routes */}
                                <Route path="/sponsorships/:organizerId" element={<SponsorshipLanding />} />
                                <Route path="/org/:organizerId" element={<SponsorshipLanding />} /> {/* Friendly alias */}
                                <Route path="/sponsorship/review" element={<SponsorshipReview />} />
                                <Route path="/sponsorship/auth" element={<SponsorAuth />} />
                                {/* Modified checkout route to be generic (no packageId param, relies on Context) or keep compatibility */}
                                <Route path="/sponsorship/checkout" element={<SponsorshipCheckout />} />
                                <Route path="/sponsorship/checkout/:packageId" element={<SponsorshipCheckout />} /> {/* Keep for backward compat if needed */}
                                <Route path="/sponsorship/success" element={<SponsorshipSuccess />} />
                                <Route path="/sponsorship/fulfilment/:sponsorshipId" element={<SponsorshipFulfilment />} />
                                <Route path="/sponsor/dashboard" element={<PrivateRoute><SponsorDashboard /></PrivateRoute>} />
                                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                            </Routes>
                            <ComplianceFooter />
                        </div>
                    </Router>
                </AuthProvider>
            </SponsorshipProvider>
        </PayPalScriptProvider>
    );
}

export default App;
