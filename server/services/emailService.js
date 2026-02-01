const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

// Initialize Transporter
const transporter = nodemailer.createTransport({
    host: process.env.MXROUTE_SERVER || 'heracles.mxrouting.net',
    port: 465, // SSL
    secure: true,
    auth: {
        user: process.env.MXROUTE_USER || 'no-reply@getfundraisr.io',
        pass: process.env.MXROUTE_PASSWORD // Should be set in env
    }
});

// Template Replacer Helpers
const replaceVariables = (text, variables) => {
    if (!text) return '';
    return text.replace(/{{([\w]+)}}/g, (match, key) => {
        return variables[key] !== undefined ? variables[key] : match;
    });
};

// Helper: Wrap content in branded HTML template
const wrapEmailBody = (content, orgProfile) => {
    const primaryColor = orgProfile.primaryColor || '#000000';
    const logoUrl = orgProfile.logoUrl;
    const orgName = orgProfile.orgName || 'Fundraisr';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { background-color: #ffffff; padding: 30px; text-align: center; border-bottom: 1px solid #f0f0f0; }
            .logo { max-height: 60px; max-width: 200px; }
            .content { padding: 40px 30px; font-size: 16px; }
            .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #f0f0f0; }
            a.button { display: inline-block; padding: 12px 24px; background-color: ${primaryColor}; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" class="logo">` : `<h2 style="margin:0; color: ${primaryColor};">${orgName}</h2>`}
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
                <p>Powered by <a href="https://getfundraisr.io" style="color: #888; text-decoration: underline;">Fundraisr</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
};

const emailService = {
    /**
     * Send a transactional email using an organization's template fallback
     * @param {Object} organization - The organization User object (with emailTemplates)
     * @param {string} type - 'sponsorship_confirmation' | 'assets_needed' | 'sponsorship_approved'
     * @param {string} toEmail - Recipient email
     * @param {Object} variables - Variables for replacement (orgName, donorName, amount, etc.)
     */
    sendTemplateEmail: async (organization, type, toEmail, variables) => {
        try {
            const orgProfile = organization.organizationProfile || {};
            const orgName = orgProfile.orgName || 'Fundraisr App';
            const fromName = orgName;

            let template = orgProfile.emailTemplates?.[type];

            // Check if disabled
            if (template && template.enabled === false) {
                console.log(`Email type '${type}' is disabled for org ${organization.slug}`);
                return false;
            }

            // Fallback defaults if template object is missing (handled by schema mostly, but good for safety)
            if (!template) {
                // Map legacy types or potential new ones to hardcoded defaults just in case
                if (type === 'sponsorship_confirmation' || type === 'receipt') {
                    template = { subject: `Confirmation: Your sponsorship for ${orgName}`, body: `<p>Thank you for your generous contribution.</p>` };
                } else if (type === 'assets_needed') {
                    template = { subject: `Action Required: Upload your logo`, body: `<p>Please upload your logo via the portal.</p>` };
                } else if (type === 'sponsorship_approved') {
                    template = { subject: `You are live! Sponsorship approved`, body: `<p>Your sponsorship has been approved.</p>` };
                } else {
                    template = { subject: `Notification from ${orgName}`, body: `<p>You have a new notification.</p>` };
                }
            }

            // Merge system variables
            const vars = {
                orgName,
                primaryColor: orgProfile.primaryColor || '#000000',
                companyName: 'Fundraisr',
                baseUrl: process.env.FRONTEND_URL || 'https://getfundraisr.io',
                ...variables
            };

            const subject = replaceVariables(template.subject, vars);
            // Replace vars in body FIRST, then wrap it
            let htmlBody = replaceVariables(template.body, vars);
            htmlBody = wrapEmailBody(htmlBody, orgProfile);

            // Construct Email
            const mailOptions = {
                from: `"${fromName}" <${process.env.MXROUTE_USER}>`, // "Org Name" <no-reply@getfundraisr.io>
                to: toEmail,
                subject: subject,
                html: htmlBody,
                sender: process.env.MXROUTE_USER,
                replyTo: orgProfile.contactEmail || organization.email || process.env.MXROUTE_USER
            };

            // Send
            const info = await transporter.sendMail(mailOptions);
            console.log(`Email sent: ${info.messageId}`);

            // Log to Database (Async, don't block return)
            try {
                await EmailLog.create({
                    userId: organization._id || organization.id,
                    toEmail: toEmail,
                    type: type,
                    subject: subject,
                    htmlBody: htmlBody,
                    sentAt: new Date(),
                    status: 'sent'
                });
            } catch (logError) {
                console.error('Failed to log email:', logError);
                // Don't fail the request if logging fails, but maybe alert
            }

            return true;

        } catch (error) {
            console.error('Email Service Error:', error);
            throw error;
        }
    },

    // Simple raw send for testing/admin
    sendRawEmail: async (to, subject, html) => {
        try {
            await transporter.sendMail({
                from: `"Fundraisr Admin" <${process.env.MXROUTE_USER}>`,
                to,
                subject,
                html
            });
            return true;
        } catch (error) {
            console.error('Raw Email Error:', error);
            throw error;
        }
    }
};

module.exports = emailService;
