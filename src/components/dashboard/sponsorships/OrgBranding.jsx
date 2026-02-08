import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useOrgPermissions } from '../../../hooks/useOrgPermissions';
import { userService } from '../../../services/userService';
import { Upload, Save, Globe, Mail, Link as LinkIcon, Palette, Lock, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../../config';

export default function OrgBranding() {
    const { currentUser, userProfile: initialProfile, activeOrganization } = useAuth();
    const { canEditSettings, role } = useOrgPermissions();
    const [profile, setProfile] = useState({
        orgName: '',
        contactEmail: '',
        website: '',
        primaryColor: '#3B82F6',
        slug: '',
        logoUrl: '',
        divisions: []
    });
    const [newDivision, setNewDivision] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [slugStatus, setSlugStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'taken'
    const [slugEditing, setSlugEditing] = useState(false); // Controls if slug input is editable
    const [savedSlug, setSavedSlug] = useState(''); // Track the originally saved slug

    // Use activeOrganization.id for team member support
    const orgId = activeOrganization?.id || currentUser?.uid;

    // Debounced slug availability check
    useEffect(() => {
        if (!profile.slug || profile.slug.length < 3) {
            setSlugStatus('idle');
            return;
        }

        // Don't check if it's the same as the initial slug
        if (profile.slug === initialProfile?.slug) {
            setSlugStatus('available');
            return;
        }

        setSlugStatus('checking');
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/users/check-slug/${profile.slug}?userId=${orgId}`);

                const data = await res.json();
                setSlugStatus(data.available ? 'available' : 'taken');
            } catch (err) {
                console.error('Slug check failed:', err);
                setSlugStatus('idle');
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [profile.slug, orgId, initialProfile?.slug]);

    useEffect(() => {
        // Fetch fresh data from API on mount
        const loadProfile = async () => {
            if (!orgId) return;
            try {
                const freshProfile = await userService.getUser(orgId);
                if (freshProfile?.organizationProfile) {
                    setProfile(prev => ({
                        ...prev,
                        ...freshProfile.organizationProfile
                    }));
                    // Prefer root slug
                    const rootSlug = freshProfile.slug || freshProfile.organizationProfile.slug;
                    if (rootSlug) {
                        setProfile(prev => ({ ...prev, slug: rootSlug }));
                        setSavedSlug(rootSlug);
                        setSlugEditing(false); // Lock by default if slug exists
                    }
                }
            } catch (err) {
                console.error('Failed to load organization profile:', err);
                // Fall back to context data if API fails
                if (initialProfile?.organizationProfile) {
                    setProfile(prev => ({
                        ...prev,
                        ...initialProfile.organizationProfile
                    }));
                    if (initialProfile.slug || initialProfile.organizationProfile.slug) {
                        const rootSlug = initialProfile.slug || initialProfile.organizationProfile.slug;
                        setProfile(prev => ({ ...prev, slug: rootSlug }));
                        setSavedSlug(rootSlug);
                        setSlugEditing(false);
                    }
                }
            }
        };
        loadProfile();
    }, [orgId]);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!canEditSettings) {
            toast.error("You don't have permission to edit settings");
            return;
        }
        if (!orgId) {
            toast.error("You must be logged in.");
            return;
        }

        // Immediate preview
        const objectUrl = URL.createObjectURL(file);
        setProfile(prev => ({ ...prev, logoUrl: objectUrl }));
        setUploading(true);

        const uploadTask = async () => {
            console.log("Starting Proxy Upload...", file.name, "Slug:", profile.slug);

            const formData = new FormData();
            formData.append('file', file);
            if (profile.slug) {
                formData.append('slug', profile.slug);
            }
            formData.append('userId', orgId);

            const res = await fetch(`${API_BASE_URL}/api/upload`, {

                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Upload failed');
            }

            const data = await res.json();
            console.log("Upload Success:", data.url);
            setProfile(prev => ({ ...prev, logoUrl: data.url }));
            return data.url;
        };

        toast.promise(uploadTask(), {
            loading: 'Uploading... (Check Console)',
            success: 'Success!',
            error: (err) => 'Error: ' + (err.message || 'Unknown error')
        }).finally(() => {
            setUploading(false);
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!canEditSettings) {
            toast.error("You don't have permission to edit settings");
            return;
        }

        // Prevent saving if URL is a Blob (upload incomplete or failed)
        if (profile.logoUrl && profile.logoUrl.startsWith('blob:')) {
            toast.error("Please wait for the logo to finish uploading before saving.");
            return;
        }

        // Basic Slug Validation
        if (profile.slug && !/^[a-zA-Z0-9-_]+$/.test(profile.slug)) {
            toast.error("URL Handle can only contain letters, numbers, hyphens, and underscores.");
            return;
        }

        // Check if slug is taken
        if (slugStatus === 'taken') {
            toast.error("This URL handle is already taken. Please choose a different one.");
            return;
        }

        setSaving(true);
        try {
            // Use dot notation to avoid overwriting entire organizationProfile object
            const payload = {
                'organizationProfile.orgName': profile.orgName,
                'organizationProfile.contactEmail': profile.contactEmail,
                'organizationProfile.website': profile.website,
                'organizationProfile.primaryColor': profile.primaryColor,
                'organizationProfile.logoUrl': profile.logoUrl,
                'organizationProfile.slug': profile.slug,
                'organizationProfile.divisions': profile.divisions || []
            };

            await userService.updateUser(orgId, payload);
            toast.success("Organization profile saved!");
        } catch (error) {
            console.error("Error saving profile:", error);
            toast.error('Failed to save profile: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-soft space-y-6">
            {/* Read-only notice for non-owners */}
            {!canEditSettings && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 -mt-2 mb-4">
                    <Lock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-blue-800">View Only</p>
                        <p className="text-xs text-blue-600">Only organization owners can edit branding settings. You have {role} access.</p>
                    </div>
                </div>
            )}

            <h2 className="text-xl font-bold text-gray-900 mb-6">Organization Branding</h2>

            {/* Logo Section */}
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                    {profile.logoUrl ? (
                        <img src={profile.logoUrl} alt="Org Logo" className="w-full h-full object-contain" />
                    ) : (
                        <Upload className="w-8 h-8 text-gray-300" />
                    )}
                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-white font-bold text-xs">
                        Change
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">Organization Logo</h3>
                    <p className="text-sm text-gray-500">Upload a high-res PNG or JPG. This will appear on all sponsorship pages.</p>
                    {uploading && <p className="text-xs text-primary mt-1">Uploading...</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        Organization Name
                    </label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                        value={profile.orgName}
                        onChange={e => {
                            const newName = e.target.value;
                            const autoSlug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                            setProfile({ ...profile, orgName: newName, slug: autoSlug });
                        }}
                        placeholder="My League Name"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" /> Contact Email
                    </label>
                    <input
                        type="email"
                        required
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                        value={profile.contactEmail}
                        onChange={e => setProfile({ ...profile, contactEmail: e.target.value })}
                        placeholder="sponsors@league.com"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" /> Website
                    </label>
                    <input
                        type="url"
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                        value={profile.website}
                        onChange={e => setProfile({ ...profile, website: e.target.value })}
                        placeholder="https://myleleague.com"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-gray-400" /> Public Page URL
                        {savedSlug && !slugEditing && (
                            <button
                                type="button"
                                onClick={() => setSlugEditing(true)}
                                className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Edit
                            </button>
                        )}
                        {savedSlug && slugEditing && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSlugEditing(false);
                                    setProfile(prev => ({ ...prev, slug: savedSlug }));
                                }}
                                className="ml-auto text-xs text-gray-500 hover:text-gray-700 font-medium"
                            >
                                Cancel
                            </button>
                        )}
                    </label>
                    {savedSlug && slugEditing && profile.slug !== savedSlug && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                            ⚠️ <strong>Warning:</strong> Changing your URL will break all existing links. Any shared links, bookmarks, or QR codes will stop working.
                        </div>
                    )}
                    <div className={`flex rounded-xl border overflow-hidden focus-within:ring-2 bg-gray-50 ${!savedSlug || slugEditing ? (
                        slugStatus === 'taken' ? 'border-red-400 focus-within:ring-red-200' :
                            slugStatus === 'available' ? 'border-green-400 focus-within:ring-green-200' :
                                'border-gray-200 focus-within:ring-primary/20'
                    ) : 'border-gray-200 bg-gray-100'
                        }`}>
                        <span className="px-4 py-2 text-gray-500 bg-gray-100 border-r border-gray-200 text-sm flex items-center">
                            {window.location.host}/org/
                        </span>
                        <input
                            type="text"
                            className={`flex-1 px-4 py-2 border-none focus:ring-0 outline-none bg-transparent ${savedSlug && !slugEditing ? 'text-gray-500 cursor-not-allowed' : ''}`}
                            value={profile.slug || ''}
                            onChange={e => setProfile({ ...profile, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
                            placeholder="my-org-name"
                            disabled={savedSlug && !slugEditing}
                        />
                        {(!savedSlug || slugEditing) && slugStatus === 'checking' && (
                            <span className="px-3 flex items-center text-gray-400 text-xs">Checking...</span>
                        )}
                        {(!savedSlug || slugEditing) && slugStatus === 'available' && (
                            <span className="px-3 flex items-center text-green-600 text-xs font-bold">✓ Available</span>
                        )}
                        {(!savedSlug || slugEditing) && slugStatus === 'taken' && (
                            <span className="px-3 flex items-center text-red-600 text-xs font-bold">✗ Taken</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-400">Custom handle for your sponsorship page.{savedSlug && !slugEditing && ' Click Edit to change.'}</p>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Palette className="w-4 h-4 text-gray-400" /> Brand Color
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            className="h-10 w-12 rounded-lg cursor-pointer border-0 p-0"
                            value={profile.primaryColor}
                            onChange={e => setProfile({ ...profile, primaryColor: e.target.value })}
                        />
                        <input
                            type="text"
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none uppercase"
                            value={profile.primaryColor}
                            onChange={e => setProfile({ ...profile, primaryColor: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Divisions / Teams */}
            <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700">League Divisions / Teams</label>
                <p className="text-xs text-gray-500">Add divisions so sponsors can select which team their children play on.</p>
                <div className="flex flex-wrap gap-2">
                    {(profile.divisions || []).map((div, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
                            {div}
                            {canEditSettings && (
                                <button
                                    type="button"
                                    onClick={() => setProfile(prev => ({
                                        ...prev,
                                        divisions: prev.divisions.filter((_, idx) => idx !== i)
                                    }))}
                                    className="hover:text-red-600 transition"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </span>
                    ))}
                </div>
                {canEditSettings && (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                            placeholder="e.g. U8, U10, Varsity..."
                            value={newDivision}
                            onChange={e => setNewDivision(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && newDivision.trim()) {
                                    e.preventDefault();
                                    setProfile(prev => ({
                                        ...prev,
                                        divisions: [...(prev.divisions || []), newDivision.trim()]
                                    }));
                                    setNewDivision('');
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                if (newDivision.trim()) {
                                    setProfile(prev => ({
                                        ...prev,
                                        divisions: [...(prev.divisions || []), newDivision.trim()]
                                    }));
                                    setNewDivision('');
                                }
                            }}
                            className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Add
                        </button>
                    </div>
                )}
            </div>

            {canEditSettings && (
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving || uploading}
                        className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-black transition font-bold shadow-lg shadow-gray-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : uploading ? 'Uploading Logo...' : <><Save className="w-4 h-4" /> Save Changes</>}
                    </button>
                </div>
            )}
        </form>
    );
}
