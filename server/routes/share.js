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

// --- Cached SPA index.html (fetched from frontend, short TTL to stay in sync with deploys) ---
let cachedSpaHtml = null;
let spaHtmlFetchedAt = 0;
const SPA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes — short to pick up frontend deploys quickly

async function getSpaHtml() {
    const now = Date.now();
    if (cachedSpaHtml && (now - spaHtmlFetchedAt) < SPA_CACHE_TTL) {
        return cachedSpaHtml;
    }
    try {
        const fetch = (await import('node-fetch')).default;
        const frontendUrl = getFrontendUrl();
        const res = await fetch(`${frontendUrl}/index.html`, { timeout: 5000 });
        if (res.ok) {
            cachedSpaHtml = await res.text();
            spaHtmlFetchedAt = now;
            console.log('[Share] Cached SPA index.html from frontend');
        }
    } catch (err) {
        console.warn('[Share] Failed to fetch SPA index.html:', err.message);
    }
    return cachedSpaHtml;
}

/**
 * Replace OG meta tags in the SPA's index.html with org-specific values.
 * Returns the modified HTML string.
 */
function injectOgTags(spaHtml, { title, description, ogImageUrl, spaUrl }) {
    let html = spaHtml;

    // Replace <title>
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);

    // Replace OG tags
    html = html.replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(title)}"/>`);
    html = html.replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(description)}"/>`);
    html = html.replace(/<meta property="og:image"[^>]*\/?>(?:\s*<meta property="og:image:width"[^>]*\/?>)?(?:\s*<meta property="og:image:height"[^>]*\/?>)?/,
        `<meta property="og:image" content="${escapeHtml(ogImageUrl)}"/>\n<meta property="og:image:width" content="1200"/>\n<meta property="og:image:height" content="630"/>`);
    html = html.replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${escapeHtml(spaUrl)}"/>`);

    // Replace Twitter tags
    html = html.replace(/<meta property="twitter:title"[^>]*>/, `<meta property="twitter:title" content="${escapeHtml(title)}"/>`);
    html = html.replace(/<meta property="twitter:description"[^>]*>/, `<meta property="twitter:description" content="${escapeHtml(description)}"/>`);
    html = html.replace(/<meta property="twitter:image"[^>]*>/, `<meta property="twitter:image" content="${escapeHtml(ogImageUrl)}"/>`);
    html = html.replace(/<meta property="twitter:url"[^>]*>/, `<meta property="twitter:url" content="${escapeHtml(spaUrl)}"/>`);

    // Replace meta name="title" and name="description"
    html = html.replace(/<meta name="title"[^>]*>/, `<meta name="title" content="${escapeHtml(title)}"/>`);
    html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(description)}"/>`);

    return html;
}

/**
 * GET /:slug
 *
 * Mounted on both /s and /org:
 * - /s/:slug  → minimal OG HTML + meta-refresh redirect (for share links)
 * - /org/:slug → SPA index.html with OG tags injected (for direct page visits)
 */
router.get('/:slug', async (req, res) => {
    const { slug } = req.params;
    const frontendUrl = getFrontendUrl();
    const isOrgRoute = req.baseUrl === '/org';

    try {
        const user = await User.findOne({
            $or: [
                { slug },
                { 'organizationProfile.slug': slug }
            ]
        }).lean();

        if (!user) {
            return res.redirect(302, frontendUrl);
        }

        const orgProfile = user.organizationProfile || {};
        const orgName = orgProfile.orgName || user.teamName || 'Organization';
        const description = orgProfile.description || `Strengthen community and boost your brand. Browse ${orgName}'s sponsorship packages today!`;
        const pageSlug = orgProfile.slug || user.slug || user._id;
        const spaUrl = `${frontendUrl}/org/${pageSlug}`;
        const apiBase = getApiBaseUrl(req);
        const ogImageUrl = `${apiBase}/og/${encodeURIComponent(pageSlug)}.png`;
        const title = `Support & Grow with ${orgName}`;

        // Generate OG image on first visit if it doesn't exist
        if (!ogImageExists(String(pageSlug))) {
            generateAndSaveOgImage(String(user._id), orgProfile).catch(err => {
                console.error('[Share] OG image generation failed:', err.message);
            });
        }

        // --- /org/ route: serve SPA HTML with OG tags injected ---
        if (isOrgRoute) {
            const spaHtml = await getSpaHtml();
            if (spaHtml) {
                const html = injectOgTags(spaHtml, { title, description: description.substring(0, 200), ogImageUrl, spaUrl });
                res.set('Content-Type', 'text/html; charset=utf-8');
                res.set('Cache-Control', 'public, max-age=300');
                return res.send(html);
            }
            // Fallback: SPA HTML unavailable — serve OG tags for crawlers + redirect
            // to /s/:slug which meta-refreshes to the SPA (avoids /org/ loop)
            return res.redirect(302, `${getApiBaseUrl(req)}/s/${encodeURIComponent(pageSlug)}`);
        }

        // --- /s/ route: minimal OG HTML + instant redirect ---
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>

<!-- Open Graph -->
<meta property="og:type" content="website"/>
<meta property="og:title" content="${escapeHtml(title)}"/>
<meta property="og:description" content="${escapeHtml(description.substring(0, 200))}"/>
<meta property="og:image" content="${escapeHtml(ogImageUrl)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:url" content="${escapeHtml(spaUrl)}"/>

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${escapeHtml(title)}"/>
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
        res.set('Cache-Control', 'public, max-age=300');
        res.send(html);
    } catch (err) {
        console.error('[Share] Error:', err.message);
        res.redirect(302, frontendUrl);
    }
});

module.exports = router;
