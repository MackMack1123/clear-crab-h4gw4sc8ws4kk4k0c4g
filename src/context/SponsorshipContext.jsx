import React, { createContext, useContext, useState, useEffect } from 'react';
import { systemService } from '../services/systemService';
import { userService } from '../services/userService';
import { trackAddToCart } from '../hooks/usePageTracking';

const SponsorshipContext = createContext();

export function useSponsorship() {
    return useContext(SponsorshipContext);
}

export function SponsorshipProvider({ children }) {
    const [cart, setCart] = useState(() => {
        try {
            const local = localStorage.getItem('sponsorship_cart');
            return local ? JSON.parse(local) : [];
        } catch (e) {
            return [];
        }
    });

    // Fresh organizer data (fetched to ensure fee waiver status is current)
    const [freshOrganizerData, setFreshOrganizerData] = useState(null);

    // System settings for fee rates
    const [feeSettings, setFeeSettings] = useState({
        platformFeePercent: 5,
        processingFeePercent: 2.9,
        processingFeeFixed: 0.30
    });

    // Fetch system settings on mount
    useEffect(() => {
        systemService.getSettings().then(settings => {
            if (settings?.fees) {
                setFeeSettings(settings.fees);
            }
        }).catch(err => console.error('Failed to load fee settings:', err));
    }, []);

    // Fetch fresh organizer data when cart has items (to get current fee waiver status)
    useEffect(() => {
        const fetchFreshOrganizerData = async () => {
            if (cart.length > 0) {
                // Get organizer ID from cart - try _id first, then organizerId from package
                const organizerId = cart[0].organizerData?._id || cart[0].organizerId;
                if (organizerId) {
                    try {
                        const freshData = await userService.getUser(organizerId);
                        setFreshOrganizerData(freshData);
                    } catch (err) {
                        console.error('Failed to fetch fresh organizer data:', err);
                        // Fall back to snapshot data
                        setFreshOrganizerData(null);
                    }
                }
            } else {
                setFreshOrganizerData(null);
            }
        };
        fetchFreshOrganizerData();
    }, [cart]);

    useEffect(() => {
        localStorage.setItem('sponsorship_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (pkg, organizerData) => {
        setCart(prev => {
            if (prev.find(item => item.id === pkg.id)) return prev;
            // Track add-to-cart event with package info
            trackAddToCart(pkg.organizerId, pkg);
            // Attach organizer data snapshot to the item for easier display
            return [...prev, { ...pkg, organizerData }];
        });
    };

    const removeFromCart = (packageId) => {
        setCart(prev => prev.filter(item => item.id !== packageId));
    };

    const clearCart = () => {
        setCart([]);
    };

    const [coverFees, setCoverFees] = useState(false);

    // Use fresh organizer data for fee waiver status (falls back to cart snapshot)
    const organizer = freshOrganizerData || (cart.length > 0 ? cart[0].organizerData : null);
    const feesWaived = organizer?.organizationProfile?.waiveFees === true;

    const cartSubtotal = cart.reduce((acc, item) => acc + (Number(item.price) || 0), 0);

    // Fee Rates from system settings (convert percentages to decimals)
    const PLATFORM_RATE = feeSettings.platformFeePercent / 100;
    const PROC_RATE = feeSettings.processingFeePercent / 100;
    const PROC_FIXED = feeSettings.processingFeeFixed;

    // Calculate Raw Fees
    const rawPlatformFee = cartSubtotal * PLATFORM_RATE;
    const rawProcessingFee = (cartSubtotal * PROC_RATE) + (cartSubtotal > 0 ? PROC_FIXED : 0);

    // Determines what the user actually pays
    // If feesWaived is true, platformFee is effectively 0 for the user
    const applicablePlatformFee = feesWaived ? 0 : rawPlatformFee;

    // Total fees to be added if user chooses to cover them
    const totalFees = applicablePlatformFee + rawProcessingFee;

    // Final calculations based on coverage selection
    const processingFee = rawProcessingFee; // Exported for display
    const platformFee = applicablePlatformFee; // Exported for display (0 if waived)
    const originalPlatformFee = rawPlatformFee; // Exported to show "was $X" if waived

    const cartTotal = coverFees
        ? (cartSubtotal + platformFee + processingFee)
        : cartSubtotal;

    const toggleCoverFees = () => setCoverFees(prev => !prev);

    const value = {
        cart,
        addToCart,
        removeFromCart,
        clearCart,

        cartSubtotal,
        processingFee, // The calculated processing fee amount
        platformFee,   // The applicable platform fee (0 if waived)
        originalPlatformFee, // The original platform fee value (for display when waived)
        coverFees,
        toggleCoverFees,
        cartTotal,
        feesWaived,
        feeSettings // Expose fee settings for display (e.g., "5% platform fee")
    };

    return (
        <SponsorshipContext.Provider value={value}>
            {children}
        </SponsorshipContext.Provider>
    );
}
