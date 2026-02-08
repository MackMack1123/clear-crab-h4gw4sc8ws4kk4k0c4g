/**
 * Fundraisr Sponsor Widget
 * Embeddable sponsor gallery for external websites
 *
 * Widget Types:
 * - carousel: Continuous scrolling sponsor logos (default)
 * - grid: Responsive grid of all sponsors
 * - gallery: Full-page sponsor showcase with large cards
 * - banner: CTA button to view sponsorship packages
 * - wall: Tier-grouped sponsor showcase
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
        showTiers: true, // Wall: group by tier or randomize
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

    // Store sponsor data for modal lookups
    let _sponsorMap = {};
    let _orgData = null;

    // SVG icons
    const ICONS = {
        globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
        mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
        phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>',
        external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>',
        award: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>'
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

        /* Clickable sponsor items */
        [data-fr-sponsor] {
            cursor: pointer;
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
        .fr-gallery-contact {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 12px;
        }
        .fr-gallery-contact a {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: var(--fr-primary);
            text-decoration: none;
            padding: 4px 10px;
            border-radius: 6px;
            background: var(--fr-surface);
            border: 1px solid var(--fr-border);
            transition: all 0.2s ease;
        }
        .fr-gallery-contact a:hover {
            border-color: var(--fr-primary);
            background: var(--fr-bg);
        }
        .fr-gallery-contact svg {
            width: 12px;
            height: 12px;
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

        /* Wall Styles */
        .fr-wall {
            max-width: 960px;
            margin: 0 auto;
        }
        .fr-wall-tier {
            margin-bottom: 32px;
        }
        .fr-wall-tier:last-child {
            margin-bottom: 0;
        }
        .fr-wall-tier-name {
            font-size: 12px;
            font-weight: 700;
            color: var(--fr-text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            border-bottom: 1px solid var(--fr-border);
            padding-bottom: 8px;
            margin-bottom: 16px;
            text-align: center;
        }
        .fr-wall-tier-grid {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 20px;
        }
        .fr-wall-tier-grid[data-priority="high"] .fr-logo-container {
            width: 180px;
            height: 110px;
        }
        .fr-wall-tier-grid[data-priority="medium"] .fr-logo-container {
            width: 140px;
            height: 90px;
        }
        .fr-wall-tier-grid[data-priority="low"] .fr-logo-container {
            width: 100px;
            height: 70px;
        }
        .fr-wall-item {
            text-align: center;
            text-decoration: none;
            color: inherit;
            display: block;
            transition: transform 0.2s ease;
        }
        .fr-wall-item:hover {
            transform: translateY(-2px);
        }

        /* ===== Sponsor Modal ===== */
        .fr-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            opacity: 0;
            transition: opacity 0.2s ease;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .fr-modal-overlay.fr-modal-open {
            opacity: 1;
        }
        .fr-modal {
            position: relative;
            width: 100%;
            max-width: 520px;
            max-height: 90vh;
            overflow-y: auto;
            background: #ffffff;
            border-radius: 24px;
            box-shadow: 0 24px 48px rgba(0,0,0,0.2);
            transform: scale(0.95) translateY(10px);
            transition: transform 0.25s ease;
        }
        .fr-modal-open .fr-modal {
            transform: scale(1) translateY(0);
        }
        .fr-modal-header {
            position: relative;
            padding: 32px 32px 0;
            text-align: center;
        }
        .fr-modal-close {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 36px;
            height: 36px;
            border: none;
            background: #f1f5f9;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s ease;
            padding: 0;
        }
        .fr-modal-close:hover {
            background: #e2e8f0;
        }
        .fr-modal-close svg {
            width: 18px;
            height: 18px;
            color: #64748b;
        }
        .fr-modal-logo-wrap {
            display: inline-block;
            background: #f8fafc;
            border-radius: 16px;
            padding: 24px;
            border: 1px solid #e2e8f0;
            margin-bottom: 20px;
        }
        .fr-modal-logo-wrap img {
            max-width: 240px;
            max-height: 120px;
            object-fit: contain;
            display: block;
        }
        .fr-modal-logo-placeholder {
            width: 80px;
            height: 80px;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 20px;
        }
        .fr-modal-name {
            font-size: 26px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 8px;
            line-height: 1.2;
        }
        .fr-modal-tier {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 6px 14px;
            border-radius: 999px;
            margin-bottom: 4px;
        }
        .fr-modal-tier svg {
            width: 14px;
            height: 14px;
        }
        .fr-modal-body {
            padding: 24px 32px;
        }
        .fr-modal-tagline {
            font-size: 16px;
            color: #475569;
            line-height: 1.6;
            text-align: center;
            margin: 0 0 24px;
            font-style: italic;
        }
        .fr-modal-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .fr-modal-action {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 18px;
            border-radius: 14px;
            text-decoration: none;
            color: #0f172a;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            transition: all 0.15s ease;
            font-size: 15px;
            font-weight: 500;
        }
        .fr-modal-action:hover {
            border-color: var(--fr-modal-color, #6366f1);
            background: #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .fr-modal-action-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .fr-modal-action-icon svg {
            width: 20px;
            height: 20px;
            color: #ffffff;
        }
        .fr-modal-action-label {
            flex: 1;
            min-width: 0;
        }
        .fr-modal-action-label small {
            display: block;
            font-size: 12px;
            color: #94a3b8;
            font-weight: 400;
            margin-top: 1px;
        }
        .fr-modal-action-arrow {
            color: #cbd5e1;
            flex-shrink: 0;
        }
        .fr-modal-action-arrow svg {
            width: 16px;
            height: 16px;
        }
        .fr-modal-footer {
            padding: 16px 32px 24px;
            text-align: center;
            border-top: 1px solid #f1f5f9;
        }
        .fr-modal-org {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
            color: #64748b;
            font-size: 13px;
            font-weight: 500;
            padding: 8px 16px;
            border-radius: 10px;
            transition: all 0.15s ease;
        }
        .fr-modal-org:hover {
            background: #f8fafc;
            color: #0f172a;
        }
        .fr-modal-org img {
            width: 28px;
            height: 28px;
            object-fit: contain;
            border-radius: 6px;
        }
        .fr-modal-org-initial {
            width: 28px;
            height: 28px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
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
        if (container.dataset.showTiers !== undefined) config.showTiers = container.dataset.showTiers !== 'false';
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

    // ===== MODAL SYSTEM =====

    function openSponsorModal(sponsorId) {
        const sponsor = _sponsorMap[sponsorId];
        if (!sponsor) return;

        const org = _orgData;
        const primaryColor = org?.primaryColor || BRAND.primary;

        // Build action links
        let actionsHtml = '';
        if (sponsor.website) {
            actionsHtml += `
                <a href="${sponsor.website}" target="_blank" rel="noopener" class="fr-modal-action" style="--fr-modal-color:${primaryColor}">
                    <span class="fr-modal-action-icon" style="background:${primaryColor}">${ICONS.globe}</span>
                    <span class="fr-modal-action-label">Visit Website<small>${sponsor.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</small></span>
                    <span class="fr-modal-action-arrow">${ICONS.external}</span>
                </a>`;
        }
        if (sponsor.email) {
            actionsHtml += `
                <a href="mailto:${sponsor.email}" class="fr-modal-action" style="--fr-modal-color:${primaryColor}">
                    <span class="fr-modal-action-icon" style="background:${primaryColor}">${ICONS.mail}</span>
                    <span class="fr-modal-action-label">Send Email<small>${sponsor.email}</small></span>
                    <span class="fr-modal-action-arrow">${ICONS.external}</span>
                </a>`;
        }
        if (sponsor.phone) {
            actionsHtml += `
                <a href="tel:${sponsor.phone}" class="fr-modal-action" style="--fr-modal-color:${primaryColor}">
                    <span class="fr-modal-action-icon" style="background:${primaryColor}">${ICONS.phone}</span>
                    <span class="fr-modal-action-label">Call<small>${sponsor.phone}</small></span>
                    <span class="fr-modal-action-arrow">${ICONS.external}</span>
                </a>`;
        }

        // Logo or initial
        const logoHtml = sponsor.logo
            ? `<div class="fr-modal-logo-wrap"><img src="${sponsor.logo}" alt="${sponsor.name}"></div>`
            : `<div class="fr-modal-logo-placeholder" style="background:${primaryColor}">${(sponsor.name || '?')[0]}</div>`;

        // Org footer
        const orgUrl = org?.slug
            ? `${PROFILE_BASE}/org/${org.slug}`
            : `${PROFILE_BASE}/org/${org?.id || ''}`;

        const orgLogoHtml = org?.logo
            ? `<img src="${org.logo}" alt="${org.name || ''}">`
            : `<span class="fr-modal-org-initial" style="background:${primaryColor}">${(org?.name || 'O')[0]}</span>`;

        const overlay = document.createElement('div');
        overlay.className = 'fr-modal-overlay';
        overlay.innerHTML = `
            <div class="fr-modal" role="dialog" aria-modal="true">
                <div class="fr-modal-header">
                    <button class="fr-modal-close" aria-label="Close">${ICONS.close}</button>
                    ${logoHtml}
                    <h2 class="fr-modal-name">${sponsor.name}</h2>
                    <span class="fr-modal-tier" style="color:${primaryColor};background:${primaryColor}12">
                        ${ICONS.award}
                        ${sponsor.tier}
                    </span>
                </div>
                <div class="fr-modal-body">
                    ${sponsor.tagline ? `<p class="fr-modal-tagline">"${sponsor.tagline}"</p>` : ''}
                    ${actionsHtml ? `<div class="fr-modal-actions">${actionsHtml}</div>` : ''}
                </div>
                <div class="fr-modal-footer">
                    <a href="${orgUrl}" target="_blank" rel="noopener" class="fr-modal-org">
                        ${orgLogoHtml}
                        Proud sponsor of ${org?.name || 'Organization'}
                    </a>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.classList.add('fr-modal-open');
        });

        // Close handlers
        const close = () => {
            overlay.classList.remove('fr-modal-open');
            setTimeout(() => overlay.remove(), 200);
            document.removeEventListener('keydown', escHandler);
        };

        const escHandler = (e) => {
            if (e.key === 'Escape') close();
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        overlay.querySelector('.fr-modal-close').addEventListener('click', close);
        document.addEventListener('keydown', escHandler);
    }

    // Attach click delegation to a widget container
    function attachModalHandlers(container) {
        container.addEventListener('click', (e) => {
            // Find the closest sponsor element
            const sponsorEl = e.target.closest('[data-fr-sponsor]');
            if (!sponsorEl) return;

            // Don't intercept direct link clicks inside the element (contact links in gallery)
            const clickedLink = e.target.closest('a[href]');
            if (clickedLink && !clickedLink.hasAttribute('data-fr-sponsor')) {
                return; // Let the link navigate normally
            }

            e.preventDefault();
            e.stopPropagation();
            openSponsorModal(sponsorEl.dataset.frSponsor);
        });
    }

    // ===== RENDER FUNCTIONS =====

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

    // Render sponsor item for carousel/grid (now uses div with data attr instead of anchor)
    function renderSponsorItem(sponsor, config, itemClass) {
        const size = LOGO_SIZES[config.logoSize] || LOGO_SIZES.medium;

        return `
            <div data-fr-sponsor="${sponsor.id}" class="${itemClass}">
                <div class="fr-logo-container" style="width: ${size.width}px; height: ${size.height}px;">
                    <img src="${sponsor.logo}" alt="${sponsor.name}" class="fr-logo" loading="lazy">
                </div>
                ${config.showNames ? `
                    <p class="fr-sponsor-name" style="max-width: ${size.width}px;">${sponsor.name}</p>
                    <p class="fr-sponsor-tier">${sponsor.tier}</p>
                ` : ''}
            </div>
        `;
    }

    // Render gallery item (larger card with more info)
    function renderGalleryItem(sponsor) {
        // Build contact links
        let contactHtml = '';
        const contactLinks = [];
        if (sponsor.website) {
            contactLinks.push(`<a href="${sponsor.website}" target="_blank" rel="noopener">${ICONS.globe} Website</a>`);
        }
        if (sponsor.email) {
            contactLinks.push(`<a href="mailto:${sponsor.email}">${ICONS.mail} Email</a>`);
        }
        if (sponsor.phone) {
            contactLinks.push(`<a href="tel:${sponsor.phone}">${ICONS.phone} ${sponsor.phone}</a>`);
        }
        if (contactLinks.length > 0) {
            contactHtml = `<div class="fr-gallery-contact">${contactLinks.join('')}</div>`;
        }

        return `
            <div data-fr-sponsor="${sponsor.id}" class="fr-gallery-item">
                <div class="fr-gallery-logo">
                    <img src="${sponsor.logo}" alt="${sponsor.name}" loading="lazy">
                </div>
                <h3 class="fr-gallery-name">${sponsor.name}</h3>
                <p class="fr-gallery-tier">${sponsor.tier}</p>
                ${sponsor.tagline ? `<p class="fr-gallery-tagline">${sponsor.tagline}</p>` : ''}
                ${contactHtml}
            </div>
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

        attachModalHandlers(container);
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

        attachModalHandlers(container);
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

        attachModalHandlers(container);
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

    // Shuffle array using Fisher-Yates
    function shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // Render wall (tier-grouped or randomized showcase)
    function renderWall(container, data, config) {
        const { sponsors, organization } = data;
        let wallHtml;

        if (config.showTiers) {
            // Group sponsors by tier preserving API sort order
            const tierOrder = [];
            const tierMap = {};
            sponsors.forEach(s => {
                const tier = s.tier || 'Sponsor';
                if (!tierMap[tier]) {
                    tierMap[tier] = [];
                    tierOrder.push(tier);
                }
                tierMap[tier].push(s);
            });

            // Assign priority: top 1/3 = high, middle = medium, bottom = low
            const tierCount = tierOrder.length;
            const highCutoff = Math.ceil(tierCount / 3);
            const medCutoff = Math.ceil((tierCount * 2) / 3);

            wallHtml = tierOrder.map((tierName, idx) => {
                const priority = idx < highCutoff ? 'high' : idx < medCutoff ? 'medium' : 'low';
                const tierSponsors = tierMap[tierName];

                const sponsorsHtml = tierSponsors.map(sponsor => {
                    const logoHtml = sponsor.logo
                        ? `<img src="${sponsor.logo}" alt="${sponsor.name}" class="fr-logo" loading="lazy">`
                        : `<span style="font-size:24px;font-weight:700;color:var(--fr-text-secondary)">${(sponsor.name || '?')[0]}</span>`;

                    return `
                        <div data-fr-sponsor="${sponsor.id}" class="fr-wall-item">
                            <div class="fr-logo-container">${logoHtml}</div>
                            ${config.showNames ? `<p class="fr-sponsor-name">${sponsor.name}</p>` : ''}
                        </div>
                    `;
                }).join('');

                return `
                    <div class="fr-wall-tier">
                        <div class="fr-wall-tier-name">${tierName}</div>
                        <div class="fr-wall-tier-grid" data-priority="${priority}">
                            ${sponsorsHtml}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            // Randomized - no tier grouping, uniform size
            const shuffled = shuffleArray(sponsors);
            const sponsorsHtml = shuffled.map(sponsor => {
                const logoHtml = sponsor.logo
                    ? `<img src="${sponsor.logo}" alt="${sponsor.name}" class="fr-logo" loading="lazy">`
                    : `<span style="font-size:24px;font-weight:700;color:var(--fr-text-secondary)">${(sponsor.name || '?')[0]}</span>`;

                return `
                    <div data-fr-sponsor="${sponsor.id}" class="fr-wall-item">
                        <div class="fr-logo-container">${logoHtml}</div>
                        ${config.showNames ? `<p class="fr-sponsor-name">${sponsor.name}</p>` : ''}
                    </div>
                `;
            }).join('');

            wallHtml = `
                <div class="fr-wall-tier">
                    <div class="fr-wall-tier-grid" data-priority="medium">
                        ${sponsorsHtml}
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="fr-widget fr-widget-${config.theme}">
                <div class="fr-widget-container">
                    <div class="fr-wall">
                        ${wallHtml}
                    </div>
                    ${renderFooter(organization)}
                </div>
            </div>
        `;

        attachModalHandlers(container);
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
                _orgData = data.organization;
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

            // Store data for modal lookups
            _orgData = data.organization;
            if (data.sponsors) {
                data.sponsors.forEach(s => { _sponsorMap[s.id] = s; });
            }

            if (!data.sponsors || data.sponsors.length === 0) {
                renderEmpty(container, config.theme, data.organization);
                return;
            }

            switch (config.type) {
                case 'wall':
                    renderWall(container, data, config);
                    break;
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
