import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { campaignService } from '../services/campaignService';
import { sponsorshipService } from '../services/sponsorshipService';
import { promoteToAdmin } from '../utils/seedData';
import { API_BASE_URL } from '../config';
import { formatCurrency } from '../utils/formatCurrency';

import PayoutView from '../components/dashboard/PayoutView';
import RosterUpload from '../components/dashboard/RosterUpload';
import SponsorshipView from '../components/dashboard/SponsorshipView';
import OrgAnalytics from '../components/analytics/OrgAnalytics';
import RoleSwitcher from '../components/layout/RoleSwitcher';
import OrgSwitcher from '../components/layout/OrgSwitcher';
import TeamManagement from '../components/team/TeamManagement';
import WidgetGenerator from '../components/dashboard/WidgetGenerator';
import { BarChart3, UsersRound, Code2 } from 'lucide-react';
import {
  LayoutDashboard,
  Wallet,
  Users,
  Settings,
  Github,
  ArrowRight,
  LogOut,
  Lock,
  Shield,
  User,
  Plus,
  ExternalLink,
  Copy,
  Trophy,
  TrendingUp,
  HeartHandshake,
  Share2
} from 'lucide-react';

export default function Dashboard() {
  const { currentUser, userProfile, updateUserEmail, refreshProfile, activeRole, availableRoles, hasRole, allOrganizations, activeOrganization, switchRole } = useAuth();
  const navigate = useNavigate();
  const [payoutMethod, setPayoutMethod] = useState('');
  const [isEditingPayout, setIsEditingPayout] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [sponsorships, setSponsorships] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'campaigns', 'settings', 'sponsorships', 'team'
  const [sponsorshipTab, setSponsorshipTab] = useState('sales'); // 'sales', 'packages', 'content', 'settings'

  // Email Update State
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Profile Update State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugError, setSlugError] = useState('');
  const [enableFundraising, setEnableFundraising] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Sync activeRole to 'organizer' when viewing this dashboard
  useEffect(() => {
    if (activeRole !== 'organizer' && availableRoles.includes('organizer')) {
      switchRole('organizer');
    }
  }, [activeRole, availableRoles, switchRole]);

  // Handle OAuth callback params - auto-switch to settings tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_success') || params.get('stripe_error') ||
        params.get('square_success') || params.get('square_error') ||
        params.get('slack_success') || params.get('slack_error')) {
      setActiveTab('settings');
    }
  }, []);

  useEffect(() => {
    if (userProfile?.email) {
      setNewEmail(userProfile.email);
    }
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setTeamName(userProfile.teamName || '');
      setSlug(userProfile.organizationProfile?.slug || userProfile.slug || '');
      setEnableFundraising(userProfile.organizationProfile?.enableFundraising !== false);
    }
  }, [userProfile]);

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required to verify identity');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      await updateUserEmail(newEmail, currentPassword);
      toast.success('Email updated successfully!');
      setCurrentPassword(''); // Clear password
    } catch (error) {
      console.error("Email update failed:", error);
      if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect password');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('This email is already associated with another account');
      } else {
        toast.error('Failed to update email: ' + error.message);
      }
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSlugError('');
    setIsUpdatingProfile(true);

    try {
      // Validate Slug
      if (slug && slug !== userProfile?.slug) {
        // Basic format check
        if (!/^[a-z0-9-]+$/.test(slug)) {
          setSlugError('Slug can only contain lowercase letters, numbers, and hyphens.');
          setIsUpdatingProfile(false);
          return;
        }

        // Check availability
        const { userService } = await import('../services/userService');
        const isAvailable = await userService.checkSlugAvailability(slug, currentUser.uid);

        if (!isAvailable) {
          setSlugError('This URL is already taken. Please choose another.');
          setIsUpdatingProfile(false);
          return;
        }
      }

      const updates = {
        firstName,
        lastName,
        teamName,
        "organizationProfile.slug": slug || undefined, // Update nested field
        "organizationProfile.enableFundraising": enableFundraising
      };

      await import('../services/userService').then(m => m.userService.updateUser(currentUser.uid, updates));
      // Update local profile immediately for better UX
      if (refreshProfile) {
        await refreshProfile();
      }
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error('Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      // Only redirect if user is ONLY a sponsor (no organizer role) and they're viewing as sponsor
      // Users with multiple roles can use the role switcher to navigate
      const isOnlySponsor = availableRoles.length === 1 && availableRoles[0] === 'sponsor';
      if (isOnlySponsor) {
        navigate('/sponsor/dashboard');
        return;
      }
      loadDashboardData();
    }
    if (userProfile?.payoutMethod) {
      setPayoutMethod(userProfile.payoutMethod);
    }
  }, [currentUser, userProfile, availableRoles]);

  async function loadDashboardData() {
    try {
      const [campaignData, sponsorshipData, packageData] = await Promise.all([
        campaignService.getOrganizerCampaigns(currentUser.uid),
        sponsorshipService.getOrganizerSponsorships(currentUser.uid),
        sponsorshipService.getPackages(activeOrganization?.id || currentUser.uid).catch(() => [])
      ]);
      setCampaigns(campaignData);
      setSponsorships(sponsorshipData || []);
      setPackages(packageData || []);

      if (campaignData.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(campaignData[0].id);
      }
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    navigate('/login');
  }

  async function handleSavePayout() {
    setSavingPayout(true);
    try {
      await import('../services/userService').then(m => m.userService.updateUser(currentUser.uid, { payoutMethod: payoutMethod }));
      toast.success("Payout info saved!");
    } catch (error) {
      console.error("Error saving payout info:", error);
      toast.error("Failed to save payout info.");
    } finally {
      setSavingPayout(false);
    }
  }

  const copyLink = (id) => {
    const url = `${window.location.origin}/campaign/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  const copyShareLink = () => {
    const pageSlug = userProfile?.organizationProfile?.slug || currentUser?.uid;
    const url = `${API_BASE_URL}/s/${pageSlug}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied!");
  };

  // Sidebar Component
  // Sidebar Component
  const Sidebar = () => (
    <aside className="w-64 bg-[#0f172a] border-r border-[#1e293b] hidden md:flex flex-col fixed h-full z-10 text-white transition-all duration-300">
      <div className="p-6 flex items-center gap-3">
        <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center text-primary font-bold shadow-glow border border-primary/20 backdrop-blur-sm">
          <div className="w-5 h-5 bg-primary rounded-lg"></div>
        </div>
        <span className="font-heading font-bold text-xl tracking-tight text-white">Fundraisr</span>
      </div>

      <nav className="flex-1 px-4 mt-2 overflow-y-auto custom-scrollbar">
        <div className="space-y-8">
          {/* Overview */}
          <div>
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group ${activeTab === 'overview' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <LayoutDashboard className={`w-5 h-5 ${activeTab === 'overview' ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'}`} />
              Overview
            </button>
            {userProfile?.role === 'admin' && (
              <Link
                to="/admin"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-amber-500 hover:text-amber-400 hover:bg-white/5 transition-all duration-200 mt-1"
              >
                <Shield className="w-5 h-5" />
                Admin Dashboard
              </Link>
            )}
          </div>

          {/* Organization Sponsorships */}
          <div className="relative">
            <div className="px-4 mb-3 flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Sponsorships</span>
              <div className="h-px bg-slate-800 flex-1"></div>
            </div>
            <div className="space-y-1">
              <div className={`transition-all duration-300 overflow-hidden ${activeTab === 'sponsorships' ? 'max-h-96' : 'max-h-96'}`}>
                <button
                  onClick={() => { setActiveTab('sponsorships'); setSponsorshipTab('sales'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-t-xl text-sm font-medium transition-all duration-200 group ${activeTab === 'sponsorships' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-50'}`}
                >
                  <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'sponsorships' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'}`}>
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  Sponsorships
                </button>

                {/* Sub-navigation */}
                <div className={`space-y-0.5 ml-4 border-l border-slate-800 pl-2 mt-1`}>
                  <button
                    onClick={() => { setActiveTab('sponsorships'); setSponsorshipTab('sales'); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'sponsorships' && sponsorshipTab === 'sales' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Sales Overview
                  </button>
                  <button
                    onClick={() => { setActiveTab('sponsorships'); setSponsorshipTab('packages'); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'sponsorships' && sponsorshipTab === 'packages' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Packages
                  </button>
                  <button
                    onClick={() => { setActiveTab('sponsorships'); setSponsorshipTab('content'); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'sponsorships' && sponsorshipTab === 'content' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Page Content
                  </button>
                  <button
                    onClick={() => { setActiveTab('sponsorships'); setSponsorshipTab('settings'); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'sponsorships' && sponsorshipTab === 'settings' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => { setActiveTab('sponsorships'); setSponsorshipTab('analytics'); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'sponsorships' && sponsorshipTab === 'analytics' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Analytics
                  </button>
                  <button
                    onClick={() => { setActiveTab('sponsorships'); setSponsorshipTab('emails'); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'sponsorships' && sponsorshipTab === 'emails' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Email Templates
                  </button>
                  <button
                    onClick={() => { setActiveTab('sponsorships'); setSponsorshipTab('widget'); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'sponsorships' && sponsorshipTab === 'widget' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Code2 className="w-3 h-3" />
                    Embed Widget
                  </button>
                  <a
                    href={`/org/${userProfile?.organizationProfile?.slug || currentUser.uid}`}
                    target="_blank"
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-white hover:bg-white/5 flex items-center gap-1.5 transition-all group/link"
                  >
                    View Public Page
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                  </a>
                  <button
                    onClick={copyShareLink}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-purple-400 hover:text-purple-300 hover:bg-white/5 flex items-center gap-1.5 transition-all"
                  >
                    <Share2 className="w-3 h-3" />
                    Copy Share Link
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Team Fundraising */}
          {enableFundraising && (
            <div className="relative mt-2">
              <div className="px-4 mb-3 flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Team Fundraising</span>
                <div className="h-px bg-slate-800 flex-1"></div>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('campaigns')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${activeTab === 'campaigns' ? 'bg-white/10 text-white border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'campaigns' ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'}`}>
                    <Trophy className="w-4 h-4" />
                  </div>
                  Campaigns
                </button>
                <button
                  onClick={() => setActiveTab('payouts')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${activeTab === 'payouts' ? 'bg-white/10 text-white border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'payouts' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'}`}>
                    <Wallet className="w-4 h-4" />
                  </div>
                  Funds & Payouts
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Team & Settings */}
        <div className="pt-4 mt-4 border-t border-slate-800 space-y-1">
          {/* Team - Only show for owners */}
          {activeOrganization?.isOwn && (
            <button
              onClick={() => setActiveTab('team')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group ${activeTab === 'team' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <UsersRound className={`w-5 h-5 ${activeTab === 'team' ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'}`} />
              Team
            </button>
          )}
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group ${activeTab === 'settings' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'}`} />
            Settings
          </button>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800 bg-[#0f172a]">
        {/* Org Switcher - Only shows if user has access to multiple organizations */}
        {allOrganizations && allOrganizations.length > 1 && (
          <div className="mb-3 pb-3 border-b border-slate-800">
            <OrgSwitcher />
          </div>
        )}

        {/* Role Switcher - Only shows if user has multiple roles */}
        {availableRoles.length > 1 && (
          <div className="mb-3 pb-3 border-b border-slate-800">
            <RoleSwitcher />
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl border border-slate-800 bg-slate-800/50">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner">
            {userProfile?.teamName?.[0] || currentUser?.email?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{userProfile?.teamName || 'My Team'}</p>
            <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside >
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-foreground">
      <Sidebar />

      <main className="md:ml-64 p-4 md:p-8 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Header */}
          {activeTab !== 'sponsorships' && activeTab !== 'team' && (
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userProfile?.firstName || 'Organizer'}!</h1>
                <p className="text-gray-600">Here's what's happening with your organization.</p>
                {process.env.NODE_ENV === 'development' && (
                  <button onClick={() => promoteToAdmin(currentUser?.uid, currentUser?.email)} className="text-xs text-gray-400 hover:text-primary underline mt-1">
                    (Dev) Make Me Admin
                  </button>
                )}
              </div>
              {enableFundraising && (
                <Link
                  to="/campaign/new"
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                  New Campaign
                </Link>
              )}
            </header>
          )}

          {/* Empty State Hero - only show on overview when there's nothing */}
          {sponsorships.length === 0 && !loading && activeTab === 'overview' && (
            <div className="bg-white rounded-3xl shadow-glow border border-gray-100 p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-purple-600/5 to-transparent pointer-events-none"></div>
              <div className="relative z-10 max-w-lg mx-auto">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-600">
                  <HeartHandshake className="w-10 h-10" />
                </div>
                {packages.length > 0 ? (
                  <>
                    <h2 className="font-heading text-3xl font-bold text-gray-900 mb-4">You're All Set!</h2>
                    <p className="text-gray-500 mb-8 text-lg">Your packages are live. Share your page with local businesses to start receiving sponsorships.</p>
                    <div className="flex justify-center gap-4 flex-wrap">
                      <Link
                        to={`/sponsor/${activeOrganization?.id || currentUser?.uid}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-xl font-bold text-lg hover:bg-purple-700 transition shadow-xl shadow-purple-600/30 hover:-translate-y-1"
                      >
                        <ExternalLink className="w-5 h-5" />
                        View Public Page
                      </Link>
                      <button
                        onClick={copyShareLink}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 transition"
                      >
                        <Share2 className="w-5 h-5" />
                        Copy Share Link
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="font-heading text-3xl font-bold text-gray-900 mb-4">Start Accepting Sponsorships</h2>
                    <p className="text-gray-500 mb-8 text-lg">Create packages and share your page with local businesses to raise funds effortlessly.</p>
                    <div className="flex justify-center gap-4 flex-wrap">
                      <button
                        onClick={() => { setActiveTab('sponsorships'); setSponsorshipTab('packages'); }}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-xl font-bold text-lg hover:bg-purple-700 transition shadow-xl shadow-purple-600/30 hover:-translate-y-1"
                      >
                        Create Package
                      </button>
                      {enableFundraising && (
                        <Link
                          to="/campaign/new"
                          className="inline-flex items-center gap-2 px-8 py-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 transition"
                        >
                          Start Fundraiser
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Dashboard Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <div className="bg-white p-5 rounded-2xl shadow-soft border border-gray-100 relative overflow-hidden group">
                  <div className="absolute -top-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <HeartHandshake className="w-24 h-24 text-purple-600" />
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Revenue</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${sponsorships.reduce((acc, s) => acc + (['paid', 'branding-submitted'].includes(s.status) ? (s.amount || 0) : 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">From {sponsorships.filter(s => ['paid', 'branding-submitted'].includes(s.status)).length} paid sponsors</p>
                </div>

                {/* Total Sponsors */}
                <div className="bg-white p-5 rounded-2xl shadow-soft border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Sponsors</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{sponsorships.length}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-green-600 font-medium">{sponsorships.filter(s => ['paid', 'branding-submitted'].includes(s.status)).length} paid</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-amber-500 font-medium">{sponsorships.filter(s => s.status === 'pending').length} pending</span>
                  </div>
                </div>

                {/* Awaiting Branding */}
                <div className="bg-white p-5 rounded-2xl shadow-soft border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Awaiting Branding</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{sponsorships.filter(s => s.status === 'paid' && !s.branding?.logoUrl).length}</p>
                  <p className="text-xs text-gray-400 mt-1">Sponsors who haven't uploaded logos</p>
                </div>

                {/* Campaigns */}
                {enableFundraising && (
                  <div className="bg-white p-5 rounded-2xl shadow-soft border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Campaigns</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
                    <p className="text-xs text-gray-400 mt-1">${formatCurrency(campaigns.reduce((acc, c) => acc + (c.currentAmount || 0), 0))} raised</p>
                  </div>
                )}
              </div>

              {/* Quick Actions & Recent Sponsors Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-purple-600" />
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => { setActiveTab('sponsorships'); setSponsorshipTab('packages'); }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-purple-50 text-left transition group"
                    >
                      <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">Manage Packages</span>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600" />
                    </button>
                    <button
                      onClick={() => { setActiveTab('sponsorships'); setSponsorshipTab('content'); }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-purple-50 text-left transition group"
                    >
                      <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">Edit Public Page</span>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600" />
                    </button>
                    <button
                      onClick={() => { setActiveTab('sponsorships'); setSponsorshipTab('widget'); }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-purple-50 text-left transition group"
                    >
                      <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">Get Embed Widget</span>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600" />
                    </button>
                    <a
                      href={`/org/${userProfile?.organizationProfile?.slug || currentUser?.uid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-purple-50 text-left transition group"
                    >
                      <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">View Public Page</span>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-600" />
                    </a>
                    <button
                      onClick={copyShareLink}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-left transition group"
                    >
                      <span className="text-sm font-medium text-purple-700 group-hover:text-purple-800">Copy Share Link</span>
                      <Share2 className="w-4 h-4 text-purple-400 group-hover:text-purple-600" />
                    </button>
                  </div>
                </div>

                {/* Recent Sponsors */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4 text-purple-600" />
                      Recent Sponsors
                    </h3>
                    <button
                      onClick={() => { setActiveTab('sponsorships'); setSponsorshipTab('sales'); }}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                      View All
                    </button>
                  </div>
                  {sponsorships.length === 0 ? (
                    <div className="text-center py-8">
                      <HeartHandshake className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No sponsors yet</p>
                      <p className="text-gray-400 text-xs mt-1">Share your page to start receiving sponsorships</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sponsorships.slice(0, 5).map((sponsor) => (
                        <div key={sponsor._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            {sponsor.branding?.logoUrl ? (
                              <img src={sponsor.branding.logoUrl} alt="" className="w-10 h-10 rounded-lg object-contain bg-white border" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <span className="text-purple-600 font-bold text-sm">
                                  {(sponsor.sponsorInfo?.companyName || sponsor.sponsorName || '?')[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{sponsor.sponsorInfo?.companyName || sponsor.sponsorName}</p>
                              <p className="text-xs text-gray-500">${formatCurrency(sponsor.amount || 0)}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            sponsor.status === 'branding-submitted' ? 'bg-green-100 text-green-700' :
                            sponsor.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {sponsor.status === 'branding-submitted' ? 'Complete' :
                             sponsor.status === 'paid' ? 'Awaiting Logo' :
                             'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Setup Checklist - only show if incomplete */}
              {(!userProfile?.organizationProfile?.orgName || !userProfile?.organizationProfile?.logoUrl) && (
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Complete Your Setup
                  </h3>
                  <p className="text-purple-100 text-sm mb-4">Finish setting up your organization to make a great impression on sponsors.</p>
                  <div className="space-y-2">
                    {!userProfile?.organizationProfile?.orgName && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 rounded-full border-2 border-purple-300" />
                        <span>Add your organization name</span>
                      </div>
                    )}
                    {!userProfile?.organizationProfile?.logoUrl && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 rounded-full border-2 border-purple-300" />
                        <span>Upload your logo</span>
                      </div>
                    )}
                    {!userProfile?.organizationProfile?.description && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 rounded-full border-2 border-purple-300" />
                        <span>Add a description</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setActiveTab('sponsorships'); setSponsorshipTab('content'); }}
                    className="mt-4 px-4 py-2 bg-white text-purple-700 rounded-lg font-medium text-sm hover:bg-purple-50 transition"
                  >
                    Complete Setup
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'team' ? (
            <TeamManagement />
          ) : activeTab === 'sponsorships' ? (
            <SponsorshipView currentTab={sponsorshipTab} onTabChange={setSponsorshipTab} />
          ) : (activeTab === 'campaigns' || activeTab === 'payouts') && enableFundraising ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-8">
                {/* Campaigns List */}
                <div className="bg-white rounded-3xl shadow-soft border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-heading font-bold text-xl">Active Campaigns</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {campaigns.map(campaign => (
                      <div key={campaign.id} className="p-6 hover:bg-gray-50 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-bold text-lg text-gray-900">{campaign.title}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${campaign.type === '5050' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {campaign.type === '5050' ? 'Team Fundraiser' : 'Contribution Grid'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">Goal: ${campaign.goalAmount} • Raised: ${campaign.currentAmount || 0}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyLink(campaign.id)}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition"
                            title="Copy Link"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                          <Link
                            to={`/campaign/edit/${campaign.id}`}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition"
                            title="Edit Campaign"
                          >
                            <Settings className="w-5 h-5" />
                          </Link>
                          {campaign.status === 'active' && (
                            <button
                              onClick={async () => {
                                if (window.confirm("Are you sure you want to stop this campaign? This will prevent further donations.")) {
                                  try {
                                    await campaignService.updateCampaign(campaign.id, { status: 'completed' });
                                    loadCampaigns(); // Refresh list
                                    toast.success("Campaign stopped");
                                  } catch (error) {
                                    console.error("Error stopping campaign:", error);
                                    toast.error("Failed to stop campaign.");
                                  }
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                              title="Stop Campaign"
                            >
                              <LogOut className="w-5 h-5" />
                            </button>
                          )}
                          <Link
                            to={`/campaign/${campaign.id}`}
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
                          >
                            View Page <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <PayoutView campaigns={campaigns} />
              </div>

              {/* Sidebar / Actions Area */}
              <div className="space-y-8">
                {/* Payout Settings Card */}
                <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-6">
                  <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    Payout Settings
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Distribution Method</label>
                      {!isEditingPayout && payoutMethod ? (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="font-medium text-gray-900 text-sm">{payoutMethod}</span>
                          <button
                            onClick={() => setIsEditingPayout(true)}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="e.g. Venmo: @MyTeam"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition bg-gray-50 focus:bg-white text-sm"
                            value={payoutMethod}
                            onChange={(e) => setPayoutMethod(e.target.value)}
                          />
                          <div className="flex gap-2">
                            {isEditingPayout && (
                              <button
                                onClick={() => {
                                  setIsEditingPayout(false);
                                  setPayoutMethod(userProfile?.payoutMethod || '');
                                }}
                                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 transition"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                await handleSavePayout();
                                setIsEditingPayout(false);
                              }}
                              disabled={savingPayout}
                              className="flex-1 bg-gray-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-gray-800 transition shadow-lg shadow-gray-900/20"
                            >
                              {savingPayout ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      )}
                      {!isEditingPayout && !payoutMethod && (
                        <p className="text-xs text-gray-400 mt-2">Where should we send your funds?</p>
                      )}
                    </div>
                    <button
                      disabled={!userProfile?.balance || userProfile.balance <= 0}
                      className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Request Disbursement
                    </button>
                  </div>
                </div>

                {/* Roster Upload Card */}
                {campaigns.length > 0 && (
                  <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-6">
                    <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-accent" />
                      Manage Roster
                    </h3>
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Campaign</label>
                      <select
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition bg-gray-50 focus:bg-white text-sm"
                        value={selectedCampaignId || ''}
                        onChange={(e) => setSelectedCampaignId(e.target.value)}
                      >
                        {campaigns.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                    {selectedCampaignId && (
                      <RosterUpload campaignId={selectedCampaignId} />
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Settings View */}
          {
            activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-8">
                  <h2 className="font-heading text-2xl font-bold text-gray-900 mb-6">Settings & Integrations</h2>

                  <div className="space-y-8">
                    {/* Personal Information (New) */}
                    <div className="border border-gray-200 rounded-2xl p-6">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 bg-gray-50 text-gray-900 rounded-xl flex items-center justify-center">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">Personal Information</h3>
                          <p className="text-gray-500 text-sm">Update your personal details and team name.</p>
                        </div>
                      </div>

                      <form onSubmit={handleUpdateProfile} className="max-w-2xl space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input
                              type="text"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input
                              type="text"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                          <input
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="e.g. Westside Soccer Club"
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Public Page URL</label>
                          <div className="flex items-center">
                            <span className="text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-xl px-4 py-2 text-sm">
                              getfundraisr.io/sponsor/
                            </span>
                            <input
                              type="text"
                              value={slug}
                              onChange={(e) => {
                                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                                setSlugError('');
                              }}
                              placeholder="my-team-name"
                              className={`flex-1 min-w-0 w-full px-4 py-2 border rounded-r-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition ${slugError ? 'border-red-300' : 'border-gray-300'}`}
                            />
                          </div>
                          {slugError && <p className="text-xs text-red-600 mt-1 font-medium">{slugError}</p>}
                          <p className="text-xs text-gray-500 mt-1">This is the link you share with sponsors.</p>
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={isUpdatingProfile}
                            className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Features Toggle (New) */}
                    <div className="border border-gray-200 rounded-2xl p-6">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                          <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">Features</h3>
                          <p className="text-gray-500 text-sm">Customize your dashboard experience.</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">Enable Team Fundraising</p>
                          <p className="text-xs text-gray-500">Show Campaigns and Payouts tabs in your sidebar.</p>
                        </div>
                        <button
                          onClick={() => {
                            const newValue = !enableFundraising;
                            setEnableFundraising(newValue);
                            // Auto-save toggle
                            import('../services/userService').then(m => m.userService.updateUser(currentUser.uid, { "organizationProfile.enableFundraising": newValue }))
                              .then(() => refreshProfile && refreshProfile())
                              .then(() => toast.success(`Fundraising features ${newValue ? 'enabled' : 'disabled'}`))
                              .catch(err => toast.error("Failed to update setting"));
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enableFundraising ? 'bg-primary' : 'bg-gray-300'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enableFundraising ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                      </div>
                    </div>
                    {/* Account Security (New) */}
                    <div className="border border-gray-200 rounded-2xl p-6">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                          <Shield className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">Account Security</h3>
                          <p className="text-gray-500 text-sm">Manage your login credentials and sensitive information.</p>
                        </div>
                      </div>

                      <form onSubmit={handleUpdateEmail} className="max-w-md space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                          <input
                            type="email"
                            required
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                          />
                        </div>

                        {/* Only show password field if email is different */}
                        {userProfile?.email !== newEmail && (
                          <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Current Password <span className="text-xs text-gray-500 font-normal">(required to verify identity)</span>
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                              <input
                                type="password"
                                required
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                              />
                            </div>
                          </div>
                        )}

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={userProfile?.email === newEmail || isUpdatingEmail || !newEmail}
                            className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isUpdatingEmail ? (
                              <>Updating...</>
                            ) : (
                              <>Update Email</>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>



                    {/* Other Settings (Placeholder) */}
                    <div className="opacity-50 pointer-events-none">
                      <div className="border border-gray-200 rounded-2xl p-6">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">General Settings</h3>
                        <p className="text-gray-500 text-sm">More settings coming soon...</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        </div >
      </main >
    </div >
  );
}
