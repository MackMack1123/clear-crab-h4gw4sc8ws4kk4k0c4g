const nodemailer = require('nodemailer');

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

const emailService = {
    /**
     * Send a transactional email using an organization's template fallback
     * @param {Object} organization - The organization User object (with emailTemplates)
     * @param {string} type - 'receipt' | 'welcome'
     * @param {string} toEmail - Recipient email
     * @param {Object} variables - Variables for replacement (orgName, donorName, amount, etc.)
     */
    sendTemplateEmail: async (organization, type, toEmail, variables) => {
        try {
            const orgProfile = organization.organizationProfile || {};
            const orgName = orgProfile.orgName || 'Fundraisr App';
            const fromName = orgName;

            // Get Template (or defaults if missing/disabled? Actually schema defaults handle missing strings, but we should check enabled status)
            // Note: Schema defaults are only applied if the sub-document exists.

            let template = orgProfile.emailTemplates?.[type];

            // Fallback system defaults if org template is missing/disabled (Optional: User might want to disable sending entirely?)
            // Assuming if enabled=false, we DO NOT send.
            if (template && template.enabled === false) {
                console.log(`Email type '${type}' is disabled for org ${organization.slug}`);
                return false;
            }

            // Fallback defaults if template object is missing (but we want to send)
            if (!template) {
                template = {
                    subject: type === 'receipt' ? 'Receipt for your donation' : 'Welcome!',
                    body: type === 'receipt' ? '<p>Thank you for your donation.</p>' : '<p>Welcome!</p>'
                };
            }

            // Merge system variables
            const vars = {
                orgName,
                companyName: 'Fundraisr',
                baseUrl: process.env.FRONTEND_URL || 'https://getfundraisr.io',
                ...variables
            };

            const subject = replaceVariables(template.subject, vars);
            const htmlBody = replaceVariables(template.body, vars);

            // Construct Email
            const mailOptions = {
                from: `"${fromName}" <${process.env.MXROUTE_USER}>`, // "Org Name" <no-reply@getfundraisr.io>
                to: toEmail,
                subject: subject,
                html: htmlBody,
                sender: process.env.MXROUTE_USER,
                replyTo: orgProfile.contactEmail || process.env.MXROUTE_USER
            };

            // Send
            const info = await transporter.sendMail(mailOptions);
            console.log(`Email sent: ${info.messageId}`);
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
