# 04: Dashboard Artifacts tab + artifact-to-session cross-link + final docs

**What to build:** Completes Upload Monitoring: the Artifacts tab shows every Upload Artifact with manual refresh, and clicking an artifact reveals its originating Upload Session's current state, closing the loop between the two tabs.

Behaviour:
- Artifacts tab table: filename, size, short sha256, storage backend, status/scan result, verification error when present, created/verified timestamps; server-side pagination, status filter, filename search like the Sessions tab.
- Manual refresh button (no auto-poll on this tab).
- Cross-link: from an artifact row, the operator can inspect the originating Upload Session's live status using the existing single-session endpoint (drill-down panel or drawer — reuse whatever detail pattern exists in the dashboard; keep it read-only).
- Replace the placeholder Artifacts tab from #03.
- Definition of Done for the whole feature per both services' documentation workflow: final feature documentation under each service's docs/features folder describing how Upload Monitoring works and how to use it, linked back to plan + progress files; mark remaining progress items done.

**Blocked by:** #03 Dashboard Upload Monitoring page — Sessions tab.

**Status:** ready-for-agent

- [x] Artifacts tab lists real artifacts with pagination, status filter, filename search, manual refresh
- [x] Clicking an artifact shows its originating session's live status without leaving the page
- [x] TypeScript typecheck/build passes for the dashboard app
- [x] Final `docs/features/upload-monitoring.md` written in BOTH services, linked from plans/progress
- [x] Progress docs fully updated (all items checked or explicitly deferred)
