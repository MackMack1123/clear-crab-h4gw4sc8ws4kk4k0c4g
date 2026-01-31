import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { userService } from '../../../services/userService';
import { sponsorshipService } from '../../../services/sponsorshipService';
import { Plus, Trash2, GripVertical, Image as ImageIcon, Save, ArrowUp, ArrowDown, Type, Megaphone, Layout, LayoutGrid, List, X, BarChart3 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import ConfirmModal from '../../common/ConfirmModal';
import { API_BASE_URL } from '../../../config';

export default function PageContentBuilder({ setActiveTab }) {
    const { currentUser, userProfile } = useAuth();
    const [blocks, setBlocks] = useState([]);
    const [saving, setSaving] = useState(false);
    const [availablePackages, setAvailablePackages] = useState([]);
    const [uploadingState, setUploadingState] = useState({}); // { [blockId]: boolean }
    const [deleteTarget, setDeleteTarget] = useState(null); // Block ID to delete
    const [navTarget, setNavTarget] = useState(null); // Tab to navigate to

    useEffect(() => {
        if (userProfile?.publicContent) {
            setBlocks(userProfile.publicContent);
        }
        if (currentUser?.uid) {
            sponsorshipService.getActivePackages(currentUser.uid).then(setAvailablePackages);
        }
    }, [userProfile, currentUser]);

    const hasUnsavedChanges = JSON.stringify(blocks) !== JSON.stringify(userProfile?.publicContent || []);

    const handleNavigate = (tab) => {
        if (hasUnsavedChanges) {
            setNavTarget(tab);
        } else {
            setActiveTab(tab);
        }
    };

    const confirmNavigate = () => {
        setActiveTab(navTarget);
        setNavTarget(null);
    };
    const addBlock = (type) => {
        const newBlock = {
            id: uuidv4(),
            type, // 'hero_standard', 'hero', 'text_image', 'text', 'cta', ...
            variant: 'card', // For 'hero': 'card' or 'full'
            title: '',
            body: '',
            imageUrl: '',
            imagePosition: 'right', // For text_image
            alignment: 'left', // For text
            buttonText: 'Contact Us', // For cta
            buttonAction: 'link', // For cta
            buttonLink: `mailto:${userProfile?.organizationProfile?.contactEmail || ''}`, // For cta
            packageId: '', // For package_highlight
            packageIds: [], // For package_gallery, package_list
            listStyle: 'image_left', // For package_list
            showImages: true, // For package_list
            overlayColor: 'black', // For hero
            overlayOpacity: 50, // For hero
            showBadge: true, // For hero_standard
            badgeText: 'Official Sponsorship Portal', // For hero_standard
            stats: [ // For stats block
                { value: '500+', label: 'Local Families' },
                { value: '50+', label: 'Active Teams' },
                { value: '12k', label: 'Annual Visitors' },
                { value: '100%', label: 'Community Focused' }
            ]
        };
        setBlocks([...blocks, newBlock]);
    };

    const STOCK_IMAGES = [
        { id: 'stock1', url: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&q=80&w=2000', label: 'Community' },
        { id: 'stock2', url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=2000', label: 'Sports' },
        { id: 'stock3', url: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&q=80&w=2000', label: 'Teamwork' },
        { id: 'stock4', url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&q=80&w=2000', label: 'Fitness' },
        { id: 'stock5', url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=2000', label: 'Soccer' },
        { id: 'stock6', url: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&q=80&w=2000', label: 'Youth' },
        { id: 'stock7', url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=2000', label: 'Gathering' },
        { id: 'stock8', url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=2000', label: 'Planning' }
    ];

    const [showStockPicker, setShowStockPicker] = useState(null); // blockId or null

    const handleStockSelect = (blockId, url) => {
        updateBlock(blockId, 'imageUrl', url);
        setShowStockPicker(null);
    };

    const removeBlock = (id) => {
        setDeleteTarget(id);
    };

    const confirmDelete = () => {
        if (deleteTarget) {
            setBlocks(blocks.filter(b => b.id !== deleteTarget));
            setDeleteTarget(null);
            toast.success("Section removed");
        }
    };

    const updateBlock = (id, field, value) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const moveBlock = (index, direction) => {
        const newBlocks = [...blocks];
        if (direction === 'up' && index > 0) {
            [newBlocks[index], newBlocks[index - 1]] = [newBlocks[index - 1], newBlocks[index]];
        } else if (direction === 'down' && index < newBlocks.length - 1) {
            [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
        }
        setBlocks(newBlocks);
    };

    const togglePackage = (blockId, packageId, currentIds = []) => {
        const newIds = currentIds.includes(packageId)
            ? currentIds.filter(id => id !== packageId)
            : [...currentIds, packageId];
        updateBlock(blockId, 'packageIds', newIds);
    };


    const handleImageUpload = async (blockId, file) => {
        if (!file) return;

        // Store the previous URL in case upload fails
        const currentBlock = blocks.find(b => b.id === blockId);
        const previousUrl = currentBlock?.imageUrl || '';

        // Immediate preview using blob URL
        const objectUrl = URL.createObjectURL(file);
        updateBlock(blockId, 'imageUrl', objectUrl);

        setUploadingState(prev => ({ ...prev, [blockId]: 'uploading' }));

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', currentUser.uid);

            const response = await fetch(`${API_BASE_URL}/api/upload`, {

                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            updateBlock(blockId, 'imageUrl', data.url);
            URL.revokeObjectURL(objectUrl);
            toast.success("Image uploaded successfully");
        } catch (error) {
            console.error("Upload failed:", error);
            updateBlock(blockId, 'imageUrl', previousUrl);
            URL.revokeObjectURL(objectUrl);
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setUploadingState(prev => {
                const newState = { ...prev };
                delete newState[blockId];
                return newState;
            });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all([
                userService.updatePageContent(currentUser.uid, blocks)
            ]);
            toast.success("Page content saved!");
        } catch (error) {
            console.error("Error saving content:", error);
            toast.error("Failed to save content");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAndNavigate = async () => {
        setSaving(true);
        try {
            await Promise.all([
                userService.updatePageContent(currentUser.uid, blocks)
            ]);
            toast.success("Page content saved!");
            setActiveTab(navTarget);
            setNavTarget(null);
        } catch (error) {
            console.error("Error saving content:", error);
            toast.error("Failed to save content");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Page Content</h2>
                    <p className="text-gray-500">Add custom sections to tell your story on the sponsorship page.</p>
                </div>
                <button
                    onClick={() => {
                        // Check if any uploads are in progress
                        if (Object.keys(uploadingState).length > 0) {
                            toast.error('Please wait for image uploads to complete before saving');
                            return;
                        }
                        handleSave();
                    }}
                    disabled={saving || Object.keys(uploadingState).length > 0}
                    className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2 rounded-xl hover:bg-black transition font-bold shadow-lg shadow-gray-900/20 disabled:opacity-50"
                >
                    {Object.keys(uploadingState).length > 0 ? 'Uploading...' : saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
            </div>



            <div className="space-y-4">
                {blocks.map((block, index) => (
                    <div key={block.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft group">
                        <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-50">
                            <div className="flex items-center gap-2">
                                <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded">
                                    {block.type === 'hero_standard' && 'STANDARD HERO'}
                                    {block.type === 'hero' && 'IMAGE HERO'}
                                    {block.type === 'text_image' && 'IMAGE & TEXT'}
                                    {block.type === 'text' && 'TEXT BLOCK'}
                                    {block.type === 'cta' && 'CALL TO ACTION'}
                                    {block.type === 'package_highlight' && 'PACKAGE HIGHLIGHT'}
                                    {block.type === 'package_gallery' && 'PACKAGE GALLERY'}
                                    {block.type === 'package_list' && 'PACKAGE LIST'}
                                    {block.type === 'stats' && 'IMPACT STATS'}
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => moveBlock(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900 disabled:opacity-30"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => moveBlock(index, 'down')}
                                        disabled={index === blocks.length - 1}
                                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900 disabled:opacity-30"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => removeBlock(block.id)}
                                className="text-red-400 hover:text-red-600 p-1 rounded transition"
                                title="Remove Section"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Common Fields - Hide for stats blocks */}
                            {block.type !== 'stats' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                        value={block.title}
                                        onChange={e => updateBlock(block.id, 'title', e.target.value)}
                                        placeholder={block.type === 'hero' || block.type === 'hero_standard' ? 'Big Headline' : 'Section Title'}
                                    />
                                </div>
                            )}

                            {block.type === 'hero_standard' && (
                                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={block.showBadge !== false}
                                            onChange={(e) => updateBlock(block.id, 'showBadge', e.target.checked)}
                                            className="w-4 h-4 text-primary rounded focus:ring-primary"
                                        />
                                        <label className="text-sm font-bold text-gray-700">Show Badge</label>
                                    </div>
                                    {block.showBadge !== false && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Badge Text</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                                value={block.badgeText || ''}
                                                onChange={(e) => updateBlock(block.id, 'badgeText', e.target.value)}
                                                placeholder="Official Sponsorship Portal"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {block.type !== 'cta' && block.type !== 'stats' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Body Text</label>
                                    <textarea
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                        rows="4"
                                        value={block.body}
                                        onChange={e => updateBlock(block.id, 'body', e.target.value)}
                                        placeholder="Section content..."
                                    />
                                </div>
                            )}

                            {/* Specific Fields */}
                            {(block.type === 'text_image' || block.type === 'hero') && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        {block.type === 'hero' ? 'Background Image' : 'Image'}
                                    </label>

                                    {block.type === 'hero' && (
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Hero Style</label>
                                            <select
                                                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                                value={block.variant || 'card'}
                                                onChange={e => updateBlock(block.id, 'variant', e.target.value)}
                                            >
                                                <option value="card">Card (Rounded with Padding)</option>
                                                <option value="full">Full Width Image (Edge to Edge)</option>
                                                <option value="gradient">Full Width Gradient (No Image)</option>
                                            </select>
                                            {block.variant === 'gradient' && (
                                                <p className="text-xs text-gray-500 mt-1">Uses a modern gradient background based on your overlay color selection below.</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Image Preview & Upload Area - Hidden for gradient variant */}
                                    {block.variant !== 'gradient' && (
                                        <>
                                            <div className="relative aspect-video bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group/image mb-3">
                                                {block.imageUrl ? (
                                                    <>
                                                        <img src={block.imageUrl} alt="Section" className="w-full h-full object-cover" />
                                                        {/* Live Overlay Preview */}
                                                        {block.type === 'hero' && (
                                                            <div
                                                                className="absolute inset-0 transition-all duration-300"
                                                                style={{
                                                                    backgroundColor: block.overlayColor === 'primary'
                                                                        ? (userProfile?.organizationProfile?.primaryColor || '#0f172a')
                                                                        : (block.overlayColor || 'black'),
                                                                    opacity: (block.overlayOpacity ?? 50) / 100
                                                                }}
                                                            />
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                        <p className="text-xs text-gray-400">Click to upload image</p>
                                                    </div>
                                                )}

                                                <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition cursor-pointer text-white font-bold text-xs">
                                                    {uploadingState[block.id] ? 'Uploading...' : 'Change Image'}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={e => handleImageUpload(block.id, e.target.files[0])}
                                                    />
                                                </label>
                                            </div>

                                            {/* Stock Image Picker Button & Modal */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowStockPicker(showStockPicker === block.id ? null : block.id)}
                                                    className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
                                                >
                                                    <ImageIcon className="w-4 h-4" /> Choose from Stock Library
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Hero Overlay Controls */}
                            {block.type === 'hero' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Overlay Color</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {[
                                                { label: 'Brand', value: 'primary', bg: 'bg-gray-100' }, // bg class overridden by style below
                                                { label: 'Dark', value: 'black', bg: 'bg-black' },
                                                { label: 'Royal', value: '#1d4ed8', bg: 'bg-blue-700' },
                                                { label: 'Navy', value: '#1e3a8a', bg: 'bg-blue-900' },
                                                { label: 'Red', value: '#dc2626', bg: 'bg-red-600' },
                                                { label: 'Maroon', value: '#7f1d1d', bg: 'bg-red-900' },
                                                { label: 'Green', value: '#16a34a', bg: 'bg-green-600' },
                                                { label: 'Forest', value: '#064e3b', bg: 'bg-emerald-900' },
                                                { label: 'Orange', value: '#ea580c', bg: 'bg-orange-600' },
                                                { label: 'Purple', value: '#7e22ce', bg: 'bg-purple-700' },
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => updateBlock(block.id, 'overlayColor', opt.value)}
                                                    className={`w-8 h-8 rounded-full ${opt.bg} border-2 transition ${block.overlayColor === opt.value ? 'border-gray-900 scale-110 ring-2 ring-offset-2 ring-gray-900' : 'border-transparent opacity-50 hover:opacity-100'} shadow-sm flex-shrink-0`}
                                                    style={opt.value === 'primary' ? { backgroundColor: userProfile?.organizationProfile?.primaryColor || '#0f172a' } : {}}
                                                    title={opt.label}
                                                >
                                                    {opt.value === 'primary' && <span className="block w-full h-full rounded-full bg-black/10 text-[8px] flex items-center justify-center font-bold text-white/90">Brand</span>}
                                                </button>
                                            ))}

                                            {/* Custom Color Input */}
                                            <div className="relative">
                                                <input
                                                    type="color"
                                                    value={block.overlayColor === 'primary' || !block.overlayColor.startsWith('#') ? '#000000' : block.overlayColor}
                                                    onChange={(e) => updateBlock(block.id, 'overlayColor', e.target.value)}
                                                    className="opacity-0 absolute inset-0 w-8 h-8 cursor-pointer"
                                                />
                                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white ${!['primary', 'black'].includes(block.overlayColor) && block.overlayColor.startsWith('#') && !['#1d4ed8', '#1e3a8a', '#dc2626', '#7f1d1d', '#16a34a', '#064e3b', '#ea580c', '#7e22ce'].includes(block.overlayColor) ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900' : 'border-gray-200'}`} title="Custom Color">
                                                    <span className="text-[10px] font-bold text-gray-500">+</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                                Overlay Opacity: {block.overlayOpacity ?? 50}%
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="90"
                                                className="w-full accent-primary"
                                                value={block.overlayOpacity ?? 50}
                                                onChange={e => updateBlock(block.id, 'overlayOpacity', parseInt(e.target.value))}
                                            />
                                        </div>
                                        {/* Blur slider - only for image variants */}
                                        {block.variant !== 'gradient' && (
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                                    Background Blur: {block.blurAmount ?? 0}px
                                                </label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="20"
                                                    className="w-full accent-primary"
                                                    value={block.blurAmount ?? 0}
                                                    onChange={e => updateBlock(block.id, 'blurAmount', parseInt(e.target.value))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {block.type === 'text_image' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Image Position</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                        value={block.imagePosition || 'right'}
                                        onChange={e => updateBlock(block.id, 'imagePosition', e.target.value)}
                                    >
                                        <option value="right">Right Side</option>
                                        <option value="left">Left Side</option>
                                    </select>
                                </div>
                            )}

                            {block.type === 'text' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Alignment</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                        value={block.alignment || 'left'}
                                        onChange={e => updateBlock(block.id, 'alignment', e.target.value)}
                                    >
                                        <option value="left">Left Aligned</option>
                                        <option value="center">Centered</option>
                                    </select>
                                </div>
                            )}

                            {block.type === 'cta' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Button Text</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                            value={block.buttonText}
                                            onChange={e => updateBlock(block.id, 'buttonText', e.target.value)}
                                            placeholder="Contact Us"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Button Action</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none mb-2"
                                            value={block.buttonAction || 'link'}
                                            onChange={e => updateBlock(block.id, 'buttonAction', e.target.value)}
                                        >
                                            <option value="link">Open External Link</option>
                                            <option value="contact">Open Contact Support Form</option>
                                        </select>

                                        {(block.buttonAction === 'link' || !block.buttonAction) && (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Button Link</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                                    value={block.buttonLink}
                                                    onChange={e => updateBlock(block.id, 'buttonLink', e.target.value)}
                                                    placeholder="mailto:..."
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Description (Optional)</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                            value={block.body}
                                            onChange={e => updateBlock(block.id, 'body', e.target.value)}
                                            placeholder="Ready to get started?"
                                        />
                                    </div>
                                </div>
                            )}

                            {block.type === 'package_highlight' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Select Package to Highlight</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                        value={block.packageId || ''}
                                        onChange={e => updateBlock(block.id, 'packageId', e.target.value)}
                                    >
                                        <option value="">-- Select a Package --</option>
                                        {availablePackages.map(pkg => (
                                            <option key={pkg.id} value={pkg.id}>{pkg.title} - ${pkg.price}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">This will show a large feature card for the selected package.</p>
                                </div>
                            )}

                            {(block.type === 'package_gallery' || block.type === 'package_list') && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Select Packages to Display</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {availablePackages.map(pkg => (
                                                <label key={pkg.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:border-primary/50 transition">
                                                    <input
                                                        type="checkbox"
                                                        checked={(block.packageIds || []).includes(pkg.id)}
                                                        onChange={() => togglePackage(block.id, pkg.id, block.packageIds)}
                                                        className="rounded text-primary focus:ring-primary"
                                                    />
                                                    <div className="text-sm">
                                                        <div className="font-bold text-gray-900">{pkg.title}</div>
                                                        <div className="text-gray-500">${pkg.price}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Show/Hide Images Toggle */}
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <div>
                                            <label className="text-sm font-bold text-gray-700">Show Package Images</label>
                                            <p className="text-xs text-gray-500">Display package photos in this section</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => updateBlock(block.id, 'showImages', !(block.showImages !== false))}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${block.showImages !== false ? 'bg-primary' : 'bg-gray-300'}`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${block.showImages !== false ? 'translate-x-6' : ''}`} />
                                        </button>
                                    </div>

                                    {block.type === 'package_list' && (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Image Position</label>
                                            <select
                                                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
                                                value={block.listStyle || 'image_left'}
                                                onChange={e => updateBlock(block.id, 'listStyle', e.target.value)}
                                                disabled={block.showImages === false}
                                            >
                                                <option value="image_left">Image on Left</option>
                                                <option value="image_right">Image on Right</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Reminder to manage photos */}
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 text-sm">
                                        <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        <p className="text-blue-700">
                                            Manage package photos on the{' '}
                                            <button
                                                type="button"
                                                onClick={() => handleNavigate('packages')}
                                                className="font-bold underline hover:text-blue-900"
                                            >
                                                Packages page
                                            </button>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Stats Block Fields */}
                            {block.type === 'stats' && (
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-gray-700">Statistics (4 columns)</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(() => {
                                            const DEFAULT_STATS = [
                                                { value: '500+', label: 'Local Families' },
                                                { value: '50+', label: 'Active Teams' },
                                                { value: '12k', label: 'Annual Visitors' },
                                                { value: '100%', label: 'Community Focused' }
                                            ];
                                            const currentStats = block.stats || DEFAULT_STATS;

                                            return currentStats.map((stat, i) => (
                                                <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                                                        Stat {i + 1}
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-600 mb-1">Value</label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none text-lg font-bold"
                                                            value={stat.value}
                                                            onChange={e => {
                                                                const newStats = [...currentStats];
                                                                newStats[i] = { ...newStats[i], value: e.target.value };
                                                                updateBlock(block.id, 'stats', newStats);
                                                            }}
                                                            placeholder="500+"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-600 mb-1">Label</label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                                            value={stat.label}
                                                            onChange={e => {
                                                                const newStats = [...currentStats];
                                                                newStats[i] = { ...newStats[i], label: e.target.value };
                                                                updateBlock(block.id, 'stats', newStats);
                                                            }}
                                                            placeholder="Local Families"
                                                        />
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                    <p className="text-xs text-gray-500">These stats will appear in a 4-column layout on the sponsorship page.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                <div className="space-y-8">
                    <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Hero Sections</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => addBlock('hero_standard')}
                                className="group p-4 bg-white border border-gray-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 rounded-2xl transition-all text-left flex items-start gap-4"
                            >
                                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-colors">
                                    <Layout className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">Standard Hero</h3>
                                    <p className="text-xs text-gray-500">Clean, centered text with a subtle background gradient.</p>
                                </div>
                            </button>

                            <button
                                onClick={() => addBlock('hero')}
                                className="group p-4 bg-white border border-gray-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 rounded-2xl transition-all text-left flex items-start gap-4"
                            >
                                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-colors">
                                    <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">Image Hero</h3>
                                    <p className="text-xs text-gray-500">High-impact image with overlay text. Supports full-width.</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Content</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => addBlock('text')}
                                className="group p-4 bg-white border border-gray-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 rounded-2xl transition-all text-left flex items-start gap-4"
                            >
                                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-colors">
                                    <Type className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">Text Block</h3>
                                    <p className="text-xs text-gray-500">Simple rich text paragraph.</p>
                                </div>
                            </button>
                            <button
                                onClick={() => addBlock('text_image')}
                                className="group p-4 bg-white border border-gray-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 rounded-2xl transition-all text-left flex items-start gap-4"
                            >
                                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-colors">
                                    <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">Image + Text</h3>
                                    <p className="text-xs text-gray-500">Side-by-side content layout.</p>
                                </div>
                            </button>
                            <button
                                onClick={() => addBlock('stats')}
                                className="group p-4 bg-white border border-gray-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 rounded-2xl transition-all text-left flex items-start gap-4"
                            >
                                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-colors">
                                    <BarChart3 className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">Impact Stats</h3>
                                    <p className="text-xs text-gray-500">Showcase your numbers.</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Packages</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => addBlock('package_highlight')}
                                className="group p-4 bg-white border border-gray-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 rounded-2xl transition-all text-left flex items-start gap-4"
                            >
                                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-colors">
                                    <Layout className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">Highlight</h3>
                                    <p className="text-xs text-gray-500">Spotlight a single package.</p>
                                </div>
                            </button>
                            <button
                                onClick={() => addBlock('package_gallery')}
                                className="group p-4 bg-white border border-gray-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 rounded-2xl transition-all text-left flex items-start gap-4"
                            >
                                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-colors">
                                    <LayoutGrid className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">Gallery</h3>
                                    <p className="text-xs text-gray-500">Grid of selected packages.</p>
                                </div>
                            </button>
                            <button
                                onClick={() => addBlock('package_list')}
                                className="group p-4 bg-white border border-gray-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 rounded-2xl transition-all text-left flex items-start gap-4"
                            >
                                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-colors">
                                    <List className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">List View</h3>
                                    <p className="text-xs text-gray-500">Detailed list layout.</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Actions</h4>
                        <div className="grid grid-cols-1">
                            <button
                                onClick={() => addBlock('cta')}
                                className="group p-4 bg-white border border-gray-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 rounded-2xl transition-all text-left flex items-start gap-4"
                            >
                                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-colors">
                                    <Megaphone className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">Call to Action</h3>
                                    <p className="text-xs text-gray-500">Footer or mid-page call to action banner.</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Image Picker Modal */}
            {showStockPicker && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Select Stock Image</h3>
                            <button onClick={() => setShowStockPicker(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-4">
                            {STOCK_IMAGES.map((img) => (
                                <button
                                    key={img.id}
                                    onClick={() => handleStockSelect(showStockPicker, img.url)}
                                    className="group relative aspect-video rounded-xl overflow-hidden hover:ring-2 hover:ring-primary transition"
                                >
                                    <img src={img.url} alt={img.label} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                        <span className="text-white font-bold text-sm">{img.label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title="Remove Section"
                message="Are you sure you want to remove this section? This action cannot be undone."
                confirmText="Remove"
                type="danger"
            />

            {/* Custom Navigation Confirmation Modal */}
            {!!navTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setNavTarget(null)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 animate-in fade-in zoom-in-95">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Unsaved Changes</h3>
                            <p className="text-gray-600">You have unsaved changes. Would you like to save them before leaving?</p>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <button
                                onClick={() => setNavTarget(null)}
                                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition whitespace-nowrap"
                            >
                                Back
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={confirmNavigate}
                                    className="px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl transition whitespace-nowrap"
                                >
                                    Leave without Saving
                                </button>
                                <button
                                    onClick={handleSaveAndNavigate}
                                    disabled={saving}
                                    className="px-6 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary-700 transition flex items-center gap-2 shadow-lg shadow-primary/30 whitespace-nowrap"
                                >
                                    {saving ? 'Saving...' : 'Save & Continue'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
