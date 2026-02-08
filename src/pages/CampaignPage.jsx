import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { campaignService } from '../services/campaignService';
import { sellerService } from '../services/sellerService';
import { transactionService } from '../services/transactionService';
import { userService } from '../services/userService';
import HeroSection from '../components/public/HeroSection';
import FundraiserView from '../components/public/FundraiserView';
import ContributionGrid from '../components/public/ContributionGrid';
import PaymentModal from '../components/public/PaymentModal';
import { Loader2 } from 'lucide-react';

export default function CampaignPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sellerIdParam = searchParams.get('ref');

    const [campaign, setCampaign] = useState(null);
    const [sellers, setSellers] = useState([]);
    const [selectedSellerId, setSelectedSellerId] = useState(sellerIdParam || '');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [pendingTransaction, setPendingTransaction] = useState(null); // { amount, quantity, type, selectedBlocks }

    useEffect(() => {
        async function loadCampaign() {
            try {
                console.log("CampaignService Object:", campaignService);
                const camp = await campaignService.fetchCampaignById(id);
                if (!camp) {
                    setError("Campaign not found.");
                    return;
                }
                setCampaign(camp);

                // Load sellers
                const roster = await sellerService.fetchSellersForCampaign(id);
                setSellers(roster);

                // If ref param exists, validate it
                if (sellerIdParam) {
                    const sellerExists = roster.find(s => s.id === sellerIdParam);
                    if (sellerExists) {
                        setSelectedSellerId(sellerIdParam);
                    }
                }

            } catch (err) {
                console.error("Error loading campaign:", err);
                setError("Failed to load campaign.");
            } finally {
                setLoading(false);
            }
        }
        loadCampaign();
    }, [id, sellerIdParam]);

    const handleCheckoutStart = (quantity, totalAmount, selectedBlocks = []) => {
        setPendingTransaction({
            quantity,
            amount: totalAmount,
            selectedBlocks
        });
        setIsPaymentModalOpen(true);
    };

    const handleVenmoConfirm = async (paymentData) => {
        // paymentData: { baseAmount, processingFee, tipAmount, totalAmount, paypalOrderId, payerId, details }
        try {
            // 1. Record Transaction
            const transactionId = await transactionService.createTransaction({
                campaignId: campaign.id,
                sellerId: selectedSellerId || null,
                type: campaign.type === '5050' ? 'fundraiser_entry' : 'grid_contribution', // Updated types
                quantity: pendingTransaction.quantity,
                amount: paymentData.baseAmount,
                tipAmount: paymentData.tipAmount,
                processingFee: paymentData.processingFee,
                totalAmount: paymentData.totalAmount,
                paymentMethod: 'paypal_venmo',
                paypalOrderId: paymentData.paypalOrderId,
                payerId: paymentData.payerId,
                paypalDetails: paymentData.details,
                selectedBlocks: pendingTransaction.selectedBlocks,
                timestamp: new Date()
            });

            // 2. Close Modal & Navigate to Thank You
            setIsPaymentModalOpen(false);

            // Find seller name if applicable
            const sellerName = sellers.find(s => s.id === selectedSellerId)?.name;

            navigate('/thank-you', {
                state: {
                    transaction: {
                        id: transactionId,
                        campaignId: campaign.id,
                        totalAmount: paymentData.totalAmount,
                        quantity: pendingTransaction.quantity,
                        sellerName: sellerName
                    }
                }
            });
        } catch (err) {
            console.error("Transaction error:", err);
            alert("Failed to record contribution. Please contact support.");
        }
    };

    const handleStripeStart = async (paymentData) => {
        try {
            // 1. Record Transaction (Mocking Stripe success for now)
            const transactionId = await transactionService.createTransaction({
                campaignId: campaign.id,
                sellerId: selectedSellerId || null,
                type: campaign.type === '5050' ? 'fundraiser_entry' : 'grid_contribution',
                quantity: pendingTransaction.quantity,
                amount: paymentData.baseAmount,
                tipAmount: paymentData.tipAmount,
                processingFee: paymentData.processingFee,
                totalAmount: paymentData.totalAmount,
                paymentMethod: 'stripe_card', // Distinguish method
                paypalOrderId: null,
                payerId: null,
                paypalDetails: null,
                selectedBlocks: pendingTransaction.selectedBlocks,
                timestamp: new Date()
            });

            // 2. Close Modal & Navigate
            setIsPaymentModalOpen(false);

            // Find seller name if applicable
            const sellerName = sellers.find(s => s.id === selectedSellerId)?.name;

            navigate('/thank-you', {
                state: {
                    transaction: {
                        id: transactionId,
                        campaignId: campaign.id,
                        totalAmount: paymentData.totalAmount,
                        quantity: pendingTransaction.quantity,
                        sellerName: sellerName
                    }
                }
            });
        } catch (err) {
            console.error("Transaction error:", err);
            alert("Failed to record contribution. Please contact support.");
        }
    };

    if (loading) return <div className="p-10 text-center">Loading campaign...</div>;
    if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-3xl mx-auto p-4">
                <HeroSection
                    campaign={campaign}
                    sellers={sellers}
                    selectedSellerId={selectedSellerId}
                    onSellerChange={setSelectedSellerId}
                />

                {/* Game Component */}
                {campaign.type === '5050' ? (
                    <FundraiserView campaign={campaign} onCheckout={handleCheckoutStart} />
                ) : (
                    <ContributionGrid campaign={campaign} onCheckout={handleCheckoutStart} />
                )}

                {/* Branding Footer */}
                <div className="mt-12 mb-6 text-center">
                    <a href="/" target="_blank" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-300 group">
                        <span className="text-xs font-medium text-gray-500">Powered by</span>
                        <div className="w-5 h-5 bg-gray-900 rounded flex items-center justify-center text-white font-bold text-[10px]">F</div>
                        <span className="font-bold text-gray-900 text-sm tracking-tight">Fundraisr</span>
                    </a>
                </div>
            </div>

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                baseAmount={pendingTransaction?.amount || 0}
                onVenmoConfirm={handleVenmoConfirm}
                onStripeStart={handleStripeStart}
            />
        </div>
    );
}
