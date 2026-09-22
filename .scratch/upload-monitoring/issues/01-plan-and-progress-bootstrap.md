# 01: Bootstrap plan & progress docs for Upload Monitoring

**What to build:** The documentation scaffold required by both services' workflow before any code is written. Create the Upload Monitoring feature plan and its linked progress file in BOTH services (`upload_api` and `dashboard`). The plan records the seven decisions from the grilling session:

1. Scope = backend list endpoints in upload_api + monitoring tables in dashboard.
2. Read-only monitoring only (no admin actions in v1).
3. One dashboard page `/uploads/monitoring`, two tabs (Sessions | Artifacts), cross-link artifact → session.
4. First permission enforcement in upload_api: list endpoints require principal permission `uploads.monitoring.view`; recorded in `upload_api/docs/adr/0001-require-monitoring-permission-on-list-endpoints.md` (already written).
5. Filter scope v1: pagination + status filter + filename search; column sorting follows existing table patterns.
6. Sidebar: new top-level group "Upload Service" containing item "Monitoring" (distinct from the legacy Geospatial "Uploads").
7. Refresh: Sessions tab polls ~10s (paused when browser tab hidden), Artifacts tab manual refresh.

Also document that a new Action Permission identifier `uploads.monitoring.view` must exist in User Management so operators can grant it via Roles (data-level registration, not code).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] `upload_api/docs/plans/upload-monitoring.md` exists with the decisions above
- [x] `upload_api/docs/progress/upload-monitoring.md` exists, prominently linking back to the plan
- [x] `dashboard/docs/plans/upload-monitoring.md` exists with the same decisions
- [x] `dashboard/docs/progress/upload-monitoring.md` exists, prominently linking back to the plan
- [x] Plan links to ADR 0001 and uses glossary terms (Upload Monitoring, Upload Session, Upload Artifact, Artifact Owner, Legacy Upload)
