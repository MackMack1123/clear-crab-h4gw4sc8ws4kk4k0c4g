import React, { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight, Home, Trophy, UserPlus, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { userService } from "../services/userService";
import { sponsorshipService } from "../services/sponsorshipService";
import toast from "react-hot-toast";

export default function ThankYou() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  // Support both campaign transactions and sponsorship submissions
  const { transaction, type, title, message, sponsorshipIds, isGuest, sponsorEmail } = state;
  const isSponsorship = type === "sponsorship";

  // Account creation state for guest checkout
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [existingAccount, setExistingAccount] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(false);

  // Check if account already exists when user clicks button
  const handleShowAccountForm = async () => {
    setCheckingAccount(true);
    try {
      const methods = await fetchSignInMethodsForEmail(auth, sponsorEmail);
      if (methods.length > 0) {
        setExistingAccount(true);
      }
    } catch (err) {
      console.warn('Could not check existing account:', err);
    } finally {
      setCheckingAccount(false);
      setShowAccountForm(true);
    }
  };

  // Handle account creation for guest checkout
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!sponsorEmail || !password) {
      toast.error("Please enter a password");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setCreatingAccount(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, sponsorEmail, password);

      await userService.updateUser(userCredential.user.uid, {
        email: sponsorEmail,
        role: 'sponsor',
        roles: ['sponsor']
      });

      await sponsorshipService.linkSponsorshipsToAccount(sponsorEmail, userCredential.user.uid);

      setAccountCreated(true);
      toast.success("Account created! Your sponsorships are now linked.");
    } catch (error) {
      console.error("Account creation error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setExistingAccount(true);
        toast.error("An account with this email already exists. Please sign in below.");
      } else {
        toast.error(error.message || "Failed to create account");
      }
    } finally {
      setCreatingAccount(false);
    }
  };

  // Handle sign-in for existing accounts
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!sponsorEmail || !password) {
      toast.error("Please enter your password");
      return;
    }

    setCreatingAccount(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, sponsorEmail, password);

      await sponsorshipService.linkSponsorshipsToAccount(sponsorEmail, userCredential.user.uid);

      setAccountCreated(true);
      toast.success("Signed in! Your sponsorships are linked.");
    } catch (error) {
      console.error("Sign-in error:", error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error("Incorrect password. Please try again.");
      } else {
        toast.error(error.message || "Failed to sign in");
      }
    } finally {
      setCreatingAccount(false);
    }
  };

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

          {/* Guest Account Creation / Sign-In Option */}
          {isGuest && sponsorEmail && !accountCreated && (
            <div className="mb-6">
              {!showAccountForm ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
                  <div className="flex items-start gap-3">
                    <UserPlus className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold text-blue-800 text-sm">Want to manage your sponsorship?</p>
                      <p className="text-blue-700 text-xs mt-1">
                        Sign in or create a free account to update your ad, view your history, and manage future sponsorships.
                      </p>
                      <button
                        onClick={handleShowAccountForm}
                        disabled={checkingAccount}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {checkingAccount && <Loader2 className="w-4 h-4 animate-spin" />}
                        {checkingAccount ? "Checking..." : "Continue"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : existingAccount ? (
                <form onSubmit={handleSignIn} className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-3">
                  <h3 className="font-bold text-gray-900 text-sm">Welcome Back!</h3>
                  <p className="text-xs text-gray-500">Sign in to link this sponsorship to your account</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      {sponsorEmail}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={creatingAccount}
                      className="flex-1 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2"
                    >
                      {creatingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAccountForm(false); setExistingAccount(false); setPassword(""); }}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCreateAccount} className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-3">
                  <h3 className="font-bold text-gray-900 text-sm">Create Your Account</h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      {sponsorEmail}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Create Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        placeholder="At least 6 characters"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={creatingAccount}
                      className="flex-1 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2"
                    >
                      {creatingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAccountForm(false); setPassword(""); }}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Account Created Success */}
          {accountCreated && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-bold text-sm">Account created successfully!</span>
              </div>
              <p className="text-green-600 text-xs mt-1">You can now access your sponsor dashboard anytime.</p>
            </div>
          )}

          <div className="space-y-3">
            {/* Show "Design Your Ad" button if we have sponsorship IDs from checkout */}
            {hasNewSponsorships && (
              <Link
                to={`/sponsorship/fulfilment/${firstSponsorshipId}`}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary-700 transition shadow-lg shadow-primary/20 hover:-translate-y-0.5"
              >
                Upload Your Logo <ArrowRight className="w-5 h-5" />
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
