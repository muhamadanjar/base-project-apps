# 03: Dashboard Upload Monitoring page — Sessions tab end-to-end

**What to build:** A signed-in operator opens the sidebar group "Upload Service" → "Monitoring", lands on `/uploads/monitoring`, and sees a live Sessions table fed by the new backend list endpoints. This slice cuts the full vertical: route, menu entry, API client, table, polling.

Behaviour:
- New top-level sidebar group "Upload Service" with item "Monitoring" (distinct from the legacy Geospatial "Uploads" item).
- Page has two tabs (Sessions | Artifacts). This ticket implements the page shell + the Sessions tab; the Artifacts tab arrives in #04 (render it as an empty placeholder tab).
- Sessions tab: TanStack Table following the existing geo upload session table pattern — server-side pagination, status filter, filename search input, sortable columns.
- Auto-poll ~10 seconds via react-query; stop polling while the browser tab is hidden; keep previous data between fetches.
- Show per-session: filename, owner, status, progress (received bytes / declared size), storage backend, artifact link placeholder, created/updated time, error message when present.
- Loading skeleton and empty/error states consistent with existing tables.
- Route lives inside the private layout so the privilege guard applies.

**Blocked by:** #02 Backend monitoring list endpoints.

**Status:** ready-for-agent

- [x] Sidebar shows "Upload Service" group with "Monitoring" item navigating to the page
- [x] Sessions tab lists real sessions with working pagination, status filter, and filename search
- [x] Table refreshes itself ~10s and pauses polling when the browser tab is hidden
- [x] TypeScript typecheck/build passes for the dashboard app
- [x] Progress doc updated with what landed
