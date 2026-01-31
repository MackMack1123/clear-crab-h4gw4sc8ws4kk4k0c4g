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

    const cartSubtotal = cart.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
    const processingFee = coverFees ? (cartSubtotal * 0.05) : 0;
    const cartTotal = cartSubtotal + processingFee;

    const toggleCoverFees = () => setCoverFees(prev => !prev);

    const value = {
        cart,
        addToCart,
        removeFromCart,
        clearCart,

        cartSubtotal,
        processingFee,
        coverFees,
        toggleCoverFees,
        cartTotal
    };

    return (
        <SponsorshipContext.Provider value={value}>
            {children}
        </SponsorshipContext.Provider>
    );
}
