# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev     # next dev
npm run build   # next build
npm run lint    # eslint
```

No test suite is configured. Next.js is 16.x with breaking changes from older versions — read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code (see AGENTS.md).

## What this is

TTS (Teknofest Takım Takip Sistemi): a Turkish-language app for ISUBÜ Teknofest teams. Team captains log in (team + per-team password, mostly from phones) at `/` → `/kaptan` to enter weekly attendance and per-member work notes; advisors use `/admin` to manage teams, members (unit + role), sessions, and CSV export. UI strings, comments, and the README are in Turkish; keep that convention. README.md has the full security model and deployment (Vercel + Cloudflare R2) details.

## Architecture

- **No SQL database.** All state is JSON documents in a private Cloudflare R2 bucket (`src/lib/r2.ts`): `tts/db.json` (teams, members, sessions), `tts/admin-sessions.json`, `tts/login-failures.json`, `tts/signing-secret.json`. `src/lib/db.ts` exposes `readDb` / `mutateDb` etc. on top of a generic `mutate()` that does read → apply fn → conditional write (ETag / If-Match) and retries on `PreconditionFailedError`. Always change data through `mutateDb`-style helpers, with mutation callbacks that are safe to re-run on retry.
- **Local dev fallback:** if `R2_ACCOUNT_ID` is unset and `NODE_ENV !== "production"`, data goes to `.data/` instead. Production requires R2.
- **Mutations** are plain functions over a `Database` object in `src/lib/mutations.ts` (e.g. `saveSessionIn(db, input, by)`), shared by the admin and captain server actions in `src/app/actions/{admin,captain,auth}.ts`. Validation failures throw `UserError`, surfaced as `FormState` (`src/lib/forms.ts`). `src/lib/stats.ts` derives attendance stats; shapes live in `src/lib/types.ts`.
- **Auth (`src/lib/auth.ts`)**: two separate JWT cookies (HS256 via `jose`, different audiences): admin (`tts_admin`, scoped to `/admin`, server-side session record in R2, expires after `ADMIN_SESSION_MINUTES`) and captain (`tts_kaptan`, long-lived). Captain sessions embed the team's `passwordVersion`; changing the password or archiving the team invalidates them. The captain's team id always comes from the signed session, never from client input. Signing key is `SESSION_SECRET` or, if empty, a random key auto-created in R2. Pages/actions gate via `requireCaptain()` / admin equivalents.
- **Brute-force protection** (`src/lib/ratelimit.ts`): per-IP lockout persisted in R2, using `x-vercel-forwarded-for` (then `x-forwarded-for`).
- **Routes:** `src/app/page.tsx` (captain login), `src/app/kaptan/*`, `src/app/admin/giris` (login) and `src/app/admin/(panel)/*` (authenticated area: takımlar, uyeler, oturumlar), `src/app/admin/csv/[id]/route.ts` (CSV export with Excel formula-injection escaping). Security headers and `no-store` for `/admin` and `/kaptan` are set in `next.config.ts`.
- Env vars are documented in `.env.example`.
