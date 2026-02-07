import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sponsorshipService } from '../services/sponsorshipService';
import { CheckCircle, Upload, Save, Plus, Trash2, Image } from 'lucide-react';
import SignPreviewEditor from '../components/sponsor/SignPreviewEditor';
import { API_BASE_URL } from '../config';

export default function SponsorshipFulfilment() {
    const { currentUser, userProfile, loading: authLoading } = useAuth();
    const { sponsorshipId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Data State
    const [sponsorship, setSponsorship] = useState(null);
    const [organizer, setOrganizer] = useState(null);
    const [packageData, setPackageData] = useState(null);
    const [formData, setFormData] = useState({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        website: '',
        adMessage: '',
        logoUrl: '',
        showPublicEmail: false, // Whether to display email on public profile
        children: [] // { name, division }
    });

    useEffect(() => {
        // Wait for auth to finish loading before attempting to fetch
        // This ensures x-user-id header is sent with the request
        if (sponsorshipId && !authLoading) {
            loadSponsorship();
        }
    }, [sponsorshipId, authLoading, currentUser, userProfile]); // Re-run when auth is ready

    const loadSponsorship = async () => {
        try {
            const data = await sponsorshipService.getSponsorship(sponsorshipId);
            if (data) {
                setSponsorship(data);

                // Robust Pre-fill Logic
                // Priority: Saved sponsorInfo > Top Level Sponsorship Data > Basic User Profile
                // Note: We do NOT use userProfile.organizationProfile as sponsors are not organizers
                setFormData(prev => ({
                    ...prev,
                    email: data.sponsorInfo?.email || data.sponsorEmail || userProfile?.email || prev.email,
                    contactName: data.sponsorInfo?.contactName || data.sponsorName || (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName}` : '') || prev.contactName,
                    companyName: data.sponsorInfo?.companyName || prev.companyName,
                    adMessage: data.sponsorInfo?.adMessage || data.branding?.tagline || prev.adMessage,
                    phone: data.sponsorInfo?.phone || data.sponsorPhone || prev.phone,
                    website: data.branding?.websiteUrl || data.sponsorInfo?.website || prev.website,
                    logoUrl: data.branding?.logoUrl || prev.logoUrl,
                    showPublicEmail: data.sponsorInfo?.showPublicEmail || false,
                    children: data.children || []
                }));

                // Load Organizer Profile for Header
                if (data.organizerId) {
                    import('../services/userService').then(({ userService }) => {
                        userService.getUser(data.organizerId).then(user => {
                            setOrganizer(user);
                        }).catch(err => console.error("Failed to load organizer", err));
                    });
                }

                // Load package data for sign preview
                if (data.packageId) {
                    try {
                        const pkg = await sponsorshipService.getPackage(data.packageId);
                        setPackageData(pkg);
                    } catch (pkgError) {
                        console.log('Could not load package data:', pkgError);
                    }
                }
            }
        } catch (error) {
            console.error("Error loading sponsorship:", error);
        } finally {
            setLoading(false);
        }
    };


    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingLogo(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);
            // Group by Organization ID if available, otherwise Sponsorship ID
            formDataUpload.append('userId', sponsorship?.organizerId || sponsorshipId);

            const response = await fetch(`${API_BASE_URL}/api/upload`, {

                method: 'POST',
                body: formDataUpload
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            setFormData(prev => ({ ...prev, logoUrl: data.url }));
        } catch (error) {
            console.error("Error uploading logo:", error);
            alert("Failed to upload logo.");
        } finally {
            setUploadingLogo(false);
        }
    };

    const addChild = () => {
        setFormData(prev => ({
            ...prev,
            children: [...prev.children, { name: '', division: '' }]
        }));
    };

    const removeChild = (index) => {
        setFormData(prev => ({
            ...prev,
            children: prev.children.filter((_, i) => i !== index)
        }));
    };

    const updateChild = (index, field, value) => {
        const newChildren = [...formData.children];
        newChildren[index] = { ...newChildren[index], [field]: value };
        setFormData(prev => ({ ...prev, children: newChildren }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await sponsorshipService.updateSponsorship(sponsorshipId, {
                status: 'branding-submitted',
                sponsorInfo: {
                    companyName: formData.companyName,
                    contactName: formData.contactName,
                    adMessage: formData.adMessage,
                    email: formData.email,
                    phone: formData.phone,
                    website: formData.website,
                    showPublicEmail: formData.showPublicEmail,
                    publicEmail: formData.showPublicEmail ? formData.email : null, // Only set if opted in
                },
                branding: {
                    logoUrl: formData.logoUrl,
                    businessName: formData.companyName,
                    tagline: formData.adMessage,
                    websiteUrl: formData.website,
                },
                children: formData.children
            });
            // Success State
            navigate('/thank-you', {
                state: {
                    type: 'sponsorship',
                    title: 'Ad Submitted!',
                    message: 'Your branding materials have been saved. You can update them anytime from your dashboard.'
                }
            });
        } catch (error) {
            console.error("Error submitting details:", error);
            alert("Failed to save details.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-12">
            <div className="max-w-2xl mx-auto bg-white p-4 sm:p-8 rounded-3xl shadow-soft border border-gray-100">
                <div className="text-center mb-10">
                    {organizer?.organizationProfile?.logoUrl && (
                        <img
                            src={organizer.organizationProfile.logoUrl}
                            alt="Organization Logo"
                            className="h-16 w-auto mx-auto mb-4 object-contain"
                        />
                    )}
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">
                        Supporting {organizer?.organizationProfile?.name || 'Organization'}
                    </h2>
                    <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">Design Your Ad</h1>
                    <p className="text-gray-600">Complete your sponsorship setup by uploading your logo and message.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Ad Content */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Business Details</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                            <input
                                type="text" required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                value={formData.companyName}
                                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                placeholder="Acme Corp"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Message / Slogan</label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px]"
                                value={formData.adMessage}
                                onChange={e => setFormData({ ...formData, adMessage: e.target.value })}
                                placeholder="e.g. 'Proud supporters of local youth sports!' or list your services..."
                            />
                            <p className="text-xs text-gray-400 mt-1">This text may appear on your banner or digital listing.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                                <input
                                    type="text" required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={formData.contactName}
                                    onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="tel" required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                            <input
                                type="email" required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                            <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.showPublicEmail}
                                    onChange={e => setFormData({ ...formData, showPublicEmail: e.target.checked })}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary/20"
                                />
                                <span className="text-sm text-gray-600">Display email as a "Contact Us" button on my public sponsor page</span>
                            </label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                            <input
                                type="url"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                value={formData.website}
                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                                placeholder="https://www.yourcompany.com"
                            />
                            <p className="text-xs text-gray-400 mt-1">Your website will be linked from your sponsor profile.</p>
                        </div>
                    </div>

                    {/* Logo Upload */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Branding Assets</h3>
                        <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                            <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shadow-sm overflow-hidden">
                                {formData.logoUrl ? (
                                    <img src={formData.logoUrl} alt="Preview" className="w-full h-full object-contain" />
                                ) : (
                                    <Upload className="w-8 h-8 text-gray-300" />
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">High-Resolution Logo</label>
                                <p className="text-xs text-gray-500 mb-3">Please upload a high-quality PNG or Vector file for printing banners.</p>
                                <label className="inline-block px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold cursor-pointer hover:bg-gray-100 transition shadow-sm">
                                    {uploadingLogo ? 'Uploading...' : 'Choose File'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Sign Preview Editor */}
                    {packageData?.signPreviewImages?.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                                <Image className="w-5 h-5 text-primary" />
                                Preview Your Signage
                            </h3>
                            <p className="text-sm text-gray-600">
                                See how your logo will look on the actual sign location! Drag your logo to position it, add text if needed, and download a preview.
                            </p>
                            {packageData.signPreviewImages.map((previewImage, idx) => (
                                <div key={idx} className="space-y-2">
                                    {previewImage.name && (
                                        <p className="font-medium text-gray-700">{previewImage.name}</p>
                                    )}
                                    <SignPreviewEditor
                                        backgroundImageUrl={previewImage.url}
                                        logoUrl={formData.logoUrl}
                                        companyName={formData.companyName}
                                        placementZone={previewImage.placementZone}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Child Info */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 flex justify-between items-center">
                            Children in League (Optional)
                        </h3>
                        {formData.children.map((child, index) => (
                            <div key={index} className="flex gap-4 items-end bg-gray-50 p-4 rounded-xl">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Child Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm"
                                        value={child.name}
                                        onChange={e => updateChild(index, 'name', e.target.value)}
                                        placeholder="Name"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Division/Team</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm"
                                        value={child.division}
                                        onChange={e => updateChild(index, 'division', e.target.value)}
                                        placeholder="e.g. U12"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeChild(index)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addChild}
                            className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                        >
                            <Plus className="w-4 h-4" /> Add Child
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || uploadingLogo}
                        className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary-700 transition shadow-xl shadow-primary/30 disabled:opacity-70"
                    >
                        {submitting ? 'Submitting...' : 'Complete Registration'}
                    </button>
                </form>
            </div>
        </div>
    );
}
