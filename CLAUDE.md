# Skylar Dashboard

## What This Is
React dashboard for Skylar Modeling (modeling school, NY + Miami). Three role tiers: CEO, Manager, Advisor. Reads live data from Google Sheets. Live at skylar-dashboard.vercel.app.

## Tech Stack
- React 19 + Vite, Tailwind CSS 4, Recharts 3, React Router DOM 7
- Google Sheets API v4 (API key auth, batchGet for all 11 tabs in one request)
- Vercel serverless proxy (`api/sheets.js`) keeps API key server-side in production
- Deployed on Vercel (auto-deploys from GitHub main branch)

## Routes
- `/` — Role selector (CEO / Manager NYC / Manager MIA / Advisor NYC / Advisor MIA)
- `/ceo` — CEO Dashboard (company-wide, location filter)
- `/manager/new-york`, `/manager/miami` — Manager Dashboards (locked to location)
- `/advisor/new-york`, `/advisor/miami` — Advisor Dashboards (locked to location)

## Project Structure
- `api/sheets.js` — Vercel serverless proxy (API key stays server-side)
- `vercel.json` — Security headers (CSP, HSTS, X-Frame-Options) + SPA rewrites
- `src/api/sheets.js` — Frontend API client (uses proxy on Vercel, direct API locally)
- `src/hooks/useSheetData.js` — Data fetching hook with 5-min auto-refresh
- `src/utils/calculations.js` — All metric calculations (30+ pure functions)
- `src/utils/studentCalculations.js` — Student search and record enrichment (max 50 char input)
- `src/utils/dateHelpers.js` — Month parsing, comparison helpers
- `src/utils/formatters.js` — Currency, percent, number formatting
- `src/pages/CEODashboard.jsx` — CEO view (8 sections, location filter)
- `src/pages/ManagerDashboard.jsx` — Manager view (locked to location, MoM/YoY toggle)
- `src/pages/AdvisorDashboard.jsx` — Advisor view (student search + sales ops + rep ranking, no financials)
- `src/components/StudentSearch.jsx` — Search overlay (Ctrl+K)
- `src/components/StudentDetail.jsx` — Full student record modal
- `src/components/RoleSelector.jsx` — Landing page with S K Y L A R  M O D E L I N G branding
- `src/config/constants.js` — Sheet ID, API key, locations, programs, colors

## Role Tiers
- **CEO**: Full access — revenue, profitability, marketing, cash, reps, operations, trends
- **Manager**: Same as CEO minus Top 5 Reps table, locked to one location, has YoY comparison toggle
- **Advisor**: Lowest tier — student search, sales operations, rep ranking (sales count only, no financial data)

## Conventions
- Dark theme: bg #0F172A, cards #1E293B, borders #334155
- Landing page title: Open Sans Bold, letter-spacing 0.35em
- All monetary values: $ prefix, comma separators, 0 decimals
- All percentages: 1 decimal place
- Division by zero → show "N/A"
- Empty data sections → show EmptyState component (don't hide the section)
- New metrics: add calculation function to utils/calculations.js, use in page component
- New data tabs: add range to TAB_RANGES in constants.js, add normalizer in sheets.js

## Security
- Vercel serverless proxy hides API key from browser (api/sheets.js)
- CSP header restricts scripts, styles, and connections to self + Google APIs
- HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff
- 30-second refresh cooldown prevents API abuse
- Search input capped at 50 characters
- No authentication yet (future: add auth before exposing PII to wider audience)

## Data Rules
- Revenue (Sales) = contract price at Deposit Date (when sale was made)
- Actualized Revenue = recognized by delivery timing (from ACTUALIZED_REVENUE tab)
- Commission = cash-basis only (on actual payments, not contract value)
- Manager expenses exclude blank-location (company-wide) expenses
- CEO "ALL" view includes all expenses; CEO filtered by location includes that location + blank
- Student payment matching: by email (primary), studentId (fallback)
- Advisor dashboard: NO financial data shown (no revenue, no commission amounts)

## Git & Deploy
- Push: `git push origin main` (token auth configured in remote URL)
- Vercel auto-deploys on push to main
- Frontend env vars: VITE_GOOGLE_SHEETS_ID, VITE_GOOGLE_API_KEY (local dev only)
- Server env vars (set in Vercel): GOOGLE_API_KEY, GOOGLE_SHEETS_ID (for the proxy)

## Do NOT
- Read from CEO_DASHBOARD or MANAGER_DASHBOARD Google Sheets tabs (those are formula-based)
- Use service account auth — we use API key (sheet is public-viewer)
- Break the 5-minute refresh interval or make excessive API calls (100 req/100s rate limit)
- Show financial data (revenue, commission $, contract prices) on the Advisor dashboard
