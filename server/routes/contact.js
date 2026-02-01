const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Create reusable transporter using MXRoute
const createTransporter = () => {
    return nodemailer.createTransporter({
        host: process.env.MXROUTE_SERVER || 'smtp.gmail.com',
        port: parseInt(process.env.MXROUTE_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.MXROUTE_USER,
            pass: process.env.MXROUTE_PASSWORD
        }
    });
};

// POST /api/contact - Send contact form email
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message, toEmail, orgName } = req.body;

        // Validate required fields
        if (!name || !email || !message || !toEmail) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if MXRoute is configured
        if (!process.env.MXROUTE_USER || !process.env.MXROUTE_PASSWORD) {
            console.warn('SMTP not configured - logging contact request instead');
            console.log('Contact Request:', { name, email, subject, message, toEmail });
            return res.json({
                success: true,
                message: 'Contact request received (email not configured)'
            });
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: `"${name} via Fundraisr" <${process.env.SMTP_USER}>`,
            replyTo: email,
            to: toEmail,
            subject: subject || `New Contact from ${name} - Sponsorship Inquiry`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #1e293b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                        <h2 style="margin: 0;">New Sponsorship Inquiry</h2>
                        <p style="margin: 8px 0 0; opacity: 0.8;">via ${orgName || 'your'} Sponsorship Portal</p>
                    </div>
                    <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
                        <p style="margin: 0 0 16px;"><strong>From:</strong> ${name}</p>
                        <p style="margin: 0 0 16px;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                        ${subject ? `<p style="margin: 0 0 16px;"><strong>Subject:</strong> ${subject}</p>` : ''}
                        <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 16px;">
                            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
                        </div>
                        <p style="margin: 24px 0 0; font-size: 12px; color: #64748b;">
                            Reply directly to this email to respond to ${name}.
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        // Send Auto-Reply to User
        try {
            const autoReplyOptions = {
                from: `"${orgName} (via Fundraisr)" <${process.env.SMTP_USER}>`,
                to: email,
                subject: `We received your message: ${subject || 'Sponsorship Inquiry'}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <h2 style="color: #1e293b;">Thanks for reaching out!</h2>
                        <p>Hi ${name},</p>
                        <p>We've received your message for <strong>${orgName}</strong> regarding "<strong>${subject || 'Sponsorship Inquiry'}</strong>".</p>
                        <p>We'll get back to you as soon as possible.</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;">
                        <p style="color: #64748b; font-size: 14px;">Your message:</p>
                        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-style: italic; color: #475569;">
                            "${message}"
                        </div>
                    </div>
                `
            };
            await transporter.sendMail(autoReplyOptions);
        } catch (autoReplyError) {
            console.error('Failed to send auto-reply:', autoReplyError);
            // Don't fail the main request if auto-reply fails
        }

        res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending contact email:', error);
        res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
});

module.exports = router;
