/**
 * Fundraisr Sponsor Widget
 * Embeddable sponsor gallery for external websites
 *
 * Usage:
 * <div id="fundraisr-sponsors"
 *      data-org="ORGANIZER_ID"
 *      data-type="carousel"
 *      data-theme="light">
 * </div>
 * <script src="https://getfundraisr.io/widget/sponsors.js" async></script>
 */
(function() {
    'use strict';

    const API_BASE = 'https://api.getfundraisr.io/api';
    const PROFILE_BASE = 'https://getfundraisr.io';

    // Default configuration
    const DEFAULTS = {
        type: 'carousel',
        theme: 'light',
        logoSize: 'medium',
        showNames: true,
        maxSponsors: 20,
        rotationSpeed: 5,
        sortBy: 'tier'
    };

    // Logo size mappings
    const LOGO_SIZES = {
        small: { width: 80, height: 60 },
        medium: { width: 120, height: 80 },
        large: { width: 160, height: 100 }
    };

    // CSS Styles (injected once)
    const WIDGET_STYLES = `
        .fr-widget {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            box-sizing: border-box;
            width: 100%;
        }
        .fr-widget *, .fr-widget *::before, .fr-widget *::after {
            box-sizing: inherit;
        }
        .fr-widget-light {
            --fr-bg: #ffffff;
            --fr-text: #1e293b;
            --fr-text-secondary: #64748b;
            --fr-border: #e2e8f0;
        }
        .fr-widget-dark {
            --fr-bg: #1e293b;
            --fr-text: #f1f5f9;
            --fr-text-secondary: #94a3b8;
            --fr-border: #334155;
        }
        .fr-widget-container {
            background: var(--fr-bg);
            border: 1px solid var(--fr-border);
            border-radius: 12px;
            padding: 20px;
            overflow: hidden;
        }

        /* Carousel Styles */
        .fr-carousel {
            position: relative;
            overflow: hidden;
        }
        .fr-carousel-track {
            display: flex;
            gap: 24px;
            transition: transform 0.5s ease;
        }
        .fr-carousel-item {
            flex-shrink: 0;
            text-align: center;
            text-decoration: none;
            color: inherit;
            display: block;
        }
        .fr-carousel-item:hover .fr-logo-container {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .fr-carousel-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: var(--fr-bg);
            border: 1px solid var(--fr-border);
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10;
            transition: all 0.2s;
        }
        .fr-carousel-nav:hover {
            background: var(--fr-primary, #7c3aed);
            color: white;
            border-color: var(--fr-primary, #7c3aed);
        }
        .fr-carousel-prev { left: 0; }
        .fr-carousel-next { right: 0; }

        /* Grid Styles */
        .fr-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 20px;
        }
        .fr-grid-item {
            text-align: center;
            text-decoration: none;
            color: inherit;
            display: block;
        }
        .fr-grid-item:hover .fr-logo-container {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        /* Shared Styles - Premium Card Look */
        .fr-logo-container {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 16px;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin-bottom: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
            border: 1px solid rgba(0,0,0,0.04);
        }
        .fr-widget-dark .fr-logo-container {
            background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
            border: 1px solid rgba(255,255,255,0.08);
        }
        .fr-carousel-item:hover .fr-logo-container,
        .fr-grid-item:hover .fr-logo-container {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 12px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08);
            border-color: var(--fr-primary, #7c3aed);
        }
        .fr-logo {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.05));
        }
        .fr-sponsor-name {
            font-size: 14px;
            font-weight: 700;
            color: var(--fr-text);
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            letter-spacing: -0.01em;
        }
        .fr-sponsor-tier {
            font-size: 11px;
            font-weight: 500;
            color: var(--fr-text-secondary);
            margin: 4px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* Footer - Premium Button Style */
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
            color: var(--fr-text-secondary);
            text-decoration: none;
            background: linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0.04) 100%);
            border: 1px solid rgba(124,58,237,0.15);
            border-radius: 100px;
            transition: all 0.2s ease;
        }
        .fr-footer a:hover {
            background: linear-gradient(135deg, var(--fr-primary, #7c3aed) 0%, #9333ea 100%);
            color: white;
            border-color: transparent;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(124,58,237,0.3);
        }
        .fr-footer svg {
            width: 14px;
            height: 14px;
        }

        /* Empty State */
        .fr-empty {
            text-align: center;
            padding: 40px 20px;
            color: var(--fr-text-secondary);
        }
        .fr-empty p {
            margin: 0 0 12px 0;
        }
        .fr-empty a {
            color: var(--fr-primary, #7c3aed);
            text-decoration: none;
            font-weight: 500;
        }

        /* Loading */
        .fr-loading {
            text-align: center;
            padding: 40px 20px;
            color: var(--fr-text-secondary);
        }
        .fr-spinner {
            width: 24px;
            height: 24px;
            border: 2px solid var(--fr-border);
            border-top-color: var(--fr-primary, #7c3aed);
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
        if (container.dataset.rotationSpeed) config.rotationSpeed = parseInt(container.dataset.rotationSpeed);
        if (container.dataset.sortBy) config.sortBy = container.dataset.sortBy;

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
                        <a href="${sponsorUrl}" target="_blank" rel="noopener">Become a Sponsor</a>
                    </div>
                </div>
            </div>
        `;
    }

    // Render sponsor item
    function renderSponsorItem(sponsor, config) {
        const size = LOGO_SIZES[config.logoSize] || LOGO_SIZES.medium;
        const profileUrl = `${PROFILE_BASE}/sponsor/${sponsor.id}`;

        return `
            <a href="${profileUrl}" target="_blank" rel="noopener" class="fr-${config.type}-item">
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

    // Render carousel
    function renderCarousel(container, data, config) {
        const { sponsors, organization } = data;
        const primaryColor = organization.primaryColor || '#7c3aed';

        const sponsorsHtml = sponsors.map(s => renderSponsorItem(s, config)).join('');

        container.innerHTML = `
            <div class="fr-widget fr-widget-${config.theme}" style="--fr-primary: ${primaryColor};">
                <div class="fr-widget-container">
                    <div class="fr-carousel">
                        <button class="fr-carousel-nav fr-carousel-prev" aria-label="Previous">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                        </button>
                        <div class="fr-carousel-viewport" style="overflow: hidden; margin: 0 40px;">
                            <div class="fr-carousel-track">
                                ${sponsorsHtml}
                            </div>
                        </div>
                        <button class="fr-carousel-nav fr-carousel-next" aria-label="Next">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </button>
                    </div>
                    ${renderFooter(organization)}
                </div>
            </div>
        `;

        // Initialize carousel behavior
        initCarousel(container, config);
    }

    // Render grid
    function renderGrid(container, data, config) {
        const { sponsors, organization } = data;
        const primaryColor = organization.primaryColor || '#7c3aed';

        const sponsorsHtml = sponsors.map(s => renderSponsorItem(s, config)).join('');

        container.innerHTML = `
            <div class="fr-widget fr-widget-${config.theme}" style="--fr-primary: ${primaryColor};">
                <div class="fr-widget-container">
                    <div class="fr-grid">
                        ${sponsorsHtml}
                    </div>
                    ${renderFooter(organization)}
                </div>
            </div>
        `;
    }

    // Render footer
    function renderFooter(organization) {
        const orgUrl = organization.slug
            ? `${PROFILE_BASE}/org/${organization.slug}`
            : `${PROFILE_BASE}/org/${organization.id}`;

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

    // Initialize carousel auto-rotation and navigation
    function initCarousel(container, config) {
        const track = container.querySelector('.fr-carousel-track');
        const prevBtn = container.querySelector('.fr-carousel-prev');
        const nextBtn = container.querySelector('.fr-carousel-next');
        const items = container.querySelectorAll('.fr-carousel-item');

        if (!track || items.length === 0) return;

        let currentIndex = 0;
        let autoRotateInterval = null;
        const itemWidth = items[0].offsetWidth + 24; // width + gap
        const visibleItems = Math.floor((container.querySelector('.fr-carousel-viewport').offsetWidth) / itemWidth);
        const maxIndex = Math.max(0, items.length - visibleItems);

        function updatePosition() {
            track.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
        }

        function next() {
            currentIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
            updatePosition();
        }

        function prev() {
            currentIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
            updatePosition();
        }

        function startAutoRotate() {
            if (config.rotationSpeed > 0) {
                autoRotateInterval = setInterval(next, config.rotationSpeed * 1000);
            }
        }

        function stopAutoRotate() {
            if (autoRotateInterval) {
                clearInterval(autoRotateInterval);
                autoRotateInterval = null;
            }
        }

        // Event listeners
        if (prevBtn) prevBtn.addEventListener('click', () => { stopAutoRotate(); prev(); startAutoRotate(); });
        if (nextBtn) nextBtn.addEventListener('click', () => { stopAutoRotate(); next(); startAutoRotate(); });

        // Pause on hover
        const carousel = container.querySelector('.fr-carousel');
        carousel.addEventListener('mouseenter', stopAutoRotate);
        carousel.addEventListener('mouseleave', startAutoRotate);

        // Start auto-rotation
        startAutoRotate();
    }

    // Main initialization function
    async function initWidget(container) {
        const config = parseConfig(container);

        if (!config.orgId) {
            console.error('Fundraisr Widget: Missing data-org attribute');
            return;
        }

        injectStyles();
        renderLoading(container, config.theme);

        try {
            const data = await fetchSponsors(config.orgId, config.maxSponsors, config.sortBy);

            if (!data.sponsors || data.sponsors.length === 0) {
                renderEmpty(container, config.theme, data.organization);
                return;
            }

            if (config.type === 'grid') {
                renderGrid(container, data, config);
            } else {
                renderCarousel(container, data, config);
            }
        } catch (error) {
            console.error('Fundraisr Widget Error:', error);
            container.innerHTML = ''; // Hide widget on error
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
