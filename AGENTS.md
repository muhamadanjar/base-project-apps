# Base Project

## Stack



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
