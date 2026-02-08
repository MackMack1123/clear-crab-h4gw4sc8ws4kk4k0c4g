const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateAndSaveOgImage, ogImageExists } = require('../services/ogImageService');

// Resolve the frontend URL from env
function getFrontendUrl() {
    return (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'https://getfundraisr.io').replace(/\/$/, '');
}

// Resolve the API base URL (for og:image absolute URL)
function getApiBaseUrl(req) {
    if (process.env.API_BASE_URL) return process.env.API_BASE_URL.replace(/\/$/, '');
    return `${req.protocol}://${req.get('host')}`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * GET /s/:slug
 * Serves minimal HTML with OG meta tags for social media crawlers,
 * then instantly redirects browsers to the SPA.
 */
router.get('/:slug', async (req, res) => {
    const { slug } = req.params;
    const frontendUrl = getFrontendUrl();

    try {
        // Look up user by slug (same pattern as GET /api/users/:id)
        const user = await User.findOne({
            $or: [
                { slug },
                { 'organizationProfile.slug': slug }
            ]
        }).lean();

        if (!user) {
            // Not found — redirect to frontend homepage
            return res.redirect(302, frontendUrl);
        }

        const orgProfile = user.organizationProfile || {};
        const orgName = orgProfile.orgName || user.teamName || 'Organization';
        const description = orgProfile.description || `Strengthen community and boost your brand. Browse ${orgName}'s sponsorship packages today!`;
        const pageSlug = orgProfile.slug || user.slug || user._id;
        const spaUrl = `${frontendUrl}/org/${pageSlug}`;
        const apiBase = getApiBaseUrl(req);
        const ogImageUrl = `${apiBase}/og/${encodeURIComponent(pageSlug)}.png`;

        // Generate OG image on first visit if it doesn't exist
        if (!ogImageExists(String(pageSlug))) {
            generateAndSaveOgImage(String(user._id), orgProfile).catch(err => {
                console.error('[Share] OG image generation failed:', err.message);
            });
        }

        // Serve minimal HTML with OG tags
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Support & Grow with ${escapeHtml(orgName)}</title>

<!-- Open Graph -->
<meta property="og:type" content="website"/>
<meta property="og:title" content="${escapeHtml(`Support & Grow with ${orgName}`)}"/>
<meta property="og:description" content="${escapeHtml(description.substring(0, 200))}"/>
<meta property="og:image" content="${escapeHtml(ogImageUrl)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:url" content="${escapeHtml(spaUrl)}"/>

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${escapeHtml(`Support & Grow with ${orgName}`)}"/>
<meta name="twitter:description" content="${escapeHtml(description.substring(0, 200))}"/>
<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}"/>

<!-- Instant redirect for browsers -->
<meta http-equiv="refresh" content="0; url=${escapeHtml(spaUrl)}"/>
<link rel="canonical" href="${escapeHtml(spaUrl)}"/>
</head>
<body>
<p>Redirecting to <a href="${escapeHtml(spaUrl)}">${escapeHtml(orgName)}</a>&hellip;</p>
</body>
</html>`;

        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=300'); // 5 min cache
        res.send(html);
    } catch (err) {
        console.error('[Share] Error:', err.message);
        res.redirect(302, frontendUrl);
    }
});

module.exports = router;
