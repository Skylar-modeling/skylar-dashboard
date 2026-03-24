# Skylar Dashboard

## What This Is
React dashboard for Skylar Modeling (modeling school, NY + Miami). CEO and Manager views reading live data from Google Sheets. Live at skylar-dashboard.vercel.app.

## Tech Stack
- React 19 + Vite, Tailwind CSS 4, Recharts 3, React Router DOM 7
- Google Sheets API v4 (API key auth, batchGet for all 11 tabs in one request)
- Deployed on Vercel (auto-deploys from GitHub main branch)

## Project Structure
- `src/api/sheets.js` — Google Sheets API client, data normalization, caching
- `src/hooks/useSheetData.js` — Data fetching hook with 5-min auto-refresh
- `src/utils/calculations.js` — All metric calculations (30+ pure functions)
- `src/utils/studentCalculations.js` — Student search and record enrichment
- `src/utils/dateHelpers.js` — Month parsing, comparison helpers
- `src/utils/formatters.js` — Currency, percent, number formatting
- `src/pages/CEODashboard.jsx` — CEO view (8 sections, location filter)
- `src/pages/ManagerDashboard.jsx` — Manager view (locked to location, MoM/YoY toggle)
- `src/components/StudentSearch.jsx` — Search overlay (Ctrl+K)
- `src/components/StudentDetail.jsx` — Full student record modal
- `src/config/constants.js` — Sheet ID, API key, locations, programs, colors

## Conventions
- Dark theme: bg #0F172A, cards #1E293B, borders #334155
- All monetary values: $ prefix, comma separators, 0 decimals
- All percentages: 1 decimal place
- Division by zero → show "N/A"
- Empty data sections → show EmptyState component (don't hide the section)
- New metrics: add calculation function to utils/calculations.js, use in page component
- New data tabs: add range to TAB_RANGES in constants.js, add normalizer in sheets.js

## Data Rules
- Revenue (Sales) = contract price at Deposit Date (when sale was made)
- Actualized Revenue = recognized by delivery timing (from ACTUALIZED_REVENUE tab)
- Commission = cash-basis only (on actual payments, not contract value)
- Manager expenses exclude blank-location (company-wide) expenses
- CEO "ALL" view includes all expenses; CEO filtered by location includes that location + blank
- Student payment matching: by email (primary), studentId (fallback)

## Git & Deploy
- Push: `git push origin main` (token auth configured in remote URL)
- Vercel auto-deploys on push to main
- Env vars: VITE_GOOGLE_SHEETS_ID, VITE_GOOGLE_API_KEY (set in Vercel + local .env)

## Do NOT
- Read from CEO_DASHBOARD or MANAGER_DASHBOARD Google Sheets tabs (those are formula-based)
- Use service account auth — we use API key (sheet is public-viewer)
- Break the 5-minute refresh interval or make excessive API calls (100 req/100s rate limit)
