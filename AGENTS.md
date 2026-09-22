# Base Project

## Stack

Multi-service monorepo (Next.js / React / Astro frontends, FastAPI backends, shared libs) with git submodules.

### Rules

#### Git Operations — STRICTLY FORBIDDEN

**NO git write operations allowed:**
- ❌ `git commit` — FORBIDDEN
- ❌ `git push` — FORBIDDEN
- ❌ `git merge` — FORBIDDEN
- ❌ `git rebase` — FORBIDDEN
- ❌ `git reset` — FORBIDDEN
- ❌ `git add` — FORBIDDEN
- ❌ `git rm` — FORBIDDEN
- ❌ `git checkout` — FORBIDDEN
- ❌ `git branch -D` — FORBIDDEN
- ❌ Any submodule operations — FORBIDDEN
- ❌ `--force`, `--no-verify`, `--amend` flags — FORBIDDEN

**Only read-only git operations allowed:**
- ✅ `git log` — Read commit history
- ✅ `git status` — Check working tree status
- ✅ `git diff` — View changes
- ✅ `git show` — View commit details

**Reason:** Multi-service monorepo with submodules. Git operations must be coordinated at root level by authorized personnel. Claude must not make autonomous commits.

#### Codebase Navigation

Use the knowledge graph (graphify or codebase-memory-mcp) before raw grep/glob:

- **graphify:** Run `graphify query "<question>"` when `graphify-out/graph.json` exists in the service. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. Browse `graphify-out/wiki/index.md` for broad navigation. Read `graphify-out/GRAPH_REPORT.md` only for architecture reviews or when the other commands don't surface enough context.
- **codebase-memory-mcp:** Use `search_graph`, `trace_path`, and `get_code_snippet` for structural queries and call-graph tracing.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- Fall back to grep/`rg`, `Glob`, or direct file reads when graphify/codebase-memory is unavailable or insufficient. Do not block on them.

#### Monorepo Structure

- Treat each service as scoped unit (changes to one service unless cross-service required)
- Use SSH URLs consistently (avoid mixing SSH + HTTP)
- Submodule management (move, add, remove) requires manual git ops by user

#### Service Entry Points & Documentation

Each service in this monorepo is autonomous:

**Entry Points:**
- Each service has its own `AGENTS.md` or `CLAUDE.md` file as its project entry point
- Service-level instructions override root instructions
- Locate service-specific rules in `services/{service_name}/` or `libs/{package_name}/`

**Documentation:**
- Each service MUST have a `doc/` or `docs/` folder for project documentation
- Document service-specific setup, APIs, workflows, and troubleshooting
- README or index in doc folder links to all service docs

**Documentation Workflow (mandatory when writing code):**
- **Plan:** Every new feature or architectural design MUST be documented in `docs/plans/[feature-name].md` before any code is written.
- **Progress:** Execution and implementation progress MUST be recorded in `docs/progress/[feature-name].md`, with a prominent link back to its plan at the top.
- **Feature docs:** Once complete (Definition of Done), write the final user/developer documentation in `docs/features/[feature-name].md` — focused on *how the feature works* and *how to use it*, not the development history. Link it back to the original plan and progress files.
- **Workflow strictness:** Do not start writing code before both the plan and progress files are initialized and linked.

#### Frontend Feature Structure (React / Next / Astro)

- `features/` is the core component folder at the project root. Every feature module lives under `features/<feature>/` and MUST contain `components/` — feature-owned components, including the page component(s) that back a route. Optional folders: `views/`, `types/`, `api/`, `hooks/`, `stores/`, `lib/`, etc.
- **Routing-only folders:** Next.js `app/` and Astro `src/pages/` are used for **routing only** (the React/Vite equivalent `src/pages/` follows the same rule). Route files stay thin: they render the feature page/view and handle only route concerns such as params, metadata, or framework-specific loading boundaries.
- `components/ui/` (or `src/components/ui/`) is for domain-agnostic reusable primitives only — no feature-specific business rules, page orchestration, feature API calls, or imports from `features/`.
- When a UI element knows about a domain concept or is used to compose a feature page, keep it inside the owning feature module instead of the base UI module.
- For new features, create the required folders from the start. When modifying an existing feature that does not follow this structure, move the touched feature-owned files toward this structure without performing an unrelated repository-wide migration.
