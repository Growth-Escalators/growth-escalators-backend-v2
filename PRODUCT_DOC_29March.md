# Growth Escalators — Product Documentation

> **Generated:** 29 March 2026
> **Version:** 1.0
> **Production URL:** https://web-production-311da.up.railway.app

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Data Flow](#4-data-flow)
5. [API Endpoints](#5-api-endpoints)
6. [Database Schema](#6-database-schema)
7. [Environment Variables & Config](#7-environment-variables--config)
8. [Current Known Issues & TODOs](#8-current-known-issues--todos)
9. [External Integrations](#9-external-integrations)
10. [Deployment Setup](#10-deployment-setup)

---

## 1. Project Overview

### What It Does

Growth Escalators is a **full-stack CRM, billing, and marketing automation platform** built for an Indian D2C performance marketing agency. It manages the entire client lifecycle — from lead capture to deal closure to recurring invoicing — while orchestrating multi-channel outreach (WhatsApp, email, social media) and providing real-time Meta Ads performance dashboards.

### Purpose

Replace fragmented SaaS tools (HubSpot, Zoho, spreadsheets) with a single, tightly integrated system purpose-built for an agency that runs Meta Ads for D2C brands. The platform handles:

- **Lead management** — Capture, score, assign, and nurture leads from multiple sources (Tally forms, Cal.com bookings, Cashfree purchases, Google Places discovery)
- **Sales pipeline** — Multi-pipeline Kanban boards with drag-and-drop, deal tracking, round-robin assignment
- **Client onboarding** — Automated ClickUp task creation on deal milestones
- **Billing** — GST-compliant invoicing (CGST/SGST + IGST), PDF generation, recurring auto-draft, payment tracking
- **Meta Ads monitoring** — Campaign dashboards, spend alerts, weekly client reports (PDF + WhatsApp delivery)
- **Multi-channel outreach** — WhatsApp Cloud API, Brevo email sequences, social media scheduling (Facebook + Instagram)
- **Team operations** — SOD/EOD Slack digests, overdue task alerts, audit logging, RBAC permissions
- **D2C SLO funnel** — Public landing page, Cashfree checkout, upsell flow, post-purchase nurture

### Who Uses It

| Role | Users | Access |
|------|-------|--------|
| Admin (Owner) | Jatin Agrawal | Full CRM + billing + system health |
| Sales | Sakcham | Contacts, pipeline, discovery, sequences |
| Manager (Ads) | Vishal | Ads dashboard, reports, spend alerts |
| Staff | Nimisha, Keshav | Contacts (masked data), limited pipeline |

**External touchpoints:** D2C brand founders (checkout/landing pages), agency clients (WhatsApp reports)

---

## 2. Tech Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20+ | Runtime |
| TypeScript | 5.9 | Type safety |
| Express | 5.2 | HTTP framework |
| Drizzle ORM | 0.45 | Database ORM & migrations |
| PostgreSQL | 16 | Primary database (Railway) |
| Socket.io | 4.8 | Real-time WhatsApp inbox |
| node-cron | 4.2 | Scheduled tasks (7 cron jobs) |
| PDFKit | 0.18 | Invoice PDF generation |
| ExcelJS | 4.4 | CSV/Excel export |
| jsonwebtoken | 9.0 | JWT authentication |
| @node-rs/argon2 | 2.0 | Password hashing |
| multer | 2.1 | File upload handling |
| morgan | 1.10 | Request logging |
| express-rate-limit | 8.3 | API rate limiting |
| pg | 8.20 | PostgreSQL driver |

### Frontend — Admin CRM (`/crm/`)

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3 | UI framework |
| Vite | 6.0 | Build tool |
| React Router | 6.28 | Client-side routing |
| Tailwind CSS | 3.4 | Styling |
| @hello-pangea/dnd | — | Pipeline drag-and-drop |
| lucide-react | — | Icon library |
| socket.io-client | — | Real-time inbox |

### Frontend — Client SLO (`/`)

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2 | UI framework |
| Vite | 5.1 | Build tool |
| React Router | 6.22 | Client-side routing |
| Tailwind CSS | 3.4 | Styling |
| @cashfreepayments/cashfree-js | — | Payment gateway SDK |

### External Services

| Service | Purpose |
|---------|---------|
| Railway | Hosting (backend + PostgreSQL + static) |
| Cloudflare R2 | Media/file storage (S3-compatible) |
| Meta Graph API v19.0 | WhatsApp Cloud API, CAPI, Ads API |
| Brevo (Sendinblue) | Transactional + sequence emails |
| Cashfree | Payment gateway (India) |
| ClickUp | Task management (team-level API) |
| Slack | Team notifications (bot) |
| Cal.com | Booking/scheduling |
| Google Places API | Lead discovery |

---

## 3. Architecture

### Folder Structure

```
growth-escalators-backend/
├── src/                            # Backend (Express + TypeScript)
│   ├── index.ts                   # Server entry — routes, cron, Socket.io
│   ├── db/
│   │   ├── schema.ts             # 44 Drizzle ORM table definitions
│   │   ├── index.ts              # DB connection pool (max 20)
│   │   ├── seed.ts               # Initial data seeder
│   │   └── migrations/           # 15 SQL migration files
│   ├── routes/                    # 32 Express router files
│   │   ├── auth.ts               # Login, forgot/reset password
│   │   ├── contacts.ts           # CRUD, bulk ops, export
│   │   ├── deals.ts              # Pipeline deals
│   │   ├── billing.ts            # Invoices, payments, MRR
│   │   ├── ads.ts                # Meta Ads dashboard
│   │   ├── social.ts             # FB/IG posting, OAuth
│   │   ├── inbox.ts              # Real-time WhatsApp
│   │   ├── discover.ts           # Google Places search
│   │   ├── webhooks.ts           # Meta WA, Cal.com, Tally, Chatwoot
│   │   ├── cashfree.ts           # Payment gateway
│   │   └── ... (22 more)
│   ├── services/                  # 18 business logic modules
│   │   ├── sodEodService.ts      # SOD/EOD Slack digests
│   │   ├── blockerAlertService.ts # Overdue task alerts
│   │   ├── spendAlertService.ts  # Ad spend monitoring
│   │   ├── bookingService.ts     # Booking → contact → deal pipeline
│   │   ├── clickupService.ts     # Auto-task creation
│   │   ├── metaCapi.ts           # Meta Conversion API
│   │   ├── pdfService.ts         # Invoice PDF generation
│   │   ├── slackService.ts       # Slack messaging
│   │   └── ... (10 more)
│   ├── middleware/
│   │   ├── auth.ts               # JWT (requireAuth, requireStrictAuth)
│   │   ├── rbac.ts               # Role-based access (5 roles, 30+ perms)
│   │   ├── idempotency.ts        # Webhook deduplication
│   │   └── validateWebhook.ts    # Meta signature verification
│   ├── utils/
│   │   ├── clickupSlack.ts       # Team member constants + helpers
│   │   ├── clickupTasks.ts       # Team-level task fetcher
│   │   ├── audit.ts              # Audit event logger
│   │   └── r2.ts                 # Cloudflare R2 storage
│   ├── workers/
│   │   ├── sequenceWorker.ts     # Email sequence processor
│   │   ├── socialPostWorker.ts   # Scheduled post publisher
│   │   └── stuckJobWorker.ts     # Dead job cleanup
│   └── scripts/                   # DB seeders, import utilities
│
├── admin/                          # CRM Admin SPA
│   └── src/
│       ├── App.jsx               # Router (18 protected routes)
│       ├── pages/                # 18 page components
│       │   ├── DashboardPage.jsx
│       │   ├── ContactsPage.jsx
│       │   ├── PipelinePage.jsx  # Kanban drag-and-drop
│       │   ├── BillingPage.jsx   # GST invoicing
│       │   ├── AdsPage.jsx       # Meta Ads dashboard
│       │   ├── SocialPage.jsx    # FB/IG posting + OAuth
│       │   ├── InboxPage.jsx     # Real-time WhatsApp
│       │   ├── LeadDiscoveryPage.jsx
│       │   ├── AnalyticsPage.jsx
│       │   └── ... (9 more)
│       └── components/           # 10 shared components
│           ├── Sidebar.jsx       # Navigation (5 sections, role-based)
│           ├── ContactSlideIn.jsx # Contact detail panel
│           └── ... (8 more)
│
├── client/                         # Public SLO Funnel SPA
│   └── src/
│       ├── App.jsx               # Router (6 public routes)
│       └── pages/
│           ├── LandingPage.jsx   # D2C sales page
│           ├── CheckoutPage.jsx  # Cashfree payment
│           ├── ThankYouPage.jsx  # Post-purchase
│           ├── ConsultingPage.jsx # Upsell + booking
│           ├── AgencyPage.jsx    # Agency signup
│           └── CommunityPage.jsx
│
├── public/                         # Built frontend assets
│   ├── admin/                    # Compiled CRM (served at /crm/)
│   └── client/                   # Compiled SLO (served at /)
│
├── consulting/                     # Consulting landing page assets
├── n8n-workflows/                  # n8n automation configs
│   ├── outreach/
│   └── seo/
├── dist/                           # Compiled backend (tsc output)
├── drizzle.config.ts
├── tsconfig.json
├── Procfile                        # web: node dist/index.js
├── railway.json                    # NIXPACKS builder config
└── package.json
```

### Key Modules

| Module | Responsibility |
|--------|---------------|
| **Auth & RBAC** | JWT tokens (8h expiry), token versioning for revocation, 5 roles, 30+ granular permissions |
| **Contact Engine** | Deduplication by channel, multi-channel (WA/email/phone/LinkedIn/IG), scoring, smart lists |
| **Pipeline** | Multi-pipeline support, Kanban UI, stage customization, deal value tracking |
| **Billing** | GST + non-GST invoices, CGST/SGST/IGST auto-calc, PDF generation, recurring auto-draft, payment tracking |
| **Ads Dashboard** | Meta Marketing API integration, spend/ROAS/CPP metrics, account-level + campaign-level data |
| **Social Media** | Facebook OAuth flow, post scheduling, R2 media library, calendar view |
| **WhatsApp Inbox** | Real-time via Socket.io, template messaging, media support, read receipts |
| **Automation** | Email sequences (Brevo), webhook-triggered jobs, round-robin booking assignment |
| **Discovery** | Google Places API search, fit scoring, qualification workflow, CSV/Excel export, budget tracking |
| **Notifications** | SOD/EOD Slack digests, blocker alerts, spend alerts, deal milestone notifications |

---

## 4. Data Flow

### 4.1 Lead Capture → Deal → Client

```
[Source]                    [Backend]                        [CRM]

Tally Form ──webhook──→ POST /webhooks/tally ──→ findOrCreateContact()
Cal.com    ──webhook──→ POST /webhooks/calcom ──→ processBooking()
Cashfree   ──webhook──→ POST /api/cashfree/webhook
Google     ──discover─→ POST /api/outreach/discover
Manual     ──CRM UI──→ POST /contacts
                              │
                              ▼
                     ┌─────────────────┐
                     │    contacts     │ ← score, source, tags
                     │ contactChannels │ ← email, phone, WA
                     └────────┬────────┘
                              │ Auto-create deal
                              ▼
                     ┌─────────────────┐
                     │     deals       │ ← stage, value, pipeline
                     └────────┬────────┘
                              │ Stage transitions trigger:
                              ├──→ ClickUp task (onboarding/followup)
                              ├──→ Slack alert (#sales-bd)
                              └──→ Sequence enrolment
                              │
                     [Deal Won] │
                              ▼
                     ┌─────────────────┐
                     │ billing_clients │ ← retainer, GST info
                     │    invoices     │ ← monthly auto-draft
                     └─────────────────┘
```

### 4.2 Booking Flow (Cal.com)

```
Visitor → Cal.com booking → POST /webhooks/calcom
  │
  ├─ 1. Extract attendee data (name, email, phone, answers)
  ├─ 2. Find/create contact + channels
  ├─ 3. Score booking (qualificationService)
  │     ├─ Ad spend: 10-40 pts
  │     ├─ Decision maker: 30 pts
  │     ├─ Revenue: 10-20 pts
  │     └─ Meta ads running: 10 pts
  │     → Hot (70+) | Warm (40-69) | Cold (<40)
  ├─ 4. Create/update deal (D2C or Healthcare pipeline)
  ├─ 5. Insert booking record
  ├─ 6. Enrol in email sequence (tier-based)
  ├─ 7. Create jobs (booking_processed, hot_lead_alert)
  ├─ 8. Fire Meta CAPI events (Lead + Schedule)
  └─ 9. Create ClickUp call prep task
```

### 4.3 Payment Flow (Cashfree)

```
Client SLO → CheckoutPage → POST /api/cashfree/create-order
  │                                    │
  │                           Cashfree payment session
  │                                    │
  ▼                                    ▼
Cashfree SDK checkout ──success──→ POST /api/cashfree/webhook
                                       │
                                       ├─ Create contact + WA/email channels
                                       ├─ Create deal (value from order)
                                       ├─ Fire CAPI Purchase event
                                       ├─ Send WhatsApp template (d2c_funnel_welcome)
                                       └─ Redirect → /consulting?name=...&bumps=...
                                              │
                                         ConsultingPage
                                              │ [Optional upsell]
                                              └─→ POST /api/cashfree/upsell
```

### 4.4 Notification Flow

```
┌──────────────────────────────────────────────────────────┐
│                    CRON SCHEDULER                         │
├──────────────────────────────────────────────────────────┤
│ 10:00 AM IST (Mon-Sat)  → sendSODDigest()               │
│   Posts to #sod-eod (C08EMRX2HHN)                        │
│   Each team member gets personal task list               │
│   Jatin + Sakcham get team overview                      │
│                                                          │
│ 7:00 PM IST (Mon-Sat)  → sendEODSummary()               │
│   Posts completed + open tasks to #sod-eod               │
│                                                          │
│ 10:15 AM + 5:00 PM IST → checkAndAlertBlockers()        │
│   2+ days overdue → #general (C07489V0RB2)               │
│   5+ days overdue → also DM Jatin                        │
│                                                          │
│ Every hour              → checkSpendAlerts()             │
│   Balance < 24h runway → DM Jatin + Vishal               │
│   6-hour cooldown per account                            │
│                                                          │
│ 9:00 AM IST (1st of month) → generateMonthlyDraftInvoices│
│                                                          │
│ 10:00 AM IST (daily)   → Overdue invoice detection       │
│   Overdue → Slack alert to #sales-bd                     │
└──────────────────────────────────────────────────────────┘
```

### 4.5 WhatsApp Real-Time Inbox

```
WhatsApp Cloud API → POST /webhooks/meta-wa
  │
  ├─ Idempotency check (processedEvents table)
  ├─ Find contact by phone number
  ├─ Save inbound message (messages table)
  ├─ Log event (events table)
  └─ Emit Socket.io event → InboxPage (live update)

Admin sends reply via InboxPage:
  POST /api/inbox/conversations/:contactId/send
  │
  ├─ Call Meta WhatsApp Cloud API
  ├─ Save outbound message
  └─ Emit Socket.io event → update UI
```

---

## 5. API Endpoints

### Authentication (No Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/login` | Login with email + password |
| POST | `/auth/forgot-password` | Send 6-digit reset code via Brevo |
| POST | `/auth/reset-password` | Reset password with code |
| GET | `/auth/me` | Get current user (requires JWT) |

### Health & Stats (Public)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check with DB status |
| GET | `/stats` | Production statistics |
| GET | `/api/system/health/ping` | Simple ping |
| GET | `/api/system/health` | Detailed system health (auth required) |

### Webhooks (Public, Higher Rate Limit: 300/min)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/webhooks/meta-wa` | Meta WA verification challenge |
| POST | `/webhooks/meta-wa` | Inbound WhatsApp messages + status |
| POST | `/webhooks/calcom` | Cal.com booking events |
| POST | `/webhooks/tally` | Tally form submissions |
| POST | `/webhooks/chatwoot` | Chatwoot conversation events |

### Contacts (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/contacts` | List (filters: status, source, search, assignedTo, tags, segment) |
| GET | `/contacts/counts` | Smart list counts (hot, uncontacted, ecom, consulting) |
| GET | `/contacts/:id` | Single contact with channels |
| GET | `/contacts/:id/conversation` | Unified timeline (messages, events, bookings, notes) |
| GET | `/contacts/:id/notes` | Contact notes |
| POST | `/contacts` | Create contact (firstName required) |
| POST | `/contacts/:id/notes` | Add note |
| POST | `/contacts/:id/channels` | Add channel (whatsapp/email/phone/linkedin/ig) |
| PATCH | `/contacts/:id` | Update contact fields |
| PATCH | `/contacts/:id/notes/:noteId` | Update note |
| DELETE | `/contacts/:id/notes/:noteId` | Delete note |
| POST | `/contacts/bulk-tag` | Bulk tag (add/replace/remove) |
| POST | `/contacts/bulk-assign` | Bulk assign |
| POST | `/contacts/bulk-delete` | Soft delete |
| POST | `/contacts/bulk-sequence` | Enrol in sequence |
| POST | `/contacts/export` | Export to CSV |

### Deals (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/deals` | List (filters: stage, contactId, serviceType, pipelineId, assignedTo) |
| POST | `/deals` | Create deal (contactId, title required) |
| PATCH | `/deals/:id` | Update (stage, value, metadata, etc.) |
| POST | `/deals/bulk-create` | Create for multiple contacts |
| POST | `/deals/bulk-update` | Bulk update deals |
| POST | `/deals/add-or-update` | Upsert deal |

### Pipelines (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/pipelines` | List active pipelines |
| GET | `/api/pipelines/:id/deals` | Kanban data: deals grouped by stage |
| POST | `/api/pipelines` | Create pipeline (name, slug, stages) |
| POST | `/api/pipelines/reorder` | Reorder pipelines |
| POST | `/api/pipelines/duplicate/:id` | Duplicate pipeline |
| PATCH | `/api/pipelines/:id` | Update pipeline |
| DELETE | `/api/pipelines/:id` | Delete (no deals attached) |

### Billing (Auth + Permissions Required)

| Method | Path | Purpose | Permission |
|--------|------|---------|------------|
| GET | `/api/billing/clients` | List billing clients | billingView |
| POST | `/api/billing/clients` | Create client | billingManageClients |
| PATCH | `/api/billing/clients/:id` | Update client | billingManageClients |
| DELETE | `/api/billing/clients/:id` | Soft delete | billingManageClients |
| GET | `/api/billing/invoices` | List invoices (clientId, status, month, year) | billingView |
| GET | `/api/billing/invoices/:id` | Invoice + items + payments | billingView |
| GET | `/api/billing/invoices/:id/pdf` | Download PDF | billingDownload |
| POST | `/api/billing/invoices` | Create invoice | billingCreate |
| PATCH | `/api/billing/invoices/:id` | Update invoice | billingEdit |
| DELETE | `/api/billing/invoices/:id` | Cancel invoice | billingEdit |
| POST | `/api/billing/invoices/:id/send` | Mark sent | billingEdit |
| POST | `/api/billing/invoices/:id/payment` | Record payment | billingMarkPaid |
| POST | `/api/billing/generate-monthly` | Generate monthly drafts | billingCreate |
| GET | `/api/billing/mrr` | MRR + outstanding metrics | billingViewMrr |
| GET | `/api/billing/stats` | Billing stats | billingView |
| GET | `/api/billing/payments` | Payment history | billingView |

### Meta Ads Dashboard (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/ads/accounts` | List ad accounts |
| GET | `/api/ads/campaigns` | Campaigns (accountId, dateRange) |
| GET | `/api/ads/insights` | Insights (accountId, dateRange, level) |
| GET | `/api/ads/adsets` | Ad set data |
| GET | `/api/ads/ads` | Individual ad data |

### Reports (Auth + reportsView)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/reports/clients` | List clients for reports |
| GET | `/api/reports/generate` | Weekly report JSON (clientId, weekOf) |
| GET | `/api/reports/pdf` | Download report PDF |
| POST | `/api/reports/send-pdf` | Generate + send via WhatsApp |

### Social Media (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/social/accounts` | Connected accounts |
| POST | `/api/social/accounts/connect-facebook` | Manual FB connect |
| DELETE | `/api/social/accounts/:id` | Disconnect account |
| GET | `/api/social/oauth/facebook/start` | Begin Facebook OAuth |
| GET | `/api/social/oauth/facebook/callback` | OAuth callback |
| POST | `/api/social/posts` | Create post (socialAccountIds[], content) |
| GET | `/api/social/posts` | List posts (status filter) |
| DELETE | `/api/social/posts/:id` | Cancel scheduled post |
| POST | `/api/social/upload` | Upload media to R2 |
| GET | `/api/social/calendar` | Posts for calendar month |
| GET | `/api/social/library` | List R2 files (type, search) |
| DELETE | `/api/social/library/:key` | Delete R2 file |

### WhatsApp Inbox (Auth Required + Socket.io)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/inbox/conversations` | List conversations |
| GET | `/api/inbox/conversations/:contactId/messages` | Message history |
| POST | `/api/inbox/conversations/:contactId/send` | Send WA message |

### Email Templates (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/email-templates` | List active templates |
| GET | `/api/email-templates/stats` | Template statistics |
| GET | `/api/email-templates/:id` | Single template |
| POST | `/api/email-templates` | Create + auto-sync to Brevo |
| PATCH | `/api/email-templates/:id` | Update + re-sync if content changed |
| DELETE | `/api/email-templates/:id` | Soft delete |
| POST | `/api/email-templates/:id/sync` | Force sync to Brevo |
| POST | `/api/email-templates/:id/send-test` | Send test email (toEmail required) |
| POST | `/api/email-templates/sync-all` | Sync all (admin only) |

### Sequences (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/sequences` | List sequences |
| GET | `/sequences/stats` | Sequences + enrolment counts |
| GET | `/sequences/enrolments` | Active enrolments for contact |
| POST | `/sequences` | Create sequence |
| POST | `/sequences/enrol` | Enrol contact |
| PATCH | `/sequences/:id` | Update sequence |
| DELETE | `/sequences/enrolments/:id` | Cancel enrolment |

### Lead Discovery (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/outreach/discover` | Run Google Places search |
| GET | `/api/outreach/discover/searches` | List recent searches |
| GET | `/api/outreach/discover/searches/:id/results` | Search results (by fitScore) |
| PATCH | `/api/outreach/discover/results/:id` | Update qualification status |
| POST | `/api/outreach/discover/import` | Import leads to contacts |
| GET | `/api/outreach/discover/export` | Export CSV/Excel |
| GET | `/api/outreach/discover/budget` | Monthly API usage |
| GET | `/api/outreach/discover/stats` | Aggregate stats |

### Marketing Accounts (Auth + Permissions)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/marketing/accounts` | List accounts (MARKETING_VIEW) |
| POST | `/api/marketing/accounts` | Add account (MARKETING_MANAGE) |
| POST | `/api/marketing/accounts/:id/request-removal` | Request removal |
| POST | `/api/marketing/accounts/:id/approve-removal` | Approve (admin) |
| POST | `/api/marketing/accounts/:id/reactivate` | Reactivate (admin) |
| GET | `/api/marketing/accounts/:id/history` | Account history |

### Analytics (Auth + reportsView)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/analytics/lead-sources` | Lead source breakdown |
| GET | `/api/analytics/funnel` | 5-stage conversion funnel |
| GET | `/api/analytics/trends` | Contact trends (days param) |

### Meta CAPI (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/capi/status` | CAPI status + recent events |
| POST | `/api/capi/test` | Fire test event |
| POST | `/api/capi/manual` | Manual CAPI event (contactId, eventName) |

### ClickUp (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/clickup/setup` | Auto-setup list |
| GET | `/api/clickup/workspace` | Workspace members |
| GET | `/api/clickup/tasks/:contactId` | Tasks for contact |
| POST | `/api/clickup/test` | Create test task |
| POST | `/api/clickup/create` | Manual task creation |

### Blockers (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/blockers` | Current overdue tasks |
| POST | `/api/blockers/check` | Manual trigger |
| POST | `/api/blockers/dismiss/:taskId` | Dismiss for 24h |

### Permissions & RBAC (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/permissions/me` | Current user permissions |
| GET | `/api/permissions/users` | List users (owner only) |
| GET | `/api/permissions/users/:userId` | User permissions (owner only) |
| PUT | `/api/permissions/users/:userId` | Update permissions (owner only) |

### Audit (Auth + AUDIT_VIEW)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/audit/events` | List events (filters: action, userId, from, to) |
| GET | `/api/audit/users` | Users for filter dropdown |
| GET | `/api/audit/export` | Export CSV (admin only) |

### System (Auth + Admin)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/system/test-sod` | Trigger SOD manually |
| POST | `/api/system/test-eod` | Trigger EOD manually |
| POST | `/api/system/test-blocker` | Trigger blocker check |

### Bookings & Jobs (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/bookings` | List bookings (tier, dateFrom) |
| GET | `/bookings/:id` | Booking + contact + deal |
| GET | `/jobs/pending` | Pending jobs (n8n polling) |
| PATCH | `/jobs/:id/claim` | Mark processing |
| PATCH | `/jobs/:id/complete` | Mark completed |
| PATCH | `/jobs/:id/fail` | Mark failed |

### Messages & Email (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/messages` | Messages for contact |
| POST | `/messages` | Create message record |
| POST | `/messages/send/whatsapp` | Send WA template |
| POST | `/email/send` | Send sequence email |
| POST | `/email/contact` | Add/update Brevo contact |
| POST | `/email/manual` | Send manual email |

### Booking Funnels (Public)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/book/:slug` | Round-robin redirect to Cal.com |
| POST | `/book/funnels` | Create funnel |
| GET | `/book/funnels` | List funnels |
| GET | `/book/funnels/:slug/stats` | Funnel stats |
| POST | `/book/funnels/:slug/members` | Add member |
| PATCH | `/book/funnels/:slug/members/:memberId` | Update member |
| POST | `/book/funnels/:slug/reset` | Reset counts |

### Cashfree Payments (Public)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/cashfree/create-order` | Create payment session |
| POST | `/api/cashfree/webhook` | Payment success handler |
| GET | `/api/cashfree/order/:orderId` | Order details (thank-you page) |
| POST | `/api/cashfree/upsell` | Upsell payment |

### Search (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/search?q=` | Global search (contacts + deals, min 2 chars) |

### Automation Hub (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/automations/hub-stats` | Hub statistics |

**Total: 140+ endpoints across 32 route files**

---

## 6. Database Schema

### Overview

- **ORM:** Drizzle ORM with PostgreSQL
- **Total Tables:** 44
- **Connection Pool:** Max 20, min 2, 30s idle timeout, 2s connect timeout
- **All monetary values:** Stored in paise (1 INR = 100 paise)
- **All timestamps:** UTC (no timezone storage)
- **Multi-tenancy:** All tables reference `tenants.id`

### Core Tables

#### tenants
Root multi-tenant table. All other tables reference this.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | gen_random_uuid() |
| name | TEXT | |
| slug | TEXT | UNIQUE |
| plan | TEXT | Default: 'agency_internal' |
| settings | JSONB | Default: {} |
| isActive | BOOLEAN | Default: true |
| createdAt | TIMESTAMP | |

#### users
CRM admin panel login accounts.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| tenantId | UUID (FK) | → tenants.id |
| name | TEXT | |
| email | TEXT | UNIQUE |
| passwordHash | TEXT | argon2 hashed |
| role | TEXT | admin / manager_ops / manager_ads / sales / staff |
| tokenVersion | INTEGER | For JWT revocation |
| createdAt | TIMESTAMP | |

#### contacts
Central lead/customer record. Append-only for analytics integrity.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| tenantId | UUID (FK) | Indexed |
| firstName, lastName | TEXT | firstName required |
| companyName | TEXT | |
| score | INTEGER | Default: 0 |
| status | TEXT | lead / qualified / customer / lost. Indexed |
| source | TEXT | tally / calcom / cashfree / manual / discovery |
| sourceDetail | TEXT | |
| assignedTo | TEXT | Team member name |
| businessType | TEXT | |
| tags | TEXT[] | Default: [] |
| notes | TEXT | |
| metadata | JSONB | Default: {} |
| optedInWa, optedInEmail | BOOLEAN | Default: false |
| doNotContact | BOOLEAN | Default: false |
| lastContactedAt, lastActivityAt | TIMESTAMP | |
| createdAt, updatedAt | TIMESTAMP | |

**Indexes:** tenant_id, status, tenant+created, tenant+assigned, tenant+firstName

#### contact_channels
Multi-channel contact info. One contact has many channels.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| contactId | UUID (FK) | → contacts.id |
| channelType | TEXT | whatsapp / email / phone / linkedin / instagram |
| channelValue | TEXT | |
| isPrimary | BOOLEAN | |
| verified | BOOLEAN | |

**Unique constraint:** (contactId, channelType, channelValue)

#### deals
Sales pipeline opportunities.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| tenantId | UUID (FK) | |
| contactId | UUID (FK) | → contacts.id |
| pipelineId | UUID (FK) | → pipelines.id |
| title | TEXT | |
| stage | TEXT | Default: 'lead' |
| value | NUMERIC(12,2) | |
| dealValue | INTEGER | |
| serviceType | TEXT | |
| assignedTo | TEXT | |
| lostReason, wonNotes, notes | TEXT | |
| expectedCloseDate | DATE | |
| closedAt | TIMESTAMP | |
| metadata | JSONB | |

**Indexes:** tenant_id, contact_id, pipeline_id, contact+pipeline, tenant+stage, tenant+assigned

#### pipelines
Sales pipeline definitions. Stages stored as JSONB array.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| tenantId | UUID (FK) | |
| name | TEXT | |
| slug | TEXT | UNIQUE per tenant |
| stages | JSONB | Array of stage objects |
| color | TEXT | Default: '#F97316' |
| isActive | BOOLEAN | Default: true |
| sortOrder | INTEGER | |

### Communication Tables

#### messages
All inbound/outbound messages across channels.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| contactId | UUID (FK) | Indexed |
| channel | TEXT | whatsapp / email / sms |
| direction | TEXT | inbound / outbound |
| externalId | TEXT | WA message ID |
| templateName | TEXT | |
| content | TEXT | |
| messageType | TEXT | text / image / document |
| mediaUrl | TEXT | |
| status | TEXT | sent / delivered / read / failed |
| sentAt | TIMESTAMP | |

#### events
Append-only immutable event log. Never update or delete.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| contactId | UUID (FK) | |
| eventType | TEXT | message_sent, booking_created, etc. |
| channel | TEXT | |
| direction | TEXT | inbound / outbound |
| payload | JSONB | |
| occurredAt | TIMESTAMP | Indexed |

### Billing Tables

#### billing_clients
Invoicing entity. GST-compliant with Indian tax system.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| name | TEXT | |
| isGst | BOOLEAN | GST or non-GST client |
| gstin | TEXT | |
| taxType | TEXT | igst / cgst_sgst |
| retainerAmount | INTEGER | In paise |
| metaAdAccountId | TEXT | Meta ads account link |
| sacCode | TEXT | Default: '9983' |
| invoiceDayOfMonth | INTEGER | 1-31 |

#### invoices
Full GST compliance with CGST/SGST/IGST. All amounts in paise.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| clientId | UUID (FK) | → billing_clients.id |
| invoiceNumber | TEXT | UNIQUE. Format: GE/GST/2026-27/001 |
| invoiceType | TEXT | gst / non_gst |
| status | TEXT | draft / sent / paid / partially_paid / overdue / cancelled |
| subtotal, totalAmount, amountPaid, amountDue | INTEGER | In paise |
| cgstRate, sgstRate, igstRate | REAL | Percentage |
| cgstAmount, sgstAmount, igstAmount | INTEGER | In paise |

#### invoice_line_items
Detailed invoice items. Multiple per invoice.

#### payments
Payment tracking. Supports partial payments.

| Column | Type | Notes |
|--------|------|-------|
| amount | INTEGER | In paise |
| paymentMode | TEXT | bank_transfer / upi / cheque / cash / other |

#### invoice_series
Atomic counter for sequential invoice numbering per financial year.

### Social & Ads Tables

#### social_accounts
Facebook/Instagram connected accounts. Tokens encrypted with AES-256-CBC.

#### social_posts
Content calendar with scheduling. Status: draft → scheduled → published/failed.

#### marketing_accounts
Meta Ads ad accounts with removal workflow and spend alert cooldown.

#### ads_insights_cache
Caches Meta API responses with TTL to reduce API calls.

### Automation Tables

#### sequences
Email drip campaign definitions. Steps stored as JSONB array.

#### sequence_enrolments
Contact enrollment in sequences. Queue polling via (status, nextStepAt) index.

#### jobs
Background job queue with idempotency, retry logic (max 3), exponential backoff.

### Funnel Tables

#### funnels, funnel_members, funnel_assignments
Round-robin booking allocation with weighted distribution and audit logging.

### Discovery Tables

#### discovery_searches, discovery_results, discovery_api_usage
Google Places API integration with fit scoring, qualification workflow, and monthly cost tracking.

### SEO Tables (Phase 2)

8 tables for SEO automation (planned feature):
- **client_knowledge_base** — Brand strategy briefing
- **client_pages** — Page inventory with WordPress integration
- **keyword_rankings** — Daily position tracking
- **backlink_data** — Backlink monitoring
- **content_gap_analysis** — Content optimization opportunities
- **seo_opportunities** — Actionable SEO items
- **site_health_metrics** — Core Web Vitals tracking
- **brand_mentions** — Linked/unlinked mention tracking

### Other Tables

| Table | Purpose |
|-------|---------|
| user_permissions | 33 granular permission columns per user |
| password_reset_tokens | 6-digit codes with 15-min expiry |
| contact_notes | Internal notes on contacts |
| clients | Won deal → client (retainer, services, onboarding) |
| bookings | Cal.com bookings with qualification scoring |
| tasks | CRM task management |
| wa_templates | WhatsApp approved message templates |
| email_templates | Brevo-synced email templates |
| processed_events | Webhook idempotency guard |
| audit_events | System-wide action log |

### Entity Relationships

```
tenants (root)
├── users ─── user_permissions
│             password_reset_tokens
├── contacts ─── contact_channels
│                contact_notes
│                deals ─── clients
│                          bookings
│                          tasks
│                messages
│                events
│                sequence_enrolments ─── sequences
├── pipelines
├── billing_clients ─── invoices ─── invoice_line_items
│                                    payments
│                       invoice_series
├── social_accounts ─── social_posts
├── marketing_accounts ─── ads_insights_cache
├── funnels ─── funnel_members
│               funnel_assignments
├── discovery_searches ─── discovery_results
│                          discovery_api_usage
├── email_templates
├── wa_templates
├── jobs
└── audit_events
```

---

## 7. Environment Variables & Config

### Required Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing key | Random 64-char string |
| `PORT` | Server port | `3000` (default) |

### Meta/Facebook

| Variable | Purpose |
|----------|---------|
| `META_ACCESS_TOKEN` | Graph API access token |
| `META_ADS_TOKEN` | Marketing API token (fallback to META_ACCESS_TOKEN) |
| `META_APP_ID` | Facebook App ID (for OAuth) |
| `META_APP_SECRET` | Facebook App Secret (webhook signature + OAuth) |
| `META_PHONE_NUMBER_ID` | WhatsApp Business phone number |
| `META_WABA_ID` | WhatsApp Business Account ID |
| `META_VERIFY_TOKEN` | Webhook verification token |
| `META_CAPI_TOKEN` | Conversion API token |
| `META_PIXEL_ID` | Facebook Pixel ID |

### Slack

| Variable | Purpose |
|----------|---------|
| `SLACK_BOT_TOKEN` | Slack Bot OAuth token (xoxb-...) |

### Brevo (Email)

| Variable | Purpose |
|----------|---------|
| `BREVO_API_KEY` | Brevo API key |

### ClickUp

| Variable | Purpose |
|----------|---------|
| `CLICKUP_API_TOKEN` | ClickUp personal API token |
| `CLICKUP_LIST_ID` | Default task list ID |
| `CLICKUP_TEAM_ID` | Team/workspace ID (default: 9016403868) |

### Cashfree (Payments)

| Variable | Purpose |
|----------|---------|
| `CASHFREE_APP_ID` | Cashfree application ID |
| `CASHFREE_SECRET_KEY` | Cashfree secret key |
| `VITE_CASHFREE_ENV` | 'production' or 'sandbox' (client-side) |

### Cloudflare R2 (Storage)

| Variable | Purpose |
|----------|---------|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | Bucket name (default: 'ge-media') |
| `R2_PUBLIC_URL` | Public URL for stored files |

### Social Media

| Variable | Purpose |
|----------|---------|
| `SOCIAL_ENCRYPTION_KEY` | AES-256 key for encrypting social tokens |

### Google Places

| Variable | Purpose |
|----------|---------|
| `GOOGLE_PLACES_API_KEY` | Google Places API key |

### Frontend (Vite)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_CASHFREE_ENV` | Cashfree environment |

### Hardcoded Constants

| Constant | Value | Location |
|----------|-------|----------|
| Slack #sod-eod channel | C08EMRX2HHN | clickupSlack.ts |
| Slack #general channel | C07489V0RB2 | clickupSlack.ts |
| Slack #sales-bd channel | C0AMPEF302G | clickupSlack.ts |
| Jatin Slack ID | U073Y677JBB | clickupSlack.ts |
| Vishal Slack ID | U0ALC9Z09RA | spendAlertService.ts |
| ClickUp Team ID | 9016403868 | clickupTasks.ts |
| Company GSTIN | 08DRYPA4899F2ZZ | recurringInvoiceService.ts |
| GE Ad Account | act_323237510625803 | Migration seed |
| Paraiso Ad Account | act_689363376592426 | Migration seed |

---

## 8. Current Known Issues & TODOs

### Known Limitations

1. **Facebook OAuth requires META_APP_ID** — Must be set in Railway env. Without it, the OAuth flow fails silently.

2. **Local development cannot reach Railway PostgreSQL** — `postgres.railway.internal` is only accessible from within Railway's network. Workaround: use `railway connect Postgres` for piped SQL, or write migrations that run at server startup.

3. **Cron jobs use UTC offsets** — All cron schedules are written in UTC with IST offsets calculated manually. No timezone library used. Daylight saving changes (if India ever adopts) would require manual updates.

4. **Single-tenant in practice** — While the schema supports multi-tenancy, the system is used by a single tenant (Growth Escalators). Some services have hardcoded tenant-specific values (team member IDs, Slack channels, company GSTIN).

5. **SEO tables (Phase 2) unpopulated** — 8 SEO tables exist in schema and migrations but have no routes, services, or UI. They were added in migration 0013.

6. **Social post publishing** — The `socialPostWorker` exists but actual Facebook/Instagram Graph API publishing logic needs verification for production use.

7. **No automated tests** — No test files or test runner configured. Manual testing via /api/system/test-* endpoints.

8. **Duplicate migration coverage** — Migration 0008 re-covers tables from 0005-0007 with IF NOT EXISTS guards. This is harmless but adds confusion.

9. **Job queue is poll-based** — n8n polls `/jobs/pending` for new work. No push notifications for job availability. Sequence worker runs in-process.

10. **Rate limiting is basic** — 100 req/min general, 300 req/min webhooks. No per-user or per-endpoint limits.

### Code Health

No TODO, FIXME, HACK, or XXX markers found in the TypeScript/JSX source code. The codebase is clean of technical debt markers.

---

## 9. External Integrations

### Meta WhatsApp Cloud API

- **Purpose:** Inbound/outbound WhatsApp messaging
- **Base URL:** `https://graph.facebook.com/v19.0`
- **Auth:** META_ACCESS_TOKEN (Bearer)
- **Webhook:** POST `/webhooks/meta-wa` — receives messages + delivery status
- **Outbound:** Template messages via `/{PHONE_NUMBER_ID}/messages`
- **Features:** Text, image, document messages; read receipts; template variables

### Meta Conversion API (CAPI)

- **Purpose:** Server-side event tracking for Meta Ads optimization
- **Endpoint:** `POST /{PIXEL_ID}/events`
- **Auth:** META_CAPI_TOKEN
- **Events:** Purchase, Lead, Schedule, InitiateCheckout
- **Data:** SHA256-hashed user data (email, phone, name, city, country)

### Meta Marketing API (Ads)

- **Purpose:** Ad account metrics, campaign performance, spend monitoring
- **Base URL:** `https://graph.facebook.com/v19.0`
- **Auth:** META_ADS_TOKEN
- **Endpoints:** Account balance/budget, campaign insights, adset insights, ad insights
- **Caching:** `ads_insights_cache` table with TTL

### Meta Facebook OAuth (Social)

- **Purpose:** Connect Facebook pages + Instagram accounts for social posting
- **Flow:** OAuth 2.0 → short-lived token → long-lived token → page tokens
- **Scopes:** pages_show_list, pages_manage_posts, instagram_basic, instagram_content_publish
- **Token Storage:** AES-256-CBC encrypted in `social_accounts` table

### Brevo (Sendinblue) Email API

- **Purpose:** Transactional emails, sequence emails, contact sync
- **SDK:** @getbrevo/brevo
- **REST API:** `https://api.brevo.com/v3`
- **Auth:** BREVO_API_KEY (header)
- **Features:**
  - Template sync (create/update SMTP templates)
  - Transactional email send
  - Contact management (lists, attributes)
  - Password reset code delivery
- **Templates:** 5 seeded (welcome_d2c, followup_day3, nudge_day7, appointment_confirm, proposal_followup)
- **Sender:** jatin@growthescalators.com

### ClickUp API v2

- **Purpose:** Task management, team workload, SOD/EOD task data
- **Base URL:** `https://api.clickup.com/api/v2`
- **Auth:** CLICKUP_API_TOKEN (Bearer)
- **Operations:**
  - Create tasks (onboarding, follow-up, call prep, outreach, lost deal analysis)
  - Fetch team member tasks (`/team/{TEAM_ID}/task`)
  - Fetch completed tasks
  - Update task status
- **Team Members:** Jatin, Sakcham, Vishal, Nimisha, Keshav (hardcoded IDs)
- **Auto-triggers:** Deal won → onboarding task, Proposal → follow-up, Hot lead → call prep

### Slack Bot API

- **Purpose:** Team notifications, digests, alerts
- **Base URL:** `https://slack.com/api`
- **Auth:** SLACK_BOT_TOKEN (Bearer)
- **Methods:** chat.postMessage, conversations.open
- **Channels:**
  - #sod-eod (C08EMRX2HHN) — Morning/evening digests
  - #general (C07489V0RB2) — Blocker alerts
  - #sales-bd (C0AMPEF302G) — Deal alerts, billing notifications, hot leads
- **DMs:** Jatin (spend alerts, critical blockers), Vishal (spend alerts)

### Cashfree Payments

- **Purpose:** D2C funnel checkout, upsell payments
- **Base URL:** `https://api.cashfree.com/pg` (production) or sandbox
- **Auth:** CASHFREE_APP_ID + CASHFREE_SECRET_KEY
- **Flow:** Create order → payment session → client-side SDK → webhook
- **Webhook:** POST `/api/cashfree/webhook` — handles PAYMENT_SUCCESS
- **Post-payment:** Contact creation, deal creation, CAPI event, WhatsApp template

### Cal.com

- **Purpose:** Strategy call booking with round-robin distribution
- **Integration:** Webhook (POST `/webhooks/calcom`)
- **Features:** Booking created → full pipeline (score, contact, deal, sequence, CAPI, ClickUp)
- **Round-robin:** Funnels table with weighted member assignment

### Google Places API

- **Purpose:** Lead discovery — find potential D2C clients
- **Operations:** Text search, place details
- **Features:** Fit scoring (0-100), qualification workflow, import to contacts
- **Budget tracking:** Monthly API usage + cost in USD

### Cloudflare R2

- **Purpose:** Media/file storage for social posts and library
- **Protocol:** S3-compatible (AWS SDK)
- **Operations:** Upload (PutObject), delete (DeleteObject), list (ListObjectsV2)
- **Bucket:** ge-media (configurable)
- **URL:** Public URL via R2_PUBLIC_URL

### Tally Forms

- **Purpose:** Lead capture forms
- **Integration:** Webhook (POST `/webhooks/tally`)
- **Action:** Creates contact + channels from form submission

### Chatwoot

- **Purpose:** Customer conversation events
- **Integration:** Webhook (POST `/webhooks/chatwoot`)

---

## 10. Deployment Setup

### Platform: Railway

The application is deployed on [Railway](https://railway.app) with the following configuration:

#### Build & Deploy

```json
// railway.json
{
  "builder": "NIXPACKS",
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

```
# Procfile
web: node dist/index.js
```

#### Build Process

1. Railway detects `package.json` → installs dependencies
2. TypeScript compiled: `tsc` → outputs to `dist/`
3. Frontend builds:
   - Admin CRM: `cd admin && npm run build` → output to `public/admin/`
   - Client SLO: `cd client && npm run build` → output to `public/client/`
4. Express serves static files from `public/`

#### Service Architecture on Railway

```
┌─────────────────────────────────────────┐
│            Railway Project               │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      Web Service (Node.js)      │    │
│  │  node dist/index.js             │    │
│  │  Port: $PORT (auto-assigned)    │    │
│  │                                 │    │
│  │  Serves:                        │    │
│  │  - /crm/*    → admin SPA       │    │
│  │  - /*        → client SPA      │    │
│  │  - /api/*    → REST API        │    │
│  │  - /auth/*   → Auth endpoints  │    │
│  │  - /webhooks/* → Webhooks      │    │
│  └──────────┬──────────────────────┘    │
│             │                           │
│  ┌──────────▼──────────────────────┐    │
│  │     PostgreSQL (Internal)       │    │
│  │  postgres.railway.internal:5432 │    │
│  │  Only reachable from web svc    │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

#### Custom Domains

| Domain | Serves |
|--------|--------|
| `web-production-311da.up.railway.app` | Primary Railway domain |
| `crm.growthescalators.com` | Admin CRM panel |
| `ecom.growthescalators.com` | D2C SLO funnel |
| `consulting.growthescalators.com` | Consulting landing page |

#### Deployment Methods

1. **GitHub auto-deploy** — Push to `main` triggers Railway build
2. **Manual deploy** — `railway up --detach` from local

#### Database Migrations

Migrations run automatically at server startup via Drizzle's `migrate()` function in `src/index.ts`. No separate migration command needed.

```typescript
// src/index.ts (startup)
import { migrate } from 'drizzle-orm/node-postgres/migrator';
await migrate(db, { migrationsFolder: './src/db/migrations' });
```

#### Monitoring

- **Health endpoint:** GET `/health` — returns DB connectivity status
- **Detailed health:** GET `/api/system/health` (auth required)
- **Request logging:** Morgan middleware logs all requests
- **Error logging:** Console.error with stack traces
- **Audit trail:** `audit_events` table logs all system actions

#### Scaling Considerations

- **Connection pool:** 20 max connections (suitable for single-service deployment)
- **Rate limiting:** 100 req/min general, 300 req/min webhooks
- **Cron jobs:** Run in-process (no separate worker)
- **Background workers:** sequenceWorker, socialPostWorker, stuckJobWorker run in same process
- **Socket.io:** Single-instance (no Redis adapter for multi-instance)

#### Manual Operations

```bash
# Deploy from local
railway up --detach

# Access PostgreSQL
railway connect Postgres

# Run database queries
echo "SELECT count(*) FROM contacts;" | railway connect Postgres

# View logs
railway logs

# Check deploy status
railway status
```

---

## Appendix: Team Members & Access

| Name | Role | Slack ID | ClickUp ID |
|------|------|----------|------------|
| Jatin Agrawal | Admin (Owner) | U073Y677JBB | 88911769 |
| Sakcham | Sales | U07TK64PZ1Q | 242618940 |
| Vishal | Manager (Ads) | U0ALC9Z09RA | 100972806 |
| Nimisha | Staff | U0AJUCV4KMY | 100972807 |
| Keshav | Staff | U0AK5NJBPEY | 4800274 |

## Appendix: Cron Schedule

| Time (IST) | Schedule (UTC) | Task | Days |
|------------|----------------|------|------|
| 10:00 AM | `30 4 * * 1-6` | SOD Digest → #sod-eod | Mon-Sat |
| 10:15 AM | `45 4 * * 1-6` | Blocker Alerts → #general | Mon-Sat |
| 5:00 PM | `30 11 * * 1-6` | Blocker Alerts → #general | Mon-Sat |
| 7:00 PM | `30 13 * * 1-6` | EOD Summary → #sod-eod | Mon-Sat |
| Every hour | `0 * * * *` | Spend Alert Check | Daily |
| 9:00 AM (1st) | `30 3 1 * *` | Monthly Invoice Drafts | Monthly |
| 10:00 AM | `30 4 * * *` | Overdue Invoice Detection | Daily |

---

*End of documentation. Generated from live codebase analysis on 29 March 2026.*
