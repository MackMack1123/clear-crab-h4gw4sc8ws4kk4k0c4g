const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const {
    fontRegular, fontBold, fontExtraBold,
    textToSvgPath, measureText, truncateText
} = require('./imageHelpers');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../public/uploads');
const REPORT_DIR = path.join(uploadDir, 'reports');
const REPORT_WIDTH = 1200;

// Ensure output directory exists
if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
}

/**
 * Format currency value for display
 */
function formatCurrency(value) {
    return '$' + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Format period label for display
 */
function formatPeriodLabel(period) {
    const labels = { '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days', '12m': 'Last 12 Months' };
    return labels[period] || 'Last 30 Days';
}

/**
 * Clean up report files older than 7 days
 */
function cleanOldReports() {
    try {
        const files = fs.readdirSync(REPORT_DIR);
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        files.forEach(file => {
            const filepath = path.join(REPORT_DIR, file);
            const stat = fs.statSync(filepath);
            if (stat.mtimeMs < cutoff) {
                fs.unlinkSync(filepath);
            }
        });
    } catch (err) {
        // Non-critical, ignore
    }
}

/**
 * Generate an analytics report image as a PNG
 *
 * @param {object} params
 * @param {string} params.orgName - Organization name
 * @param {string} params.period - Period string (e.g. '30d')
 * @param {object} params.overview - { totalRevenue, thisPeriodRevenue, sponsorshipCount, avgValue }
 * @param {Array} params.packageStats - Top packages by revenue
 * @param {Array} params.topSponsors - Top sponsors
 * @param {object|null} params.funnelOverview - Funnel overview metrics (optional)
 * @returns {Promise<Buffer>} PNG buffer
 */
async function generateReportImage({ orgName, period, overview, packageStats, topSponsors, funnelOverview }) {
    const padding = 60;
    const contentWidth = REPORT_WIDTH - padding * 2;
    let y = 0;
    let svgParts = [];

    // --- Calculate dynamic height ---
    // Header: 120px
    y = 120;

    // Metric cards row: 120px
    y += 130;

    // Package performance section
    const topPackages = (packageStats || []).slice(0, 10);
    if (topPackages.length > 0) {
        y += 50; // section header
        y += topPackages.length * 40 + 20; // bars + padding
    }

    // Top sponsors section
    const topSponsorsList = (topSponsors || []).slice(0, 5);
    if (topSponsorsList.length > 0) {
        y += 50; // section header
        y += topSponsorsList.length * 36 + 20;
    }

    // Funnel section
    if (funnelOverview && funnelOverview.landing > 0) {
        y += 50; // section header
        y += 140; // funnel bars
    }

    // Footer
    y += 60;

    const totalHeight = y;

    // --- Build SVG ---
    // Background
    svgParts.push(`<rect width="${REPORT_WIDTH}" height="${totalHeight}" fill="#0f172a" rx="0"/>`);

    // Subtle top accent bar
    svgParts.push(`<rect x="0" y="0" width="${REPORT_WIDTH}" height="4" fill="#7c3aed"/>`);

    // --- Header ---
    y = 50;
    svgParts.push(textToSvgPath(truncateText(orgName, 40), padding, y, 28, fontExtraBold, '#ffffff'));
    const periodLabel = formatPeriodLabel(period);
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    svgParts.push(textToSvgPath(`${periodLabel}  |  ${dateStr}`, padding, y + 30, 14, fontRegular, '#94a3b8'));

    y += 60;

    // --- Metric Cards ---
    const cardWidth = (contentWidth - 30) / 4; // 3 gaps of 10px
    const cards = [
        { label: 'Total Revenue', value: formatCurrency(overview.totalRevenue), color: '#22c55e' },
        { label: 'Period Revenue', value: formatCurrency(overview.thisPeriodRevenue), color: '#3b82f6' },
        { label: 'Sponsorships', value: String(overview.sponsorshipCount || 0), color: '#a855f7' },
        { label: 'Avg Value', value: formatCurrency(overview.avgValue), color: '#f97316' }
    ];

    cards.forEach((card, i) => {
        const cx = padding + i * (cardWidth + 10);
        // Card background
        svgParts.push(`<rect x="${cx}" y="${y}" width="${cardWidth}" height="100" rx="12" fill="#1e293b"/>`);
        // Color accent bar
        svgParts.push(`<rect x="${cx}" y="${y}" width="${cardWidth}" height="4" rx="2" fill="${card.color}"/>`);
        // Label
        svgParts.push(textToSvgPath(card.label, cx + 16, y + 35, 12, fontRegular, '#94a3b8'));
        // Value
        svgParts.push(textToSvgPath(card.value, cx + 16, y + 70, 24, fontBold, '#ffffff'));
    });

    y += 130;

    // --- Package Performance ---
    if (topPackages.length > 0) {
        svgParts.push(textToSvgPath('Package Performance', padding, y + 20, 18, fontBold, '#ffffff'));
        y += 50;

        const maxRevenue = Math.max(...topPackages.map(p => p.revenue || 0), 1);
        const barMaxWidth = contentWidth - 300;

        topPackages.forEach((pkg, i) => {
            const barY = y + i * 40;
            const barWidth = Math.max(((pkg.revenue || 0) / maxRevenue) * barMaxWidth, 4);
            const label = truncateText(pkg.title || 'Unknown', 25);

            svgParts.push(textToSvgPath(label, padding, barY + 16, 13, fontRegular, '#e2e8f0'));
            svgParts.push(`<rect x="${padding + 220}" y="${barY}" width="${barWidth}" height="24" rx="4" fill="#7c3aed" opacity="0.8"/>`);

            const revenueText = formatCurrency(pkg.revenue);
            const countText = `${pkg.count} sold`;
            svgParts.push(textToSvgPath(`${revenueText}  (${countText})`, padding + 230 + barWidth, barY + 16, 12, fontRegular, '#94a3b8'));
        });

        y += topPackages.length * 40 + 20;
    }

    // --- Top Sponsors ---
    if (topSponsorsList.length > 0) {
        svgParts.push(textToSvgPath('Top Sponsors', padding, y + 20, 18, fontBold, '#ffffff'));
        y += 50;

        topSponsorsList.forEach((sponsor, i) => {
            const rowY = y + i * 36;
            const rank = `${i + 1}.`;
            svgParts.push(textToSvgPath(rank, padding, rowY + 16, 14, fontBold, '#7c3aed'));
            svgParts.push(textToSvgPath(truncateText(sponsor.name || 'Unknown', 35), padding + 30, rowY + 16, 14, fontRegular, '#e2e8f0'));
            const amountText = `${formatCurrency(sponsor.totalAmount)}  (${sponsor.count} sponsorship${sponsor.count > 1 ? 's' : ''})`;
            const amountWidth = measureText(amountText, 12, fontRegular);
            svgParts.push(textToSvgPath(amountText, REPORT_WIDTH - padding - amountWidth, rowY + 16, 12, fontRegular, '#22c55e'));
        });

        y += topSponsorsList.length * 36 + 20;
    }

    // --- Funnel Summary ---
    if (funnelOverview && funnelOverview.landing > 0) {
        svgParts.push(textToSvgPath('Sponsorship Funnel', padding, y + 20, 18, fontBold, '#ffffff'));
        y += 50;

        const funnelSteps = [
            { label: 'Landing', value: funnelOverview.landing, color: '#3b82f6' },
            { label: 'Add to Cart', value: funnelOverview.addToCart, color: '#06b6d4' },
            { label: 'Review', value: funnelOverview.review, color: '#6366f1' },
            { label: 'Checkout', value: funnelOverview.checkout, color: '#a855f7' },
            { label: 'Success', value: funnelOverview.success, color: '#22c55e' }
        ];

        const funnelMax = Math.max(funnelOverview.landing, 1);
        const funnelBarMax = contentWidth - 200;

        funnelSteps.forEach((step, i) => {
            const rowY = y + i * 28;
            svgParts.push(textToSvgPath(step.label, padding, rowY + 16, 12, fontRegular, '#94a3b8'));
            const barWidth = Math.max((step.value / funnelMax) * funnelBarMax, 4);
            svgParts.push(`<rect x="${padding + 120}" y="${rowY}" width="${barWidth}" height="20" rx="4" fill="${step.color}" opacity="0.7"/>`);
            svgParts.push(textToSvgPath(String(step.value), padding + 130 + barWidth, rowY + 15, 11, fontBold, '#ffffff'));
        });

        // Overall conversion
        const convY = y + funnelSteps.length * 28 + 5;
        svgParts.push(textToSvgPath(`Overall Conversion: ${funnelOverview.overallConversion || 0}%`, padding, convY + 16, 13, fontBold, '#22c55e'));

        y += 140;
    }

    // --- Footer ---
    y += 10;
    const footerText = 'Generated by Fundraisr';
    const footerWidth = measureText(footerText, 11, fontRegular);
    svgParts.push(textToSvgPath(footerText, REPORT_WIDTH / 2 - footerWidth / 2, y + 16, 11, fontRegular, '#475569'));

    // Assemble final SVG
    const finalSvg = `<svg width="${REPORT_WIDTH}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
        ${svgParts.join('\n        ')}
    </svg>`;

    return sharp(Buffer.from(finalSvg))
        .resize(REPORT_WIDTH, totalHeight)
        .png()
        .toBuffer();
}

/**
 * Generate report image and save to disk
 * @returns {{ filename: string, filepath: string }}
 */
async function generateAndSaveReport(orgId, reportData) {
    // Clean old reports (fire-and-forget)
    cleanOldReports();

    const timestamp = Date.now();
    const filename = `${orgId}-${reportData.period || '30d'}-${timestamp}.png`;
    const filepath = path.join(REPORT_DIR, filename);

    const buffer = await generateReportImage(reportData);
    fs.writeFileSync(filepath, buffer);

    console.log(`[Report] Generated: ${filename}`);
    return { filename, filepath };
}

module.exports = {
    generateReportImage,
    generateAndSaveReport,
    REPORT_DIR
};
