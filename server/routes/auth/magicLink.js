const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const admin = require('../../firebaseAdmin');
const MagicLinkToken = require('../../models/MagicLinkToken');
const User = require('../../models/User');
const emailService = require('../../services/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Branded email HTML wrapper
const buildEmailHtml = (title, body) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 40px 30px; font-size: 16px; }
        .button { display: inline-block; padding: 14px 28px; background-color: #7c3aed; color: white !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #f0f0f0; }
        .footer a { color: #7c3aed; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
        </div>
        <div class="content">
            ${body}
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Fundraisr. All rights reserved.</p>
            <p><a href="${FRONTEND_URL}">getfundraisr.io</a></p>
        </div>
    </div>
</body>
</html>`;

// POST /send — Send magic link email
router.post('/send', async (req, res) => {
    try {
        const { email, role } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const normalizedEmail = email.toLowerCase().trim();
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await MagicLinkToken.create({
            token,
            email: normalizedEmail,
            role: role || 'organizer',
            expiresAt
        });

        const magicLink = `${FRONTEND_URL}/auth/magic-link/verify?token=${token}`;

        const html = buildEmailHtml('Sign In to Fundraisr', `
            <p>Hi there,</p>
            <p>Click the button below to sign in to your Fundraisr account. This link expires in 15 minutes.</p>
            <p style="text-align: center;">
                <a href="${magicLink}" class="button">Sign In to Fundraisr</a>
            </p>
            <p style="font-size: 14px; color: #666;">If you didn't request this link, you can safely ignore this email.</p>
            <p style="font-size: 12px; color: #999; word-break: break-all;">Or copy this link: ${magicLink}</p>
        `);

        await emailService.sendRawEmail(normalizedEmail, 'Sign in to Fundraisr', html);

        // Always return success to prevent email enumeration
        res.json({ message: 'If an account exists, a sign-in link has been sent.' });
    } catch (error) {
        console.error('Magic link send error:', error);
        // Still return success to prevent enumeration
        res.json({ message: 'If an account exists, a sign-in link has been sent.' });
    }
});

// POST /verify — Verify magic link token
router.post('/verify', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token is required' });

        const record = await MagicLinkToken.findOne({ token });

        if (!record) {
            return res.status(400).json({ error: 'Invalid or expired link.' });
        }
        if (record.used) {
            return res.status(400).json({ error: 'This link has already been used.' });
        }
        if (record.expiresAt < new Date()) {
            return res.status(400).json({ error: 'This link has expired. Please request a new one.' });
        }

        // Mark as used
        record.used = true;
        record.usedAt = new Date();
        await record.save();

        const email = record.email;
        let isNewUser = false;
        let uid;

        // Check if Firebase user exists
        try {
            const existingUser = await admin.auth().getUserByEmail(email);
            uid = existingUser.uid;
        } catch (fbError) {
            if (fbError.code === 'auth/user-not-found') {
                // Create new Firebase user
                const newUser = await admin.auth().createUser({
                    email,
                    emailVerified: true
                });
                uid = newUser.uid;
                isNewUser = true;
            } else {
                throw fbError;
            }
        }

        // Ensure MongoDB user record exists
        const existingMongoUser = await User.findById(uid);
        if (!existingMongoUser) {
            await User.create({
                _id: uid,
                email,
                role: record.role || 'organizer',
                roles: [record.role || 'organizer']
            });
            isNewUser = true;
        }

        // Generate custom token for frontend sign-in
        const customToken = await admin.auth().createCustomToken(uid);

        res.json({ customToken, isNewUser });
    } catch (error) {
        console.error('Magic link verify error:', error);
        res.status(500).json({ error: 'Failed to verify link. Please try again.' });
    }
});

// POST /reset-password — Send password reset via MXRoute
router.post('/reset-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const normalizedEmail = email.toLowerCase().trim();

        try {
            const resetLink = await admin.auth().generatePasswordResetLink(normalizedEmail);

            const html = buildEmailHtml('Reset Your Password', `
                <p>Hi there,</p>
                <p>We received a request to reset your Fundraisr password. Click the button below to choose a new password.</p>
                <p style="text-align: center;">
                    <a href="${resetLink}" class="button">Reset Password</a>
                </p>
                <p style="font-size: 14px; color: #666;">This link will expire shortly. If you didn't request a password reset, you can safely ignore this email.</p>
                <p style="font-size: 12px; color: #999; word-break: break-all;">Or copy this link: ${resetLink}</p>
            `);

            await emailService.sendRawEmail(normalizedEmail, 'Reset your Fundraisr password', html);
        } catch (fbError) {
            // If user doesn't exist in Firebase, silently succeed (prevent enumeration)
            console.log('Password reset - user may not exist:', fbError.code || fbError.message);
        }

        // Always return success
        res.json({ message: 'If an account exists, a password reset link has been sent.' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.json({ message: 'If an account exists, a password reset link has been sent.' });
    }
});

module.exports = router;
