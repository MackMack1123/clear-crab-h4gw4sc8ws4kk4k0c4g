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
 * Generate a 1200x630 OG image as a PNG Buffer
 *
 * Layout (split design):
 * ┌──────────────────────────────────────────────────┐
 * │  "F" badge (top-center, small)                   │
 * │                                                  │
 * │  ┌────────────┐     Become a Sponsor for         │
 * │  │            │     {Organization Name}           │
 * │  │   [LOGO]   │                                  │
 * │  │            │     ┌────────────┐               │
 * │  └────────────┘     │ Learn More │               │
 * │                     └────────────┘               │
 * │  ▓▓ purple accent shape behind logo card         │
 * │                        getfundraisr.io (bottom)  │
 * └──────────────────────────────────────────────────┘
 */
async function generateOgImage(orgProfile) {
    const primaryColor = orgProfile.primaryColor || '#7c3aed';
    const darkColor = darkenColor(primaryColor, 0.35);
    const orgName = orgProfile.orgName || 'Our Organization';
    const displayName = truncateText(orgName, 28);

    // --- Background: white canvas with accent shape on left ---
    const bgSvg = `
    <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <!-- White background -->
      <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="#ffffff"/>

      <!-- Purple accent shape (left side, diagonal) -->
      <defs>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${darkColor};stop-opacity:1" />
        </linearGradient>
      </defs>
      <path d="M0,0 L480,0 L420,630 L0,630 Z" fill="url(#accent)"/>

      <!-- Subtle lighter accent overlay for depth -->
      <path d="M40,80 L440,40 L390,590 L30,610 Z" fill="rgba(255,255,255,0.08)"/>
    </svg>`;

    let pipeline = sharp(Buffer.from(bgSvg)).resize(OG_WIDTH, OG_HEIGHT);
    const composites = [];

    // --- Logo card (centered on the accent area) ---
    const cardSize = 220;
    const cardLeft = 130;
    const cardTop = 175;

    // Card background (warm amber/gold like reference)
    const cardSvg = `
    <svg width="${cardSize + 20}" height="${cardSize + 20}" xmlns="http://www.w3.org/2000/svg">
      <!-- Card shadow -->
      <rect x="6" y="6" width="${cardSize + 8}" height="${cardSize + 8}" rx="20" fill="rgba(0,0,0,0.12)"/>
      <!-- Card body -->
      <rect x="0" y="0" width="${cardSize + 8}" height="${cardSize + 8}" rx="20" fill="#f5f0e8"/>
    </svg>`;
    composites.push({
        input: await sharp(Buffer.from(cardSvg)).png().toBuffer(),
        top: cardTop - 4,
        left: cardLeft - 4,
    });

    // Try to fetch and composite the org logo inside the card
    if (orgProfile.logoUrl) {
        try {
            const logoBuffer = await fetchImage(orgProfile.logoUrl);
            if (logoBuffer) {
                const resizedLogo = await sharp(logoBuffer)
                    .resize(cardSize - 40, cardSize - 40, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .png()
                    .toBuffer();

                const logoMeta = await sharp(resizedLogo).metadata();
                const logoLeft = cardLeft + Math.round((cardSize - (logoMeta.width || 180)) / 2);
                const logoTop = cardTop + Math.round((cardSize - (logoMeta.height || 180)) / 2);

                composites.push({
                    input: resizedLogo,
                    top: logoTop,
                    left: logoLeft,
                });
            }
        } catch (err) {
            console.warn('[OG Image] Failed to fetch logo, continuing without it:', err.message);
        }
    }

    // --- Right side: Text + CTA button ---
    const textX = 540;
    const textAreaWidth = OG_WIDTH - textX - 60;

    // Word-wrap the title into lines
    const titleLine1 = 'Become a Sponsor for';
    const titleLine2 = escapeXml(displayName);

    const textSvg = `
    <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <!-- Title -->
      <text x="${textX}" y="240"
        font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
        font-size="40" font-weight="800" fill="#0f172a">
        ${escapeXml(titleLine1)}
      </text>
      <text x="${textX}" y="290"
        font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
        font-size="40" font-weight="800" fill="${primaryColor}">
        ${titleLine2}
      </text>

      <!-- Learn More button -->
      <rect x="${textX}" y="330" width="180" height="50" rx="12" fill="${primaryColor}"/>
      <text x="${textX + 90}" y="361"
        font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
        font-size="18" font-weight="700" fill="#ffffff"
        text-anchor="middle">
        Learn More
      </text>

      <!-- Fundraisr branding (bottom right, minimal) -->
      <text x="${OG_WIDTH - 50}" y="${OG_HEIGHT - 28}"
        font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
        font-size="14" font-weight="500" fill="#94a3b8"
        text-anchor="end">
        getfundraisr.io
      </text>
    </svg>`;

    composites.push({
        input: Buffer.from(textSvg),
        top: 0,
        left: 0,
    });

    // --- Fundraisr "F" badge (top center) ---
    const badgeSvg = `
    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#0f172a"/>
      <text x="20" y="27"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="22" font-weight="800" fill="#ffffff"
        text-anchor="middle">
        F
      </text>
    </svg>`;
    composites.push({
        input: await sharp(Buffer.from(badgeSvg)).png().toBuffer(),
        top: 24,
        left: Math.round(OG_WIDTH / 2) - 20,
    });

    return pipeline.composite(composites).png().toBuffer();
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
