const sharp = require('sharp');
const opentype = require('opentype.js');
const path = require('path');
const fs = require('fs');

const OG_DIR = path.join(__dirname, '../public/og');
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// Ensure output directory exists
if (!fs.existsSync(OG_DIR)) {
    fs.mkdirSync(OG_DIR, { recursive: true });
}

// Load bundled Inter font files at startup (vector paths — no system fonts needed)
const fontRegular = opentype.loadSync(
    path.join(__dirname, '../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff')
);
const fontBold = opentype.loadSync(
    path.join(__dirname, '../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff')
);
const fontExtraBold = opentype.loadSync(
    path.join(__dirname, '../node_modules/@fontsource/inter/files/inter-latin-800-normal.woff')
);

/**
 * Convert text to an SVG <path> element using opentype.js
 * This renders as vector outlines — works on any server without system fonts.
 */
function textToSvgPath(text, x, y, fontSize, font, fill) {
    const otPath = font.getPath(text, x, y, fontSize);
    return `<path d="${otPath.toPathData()}" fill="${fill}"/>`;
}

/**
 * Measure text width for alignment
 */
function measureText(text, fontSize, font) {
    return font.getAdvanceWidth(text, fontSize);
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
 * Truncate text to fit approximately within a width
 */
function truncateText(text, maxChars) {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars - 1) + '...';
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
 * Layout (split design — dark bg, accent left):
 * ┌──────────────────────────────────────────────────┐
 * │ ▓▓▓▓▓▓▓▓▓▓▓│                                    │
 * │ ▓ accent   ▓│  Support & Grow with               │
 * │ ▓┌────────┐▓│  {Organization Name}               │
 * │ ▓│ [LOGO] │▓│                                    │
 * │ ▓└────────┘▓│  Strengthen Community, Boost Your  │
 * │ ▓▓▓▓▓▓▓▓▓▓▓│  Brand. Browse Sponsorship Pkgs.   │
 * │             │  ┌────────────┐                    │
 * │             │  │ Learn More │ (outlined)         │
 * │             │  └────────────┘                    │
 * │             │      Powered by [F] Fundraisr      │
 * │             │              getfundraisr.io       │
 * └──────────────────────────────────────────────────┘
 */
async function generateOgImage(orgProfile) {
    const primaryColor = orgProfile.primaryColor || '#7c3aed';
    const darkColor = darkenColor(primaryColor, 0.35);
    const orgName = orgProfile.orgName || 'Our Organization';
    const displayName = truncateText(orgName, 28);

    // --- Background: dark canvas with accent shape on left ---
    const bgSvg = `
    <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="#1e293b"/>
      <defs>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${darkColor};stop-opacity:1" />
        </linearGradient>
      </defs>
      <path d="M0,0 L480,0 L420,630 L0,630 Z" fill="url(#accent)"/>
      <path d="M40,80 L440,40 L390,590 L30,610 Z" fill="rgba(255,255,255,0.08)"/>
    </svg>`;

    let pipeline = sharp(Buffer.from(bgSvg)).resize(OG_WIDTH, OG_HEIGHT);
    const composites = [];

    // --- Logo card (centered on the accent area) ---
    const cardSize = 220;
    const cardLeft = 130;
    const cardTop = 175;

    const cardSvg = `
    <svg width="${cardSize + 20}" height="${cardSize + 20}" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="${cardSize + 8}" height="${cardSize + 8}" rx="20" fill="rgba(0,0,0,0.12)"/>
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

    // --- Right side: Text + CTA button (all rendered as vector paths) ---
    const textX = 540;

    const textSvg = `
    <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <!-- "Support & Grow with" -->
      ${textToSvgPath('Support & Grow with', textX, 210, 40, fontExtraBold, '#ffffff')}

      <!-- Org name (slightly smaller) -->
      ${textToSvgPath(displayName, textX, 260, 34, fontBold, '#ffffff')}

      <!-- Subheading line 1: "Strengthen Community, Boost Your Brand. Browse" -->
      ${textToSvgPath('Strengthen Community, Boost Your ', textX, 310, 17, fontRegular, '#94a3b8')}${textToSvgPath('Brand', textX + measureText('Strengthen Community, Boost Your ', 17, fontRegular), 310, 17, fontBold, primaryColor)}${textToSvgPath('. Browse', textX + measureText('Strengthen Community, Boost Your ', 17, fontRegular) + measureText('Brand', 17, fontBold), 310, 17, fontRegular, '#94a3b8')}

      <!-- Subheading line 2: "Sponsorship Packages." -->
      ${textToSvgPath('Sponsorship', textX, 335, 17, fontBold, primaryColor)}${textToSvgPath(' Packages.', textX + measureText('Sponsorship', 17, fontBold), 335, 17, fontRegular, '#94a3b8')}

      <!-- Learn More button (outlined) -->
      <rect x="${textX}" y="370" width="180" height="50" rx="12" fill="none" stroke="${primaryColor}" stroke-width="2"/>

      <!-- Learn More button text (centered in button) -->
      ${textToSvgPath('Learn More', textX + 90 - measureText('Learn More', 18, fontBold) / 2, 401, 18, fontBold, primaryColor)}
    </svg>`;

    composites.push({
        input: Buffer.from(textSvg),
        top: 0,
        left: 0,
    });

    // --- "Powered by Fundraisr" pill badge (bottom right) ---
    const poweredByText = 'Powered by';
    const fundraisrText = 'Fundraisr';
    const badgePadX = 16;
    const badgePadY = 10;
    const badgeGap = 8;
    const logoSize = 22;
    const logoGap = 6;
    const poweredByWidth = measureText(poweredByText, 12, fontRegular);
    const fundraisrWidth = measureText(fundraisrText, 13, fontBold);
    const badgeInnerWidth = poweredByWidth + badgeGap + logoSize + logoGap + fundraisrWidth;
    const badgeWidth = badgeInnerWidth + badgePadX * 2;
    const badgeHeight = 34;
    const badgeX = OG_WIDTH - 50 - badgeWidth;
    const badgeY = OG_HEIGHT - 70;

    const badgeSvg = `
    <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <!-- Pill background -->
      <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="17" fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>

      <!-- "Powered by" text -->
      ${textToSvgPath(poweredByText, badgeX + badgePadX, badgeY + 22, 12, fontRegular, '#6b7280')}

      <!-- F logo square -->
      <rect x="${badgeX + badgePadX + poweredByWidth + badgeGap}" y="${badgeY + 6}" width="${logoSize}" height="${logoSize}" rx="5" fill="#111827"/>
      ${textToSvgPath('F', badgeX + badgePadX + poweredByWidth + badgeGap + logoSize / 2 - measureText('F', 13, fontExtraBold) / 2, badgeY + 23, 13, fontExtraBold, '#ffffff')}

      <!-- "Fundraisr" text -->
      ${textToSvgPath(fundraisrText, badgeX + badgePadX + poweredByWidth + badgeGap + logoSize + logoGap, badgeY + 23, 13, fontBold, '#111827')}

      <!-- getfundraisr.io below the badge -->
      ${textToSvgPath('getfundraisr.io', OG_WIDTH - 50 - measureText('getfundraisr.io', 12, fontRegular), OG_HEIGHT - 22, 12, fontRegular, '#64748b')}
    </svg>`;

    composites.push({
        input: Buffer.from(badgeSvg),
        top: 0,
        left: 0,
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
      ${textToSvgPath('Fundraisr', OG_WIDTH / 2 - measureText('Fundraisr', 56, fontExtraBold) / 2, OG_HEIGHT / 2 - 10, 56, fontExtraBold, '#ffffff')}
      ${textToSvgPath('Sponsorship & Fundraising Made Easy', OG_WIDTH / 2 - measureText('Sponsorship & Fundraising Made Easy', 24, fontRegular) / 2, OG_HEIGHT / 2 + 40, 24, fontRegular, 'rgba(255,255,255,0.7)')}
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
