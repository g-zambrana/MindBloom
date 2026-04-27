# 🌱 MindBloom

**A mental wellness companion for everyday executive function - built by Therapal**

> *CSCI-380 Final Project · Spring 2026*

---

## Overview

MindBloom is a free, in-development, browser-based mental wellness application that brings mood tracking, guided journaling, therapist discovery, and curated mental health resources together in one cohesive platform. It is designed for people navigating everyday executive function challenges, the kind that make it hard to build routines, stay present, or regulate emotions, without requiring clinical care or a paid subscription.

Many existing tools solve one piece of this puzzle in isolation, or lock their best features behind paywalls. MindBloom unifies the most meaningful of these features so that every piece of data a user logs, such as a mood check-in, a journal entry, a sleep rating, can be understood in relation to everything else, rather than living in disconnected silos.

The app is not a replacement for licensed clinical support. It is an accessible, stigma-free on-ramp for people who want a structured way to understand and support their own mental health.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Setup](#environment-setup)
- [Deployment](#deployment)
- [User Roles](#user-roles)
- [Team](#team)

---

## Features

### For Users (Clients)

**Mood Tracker**
Log daily mood on a five-point scale alongside energy level, anxiety level, hours of sleep, and freeform emotion tags. Each entry builds a longitudinal record that surfaces patterns over time.

**Guided Journal**
Write private journal entries with optional mood associations, tags, and word count tracking. A rotating library of categorised prompts (gratitude, reflection, growth, connection) helps users get started when they are not sure what to write.

**Previous Entries**
Browse and revisit past journal entries from a dedicated history view.

**Streak Tracking**
A continuous logging streak visible from the dashboard encourages consistency without pressure.

**Therapist Finder**
Browse verified therapist profiles filtered by specialisation, treatment approach, language, session format (video, phone, in-person), and insurance acceptance. Request a match and communicate securely through the platform.

**Resources Library**
Access a curated collection of articles, exercises, videos, audio guides, and worksheets. Save items for later, mark them complete, and receive personalised recommendations from a matched therapist.

**Daily Affirmations**
A short, rotating affirmation is surfaced on the dashboard each day to set a grounding tone.

**Profile Management**
Update personal details, emergency contacts, therapy goals, and preferred language from a dedicated profile page.

### For Staff & Admins

A password-protected staff portal provides separate views for:

- **Staff Dashboard** — platform-wide activity and user overview
- **Reports** — aggregate analytics and engagement metrics
- **Therapist Management** — verify credentials, activate or deactivate profiles, and manage onboarding status

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| Backend / Database | [Supabase](https://supabase.com) (PostgreSQL + Auth + Row Level Security) |
| Hosting | [Vercel](https://vercel.com) |
| Design | [Figma](https://figma.com) |
| Version Control | Git + GitHub |
| Editor | VS Code |

**Key libraries & services**
- `@supabase/supabase-js` v2 — loaded via ESM CDN (`esm.sh`)
- Google Fonts — Nunito (body), Playfair Display (headings)
- Supabase Auth — email/password with session persistence and password reset flow

---

## Project Structure

```
MindBloom/
├── css/
│   └── style.css               # Global design tokens and shared styles
├── images/
│   └── herb.svg                # App favicon / brand mark
├── js/
│   ├── supabase.js             # Supabase client, auth helpers (requireAuth, query)
│   ├── dashboard.js            # Dashboard page controller
│   ├── home.js
│   ├── journal.js              # Journal / self-reflection controller
│   ├── mood-tracker.js         # Mood logging controller
│   ├── profile.js
│   ├── login.js
│   ├── register.js
│   ├── reset-password.js
│   ├── update-password.js
│   ├── resources.js
│   ├── sidebar.js              # Shared sidebar component logic
│   ├── therapist-page.js
│   ├── services/
│   │   ├── dashboardService.js # Aggregates streak, mood, affirmation data
│   │   ├── journalService.js   # CRUD for journal_entries + prompts
│   │   ├── moodService.js      # CRUD for mood_logs + streaks
│   │   ├── therapistService.js # Therapist browse, match, review logic
│   │   └── userService.js      # Profile upsert and retrieval
│   └── staff/
│       ├── staffLogin.js
│       ├── staff-dashboard.js
│       ├── reports.js
│       └── therapist.js        # Therapist verification / management
├── pages/
│   ├── home.html               # Main dashboard
│   ├── login.html
│   ├── register.html
│   ├── reset-password.html
│   ├── update-password.html
│   ├── mood-tracker.html
│   ├── self-reflection.html    # Journal entry composer
│   ├── previousentries.html    # Journal history
│   ├── therapist.html          # Therapist finder / profile view
│   ├── resources.html
│   ├── profile.html
│   └── staff/
│       ├── login.html
│       ├── staff-dashboard.html
│       ├── reports.html
│       └── therapist.html
├── supabase/
│   └── schema.sql              # Full database schema with RLS policies and seed data
├── vercel.json                 # Clean URL rewrites and route redirects
└── README.md
```

---

## Database Schema

The database is hosted on Supabase (PostgreSQL) and structured around four user roles: `client`, `therapist`, `staff`, and `admin`. Row Level Security is enabled on every table.

**Core tables**

| Table | Purpose |
|---|---|
| `users` | Extended profile mirroring `auth.users` |
| `client_profiles` | Client-specific data: emergency contact, insurance, goals |
| `therapists` | Credentials, specialisations, availability, and verification status |
| `staff` | Staff role, department, and permissions |
| `user_therapist_matches` | Tracks the lifecycle of a client–therapist relationship |
| `appointments` | Scheduled therapy sessions with format, status, and notes |
| `mood_logs` | Per-entry mood, energy, anxiety, sleep, and emotion tags |
| `user_streaks` | Running and longest logging streaks per user |
| `journal_entries` | Private journal entries with mood association and tags |
| `journal_prompts` | Staff-curated prompt library organised by category |
| `resources` | Published articles, exercises, videos, audio, and worksheets |
| `user_resources` | Saves and completion status per user per resource |
| `resource_shares` | Therapist-to-client resource recommendations |
| `affirmations` | Daily affirmation text pool |
| `messages` | Secure in-platform messaging between matched users |
| `notifications` | In-app notification log by type and read status |
| `therapist_reviews` | Post-appointment star ratings and written reviews |

To apply the schema, open the **Supabase SQL Editor** and run `supabase/schema.sql`. The file includes all table definitions, indexes, RLS policies, permission grants, triggers, and seed data for affirmations and journal prompts.

---

## User Roles

| Role | Access |
|---|---|
| `client` | Dashboard, mood tracker, journal, therapist finder, resources, profile |
| `therapist` | Client session notes, messaging, resource sharing, availability management |
| `staff` | Staff dashboard, reports, therapist verification and management |
| `admin` | Full platform access including staff management |

Role assignment is controlled in the `public.users` table. All access restrictions are enforced at the database level via Supabase RLS policies — not just in the UI.

---

## Team

**Therapal** — CSCI-380, Spring 2026

---

> MindBloom is a student project. It is not a licensed medical or clinical service. If you or someone you know is in crisis, please contact the **988 Suicide & Crisis Lifeline** by calling or texting **988**.
