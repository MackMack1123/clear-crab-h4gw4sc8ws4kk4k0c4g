const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const admin = require('../../firebaseAdmin');
const MagicLinkToken = require('../../models/MagicLinkToken');
const User = require('../../models/User');
const emailService = require('../../services/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Table-based email template for Gmail/Outlook compatibility
const buildEmailHtml = (title, body) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
        <tr><td align="center" style="padding:32px 16px;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                <!-- Logo -->
                <tr>
                    <td align="center" style="padding:32px 24px 16px;">
                        <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="background-color:#7c3aed;width:40px;height:40px;border-radius:10px;text-align:center;vertical-align:middle;color:#ffffff;font-weight:bold;font-size:20px;font-family:Arial,sans-serif;">F</td>
                                <td style="padding-left:10px;font-size:20px;font-weight:bold;color:#1e293b;font-family:Arial,sans-serif;">Fundraisr</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <!-- Title -->
                <tr>
                    <td align="center" style="padding:8px 40px 24px;">
                        <h1 style="margin:0;font-size:24px;font-weight:bold;color:#1e293b;font-family:Arial,sans-serif;">${title}</h1>
                    </td>
                </tr>
                <!-- Divider -->
                <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td></tr>
                <!-- Content -->
                <tr>
                    <td style="padding:32px 40px;font-size:16px;line-height:1.6;color:#374151;font-family:Arial,sans-serif;">
                        ${body}
                    </td>
                </tr>
                <!-- Footer -->
                <tr>
                    <td style="padding:24px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
                        <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;">&copy; ${new Date().getFullYear()} Fundraisr. All rights reserved.</p>
                        <p style="margin:0;font-size:12px;font-family:Arial,sans-serif;"><a href="${FRONTEND_URL}" style="color:#7c3aed;text-decoration:none;">getfundraisr.io</a></p>
                    </td>
                </tr>
            </table>
        </td></tr>
    </table>
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
            <p style="margin:0 0 16px;">Hi there,</p>
            <p style="margin:0 0 24px;">Click the button below to sign in to your Fundraisr account. This link expires in 15 minutes.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center" style="padding:8px 0 24px;">
                    <a href="${magicLink}" style="display:inline-block;padding:14px 32px;background-color:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;font-family:Arial,sans-serif;">Sign In to Fundraisr</a>
                </td></tr>
            </table>
            <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">If you didn't request this link, you can safely ignore this email.</p>
            <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all;">Or copy this link: ${magicLink}</p>
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
        if (!admin.apps.length) {
            console.error('Magic link verify: Firebase Admin SDK not initialized');
            return res.status(500).json({ error: 'Server configuration error. Please contact support.' });
        }

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
        console.error('Magic link verify error:', error.code || error.message, error.stack);
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
                <p style="margin:0 0 16px;">Hi there,</p>
                <p style="margin:0 0 24px;">We received a request to reset your Fundraisr password. Click the button below to choose a new password.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr><td align="center" style="padding:8px 0 24px;">
                        <a href="${resetLink}" style="display:inline-block;padding:14px 32px;background-color:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;font-family:Arial,sans-serif;">Reset Password</a>
                    </td></tr>
                </table>
                <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">This link will expire shortly. If you didn't request a password reset, you can safely ignore this email.</p>
                <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all;">Or copy this link: ${resetLink}</p>
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
