# Fundraisr Pre-Launch Checklist

**Last Updated:** 2026-02-02
**Status:** In Progress

---

## 1. Security & Authentication

### Firebase Configuration
- [ ] Production Firebase project created (separate from dev)
- [ ] Authorized domains configured for production URL
- [ ] Firebase security rules reviewed and tightened
- [ ] API keys restricted to specific domains
- [ ] Anonymous/unused auth providers disabled

### Environment & Secrets
- [x] All `.env` files excluded from git (`.gitignore`)
- [ ] Production environment variables set on hosting platform
- [x] No hardcoded API keys, secrets, or credentials in codebase
- [ ] Stripe keys switched to production (not test keys) — *DEFERRED: Keys not available yet*
- [x] MongoDB connection string uses production cluster
- [ ] **IMPORTANT:** Rotate all secrets - `.env` files were previously committed to git history (commit `ab6765a`)

### API Security
- [ ] All sensitive routes require authentication
- [x] Team permission middleware working correctly
- [x] Rate limiting implemented on public endpoints (added `express-rate-limit`)
- [ ] Input validation on all API endpoints (especially payments)
- [ ] SQL/NoSQL injection prevention verified
- [ ] XSS protection in place (sanitize user content)

### Authentication Flows
- [ ] Password reset flow works end-to-end
- [ ] Session expiration handled gracefully
- [ ] Logout clears all sensitive data
- [ ] Failed login attempts logged/limited

---

## 2. Payment Processing (Critical)

> **Note:** Stripe production setup deferred until keys are available.

### Stripe Configuration
- [ ] Production Stripe account approved and verified
- [ ] Production API keys configured — *DEFERRED*
- [ ] Webhook endpoint registered in Stripe dashboard — *DEFERRED*
- [ ] Webhook signing secret configured — *DEFERRED*
- [ ] Test a real transaction with a real card (small amount)

### Payment Flows
- [ ] Complete checkout flow works
- [ ] Payment failure shows appropriate error message
- [ ] Duplicate payment prevention (idempotency)
- [ ] Fee calculations are accurate
- [ ] Fee waiver feature works for selected orgs
- [ ] Confirmation emails sent after successful payment
- [ ] Sponsorship record created with correct status

### Financial Compliance
- [ ] Refund process documented (even if manual)
- [ ] Receipt/invoice generation works
- [ ] Tax information handling (if applicable)
- [ ] Payout process to organizers documented

---

## 3. Database & Data

### MongoDB Production
- [x] Production cluster configured (MongoDB Atlas)
- [ ] Database user has minimum required permissions
- [ ] IP whitelist configured (or network peering)
- [ ] Connection pooling configured appropriately
- [ ] Indexes created for frequently queried fields:
  - [ ] `User.email`
  - [ ] `User.organizationProfile.slug`
  - [ ] `Sponsorship.organizerId`
  - [ ] `Sponsorship.sponsorEmail`
  - [ ] `Sponsorship.sponsorUserId`
  - [ ] `Package.organizerId`

### Data Integrity
- [ ] Required fields enforced in schemas
- [ ] Orphaned records handled (deleted org's sponsorships)
- [ ] Data migration scripts ready (if migrating from dev data)

### Backup & Recovery
- [ ] Automated backups enabled
- [ ] Backup retention policy set
- [ ] Test restore from backup at least once
- [ ] Point-in-time recovery enabled (if using Atlas)

### Future Work
- [ ] Create separate development MongoDB collection/database

---

## 4. Email System

### Email Service
- [x] Production email service configured
- [ ] Sender domain verified (SPF, DKIM, DMARC)
- [ ] From address configured (`noreply@getfundraisr.io`)
- [ ] Reply-to address configured

### Email Templates
- [ ] Sponsorship confirmation email works
- [ ] Team invitation email works
- [ ] All template variables populate correctly
- [ ] Emails render correctly on mobile
- [ ] Unsubscribe link works (if applicable)
- [ ] Test emails don't land in spam

### Email Content
- [ ] No placeholder text remaining
- [ ] Links in emails point to production URLs
- [ ] Company branding is correct

---

## 5. Infrastructure & Deployment

### Hosting
- [ ] Frontend deployed to production (Vercel/Netlify)
- [ ] Backend deployed to production (Railway/Render/Heroku)
- [ ] Custom domain configured
- [ ] SSL certificate active (HTTPS enforced)
- [x] CORS configured for production domains only — uses `ALLOWED_ORIGINS` env var

### Environment Variables
- [x] Environment variables configured correctly

```
# Frontend
VITE_API_URL=<production API URL>
VITE_FIREBASE_*=<production values>
VITE_STRIPE_PUBLISHABLE_KEY=<DEFERRED>

# Backend
MONGODB_URI=<production connection string> ✓
STRIPE_SECRET_KEY=<DEFERRED>
STRIPE_WEBHOOK_SECRET=<DEFERRED>
FRONTEND_URL=<production URL>
SENDGRID_API_KEY=<configured> ✓
```

### Performance
- [ ] Frontend assets minified and gzipped
- [ ] Images optimized (use WebP where possible)
- [ ] Lazy loading for images and heavy components
- [ ] API response times acceptable (<500ms for most endpoints)

---

## 6. Functional Testing

### Organizer Flows
- [ ] Sign up as new organizer
- [ ] Complete organization profile
- [ ] Create sponsorship package
- [ ] Edit/delete package
- [ ] View public sponsorship page
- [ ] Connect Stripe account
- [ ] View sponsorships received
- [ ] Invite team member
- [ ] Team member accepts invitation
- [ ] Team member sees correct permissions

### Sponsor Flows
- [ ] Browse organization's public page
- [ ] Select package
- [ ] Complete checkout (guest)
- [ ] Complete checkout (logged in)
- [ ] Receive confirmation email
- [ ] Submit branding materials
- [ ] Create sponsor account
- [ ] View sponsor dashboard with history
- [ ] Returning sponsor recognized by email

### Admin Flows
- [ ] Admin dashboard loads
- [ ] View all users
- [ ] Edit organization settings
- [ ] Change user roles
- [ ] View all sponsorships
- [ ] Update sponsorship status
- [ ] System settings work (fees, payment toggles)

### Edge Cases
- [ ] Invalid/expired invite token handled
- [ ] Non-existent organization slug shows 404
- [ ] Payment failure doesn't create orphan records
- [ ] Concurrent package edits handled
- [ ] Very long text inputs handled (truncation/validation)
- [ ] Special characters in org names/slugs handled

---

## 7. Mobile & Browser Compatibility

### Responsive Design
- [ ] All pages work on mobile (320px width)
- [ ] All pages work on tablet (768px width)
- [ ] Touch interactions work (no hover-only UI)
- [ ] Forms are usable on mobile keyboards

### Browser Testing
- [ ] Chrome (latest)
- [ ] Safari (latest + iOS Safari)
- [ ] Firefox (latest)
- [ ] Edge (latest)

---

## 8. Legal & Compliance

### Legal Documents
- [ ] Privacy Policy page exists and is linked
- [ ] Terms of Service page exists and is linked
- [ ] Cookie consent banner (if using cookies beyond essential)
- [ ] Acceptable Use Policy (optional but recommended)

### Privacy
- [ ] Data collection minimized
- [ ] User data deletion process documented
- [ ] No unnecessary personal data logged
- [ ] Third-party data sharing disclosed

### Payments
- [ ] Not storing credit card numbers (Stripe handles this)
- [ ] Clear pricing displayed before checkout
- [ ] Refund policy stated

---

## 9. Monitoring & Observability

### Error Tracking
- [ ] Error tracking service configured (Sentry, LogRocket, etc.) — *Recommended for production*
- [ ] Frontend errors captured — *Consider adding error boundary*
- [x] Backend errors captured — global error handler added
- [ ] Error alerts configured (email/Slack)

### Logging
- [x] Important actions logged (signups, payments, errors) — structured logger at `server/utils/logger.js`
- [x] Sensitive data not logged (passwords, full card numbers) — logger redacts sensitive fields
- [ ] Log retention policy set — *Depends on hosting platform*

### Uptime Monitoring
- [ ] Uptime monitor configured (UptimeRobot, Pingdom, etc.)
- [x] Health check endpoint exists (`/api/health`) — added with DB connection status
- [ ] Alert on downtime (email/SMS)

### Analytics
- [ ] Google Analytics or equivalent configured
- [ ] Key events tracked:
  - [ ] Page views
  - [ ] Sign ups
  - [ ] Package purchases
  - [ ] Checkout started vs completed

---

## 10. SEO & Marketing Readiness

### SEO Basics
- [x] Page titles set correctly
- [x] Meta descriptions set
- [x] Open Graph tags for social sharing — added to index.html
- [x] **Favicon configured** — created custom SVG favicon at `/public/favicon.svg`
- [ ] robots.txt allows indexing
- [ ] Sitemap generated (optional for launch)

### Organization Public Pages
- [ ] **OG image PNG conversion** — SVG created at `/public/og-image.svg`, needs conversion to PNG (1200x630)
  - Use tool like https://cloudconvert.com/svg-to-png or Figma to export
- [ ] Title shows organization name
- [ ] Description shows organization description

---

## 11. Support & Documentation

### User Support
- [ ] Support email configured and monitored
- [ ] Contact form works (if any)
- [ ] FAQ or help section (at least basic)

### Internal Documentation
- [ ] Deployment process documented
- [ ] Environment variable list documented
- [ ] Common issues and solutions documented
- [ ] Database access credentials stored securely (1Password, etc.)

---

## 12. Final Pre-Launch

### Go-Live Checklist
- [ ] DNS propagation complete (if new domain)
- [ ] Old test data cleared from production database
- [ ] Admin account created with secure password
- [ ] Team notified of launch time
- [ ] Monitoring dashboards open during launch
- [ ] Rollback plan ready (previous deploy accessible)

### Post-Launch Monitoring (First 24-48 hours)
- [ ] Watch error tracking dashboard
- [ ] Monitor server resources (CPU, memory)
- [ ] Check email deliverability
- [ ] Verify payment webhooks receiving correctly
- [ ] Respond quickly to any user-reported issues

---

## Quick Reference: Critical Blockers

| Item | Status | Notes |
|------|--------|-------|
| Production Stripe keys | DEFERRED | Not available yet |
| Stripe webhook configured | DEFERRED | Not available yet |
| Production MongoDB | DONE | Connected |
| Email service production | DONE | Configured |
| HTTPS enforced | TODO | Verify on deployment |
| Environment variables set | DONE | Verified |

---

## Action Items (Current Session)

1. [x] Work through Section 1: Security & Authentication
   - Added CORS configuration (uses `ALLOWED_ORIGINS` env var)
   - Added rate limiting (`express-rate-limit`)
   - Added health check endpoint (`/api/health`)
2. [x] Implement error logging (Section 9)
   - Created structured logger (`server/utils/logger.js`)
   - Added global error handler
   - Added uncaught exception handling
3. [x] Create OG image for social sharing — SVG created, needs PNG conversion
4. [x] Create custom favicon — `/public/favicon.svg`

## Remaining High Priority

- [ ] Convert OG image SVG to PNG (1200x630)
- [ ] Rotate all secrets (credentials were in git history)
- [ ] Set `ALLOWED_ORIGINS` env var on production server
- [ ] Add frontend error boundary
- [ ] Stripe production setup (when keys available)

---

## Notes

- Development MongoDB database to be created in the future
- Stripe setup will be completed when production keys are available
- `.env` files were previously committed to git - all secrets should be rotated before launch
