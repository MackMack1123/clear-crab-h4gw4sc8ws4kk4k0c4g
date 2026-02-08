import React from 'react';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';
import { Loader2 } from 'lucide-react';

export default function SquarePaymentForm({ amount, onSubmit, loading, locationId: locationIdProp }) {
    const appId = import.meta.env.VITE_SQUARE_APP_ID;
    const locationId = locationIdProp || import.meta.env.VITE_SQUARE_LOCATION_ID;

    if (!appId || !locationId) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                Square Configuration Missing. Please check VITE_SQUARE_APP_ID and VITE_SQUARE_LOCATION_ID.
            </div>
        );
    }

    return (
        <div className="payment-form-container">
            <PaymentForm
                applicationId={appId}
                locationId={locationId}
                cardTokenizeResponseReceived={async (token, buyer) => {
                    await onSubmit(token.token);
                }}
            >
                <CreditCard
                    buttonProps={{
                        css: {
                            backgroundColor: '#6366f1',
                            fontSize: '14px',
                            color: '#fff',
                            '&:hover': {
                                backgroundColor: '#4f46e5',
                            },
                        },
                    }}
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                        </div>
                    ) : (
                        `Pay $${amount.toFixed(2)}`
                    )}
                </CreditCard>
            </PaymentForm>
        </div>
    );
}
