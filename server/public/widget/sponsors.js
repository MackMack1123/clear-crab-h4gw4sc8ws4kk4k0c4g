/**
 * Fundraisr Sponsor Widget
 * Embeddable sponsor gallery for external websites
 *
 * Widget Types:
 * - carousel: Continuous scrolling sponsor logos (default)
 * - grid: Responsive grid of all sponsors
 * - gallery: Full-page sponsor showcase with large cards
 * - banner: CTA button to view sponsorship packages
 *
 * Usage:
 * <div id="fundraisr-sponsors" data-org="ORGANIZER_ID" data-type="carousel"></div>
 * <script src="https://api.getfundraisr.io/widget/sponsors.js" async></script>
 */
(function() {
    'use strict';

    const API_BASE = 'https://api.getfundraisr.io/api';
    const PROFILE_BASE = 'https://getfundraisr.io';

    // Brand colors
    const BRAND = {
        primary: '#6366f1',
        primaryHover: '#4f46e5',
        primaryLight: '#eef2ff',
        text: '#0f172a',
        textSecondary: '#64748b',
        background: '#ffffff',
        border: '#e2e8f0',
        surface: '#f8fafc'
    };

    // Default configuration
    const DEFAULTS = {
        type: 'carousel',
        theme: 'light',
        logoSize: 'medium',
        showNames: true,
        maxSponsors: 20,
        scrollSpeed: 30, // pixels per second
        sortBy: 'tier',
        // Banner specific
        buttonText: 'View Sponsorship Packages',
        buttonColor: BRAND.primary
    };

    // Logo size mappings
    const LOGO_SIZES = {
        small: { width: 100, height: 70 },
        medium: { width: 140, height: 90 },
        large: { width: 180, height: 110 }
    };

    // CSS Styles
    const WIDGET_STYLES = `
        .fr-widget {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-sizing: border-box;
            width: 100%;
        }
        .fr-widget *, .fr-widget *::before, .fr-widget *::after {
            box-sizing: inherit;
        }
        .fr-widget-light {
            --fr-bg: #ffffff;
            --fr-surface: #f8fafc;
            --fr-text: #0f172a;
            --fr-text-secondary: #64748b;
            --fr-border: #e2e8f0;
            --fr-primary: ${BRAND.primary};
            --fr-primary-hover: ${BRAND.primaryHover};
        }
        .fr-widget-dark {
            --fr-bg: #1e293b;
            --fr-surface: #334155;
            --fr-text: #f1f5f9;
            --fr-text-secondary: #94a3b8;
            --fr-border: #475569;
            --fr-primary: ${BRAND.primary};
            --fr-primary-hover: ${BRAND.primaryHover};
        }
        .fr-widget-container {
            background: var(--fr-bg);
            border: 1px solid var(--fr-border);
            border-radius: 16px;
            padding: 24px;
            overflow: hidden;
        }

        /* Continuous Scroll Carousel */
        .fr-carousel {
            position: relative;
            width: 100%;
            overflow: hidden;
            mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
            -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        }
        .fr-carousel-track {
            display: flex;
            gap: 32px;
            width: max-content;
            animation: fr-scroll var(--scroll-duration, 20s) linear infinite;
        }
        .fr-carousel-track:hover {
            animation-play-state: paused;
        }
        @keyframes fr-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .fr-carousel-item {
            flex-shrink: 0;
            text-align: center;
            text-decoration: none;
            color: inherit;
            display: block;
            transition: transform 0.2s ease;
        }
        .fr-carousel-item:hover {
            transform: scale(1.02);
        }

        /* Grid Styles */
        .fr-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 24px;
        }
        .fr-grid-item {
            text-align: center;
            text-decoration: none;
            color: inherit;
            display: block;
            transition: transform 0.2s ease;
        }
        .fr-grid-item:hover {
            transform: translateY(-2px);
        }

        /* Gallery Styles (Full Page) */
        .fr-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 32px;
        }
        .fr-gallery-item {
            text-decoration: none;
            color: inherit;
            display: block;
            background: var(--fr-bg);
            border: 1px solid var(--fr-border);
            border-radius: 16px;
            padding: 24px;
            transition: all 0.2s ease;
        }
        .fr-gallery-item:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.1);
            border-color: var(--fr-primary);
        }
        .fr-gallery-logo {
            width: 100%;
            height: 120px;
            background: var(--fr-surface);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            overflow: hidden;
        }
        .fr-gallery-logo img {
            max-width: 80%;
            max-height: 80%;
            object-fit: contain;
        }
        .fr-gallery-name {
            font-size: 18px;
            font-weight: 700;
            color: var(--fr-text);
            margin: 0 0 4px 0;
        }
        .fr-gallery-tier {
            font-size: 13px;
            font-weight: 500;
            color: var(--fr-primary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin: 0 0 8px 0;
        }
        .fr-gallery-tagline {
            font-size: 14px;
            color: var(--fr-text-secondary);
            margin: 0;
            line-height: 1.5;
        }

        /* Banner CTA Widget */
        .fr-banner {
            text-align: center;
            padding: 32px 24px;
        }
        .fr-banner-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--fr-text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin: 0 0 16px 0;
        }
        .fr-banner-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 14px 28px;
            font-size: 16px;
            font-weight: 600;
            color: #ffffff;
            background: var(--fr-button-color, var(--fr-primary));
            border: none;
            border-radius: 12px;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
        }
        .fr-banner-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
            filter: brightness(1.1);
        }
        .fr-banner-button svg {
            width: 18px;
            height: 18px;
        }

        /* Shared Card Styles */
        .fr-logo-container {
            background: var(--fr-surface);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            margin-bottom: 10px;
            border: 1px solid var(--fr-border);
        }
        .fr-carousel-item:hover .fr-logo-container,
        .fr-grid-item:hover .fr-logo-container {
            border-color: var(--fr-primary);
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .fr-logo {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .fr-sponsor-name {
            font-size: 14px;
            font-weight: 600;
            color: var(--fr-text);
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .fr-sponsor-tier {
            font-size: 11px;
            font-weight: 500;
            color: var(--fr-text-secondary);
            margin: 4px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* Footer - On Brand */
        .fr-footer {
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid var(--fr-border);
            text-align: center;
        }
        .fr-footer a {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            font-size: 12px;
            font-weight: 600;
            color: #ffffff;
            text-decoration: none;
            background: var(--fr-primary);
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        .fr-footer a:hover {
            background: var(--fr-primary-hover);
            transform: translateY(-1px);
        }
        .fr-footer svg {
            width: 14px;
            height: 14px;
        }

        /* Empty State */
        .fr-empty {
            text-align: center;
            padding: 48px 24px;
            color: var(--fr-text-secondary);
        }
        .fr-empty p {
            margin: 0 0 16px 0;
            font-size: 15px;
        }
        .fr-empty a {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--fr-primary);
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
        }
        .fr-empty a:hover {
            text-decoration: underline;
        }

        /* Loading */
        .fr-loading {
            text-align: center;
            padding: 48px 24px;
            color: var(--fr-text-secondary);
        }
        .fr-spinner {
            width: 28px;
            height: 28px;
            border: 3px solid var(--fr-border);
            border-top-color: var(--fr-primary);
            border-radius: 50%;
            animation: fr-spin 0.8s linear infinite;
            margin: 0 auto 12px;
        }
        @keyframes fr-spin {
            to { transform: rotate(360deg); }
        }
    `;

    // Inject styles once
    let stylesInjected = false;
    function injectStyles() {
        if (stylesInjected) return;
        const style = document.createElement('style');
        style.textContent = WIDGET_STYLES;
        document.head.appendChild(style);
        stylesInjected = true;
    }

    // Parse data attributes from container
    function parseConfig(container) {
        const config = { ...DEFAULTS };

        config.orgId = container.dataset.org;
        if (container.dataset.type) config.type = container.dataset.type;
        if (container.dataset.theme) config.theme = container.dataset.theme;
        if (container.dataset.logoSize) config.logoSize = container.dataset.logoSize;
        if (container.dataset.showNames !== undefined) config.showNames = container.dataset.showNames !== 'false';
        if (container.dataset.maxSponsors) config.maxSponsors = parseInt(container.dataset.maxSponsors);
        if (container.dataset.scrollSpeed) config.scrollSpeed = parseInt(container.dataset.scrollSpeed);
        if (container.dataset.sortBy) config.sortBy = container.dataset.sortBy;
        // Banner config
        if (container.dataset.buttonText) config.buttonText = container.dataset.buttonText;
        if (container.dataset.buttonColor) config.buttonColor = container.dataset.buttonColor;

        return config;
    }

    // Fetch sponsors from API
    async function fetchSponsors(orgId, maxSponsors, sortBy) {
        const url = `${API_BASE}/widget/sponsors/${orgId}?maxSponsors=${maxSponsors}&sortBy=${sortBy}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch sponsors');
        return response.json();
    }

    // Render loading state
    function renderLoading(container, theme) {
        container.innerHTML = `
            <div class="fr-widget fr-widget-${theme}">
                <div class="fr-widget-container">
                    <div class="fr-loading">
                        <div class="fr-spinner"></div>
                        <p>Loading sponsors...</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Render empty state
    function renderEmpty(container, theme, orgData) {
        const sponsorUrl = orgData?.slug
            ? `${PROFILE_BASE}/org/${orgData.slug}`
            : `${PROFILE_BASE}/org/${orgData?.id || ''}`;

        container.innerHTML = `
            <div class="fr-widget fr-widget-${theme}">
                <div class="fr-widget-container">
                    <div class="fr-empty">
                        <p>Sponsorship opportunities available!</p>
                        <a href="${sponsorUrl}" target="_blank" rel="noopener">
                            Become a Sponsor
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    // Render sponsor item for carousel/grid
    function renderSponsorItem(sponsor, config, itemClass) {
        const size = LOGO_SIZES[config.logoSize] || LOGO_SIZES.medium;
        const profileUrl = `${PROFILE_BASE}/sponsor/${sponsor.id}`;

        return `
            <a href="${profileUrl}" target="_blank" rel="noopener" class="${itemClass}">
                <div class="fr-logo-container" style="width: ${size.width}px; height: ${size.height}px;">
                    <img src="${sponsor.logo}" alt="${sponsor.name}" class="fr-logo" loading="lazy">
                </div>
                ${config.showNames ? `
                    <p class="fr-sponsor-name" style="max-width: ${size.width}px;">${sponsor.name}</p>
                    <p class="fr-sponsor-tier">${sponsor.tier}</p>
                ` : ''}
            </a>
        `;
    }

    // Render gallery item (larger card with more info)
    function renderGalleryItem(sponsor) {
        const profileUrl = `${PROFILE_BASE}/sponsor/${sponsor.id}`;

        return `
            <a href="${profileUrl}" target="_blank" rel="noopener" class="fr-gallery-item">
                <div class="fr-gallery-logo">
                    <img src="${sponsor.logo}" alt="${sponsor.name}" loading="lazy">
                </div>
                <h3 class="fr-gallery-name">${sponsor.name}</h3>
                <p class="fr-gallery-tier">${sponsor.tier}</p>
                ${sponsor.tagline ? `<p class="fr-gallery-tagline">${sponsor.tagline}</p>` : ''}
            </a>
        `;
    }

    // Render continuous scroll carousel
    function renderCarousel(container, data, config) {
        const { sponsors, organization } = data;

        // Duplicate sponsors for seamless loop (only if we have sponsors)
        const duplicatedSponsors = sponsors.length > 0 ? [...sponsors, ...sponsors] : [];
        const sponsorsHtml = duplicatedSponsors.map(s => renderSponsorItem(s, config, 'fr-carousel-item')).join('');

        // Calculate scroll duration based on number of items and speed
        const itemWidth = (LOGO_SIZES[config.logoSize]?.width || 140) + 32; // width + gap
        const totalWidth = sponsors.length * itemWidth;
        const duration = totalWidth / config.scrollSpeed;

        container.innerHTML = `
            <div class="fr-widget fr-widget-${config.theme}">
                <div class="fr-widget-container">
                    <div class="fr-carousel">
                        <div class="fr-carousel-track" style="--scroll-duration: ${duration}s;">
                            ${sponsorsHtml}
                        </div>
                    </div>
                    ${renderFooter(organization)}
                </div>
            </div>
        `;
    }

    // Render grid
    function renderGrid(container, data, config) {
        const { sponsors, organization } = data;
        const sponsorsHtml = sponsors.map(s => renderSponsorItem(s, config, 'fr-grid-item')).join('');

        container.innerHTML = `
            <div class="fr-widget fr-widget-${config.theme}">
                <div class="fr-widget-container">
                    <div class="fr-grid">
                        ${sponsorsHtml}
                    </div>
                    ${renderFooter(organization)}
                </div>
            </div>
        `;
    }

    // Render gallery (full page showcase)
    function renderGallery(container, data, config) {
        const { sponsors, organization } = data;
        const sponsorsHtml = sponsors.map(s => renderGalleryItem(s)).join('');

        container.innerHTML = `
            <div class="fr-widget fr-widget-${config.theme}">
                <div class="fr-widget-container" style="border: none; padding: 0; background: transparent;">
                    <div class="fr-gallery">
                        ${sponsorsHtml}
                    </div>
                    ${renderFooter(organization)}
                </div>
            </div>
        `;
    }

    // Render banner CTA
    function renderBanner(container, data, config) {
        const { organization } = data;
        const sponsorUrl = organization?.slug
            ? `${PROFILE_BASE}/org/${organization.slug}`
            : `${PROFILE_BASE}/org/${organization?.id || config.orgId}`;

        container.innerHTML = `
            <div class="fr-widget fr-widget-${config.theme}">
                <div class="fr-widget-container">
                    <div class="fr-banner">
                        <p class="fr-banner-title">Support ${organization?.name || 'Our Team'}</p>
                        <a href="${sponsorUrl}" target="_blank" rel="noopener" class="fr-banner-button" style="--fr-button-color: ${config.buttonColor};">
                            ${config.buttonText}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    // Render footer
    function renderFooter(organization) {
        const orgUrl = organization?.slug
            ? `${PROFILE_BASE}/org/${organization.slug}`
            : `${PROFILE_BASE}/org/${organization?.id || ''}`;

        return `
            <div class="fr-footer">
                <a href="${orgUrl}" target="_blank" rel="noopener">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                    Powered by Fundraisr
                </a>
            </div>
        `;
    }

    // Main initialization function
    async function initWidget(container) {
        const config = parseConfig(container);

        if (!config.orgId) {
            console.error('Fundraisr Widget: Missing data-org attribute');
            return;
        }

        injectStyles();

        // Banner widget doesn't need to fetch sponsors
        if (config.type === 'banner') {
            try {
                const data = await fetchSponsors(config.orgId, 1, 'tier');
                renderBanner(container, data, config);
            } catch (error) {
                // Render banner with minimal data
                renderBanner(container, { organization: { id: config.orgId } }, config);
            }
            return;
        }

        renderLoading(container, config.theme);

        try {
            const data = await fetchSponsors(config.orgId, config.maxSponsors, config.sortBy);

            if (!data.sponsors || data.sponsors.length === 0) {
                renderEmpty(container, config.theme, data.organization);
                return;
            }

            switch (config.type) {
                case 'gallery':
                    renderGallery(container, data, config);
                    break;
                case 'grid':
                    renderGrid(container, data, config);
                    break;
                case 'carousel':
                default:
                    renderCarousel(container, data, config);
                    break;
            }
        } catch (error) {
            console.error('Fundraisr Widget Error:', error);
            container.innerHTML = '';
        }
    }

    // Initialize all widgets on page
    function init() {
        const containers = document.querySelectorAll('#fundraisr-sponsors, [data-fundraisr-widget]');
        containers.forEach(initWidget);
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for manual initialization
    window.FundraisrWidget = { init, initWidget };
})();
