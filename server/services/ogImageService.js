const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OG_DIR = path.join(__dirname, '../public/og');
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// Ensure output directory exists
if (!fs.existsSync(OG_DIR)) {
    fs.mkdirSync(OG_DIR, { recursive: true });
}

/**
 * Darken a hex color by a percentage (0-1)
 */
function darkenColor(hex, amount) {
    hex = hex.replace('#', '');
    const num = parseInt(hex, 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.max(0, Math.round(r * (1 - amount)));
    g = Math.max(0, Math.round(g * (1 - amount)));
    b = Math.max(0, Math.round(b * (1 - amount)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Escape text for safe SVG embedding
 */
function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Truncate text to fit approximately within a width (rough character estimate)
 */
function truncateText(text, maxChars) {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars - 1) + '\u2026';
}

/**
 * Generate a 1200x630 OG image as a PNG Buffer
 */
async function generateOgImage(orgProfile) {
    const primaryColor = orgProfile.primaryColor || '#7c3aed';
    const darkColor = darkenColor(primaryColor, 0.4);
    const orgName = orgProfile.orgName || 'Our Organization';
    const displayName = truncateText(orgName, 30);

    // Build gradient background SVG
    const bgSvg = `
    <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${darkColor};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#bg)" />
      <!-- Subtle pattern overlay -->
      <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="rgba(0,0,0,0.15)" />
    </svg>`;

    // Start compositing with the gradient background
    let pipeline = sharp(Buffer.from(bgSvg)).resize(OG_WIDTH, OG_HEIGHT);

    const composites = [];

    // Try to fetch and composite the org logo
    if (orgProfile.logoUrl) {
        try {
            const logoBuffer = await fetchImage(orgProfile.logoUrl);
            if (logoBuffer) {
                const resizedLogo = await sharp(logoBuffer)
                    .resize(160, 160, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .png()
                    .toBuffer();

                // White circle background for the logo
                const logoBgSvg = `
                <svg width="180" height="180" xmlns="http://www.w3.org/2000/svg">
                  <rect width="180" height="180" rx="24" fill="white" opacity="0.95"/>
                </svg>`;
                const logoBg = await sharp(Buffer.from(logoBgSvg)).png().toBuffer();

                const logoMeta = await sharp(resizedLogo).metadata();
                const logoLeft = Math.round((180 - (logoMeta.width || 160)) / 2);
                const logoTop = Math.round((180 - (logoMeta.height || 160)) / 2);

                composites.push({
                    input: logoBg,
                    top: 140,
                    left: Math.round((OG_WIDTH - 180) / 2),
                });
                composites.push({
                    input: resizedLogo,
                    top: 140 + logoTop,
                    left: Math.round((OG_WIDTH - 180) / 2) + logoLeft,
                });
            }
        } catch (err) {
            console.warn('[OG Image] Failed to fetch logo, continuing without it:', err.message);
        }
    }

    // Text overlay SVG
    const textTopOffset = orgProfile.logoUrl ? 350 : 200;
    const textSvg = `
    <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <text x="${OG_WIDTH / 2}" y="${textTopOffset}"
        font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
        font-size="52" font-weight="800" fill="white"
        text-anchor="middle" dominant-baseline="central">
        ${escapeXml('Support ' + displayName)}
      </text>
      <text x="${OG_WIDTH / 2}" y="${textTopOffset + 70}"
        font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
        font-size="28" font-weight="500" fill="rgba(255,255,255,0.8)"
        text-anchor="middle" dominant-baseline="central">
        Become a Sponsor Today
      </text>
      <!-- Fundraisr badge -->
      <text x="${OG_WIDTH - 40}" y="${OG_HEIGHT - 30}"
        font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
        font-size="16" font-weight="600" fill="rgba(255,255,255,0.5)"
        text-anchor="end" dominant-baseline="auto">
        Powered by Fundraisr
      </text>
    </svg>`;

    composites.push({
        input: Buffer.from(textSvg),
        top: 0,
        left: 0,
    });

    return pipeline.composite(composites).png().toBuffer();
}

/**
 * Fetch an image from a URL and return as Buffer
 */
async function fetchImage(url) {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url, { timeout: 5000 });
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (err) {
        console.warn('[OG Image] fetchImage failed:', err.message);
        return null;
    }
}

/**
 * Generate OG image and save to disk
 * @returns {string} The filename (e.g. "my-slug.png")
 */
async function generateAndSaveOgImage(userId, orgProfile) {
    const slug = orgProfile.slug || userId;
    const filename = `${slug}.png`;
    const filepath = path.join(OG_DIR, filename);

    try {
        const buffer = await generateOgImage(orgProfile);
        fs.writeFileSync(filepath, buffer);
        console.log(`[OG Image] Generated: ${filename}`);
        return filename;
    } catch (err) {
        console.error('[OG Image] Generation failed:', err.message);
        // Generate a simple fallback
        try {
            const fallback = await generateFallbackImage();
            fs.writeFileSync(filepath, fallback);
            return filename;
        } catch (fallbackErr) {
            console.error('[OG Image] Fallback generation also failed:', fallbackErr.message);
            return null;
        }
    }
}

/**
 * Generate a simple default Fundraisr OG image as fallback
 */
async function generateFallbackImage() {
    const svg = `
    <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4c1d95;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#bg)" />
      <text x="${OG_WIDTH / 2}" y="${OG_HEIGHT / 2 - 20}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="56" font-weight="800" fill="white"
        text-anchor="middle" dominant-baseline="central">
        Fundraisr
      </text>
      <text x="${OG_WIDTH / 2}" y="${OG_HEIGHT / 2 + 40}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="24" font-weight="500" fill="rgba(255,255,255,0.7)"
        text-anchor="middle" dominant-baseline="central">
        Sponsorship &amp; Fundraising Made Easy
      </text>
    </svg>`;
    return sharp(Buffer.from(svg)).resize(OG_WIDTH, OG_HEIGHT).png().toBuffer();
}

/**
 * Check if a cached OG image exists for a slug
 */
function ogImageExists(slug) {
    return fs.existsSync(path.join(OG_DIR, `${slug}.png`));
}

module.exports = {
    generateOgImage,
    generateAndSaveOgImage,
    ogImageExists,
    OG_DIR,
};
