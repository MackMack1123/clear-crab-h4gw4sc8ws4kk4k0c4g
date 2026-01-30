import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AdminRoute({ children }) {
    const { currentUser, userProfile, isAdmin, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    if (!currentUser || !isAdmin) {
        // Redirect to dashboard if logged in but not admin, or login if not logged in
        return <Navigate to={currentUser ? "/dashboard" : "/login"} />;
    }

    return children;
}
