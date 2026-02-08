import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sponsorshipService } from '../services/sponsorshipService';
import { CheckCircle, Upload, Save, Plus, Trash2, Image, MessageSquare } from 'lucide-react';
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
        website: 'https://',
        adMessage: '',
        logoUrl: '',
        showPublicEmail: false,
        showPublicWebsite: false,
        showPublicPhone: false,
        hasChildren: null, // null = not answered, true/false
        children: [], // { name, division }
        notes: ''
    });
    const [phoneError, setPhoneError] = useState('');
    const [emailError, setEmailError] = useState('');

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
                const existingChildren = data.children || [];
                setFormData(prev => ({
                    ...prev,
                    email: data.sponsorInfo?.email || data.sponsorEmail || userProfile?.email || prev.email,
                    contactName: data.sponsorInfo?.contactName || data.sponsorName || (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName}` : '') || prev.contactName,
                    companyName: data.sponsorInfo?.companyName || prev.companyName,
                    adMessage: data.sponsorInfo?.adMessage || data.branding?.tagline || prev.adMessage,
                    phone: data.sponsorInfo?.phone || data.sponsorPhone || prev.phone,
                    website: data.branding?.websiteUrl || data.sponsorInfo?.website || prev.website || 'https://',
                    logoUrl: data.branding?.logoUrl || prev.logoUrl,
                    showPublicEmail: data.sponsorInfo?.showPublicEmail || false,
                    showPublicWebsite: data.sponsorInfo?.showPublicWebsite || false,
                    showPublicPhone: data.sponsorInfo?.showPublicPhone || false,
                    hasChildren: existingChildren.length > 0 ? true : null,
                    children: existingChildren,
                    notes: data.notes || ''
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

    const formatPhone = (value) => {
        const digits = value.replace(/\D/g, '').slice(0, 10);
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    };

    const validatePhone = (value) => {
        if (!value) return '';
        const digits = value.replace(/\D/g, '');
        if (digits.length !== 10) return 'Phone number must be 10 digits (e.g. 610-803-2138)';
        return '';
    };

    const validateEmail = (value) => {
        if (!value) return '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
    };

    const handleWebsiteChange = (value) => {
        // If user clears the field, reset to https://
        if (!value || value === 'http' || value === 'https' || value === 'https:' || value === 'https:/') {
            setFormData(prev => ({ ...prev, website: 'https://' }));
            return;
        }
        // Prevent double https://
        if (value.startsWith('https://https://') || value.startsWith('https://http')) {
            value = value.replace('https://https://', 'https://').replace('https://http://', 'http://').replace('https://http', 'https://');
        }
        setFormData(prev => ({ ...prev, website: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate phone
        const phoneErr = validatePhone(formData.phone);
        if (phoneErr) { setPhoneError(phoneErr); return; }

        // Validate email
        const emailErr = validateEmail(formData.email);
        if (emailErr) { setEmailError(emailErr); return; }

        // Clean website - if only https://, treat as empty
        const cleanWebsite = formData.website === 'https://' ? '' : formData.website;

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
                    website: cleanWebsite,
                    showPublicEmail: formData.showPublicEmail,
                    showPublicWebsite: formData.showPublicWebsite,
                    showPublicPhone: formData.showPublicPhone,
                    publicEmail: formData.showPublicEmail ? formData.email : null,
                    publicWebsite: formData.showPublicWebsite ? cleanWebsite : null,
                    publicPhone: formData.showPublicPhone ? formData.phone : null,
                },
                branding: {
                    logoUrl: formData.logoUrl,
                    businessName: formData.companyName,
                    tagline: formData.adMessage,
                    websiteUrl: cleanWebsite,
                },
                children: formData.hasChildren
                    ? formData.children.map(c => ({ name: c.name, division: c.division }))
                    : [],
                notes: formData.notes || ''
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
                                    className={`w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none ${phoneError ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-primary/20'}`}
                                    value={formData.phone}
                                    onChange={e => {
                                        const formatted = formatPhone(e.target.value);
                                        setFormData({ ...formData, phone: formatted });
                                        setPhoneError('');
                                    }}
                                    placeholder="610-803-2138"
                                />
                                {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                            <input
                                type="email" required
                                className={`w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none ${emailError ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-primary/20'}`}
                                value={formData.email}
                                onChange={e => {
                                    setFormData({ ...formData, email: e.target.value });
                                    setEmailError('');
                                }}
                            />
                            {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                            <input
                                type="url"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                value={formData.website}
                                onChange={e => handleWebsiteChange(e.target.value)}
                                placeholder="https://www.yourcompany.com"
                            />
                        </div>
                    </div>

                    {/* Public Profile Visibility */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Public Profile</h3>
                        <p className="text-sm text-gray-500">
                            What information would you like included with your profile on our website?
                        </p>
                        <div className="space-y-3">
                            {[
                                { key: 'showPublicWebsite', label: 'Website' },
                                { key: 'showPublicEmail', label: 'Email' },
                                { key: 'showPublicPhone', label: 'Phone Number' },
                            ].map(({ key, label }) => (
                                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <span className="text-sm font-medium text-gray-700">{label}</span>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, [key]: true }))}
                                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${formData[key] === true
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, [key]: false }))}
                                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${formData[key] === false
                                                ? 'bg-gray-700 text-white shadow-sm'
                                                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>
                            ))}
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
                        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">
                            Children in {organizer?.organizationProfile?.orgName || 'the League'}
                        </h3>
                        <p className="text-sm text-gray-500">
                            Many sponsors are also parents in our league! If you have children who play, letting us know helps the organization recognize your family's connection and may feature your sponsorship alongside their team.
                        </p>

                        {/* Yes/No Toggle */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData(prev => ({
                                        ...prev,
                                        hasChildren: true,
                                        children: prev.children.length === 0 ? [{ name: '', division: '' }] : prev.children
                                    }));
                                }}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition ${formData.hasChildren === true
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                Yes, I have children in the league
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, hasChildren: false, children: [] }))}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition ${formData.hasChildren === false
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                No
                            </button>
                        </div>

                        {/* Children Fields (only if Yes) */}
                        {formData.hasChildren && (
                            <div className="space-y-3">
                                {formData.children.map((child, index) => (
                                    <div key={index} className="flex gap-3 items-end bg-gray-50 p-4 rounded-xl">
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
                                            {organizer?.organizationProfile?.divisions?.length > 0 ? (
                                                <>
                                                    <select
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                                                        value={organizer.organizationProfile.divisions.includes(child.division) ? child.division : (child.division ? '__other' : '')}
                                                        onChange={e => {
                                                            if (e.target.value === '__other') {
                                                                updateChild(index, 'division', '');
                                                                const newChildren = [...formData.children];
                                                                newChildren[index] = { ...newChildren[index], _isCustom: true, division: '' };
                                                                setFormData(prev => ({ ...prev, children: newChildren }));
                                                            } else {
                                                                const newChildren = [...formData.children];
                                                                newChildren[index] = { ...newChildren[index], _isCustom: false, division: e.target.value };
                                                                setFormData(prev => ({ ...prev, children: newChildren }));
                                                            }
                                                        }}
                                                    >
                                                        <option value="">Select division...</option>
                                                        {organizer.organizationProfile.divisions.map((div, i) => (
                                                            <option key={i} value={div}>{div}</option>
                                                        ))}
                                                        <option value="__other">Other...</option>
                                                    </select>
                                                    {(child._isCustom || (child.division && !organizer.organizationProfile.divisions.includes(child.division))) && (
                                                        <input
                                                            type="text"
                                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm mt-2"
                                                            value={child.division}
                                                            onChange={e => updateChild(index, 'division', e.target.value)}
                                                            placeholder="Enter division name..."
                                                            autoFocus
                                                        />
                                                    )}
                                                </>
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm"
                                                    value={child.division}
                                                    onChange={e => updateChild(index, 'division', e.target.value)}
                                                    placeholder="e.g. U12"
                                                />
                                            )}
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
                                    <Plus className="w-4 h-4" /> Add Another Child
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-primary" />
                            Notes for the Organization
                        </h3>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px]"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Any additional notes or requests for the organization? (e.g. special instructions, preferred placement, etc.)"
                        />
                        <p className="text-xs text-gray-400">These notes are shared privately with the organization and will not appear publicly.</p>
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
