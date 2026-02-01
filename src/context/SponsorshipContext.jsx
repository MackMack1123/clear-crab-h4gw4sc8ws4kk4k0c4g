import React, { createContext, useContext, useState, useEffect } from 'react';

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

    // We also track the "organizer" context if buying from a specific one
    // But since packages have organizerId, we can infer.

    useEffect(() => {
        localStorage.setItem('sponsorship_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (pkg, organizerData) => {
        setCart(prev => {
            if (prev.find(item => item.id === pkg.id)) return prev;
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

    const organizer = cart.length > 0 ? cart[0].organizerData : null;
    const feesWaived = organizer?.organizationProfile?.waiveFees === true;

    const cartSubtotal = cart.reduce((acc, item) => acc + (Number(item.price) || 0), 0);

    // Fee Constants
    const PLATFORM_RATE = 0.05;
    const PROC_RATE = 0.029;
    const PROC_FIXED = 0.30;

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
        feesWaived
    };

    return (
        <SponsorshipContext.Provider value={value}>
            {children}
        </SponsorshipContext.Provider>
    );
}
