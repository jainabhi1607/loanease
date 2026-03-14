# CLAUDE.md Template for New Projects

> Copy this into your project root as `CLAUDE.md` and fill in the sections. This template is based on the documentation system used in the Momentum rebuild, which maintained full context across 50+ sessions with regular `/clear` resets.

---

## Why This Works

The documentation system has three layers, each serving a different purpose:

1. **`CLAUDE.md`** (project root) — the operational manual. Claude reads this at the start of every message. It should contain session rituals, architecture rules, common gotchas, and links to deeper docs. Keep it actionable, not narrative.

2. **`docs/implementation-progress.md`** — the living journal. Updated at the end of every session with what was done and what's next. This is the single most important file for context recovery after `/clear`.

3. **Auto-memory (`~/.claude/projects/.../memory/MEMORY.md`)** — patterns learned the hard way. Gotchas, schema quirks, field mappings, things that broke and how they were fixed. Claude manages this automatically but you can seed it.

The principle: **CLAUDE.md tells Claude how to work. implementation-progress.md tells Claude where we are. Auto-memory tells Claude what not to repeat.**

---

## The Template

Copy everything below into your project's `CLAUDE.md`:

```markdown
# [Project Name]

[One sentence description of what this application does.]

## Session Checklist

**At the start of every session (after /clear or new conversation):**

1. Read [implementation-progress.md](docs/implementation-progress.md) — check the **Current Focus** section for what we're working on
2. Run `git status` and `git branch` — confirm branch and see uncommitted work
3. If the user gives a task, check relevant source files before implementing

**Before ending a session or major milestone:**
- Update the **Current Focus** section in `implementation-progress.md` with what was done and what's next

## Source of Truth

[Define where the canonical truth lives for your project. Examples:]

- **Database schema:** `schema.prisma` / `migrations/` / `production_dump.sql`
- **Existing system:** `legacy-code/` folder (if rebuilding)
- **API contracts:** `openapi.yaml` / Postman collection
- **Design:** Figma link / wireframes in `docs/design/`

[The point of this section is to prevent Claude from inventing things. Be explicit about what defines "correct".]

## Tech Stack

- **Framework**: [e.g., Next.js 16 App Router]
- **Database**: [e.g., PostgreSQL via Supabase]
- **ORM**: [e.g., Prisma]
- **Auth**: [e.g., NextAuth.js with credentials provider]
- **UI**: [e.g., shadcn/ui + Tailwind CSS]
- **Hosting**: [e.g., Vercel]
- **File Storage**: [e.g., Cloudflare R2]

## Development Guidelines

### Git Workflow

[Be specific about branches and deployment:]

- **Development branch:** `stg` / `dev` / `feature/*`
- **Production branch:** `main`
- **Process:** Work in dev → commit → push → test on staging → merge to main
- Never commit directly to main. Never skip staging.

### Pre-Implementation Rules

[These are the rules that prevent Claude from going off-track. Examples:]

1. **Check the schema first** — before implementing any feature, verify the relevant tables/columns exist and match what you expect
2. **Read before writing** — always read existing files before modifying them
3. **No invented fields** — if a column doesn't exist in the schema, don't use it
4. **After schema changes** — run `npx prisma generate` and restart the dev server

### Coding Standards

[Keep this short — only rules Claude wouldn't know from general best practices:]

- [e.g., Use `parseInt()` when converting session user IDs to database integer fields]
- [e.g., All API routes must check authentication via `getServerSession()`]
- [e.g., Form validation: Zod on client + server, never trust client-only]
- [e.g., Date handling: always `.split("T")[0]` before constructing local Date objects from API strings]

### Common Gotchas

[This section grows over time. Seed it with anything you already know, then let Claude add to it as issues are discovered:]

- [e.g., Session user ID is a string — must parseInt() for database queries]
- [e.g., The `state` field is legacy — don't require it in validations]
- [e.g., Dev server must be restarted after Prisma schema changes or you get 500s]

## Architecture Rules

[High-level rules that govern how the system is structured. These prevent Claude from making wrong architectural decisions:]

- [e.g., Leads and Projects are separate entities — a Lead generates a Project but both persist independently]
- [e.g., All documents must be served through authenticated proxy endpoints — never expose direct file URLs]
- [e.g., API pattern: REST — GET/POST on /api/{resource}, GET/PUT/DELETE on /api/{resource}/[id]]

## Dev Environment

[Commands Claude will need regularly:]

- **Start dev:** `npm run dev`
- **Generate types:** `npx prisma generate`
- **Push schema:** `npx prisma db push`
- **Port conflicts:** `lsof -i :3000 -t | xargs kill -9`

## Reference Docs

[Link to deeper documentation. Create these files as needed:]

| Document | Description |
|----------|-------------|
| [implementation-progress.md](docs/implementation-progress.md) | What's done, what's next, session journal |
| [architecture.md](docs/architecture.md) | System design, entity relationships, data flow |
| [status-mappings.md](docs/status-mappings.md) | Enum values, status codes, type mappings |
| [security.md](docs/security.md) | Auth implementation, security measures |
| [deployment.md](docs/deployment.md) | Deployment config, environment variables |
```

---

## Implementation Progress Template

Create `docs/implementation-progress.md` with this structure:

```markdown
# Implementation Progress

**Last Updated:** [date]

## Current Focus

**Working on:** [current task or "Nothing active — ready for next task"]
**Next steps:** [what should be tackled next]
**Last completed:**
- **[Feature name]** — [1-2 sentence summary of what was done, key decisions, commit hash if relevant]

## Completed Modules

### 1. [Module Name] (100%)

**Features:**
- [bullet list of what's implemented]

**Key decisions:**
- [any non-obvious decisions that future-you needs to know]

**Files:** [key files for this module]

## Known Issues & Technical Debt

1. [issue description]
2. [issue description]
```

---

## Tips for Maximum Effectiveness

### Keep CLAUDE.md Under Control
- It's loaded on every message — if it's too long, Claude wastes context reading irrelevant detail
- Move completed feature details into separate docs (e.g., `docs/completed-features.md`) and reference them
- The sweet spot is 100-200 lines of high-signal content

### Update implementation-progress.md Religiously
- This is the #1 file that makes `/clear` recovery work
- The "Current Focus" section at the top is what Claude reads first
- Append completed work at the end of each session — chronological history becomes invaluable

### Let Auto-Memory Build Naturally
- Don't try to pre-populate everything — let Claude add gotchas as they're discovered
- The 200-line limit on MEMORY.md is real — keep it as an index and link to topic files
- Periodically review and clean up — remove things that are no longer relevant

### Create Docs When Complexity Demands It
Good candidates for their own doc file:
- Status/enum mappings (anything with magic numbers)
- Architecture decisions (why things are structured a certain way)
- Security implementation details
- Deployment and environment configuration
- Complex feature specifications

### The Golden Rule
**If you had amnesia tomorrow and could only read one file to understand the project, that file should be `CLAUDE.md`. If you could read two, add `implementation-progress.md`. Everything else is supporting detail.**
