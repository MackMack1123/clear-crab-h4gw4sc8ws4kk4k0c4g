const opentype = require('opentype.js');
const path = require('path');

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
        console.warn('[Image Helper] fetchImage failed:', err.message);
        return null;
    }
}

module.exports = {
    fontRegular,
    fontBold,
    fontExtraBold,
    textToSvgPath,
    measureText,
    darkenColor,
    truncateText,
    fetchImage
};
