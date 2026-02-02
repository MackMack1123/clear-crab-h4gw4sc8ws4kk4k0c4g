import React from "react";
import { useLocation, Link } from "react-router-dom";
import { CheckCircle, ArrowRight, Home, Trophy } from "lucide-react";

export default function ThankYou() {
  const location = useLocation();
  const state = location.state || {};

  // Support both campaign transactions and sponsorship submissions
  const { transaction, type, title, message, sponsorshipIds } = state;
  const isSponsorship = type === "sponsorship";

  // No valid state - show not found
  if (!transaction && !isSponsorship) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h1>
          <p className="text-gray-500 mb-8">
            It looks like you wandered here by accident.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-700 transition"
          >
            <Home className="w-5 h-5" /> Go Home
          </Link>
        </div>
      </div>
    );
  }

  // Sponsorship Thank You (after ad submission or checkout)
  if (isSponsorship) {
    const hasNewSponsorships = sponsorshipIds && sponsorshipIds.length > 0;
    const firstSponsorshipId = hasNewSponsorships ? sponsorshipIds[0] : null;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-lg w-full text-center border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500"></div>

          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
            <CheckCircle className="w-10 h-10" />
          </div>

          <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title || "Thank You!"}
          </h1>
          <p className="text-gray-600 text-lg mb-8">
            {message || "Your sponsorship has been processed successfully."}
          </p>

          <div className="space-y-3">
            {/* Show "Design Your Ad" button if we have sponsorship IDs from checkout */}
            {hasNewSponsorships && (
              <Link
                to={`/sponsorship/fulfilment/${firstSponsorshipId}`}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary-700 transition shadow-lg shadow-primary/20 hover:-translate-y-0.5"
              >
                Design Your Ad <ArrowRight className="w-5 h-5" />
              </Link>
            )}
            <Link
              to="/sponsor/dashboard"
              className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-lg transition ${
                hasNewSponsorships
                  ? "bg-white border-2 border-gray-200 text-gray-700 hover:border-primary hover:text-primary"
                  : "bg-primary text-white hover:bg-primary-700 shadow-lg shadow-primary/20 hover:-translate-y-0.5"
              }`}
            >
              Go to Dashboard <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/"
              className="text-gray-500 font-bold text-sm hover:text-gray-900 transition block"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Campaign Transaction Thank You (original behavior)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-lg w-full text-center border border-gray-100 relative overflow-hidden">
        {/* Confetti/Decoration Background */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500"></div>

        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
          <CheckCircle className="w-10 h-10" />
        </div>

        <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Thank You!
        </h1>
        <p className="text-gray-600 text-lg mb-8">
          Your contribution has been received. Good luck!
        </p>

        <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left space-y-4 border border-gray-100">
          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
            <span className="text-gray-500 font-medium">Total Amount</span>
            <span className="text-xl font-bold text-gray-900">
              ${transaction.totalAmount}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Quantity</span>
            <span className="font-semibold text-gray-900">
              {transaction.quantity} Entries
            </span>
          </div>
          {transaction.sellerName && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Supporting</span>
              <span className="font-semibold text-primary bg-primary/5 px-3 py-1 rounded-lg">
                {transaction.sellerName}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs text-gray-400 pt-2">
            <span>Order ID</span>
            <span className="font-mono">
              {transaction.id?.slice(0, 8) || "Processing..."}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            to={`/campaign/${transaction.campaignId}`}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary-700 transition shadow-lg shadow-primary/20 hover:-translate-y-0.5"
          >
            Back to Campaign <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-gray-400 mt-4">
            A receipt has been sent to your email.
          </p>
        </div>
      </div>
    </div>
  );
}
