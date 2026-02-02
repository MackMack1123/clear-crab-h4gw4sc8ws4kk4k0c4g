/**
 * Format a number as US currency (e.g., $1,234.56)
 * @param {number} amount - The amount to format
 * @param {boolean} includeCents - Whether to always show cents (default: true)
 * @returns {string} Formatted currency string without the $ symbol
 */
export function formatCurrency(amount, includeCents = true) {
    const num = Number(amount) || 0;
    return num.toLocaleString('en-US', {
        minimumFractionDigits: includeCents ? 2 : 0,
        maximumFractionDigits: 2,
    });
}

/**
 * Format a number as US currency with $ symbol (e.g., $1,234.56)
 * @param {number} amount - The amount to format
 * @param {boolean} includeCents - Whether to always show cents (default: true)
 * @returns {string} Formatted currency string with $ symbol
 */
export function formatUSD(amount, includeCents = true) {
    return `$${formatCurrency(amount, includeCents)}`;
}
