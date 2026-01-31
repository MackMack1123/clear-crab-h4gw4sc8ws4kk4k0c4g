import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { sponsorshipService } from '../../../services/sponsorshipService';
import { Plus, Edit2, Trash2, Check, X, Upload, Image as ImageIcon, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../../common/ConfirmModal';
import { API_BASE_URL } from '../../../config';

export default function ManagePackages() {
    const { currentUser } = useAuth();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPackage, setCurrentPackage] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        features: [''],
        imageUrl: '',
        signPreviewImages: [] // { url, name }
    });
    const [uploading, setUploading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null); // Package to delete

    useEffect(() => {
        if (currentUser) {
            loadPackages();
        }
    }, [currentUser]);

    const loadPackages = async () => {
        setLoading(true);
        try {
            const data = await sponsorshipService.getPackages(currentUser.uid);
            setPackages(data);
        } catch (error) {
            console.error("Error loading packages:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFeatureChange = (index, value) => {
        const newFeatures = [...formData.features];
        newFeatures[index] = value;
        setFormData({ ...formData, features: newFeatures });
    };

    const addFeature = () => {
        setFormData({ ...formData, features: [...formData.features, ''] });
    };

    const removeFeature = (index) => {
        const newFeatures = formData.features.filter((_, i) => i !== index);
        setFormData({ ...formData, features: newFeatures });
    };

    const handleImageUpload = async (file) => {
        if (!file) return;

        setUploading(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);
            formDataUpload.append('userId', currentUser.uid);

            const response = await fetch(`${API_BASE_URL}/api/upload`, {

                method: 'POST',
                body: formDataUpload
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            setFormData(prev => ({ ...prev, imageUrl: data.url }));
            toast.success("Image uploaded");
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleSignPreviewUpload = async (file) => {
        if (!file) return;

        setUploading(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);
            formDataUpload.append('userId', currentUser.uid);

            const response = await fetch(`${API_BASE_URL}/api/upload`, {

                method: 'POST',
                body: formDataUpload
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            setFormData(prev => ({
                ...prev,
                signPreviewImages: [
                    ...prev.signPreviewImages,
                    { url: data.url, name: '', placementZone: { x: 10, y: 60, width: 80, height: 30 } }
                ]
            }));
            toast.success("Sign location image uploaded");
        } catch (error) {
            console.error("Error uploading sign preview:", error);
            toast.error("Failed to upload sign preview image");
        } finally {
            setUploading(false);
        }
    };

    const removeSignPreviewImage = (index) => {
        setFormData(prev => ({
            ...prev,
            signPreviewImages: prev.signPreviewImages.filter((_, i) => i !== index)
        }));
    };

    const updateSignPreviewName = (index, name) => {
        const updated = [...formData.signPreviewImages];
        updated[index] = { ...updated[index], name };
        setFormData(prev => ({ ...prev, signPreviewImages: updated }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSave = {
                title: formData.title,
                description: formData.description,
                price: parseFloat(formData.price),
                features: formData.features.filter(f => f.trim() !== ''),
                imageUrl: formData.imageUrl || '',
                signPreviewImages: formData.signPreviewImages || []
            };

            if (currentPackage) {
                await sponsorshipService.updatePackage(currentPackage.id, dataToSave);
            } else {
                await sponsorshipService.createPackage(currentUser.uid, dataToSave);
            }
            setIsEditing(false);
            setCurrentPackage(null);
            setFormData({ title: '', description: '', price: '', features: [''], imageUrl: '', signPreviewImages: [] });
            loadPackages();
            toast.success("Package saved successfully!");
        } catch (error) {
            console.error("Error saving package:", error);
            toast.error("Failed to save package");
        }
    };

    const startEdit = (pkg) => {
        setCurrentPackage(pkg);
        setFormData({
            title: pkg.title,
            description: pkg.description,
            price: pkg.price,
            features: pkg.features || [''],
            imageUrl: pkg.imageUrl || '',
            signPreviewImages: pkg.signPreviewImages || []
        });
        setIsEditing(true);
    };

    const toggleActive = async (pkg) => {
        try {
            await sponsorshipService.updatePackage(pkg.id, { active: !pkg.active });
            toast.success(pkg.active ? 'Package marked as inactive' : 'Package marked as active');
            loadPackages();
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update package status");
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await sponsorshipService.deletePackage(deleteTarget.id);
            toast.success('Package deleted');
            loadPackages();
        } catch (error) {
            console.error("Error deleting package:", error);
            toast.error("Failed to delete package");
        } finally {
            setDeleteTarget(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Sponsorship Packages</h2>
                {!isEditing && (
                    <button
                        onClick={() => {
                            setCurrentPackage(null);
                            setFormData({ title: '', description: '', price: '', features: [''], imageUrl: '' });
                            setIsEditing(true);
                        }}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
                    >
                        <Plus className="w-4 h-4" /> Add Package
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft">
                    <h3 className="text-lg font-bold mb-4">{currentPackage ? 'Edit Package' : 'New Package'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Package Title</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Gold Sponsor"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                rows="3"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Main benefits of this package..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Package Image (Optional)</label>
                            <div className="flex items-center gap-4">
                                {formData.imageUrl && (
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                    {uploading ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4 text-gray-500" />}
                                    <span className="text-sm font-medium text-gray-700">{uploading ? "Uploading..." : "Upload Image"}</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => handleImageUpload(e.target.files[0])}
                                    />
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                placeholder="500.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
                            {formData.features.map((feature, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                        value={feature}
                                        onChange={e => handleFeatureChange(index, e.target.value)}
                                        placeholder="Feature detail (e.g. Logo on banner)"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeFeature(index)}
                                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addFeature}
                                className="text-sm text-primary font-bold hover:underline"
                            >
                                + Add Feature
                            </button>
                        </div>

                        {/* Sign Preview Images */}
                        <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-blue-600" />
                                <label className="text-sm font-bold text-blue-900">Sign Location Preview Images</label>
                            </div>
                            <p className="text-xs text-blue-700">
                                Upload photos of where sponsors' signs will be displayed. Sponsors can preview how their logo will look!
                            </p>

                            {formData.signPreviewImages?.map((img, index) => (
                                <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-blue-200">
                                    <img src={img.url} alt="Preview" className="w-16 h-12 object-cover rounded" />
                                    <input
                                        type="text"
                                        placeholder="Location name (e.g. Outfield Banner)"
                                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200"
                                        value={img.name}
                                        onChange={(e) => updateSignPreviewName(index, e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeSignPreviewImage(index)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition text-sm font-bold">
                                <Upload className="w-4 h-4" />
                                {uploading ? "Uploading..." : "Add Sign Location Photo"}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleSignPreviewUpload(e.target.files[0])}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition font-bold"
                            >
                                Save Package
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loading ? (
                        <p className="text-gray-500">Loading packages...</p>
                    ) : packages.length === 0 ? (
                        <div className="col-span-full text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-500">No packages created yet.</p>
                        </div>
                    ) : (
                        packages.map(pkg => (
                            <div key={pkg.id} className={`bg-white p-6 rounded-2xl border ${pkg.active ? 'border-gray-100' : 'border-gray-200 opacity-75'} shadow-sm relative group`}>
                                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                    <button
                                        onClick={() => startEdit(pkg)}
                                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg"
                                        title="Edit package"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(pkg)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                        title="Delete package"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-gray-900">{pkg.title}</h3>
                                    <span className="font-heading font-bold text-xl text-primary">${pkg.price}</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">{pkg.description}</p>
                                <ul className="space-y-1 mb-4">
                                    {pkg.features?.map((f, i) => (
                                        <li key={i} className="text-xs text-gray-500 flex items-center gap-2">
                                            <Check className="w-3 h-3 text-green-500" /> {f}
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleActive(pkg)}
                                        className={`text-xs font-bold px-3 py-1 rounded-full border ${pkg.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                                    >
                                        {pkg.active ? 'Active' : 'Inactive'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title="Delete Package"
                message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}
