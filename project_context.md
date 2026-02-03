# Project Context: Fundraisr

## Overview
**Fundraisr** is a fundraising platform tailored for youth sports organizations. It enables organizations to run Team Fundraising campaigns and sell Digital Sponsorship packages.

## Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, Lucide React
- **Backend:** Node.js, Express
- **Database:** MongoDB (Local & Atlas), Firebase (Auth & Legacy Data)
- **Deployment:** DigitalOcean App Platform (Docker)
- **Payments:** Stripe (primary), Square (legacy support)
- **Notifications:** Slack Integration

## Core Modules

### 1. Sponsorships (Current Focus)
- **Goal:** Allow organizations to sell digital ads/sponsorships.
- **Workflow:**
    1.  **Creation:** Organizers create "Packages" (price, description, features).
    2.  **Sales:** Public landing page (`/sponsor/:organizerId`) displays packages.
    3.  **Checkout:** Custom flow (`SponsorshipCheckout`) handling platform fees (5% + 0.30) vs processing fees.
    4.  **Fulfillment:** Sponsors get a dashboard to upload logos/ads. Organizers review and approve.
- **Key Files:**
    - `src/pages/SponsorshipLanding.jsx`: Public sales page. (Recently patched for stability).
    - `src/pages/SponsorDashboard.jsx`: Sponsor portal.
    - `server/routes/sponsorships.js`: API endpoints.

### 2. Team Fundraising
- **Goal:** Peer-to-peer fundraising similar to GoFundMe but for teams.
- **Key Files:**
    - `src/pages/Campaign.jsx`: Campaign landing page.
    - `src/pages/Dashboard.jsx`: Organizer overview.

## Recent Changes & Status
**Date:** Feb 1, 2026

1.  **Dashboard Refinement:**
    - **Organizer:** Reordered sidebar to prioritize "Sponsorships". Added "Admin Dashboard" link.
    - **Sponsor:** Added "Outstanding Actions" section (Amber alerts) for incomplete setups.
    - **Admin:** Improved fee status visibility.

2.  **Stability Fixes:**
    - **Usage of `package-lock.json`**: Regenerated to resolve `npm ci` Runtime Errors on deployment.
    - **Sponsorship Landing:** Added defensive checks (`Array.isArray`) to `publicContent` and `stats` mapping to prevent "White Screen of Death" crashes on live sites.

3.  **Fee Structure:**
    - Separated "Processing Fee" (~2.9%) from "Platform Fee" (5%).
    - Added ability to wafer platform fees via Admin.

## Active Issues / Known Risks
- **Deployment:** The `npm ci` process was recently failing due to lockfile mismatch. This was patched but should be monitored.
- **Data Integrity:** Some legacy data structures (e.g., `publicContent` blocks) might not match the expected schema, hence the recent patches in `SponsorshipLanding.jsx`.

## Directory Structure
- `/src/pages`: Main route components.
- `/src/components`: Reusable UI blocks (see `dashboard/` for detailed views).
- `/src/services`: Frontend API wrappers (`sponsorshipService.js`, `userService.js`).
- `/server/routes`: Express API definitions.
