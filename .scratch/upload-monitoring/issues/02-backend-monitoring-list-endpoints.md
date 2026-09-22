# 02: Backend monitoring list endpoints in upload_api

**What to build:** An operator holding the `uploads.monitoring.view` permission can list every Upload Session and every Upload Artifact across all Artifact Owners through two new paginated endpoints on the Upload Service, and any caller without that permission is rejected. This is the data source for Upload Monitoring.

Behaviour per endpoint:
- List Upload Sessions: pagination (page / page size), optional filter by status, optional case-insensitive filename search, newest-first ordering by default. Items carry the fields the domain already exposes (id, owner, filename, status, received bytes vs declared size, storage backend, artifact id, timestamps, error message).
- List Upload Artifacts: same shape (id, session id, owner, filename, size, sha256, storage backend, scan/status, created/verified timestamps).
- Authorization per ADR 0001: enforce `uploads.monitoring.view` from the caller's principal permissions. This is the FIRST enforced permission in this service — build it as a small reusable dependency other endpoints can adopt later. When auth is disabled in development mode, behave as today (admin principal).
- Follow clean-architecture rules in the service's AGENTS.md (routers delegate, no raw SQL in routers, repositories extend the base repository).

**Blocked by:** #01 Bootstrap plan & progress docs.

**Status:** ready-for-agent

- [x] Both list endpoints return paginated results filtered by status and filename search
- [x] Caller without `uploads.monitoring.view` gets 403; unauthenticated gets 401
- [x] Auth-disabled development mode still returns full lists
- [x] Automated tests cover: happy path pagination, status filter, filename search, forbidden-without-permission
- [x] Existing test suite passes; progress doc updated with what landed
