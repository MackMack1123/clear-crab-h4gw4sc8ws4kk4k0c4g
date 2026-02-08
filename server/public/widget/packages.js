/**
 * Fundraisr Packages Widget
 * Embeddable sponsorship packages display for external websites
 *
 * Usage:
 * <div id="fundraisr-packages" data-org="ORGANIZER_ID"></div>
 * <script src="https://api.getfundraisr.io/widget/packages.js" async></script>
 *
 * Options (data attributes):
 * - data-org: Organizer ID (required)
 * - data-theme: "light" (default) or "dark"
 * - data-button-text: CTA button text (default: "View Package")
 */
(function() {
    'use strict';

    var API_BASE = 'https://api.getfundraisr.io/api';
    var PROFILE_BASE = 'https://getfundraisr.io';

    var BRAND_PRIMARY = '#6366f1';

    // ===== ANALYTICS =====

    function trackEvent(type, data) {
        try {
            var payload = JSON.stringify({
                organizerId: data.organizerId,
                widgetType: 'packages',
                source: 'packages-widget',
                referrer: window.location.href,
                packageId: data.packageId || undefined,
                packageTitle: data.packageTitle || undefined
            });

            var url = API_BASE + '/widget/track/' + type;

            if (navigator.sendBeacon) {
                var blob = new Blob([payload], { type: 'application/json' });
                navigator.sendBeacon(url, blob);
            } else {
                fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload,
                    keepalive: true
                }).catch(function() {});
            }
        } catch (e) {
            // Never break the widget
        }
    }

    // ===== STYLES =====

    var STYLES = '\
        .fr-pkg-widget {\
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\
            box-sizing: border-box;\
            width: 100%;\
        }\
        .fr-pkg-widget *, .fr-pkg-widget *::before, .fr-pkg-widget *::after {\
            box-sizing: inherit;\
        }\
        .fr-pkg-widget-light {\
            --fr-pkg-bg: #ffffff;\
            --fr-pkg-surface: #f8fafc;\
            --fr-pkg-text: #0f172a;\
            --fr-pkg-text-secondary: #64748b;\
            --fr-pkg-border: #e2e8f0;\
            --fr-pkg-primary: ' + BRAND_PRIMARY + ';\
        }\
        .fr-pkg-widget-dark {\
            --fr-pkg-bg: #1e293b;\
            --fr-pkg-surface: #334155;\
            --fr-pkg-text: #f1f5f9;\
            --fr-pkg-text-secondary: #94a3b8;\
            --fr-pkg-border: #475569;\
            --fr-pkg-primary: ' + BRAND_PRIMARY + ';\
        }\
        .fr-pkg-container {\
            background: var(--fr-pkg-bg);\
            border: 1px solid var(--fr-pkg-border);\
            border-radius: 16px;\
            padding: 24px;\
            overflow: hidden;\
        }\
        /* Loading */\
        .fr-pkg-loading {\
            text-align: center;\
            padding: 48px 24px;\
            color: var(--fr-pkg-text-secondary);\
        }\
        .fr-pkg-spinner {\
            width: 28px;\
            height: 28px;\
            border: 3px solid var(--fr-pkg-border);\
            border-top-color: var(--fr-pkg-primary);\
            border-radius: 50%;\
            animation: fr-pkg-spin 0.8s linear infinite;\
            margin: 0 auto 12px;\
        }\
        @keyframes fr-pkg-spin {\
            to { transform: rotate(360deg); }\
        }\
        /* Grid */\
        .fr-pkg-grid {\
            display: grid;\
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));\
            gap: 24px;\
        }\
        /* Card */\
        .fr-pkg-card {\
            background: var(--fr-pkg-bg);\
            border: 1px solid var(--fr-pkg-border);\
            border-radius: 20px;\
            padding: 24px;\
            display: flex;\
            flex-direction: column;\
            transition: all 0.2s ease;\
            text-decoration: none;\
            color: inherit;\
        }\
        .fr-pkg-card:hover {\
            transform: translateY(-4px);\
            box-shadow: 0 12px 24px rgba(0,0,0,0.1);\
            border-color: var(--fr-pkg-primary);\
        }\
        .fr-pkg-card-image {\
            width: 100%;\
            aspect-ratio: 16/9;\
            border-radius: 12px;\
            overflow: hidden;\
            margin-bottom: 16px;\
            background: var(--fr-pkg-surface);\
        }\
        .fr-pkg-card-image img {\
            width: 100%;\
            height: 100%;\
            object-fit: cover;\
        }\
        .fr-pkg-card-title {\
            font-size: 18px;\
            font-weight: 700;\
            color: var(--fr-pkg-text);\
            margin: 0 0 4px 0;\
            line-height: 1.3;\
        }\
        .fr-pkg-card-desc {\
            font-size: 14px;\
            color: var(--fr-pkg-text-secondary);\
            margin: 0 0 16px 0;\
            line-height: 1.5;\
            display: -webkit-box;\
            -webkit-line-clamp: 2;\
            -webkit-box-orient: vertical;\
            overflow: hidden;\
        }\
        .fr-pkg-card-price {\
            font-size: 32px;\
            font-weight: 800;\
            color: var(--fr-pkg-text);\
            margin: 0 0 16px 0;\
            letter-spacing: -0.02em;\
        }\
        .fr-pkg-card-features {\
            list-style: none;\
            margin: 0 0 20px 0;\
            padding: 0;\
            flex: 1;\
        }\
        .fr-pkg-card-features li {\
            font-size: 14px;\
            color: var(--fr-pkg-text-secondary);\
            padding: 6px 0;\
            display: flex;\
            align-items: flex-start;\
            gap: 8px;\
        }\
        .fr-pkg-card-features li::before {\
            content: "";\
            display: inline-block;\
            width: 18px;\
            height: 18px;\
            min-width: 18px;\
            background: #dcfce7;\
            border-radius: 50%;\
            position: relative;\
            top: 1px;\
        }\
        .fr-pkg-card-features li::after {\
            content: "";\
            position: absolute;\
        }\
        .fr-pkg-check {\
            width: 18px;\
            height: 18px;\
            min-width: 18px;\
            background: #dcfce7;\
            border-radius: 50%;\
            display: inline-flex;\
            align-items: center;\
            justify-content: center;\
        }\
        .fr-pkg-check svg {\
            width: 12px;\
            height: 12px;\
            color: #16a34a;\
        }\
        .fr-pkg-card-cta {\
            display: flex;\
            align-items: center;\
            justify-content: center;\
            gap: 8px;\
            width: 100%;\
            padding: 12px 20px;\
            font-size: 15px;\
            font-weight: 700;\
            color: #ffffff;\
            background: var(--fr-pkg-primary);\
            border: none;\
            border-radius: 12px;\
            text-decoration: none;\
            cursor: pointer;\
            transition: all 0.2s ease;\
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);\
        }\
        .fr-pkg-card-cta:hover {\
            filter: brightness(1.1);\
            box-shadow: 0 6px 20px rgba(0,0,0,0.2);\
        }\
        .fr-pkg-card-cta svg {\
            width: 16px;\
            height: 16px;\
        }\
        /* Hero (package_highlight) */\
        .fr-pkg-hero {\
            display: flex;\
            flex-direction: column;\
            background: var(--fr-pkg-bg);\
            border: 1px solid var(--fr-pkg-border);\
            border-radius: 24px;\
            overflow: hidden;\
            margin-bottom: 24px;\
            transition: all 0.2s ease;\
        }\
        .fr-pkg-hero:hover {\
            box-shadow: 0 12px 32px rgba(0,0,0,0.1);\
        }\
        @media (min-width: 768px) {\
            .fr-pkg-hero {\
                flex-direction: row;\
            }\
        }\
        .fr-pkg-hero-image {\
            width: 100%;\
            min-height: 220px;\
            background: var(--fr-pkg-surface);\
            position: relative;\
            overflow: hidden;\
        }\
        @media (min-width: 768px) {\
            .fr-pkg-hero-image {\
                width: 50%;\
                min-height: 340px;\
            }\
        }\
        .fr-pkg-hero-image img {\
            width: 100%;\
            height: 100%;\
            object-fit: cover;\
            position: absolute;\
            inset: 0;\
        }\
        .fr-pkg-hero-badge {\
            position: absolute;\
            top: 16px;\
            right: 16px;\
            display: inline-flex;\
            align-items: center;\
            gap: 4px;\
            padding: 6px 12px;\
            background: rgba(0,0,0,0.7);\
            color: #fff;\
            font-size: 12px;\
            font-weight: 700;\
            border-radius: 999px;\
            backdrop-filter: blur(4px);\
        }\
        .fr-pkg-hero-badge svg {\
            width: 12px;\
            height: 12px;\
            fill: #fff;\
        }\
        .fr-pkg-hero-body {\
            padding: 28px;\
            display: flex;\
            flex-direction: column;\
            justify-content: center;\
            flex: 1;\
        }\
        @media (min-width: 768px) {\
            .fr-pkg-hero-body {\
                padding: 36px;\
            }\
        }\
        .fr-pkg-hero-title {\
            font-size: 24px;\
            font-weight: 800;\
            color: var(--fr-pkg-text);\
            margin: 0 0 8px 0;\
        }\
        .fr-pkg-hero-price {\
            font-size: 36px;\
            font-weight: 800;\
            color: var(--fr-pkg-text);\
            margin: 0 0 12px 0;\
            letter-spacing: -0.02em;\
        }\
        .fr-pkg-hero-desc {\
            font-size: 15px;\
            color: var(--fr-pkg-text-secondary);\
            margin: 0 0 20px 0;\
            line-height: 1.6;\
        }\
        .fr-pkg-hero-features {\
            display: grid;\
            grid-template-columns: 1fr 1fr;\
            gap: 8px;\
            margin-bottom: 24px;\
        }\
        .fr-pkg-hero-features span {\
            font-size: 14px;\
            color: var(--fr-pkg-text-secondary);\
            display: flex;\
            align-items: center;\
            gap: 6px;\
        }\
        /* List (package_list) */\
        .fr-pkg-list {\
            display: flex;\
            flex-direction: column;\
            gap: 12px;\
            margin-bottom: 24px;\
        }\
        .fr-pkg-list-item {\
            display: flex;\
            align-items: center;\
            justify-content: space-between;\
            gap: 16px;\
            background: var(--fr-pkg-bg);\
            border: 1px solid var(--fr-pkg-border);\
            border-radius: 14px;\
            padding: 16px 20px;\
            text-decoration: none;\
            color: inherit;\
            transition: all 0.2s ease;\
        }\
        .fr-pkg-list-item:hover {\
            border-color: var(--fr-pkg-primary);\
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);\
        }\
        .fr-pkg-list-info {\
            flex: 1;\
            min-width: 0;\
        }\
        .fr-pkg-list-title {\
            font-size: 16px;\
            font-weight: 700;\
            color: var(--fr-pkg-text);\
            margin: 0 0 2px 0;\
        }\
        .fr-pkg-list-desc {\
            font-size: 13px;\
            color: var(--fr-pkg-text-secondary);\
            margin: 0;\
            white-space: nowrap;\
            overflow: hidden;\
            text-overflow: ellipsis;\
        }\
        .fr-pkg-list-price {\
            font-size: 20px;\
            font-weight: 800;\
            color: var(--fr-pkg-text);\
            white-space: nowrap;\
        }\
        .fr-pkg-list-cta {\
            font-size: 13px;\
            font-weight: 600;\
            color: var(--fr-pkg-primary);\
            white-space: nowrap;\
            text-decoration: none;\
            display: flex;\
            align-items: center;\
            gap: 4px;\
        }\
        .fr-pkg-list-cta svg {\
            width: 14px;\
            height: 14px;\
        }\
        /* Section title */\
        .fr-pkg-section-title {\
            font-size: 22px;\
            font-weight: 700;\
            color: var(--fr-pkg-text);\
            margin: 0 0 16px 0;\
            text-align: center;\
        }\
        /* Empty */\
        .fr-pkg-empty {\
            text-align: center;\
            padding: 40px 24px;\
        }\
        .fr-pkg-empty-title {\
            font-size: 18px;\
            font-weight: 700;\
            color: var(--fr-pkg-text);\
            margin: 0 0 8px 0;\
        }\
        .fr-pkg-empty-desc {\
            font-size: 14px;\
            color: var(--fr-pkg-text-secondary);\
            margin: 0 0 20px 0;\
        }\
        .fr-pkg-empty-cta {\
            display: inline-flex;\
            align-items: center;\
            gap: 8px;\
            padding: 12px 28px;\
            font-size: 15px;\
            font-weight: 600;\
            color: #ffffff;\
            background: var(--fr-pkg-primary);\
            border-radius: 12px;\
            text-decoration: none;\
            transition: all 0.2s ease;\
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);\
        }\
        .fr-pkg-empty-cta:hover {\
            transform: translateY(-2px);\
            filter: brightness(1.1);\
        }\
        /* Footer */\
        .fr-pkg-footer {\
            margin-top: 20px;\
            padding-top: 16px;\
            border-top: 1px solid var(--fr-pkg-border);\
            text-align: center;\
        }\
        .fr-pkg-footer a {\
            display: inline-flex;\
            align-items: center;\
            gap: 8px;\
            padding: 8px 16px;\
            font-size: 12px;\
            font-weight: 500;\
            color: #6b7280;\
            text-decoration: none;\
            background: #ffffff;\
            border: 1px solid #e5e7eb;\
            border-radius: 9999px;\
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);\
            transition: all 0.2s ease;\
        }\
        .fr-pkg-footer a:hover {\
            background: #f9fafb;\
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);\
        }\
        .fr-pkg-footer-logo {\
            width: 20px;\
            height: 20px;\
            background: #111827;\
            border-radius: 4px;\
            display: flex;\
            align-items: center;\
            justify-content: center;\
            color: #ffffff;\
            font-size: 10px;\
            font-weight: 700;\
            flex-shrink: 0;\
        }\
        .fr-pkg-footer-brand {\
            font-weight: 700;\
            color: #111827;\
            font-size: 13px;\
            letter-spacing: -0.01em;\
        }\
    ';

    var stylesInjected = false;
    function injectStyles() {
        if (stylesInjected) return;
        var style = document.createElement('style');
        style.textContent = STYLES;
        document.head.appendChild(style);
        stylesInjected = true;
    }

    // ===== HELPERS =====

    function escHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function formatPrice(price) {
        return '$' + Number(price).toLocaleString();
    }

    function orgUrl(org) {
        return PROFILE_BASE + '/org/' + (org.slug || org.id || '');
    }

    function packageUrl(org, pkgId) {
        return orgUrl(org) + '?pkg=' + pkgId;
    }

    function darkenColor(hex) {
        if (!hex || hex.length < 7) return hex;
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        var f = 0.85;
        return '#' + [r, g, b].map(function(c) { return Math.round(c * f).toString(16).padStart(2, '0'); }).join('');
    }

    function primaryStyle(org) {
        var c = org && org.primaryColor;
        if (!c) return '';
        return '--fr-pkg-primary:' + c + ';';
    }

    var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    var ARROW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    var STAR_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

    // ===== RENDER =====

    function renderFooter(org) {
        var url = orgUrl(org);
        return '<div class="fr-pkg-footer">' +
            '<a href="' + url + '" target="_blank" rel="noopener">' +
                '<span>Powered by</span>' +
                '<span class="fr-pkg-footer-logo">F</span>' +
                '<span class="fr-pkg-footer-brand">Fundraisr</span>' +
            '</a>' +
        '</div>';
    }

    function renderCard(pkg, org, buttonText) {
        var href = packageUrl(org, pkg.id);
        var imageHtml = '';
        if (pkg.imageUrl) {
            imageHtml = '<div class="fr-pkg-card-image"><img src="' + escHtml(pkg.imageUrl) + '" alt="' + escHtml(pkg.title) + '" loading="lazy"></div>';
        }

        var featuresHtml = '';
        if (pkg.features && pkg.features.length > 0) {
            var items = pkg.features.slice(0, 6).map(function(f) {
                return '<li><span class="fr-pkg-check">' + CHECK_SVG + '</span>' + escHtml(f) + '</li>';
            }).join('');
            featuresHtml = '<ul class="fr-pkg-card-features">' + items + '</ul>';
        }

        return '<a href="' + href + '" target="_blank" rel="noopener" class="fr-pkg-card" data-fr-pkg="' + pkg.id + '">' +
            imageHtml +
            '<h3 class="fr-pkg-card-title">' + escHtml(pkg.title) + '</h3>' +
            '<p class="fr-pkg-card-desc">' + escHtml(pkg.description) + '</p>' +
            '<div class="fr-pkg-card-price">' + formatPrice(pkg.price) + '</div>' +
            featuresHtml +
            '<span class="fr-pkg-card-cta">' + escHtml(buttonText) + ' ' + ARROW_SVG + '</span>' +
        '</a>';
    }

    function renderHighlight(pkg, org, buttonText) {
        if (!pkg) return '';
        var href = packageUrl(org, pkg.id);
        var imageHtml = '';
        if (pkg.imageUrl) {
            imageHtml = '<img src="' + escHtml(pkg.imageUrl) + '" alt="' + escHtml(pkg.title) + '" loading="lazy">';
        }

        var featuresHtml = '';
        if (pkg.features && pkg.features.length > 0) {
            var items = pkg.features.slice(0, 4).map(function(f) {
                return '<span><span class="fr-pkg-check">' + CHECK_SVG + '</span> ' + escHtml(f) + '</span>';
            }).join('');
            featuresHtml = '<div class="fr-pkg-hero-features">' + items + '</div>';
        }

        return '<a href="' + href + '" target="_blank" rel="noopener" class="fr-pkg-hero" data-fr-pkg="' + pkg.id + '">' +
            '<div class="fr-pkg-hero-image">' +
                imageHtml +
                '<span class="fr-pkg-hero-badge">' + STAR_SVG + ' Featured</span>' +
            '</div>' +
            '<div class="fr-pkg-hero-body">' +
                '<h3 class="fr-pkg-hero-title">' + escHtml(pkg.title) + '</h3>' +
                '<div class="fr-pkg-hero-price">' + formatPrice(pkg.price) + '</div>' +
                '<p class="fr-pkg-hero-desc">' + escHtml(pkg.description) + '</p>' +
                featuresHtml +
                '<span class="fr-pkg-card-cta">' + escHtml(buttonText) + ' ' + ARROW_SVG + '</span>' +
            '</div>' +
        '</a>';
    }

    function renderList(pkgs, org, title) {
        if (!pkgs || pkgs.length === 0) return '';
        var titleHtml = title ? '<h3 class="fr-pkg-section-title">' + escHtml(title) + '</h3>' : '';
        var items = pkgs.map(function(pkg) {
            var href = packageUrl(org, pkg.id);
            return '<a href="' + href + '" target="_blank" rel="noopener" class="fr-pkg-list-item" data-fr-pkg="' + pkg.id + '">' +
                '<div class="fr-pkg-list-info">' +
                    '<div class="fr-pkg-list-title">' + escHtml(pkg.title) + '</div>' +
                    '<div class="fr-pkg-list-desc">' + escHtml(pkg.description) + '</div>' +
                '</div>' +
                '<div class="fr-pkg-list-price">' + formatPrice(pkg.price) + '</div>' +
                '<span class="fr-pkg-list-cta">View ' + ARROW_SVG + '</span>' +
            '</a>';
        }).join('');
        return titleHtml + '<div class="fr-pkg-list">' + items + '</div>';
    }

    function renderGallery(pkgs, org, title, buttonText) {
        if (!pkgs || pkgs.length === 0) return '';
        var titleHtml = title ? '<h3 class="fr-pkg-section-title">' + escHtml(title) + '</h3>' : '';
        var cards = pkgs.map(function(pkg) { return renderCard(pkg, org, buttonText); }).join('');
        return titleHtml + '<div class="fr-pkg-grid">' + cards + '</div>';
    }

    function renderEmpty(org) {
        var url = orgUrl(org);
        var name = (org && org.name) || 'this organization';
        return '<div class="fr-pkg-empty">' +
            '<h3 class="fr-pkg-empty-title">No Packages Available</h3>' +
            '<p class="fr-pkg-empty-desc">Check back soon for sponsorship opportunities with ' + escHtml(name) + '.</p>' +
            '<a href="' + url + '" target="_blank" rel="noopener" class="fr-pkg-empty-cta">Visit Our Page ' + ARROW_SVG + '</a>' +
        '</div>';
    }

    function renderLoading() {
        return '<div class="fr-pkg-loading"><div class="fr-pkg-spinner"></div><p>Loading packages...</p></div>';
    }

    // ===== CLICK TRACKING =====

    function attachClickTracking(container, orgId) {
        container.addEventListener('click', function(e) {
            var link = e.target.closest('[data-fr-pkg]');
            if (!link) return;
            trackEvent('click', {
                organizerId: orgId,
                packageId: link.dataset.frPkg,
                packageTitle: (link.querySelector('.fr-pkg-card-title, .fr-pkg-hero-title, .fr-pkg-list-title') || {}).textContent || ''
            });
        });
    }

    // ===== MAIN INIT =====

    async function initWidget(container) {
        if (container._frPkgInit) return;
        container._frPkgInit = true;

        var orgId = container.dataset.org;
        if (!orgId) {
            console.error('Fundraisr Packages Widget: Missing data-org attribute');
            return;
        }

        var theme = container.dataset.theme || 'light';
        var buttonText = container.dataset.buttonText || 'View Package';

        injectStyles();

        // Show loading
        container.innerHTML = '<div class="fr-pkg-widget fr-pkg-widget-' + theme + '"><div class="fr-pkg-container">' + renderLoading() + '</div></div>';

        try {
            var response = await fetch(API_BASE + '/widget/packages/' + orgId);
            if (!response.ok) throw new Error('Failed to fetch packages');
            var data = await response.json();

            var org = data.organization || {};
            var pkgs = data.packages || [];
            var blocks = data.packageBlocks || [];

            // Build a map for quick lookup
            var pkgMap = {};
            pkgs.forEach(function(p) { pkgMap[p.id] = p; });

            // Track impression
            trackEvent('impression', { organizerId: orgId });

            // Build body content
            var bodyHtml = '';

            if (blocks.length > 0) {
                // Render blocks in order
                blocks.forEach(function(block) {
                    if (block.type === 'package_highlight' && block.packageId) {
                        var pkg = pkgMap[block.packageId];
                        if (pkg) {
                            bodyHtml += renderHighlight(pkg, org, buttonText);
                        }
                    } else if (block.type === 'package_gallery' && block.packageIds) {
                        var galleryPkgs = block.packageIds
                            .map(function(id) { return pkgMap[id]; })
                            .filter(Boolean);
                        if (galleryPkgs.length > 0) {
                            bodyHtml += renderGallery(galleryPkgs, org, block.title, buttonText);
                        }
                    } else if (block.type === 'package_list' && block.packageIds) {
                        var listPkgs = block.packageIds
                            .map(function(id) { return pkgMap[id]; })
                            .filter(Boolean);
                        if (listPkgs.length > 0) {
                            bodyHtml += renderList(listPkgs, org, block.title);
                        }
                    }
                });
            }

            // Fallback: simple grid if no blocks or blocks produced no content
            if (!bodyHtml) {
                if (pkgs.length === 0) {
                    bodyHtml = renderEmpty(org);
                } else {
                    bodyHtml = renderGallery(pkgs, org, null, buttonText);
                }
            }

            container.innerHTML = '<div class="fr-pkg-widget fr-pkg-widget-' + theme + '" style="' + primaryStyle(org) + '">' +
                '<div class="fr-pkg-container">' +
                    bodyHtml +
                    renderFooter(org) +
                '</div>' +
            '</div>';

            attachClickTracking(container, orgId);

        } catch (error) {
            console.error('Fundraisr Packages Widget Error:', error);
            container.innerHTML = '';
        }
    }

    function init() {
        var containers = document.querySelectorAll('#fundraisr-packages, [data-fundraisr-packages]');
        containers.forEach(initWidget);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.FundraisrPackagesWidget = { init: init, initWidget: initWidget };
})();
