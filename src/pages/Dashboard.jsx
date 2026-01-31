import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { campaignService } from '../services/campaignService';
import { promoteToAdmin } from '../utils/seedData';

import PayoutView from '../components/dashboard/PayoutView';
import RosterUpload from '../components/dashboard/RosterUpload';
import SponsorshipView from '../components/dashboard/SponsorshipView';
import OrgAnalytics from '../components/analytics/OrgAnalytics';
import { BarChart3 } from 'lucide-react';
import {
  LayoutDashboard,
  Wallet,
  Users,
  Settings,
  LogOut,
  Plus,
  ExternalLink,
  Copy,
  Trophy,
  TrendingUp,
  ArrowRight,
  HeartHandshake,
  Github
} from 'lucide-react';

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [payoutMethod, setPayoutMethod] = useState('');
  const [isEditingPayout, setIsEditingPayout] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'campaigns', 'settings', 'sponsorships'
  const [sponsorshipTab, setSponsorshipTab] = useState('sales'); // 'sales', 'packages', 'content', 'settings'

  useEffect(() => {
    if (currentUser) {
      if (userProfile?.role === 'sponsor') {
        navigate('/sponsor/dashboard');
        return;
      }
      loadCampaigns();
    }
    if (userProfile?.payoutMethod) {
      setPayoutMethod(userProfile.payoutMethod);
    }
  }, [currentUser, userProfile]);

  async function loadCampaigns() {
    try {
      const data = await campaignService.getOrganizerCampaigns(currentUser.uid);
      setCampaigns(data);
      if (data.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load campaigns", error);
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
          </div>

          {/* Team Fundraising */}
          <div className="relative">
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
                    📊 Analytics
                  </button>
                  <a
                    href={`/org/${userProfile?.slug || currentUser.uid}`}
                    target="_blank"
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-white hover:bg-white/5 flex items-center gap-1.5 transition-all group/link"
                  >
                    View Public Page
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                  </a>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Settings */}
          <div className="pt-4 mt-4 border-t border-slate-800">
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group ${activeTab === 'settings' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'}`} />
              Settings
            </button>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800 bg-[#0f172a]">
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
          {activeTab !== 'sponsorships' && (
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userProfile?.firstName || 'Organizer'}!</h1>
                    <p className="text-gray-600">Here's what's happening with your campaigns.</p>
                    <button onClick={() => promoteToAdmin(currentUser?.uid)} className="text-xs text-gray-400 hover:text-primary underline mt-1">
                      (Dev) Make Me Admin
                    </button>
                  </div>
                  <Link
                    to="/campaign/new"
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    New Campaign
                  </Link>
                </div>
              </div>
            </header>
          )}

          {/* Empty State Hero */}
          {campaigns.length === 0 && !loading && activeTab !== 'sponsorships' && (
            <div className="bg-white rounded-3xl shadow-glow border border-gray-100 p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
              <div className="relative z-10 max-w-lg mx-auto">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                  <Trophy className="w-10 h-10" />
                </div>
                <h2 className="font-heading text-3xl font-bold text-gray-900 mb-4">Start Your First Fundraiser</h2>
                <p className="text-gray-500 mb-8 text-lg">Launch a professional fundraising campaign for your team in minutes. Choose from 50/50 splits or contribution grids.</p>
                <Link
                  to="/campaign/new"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition shadow-xl shadow-primary/30 hover:-translate-y-1"
                >
                  Create Campaign <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          )}

          {/* Stats Cards (Only show if campaigns exist and NOT in sponsorships tab) */}
          {campaigns.length > 0 && activeTab !== 'sponsorships' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Raised</span>
                </div>
                <p className="text-3xl font-heading font-bold text-gray-900">${(userProfile?.balance || 0).toFixed(2)}</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Active Campaigns</span>
                </div>
                <p className="text-3xl font-heading font-bold text-gray-900">{campaigns.length}</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-accent/10 text-accent rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Growth</span>
                </div>
                <p className="text-3xl font-heading font-bold text-gray-900">+12% <span className="text-sm font-normal text-gray-400">this week</span></p>
              </div>
            </div>
          )}

          {activeTab === 'sponsorships' ? (
            <SponsorshipView currentTab={sponsorshipTab} onTabChange={setSponsorshipTab} />
          ) : campaigns.length > 0 && (
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
          )}
        </div>
    </div>
  )
}

{/* Settings View */ }
{
  activeTab === 'settings' && (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-8">
        <h2 className="font-heading text-2xl font-bold text-gray-900 mb-6">Settings & Integrations</h2>

        <div className="space-y-8">
          {/* GitHub Integration */}
          <div className="border border-gray-200 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center text-white">
                  <Github className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">GitHub Automation</h3>
                  <p className="text-gray-500 text-sm">Connect your GitHub account to automate repository creation for new campaigns.</p>
                </div>
              </div>

              {userProfile?.githubSettings?.connected ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-100">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-bold text-sm">Connected as {userProfile.githubSettings.username}</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                    // Pass the current user ID to the server so it knows who to link
                    window.location.href = `${apiUrl}/api/auth/github?userId=${currentUser?.uid}`;
                  }}
                  className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition shadow-lg shadow-gray-900/10 hover:-translate-y-0.5 flex items-center gap-2"
                >
                  Connect GitHub <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
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
