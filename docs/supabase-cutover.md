# Supabase cutover runbook

The steps that switch production from Appwrite to Supabase. Design:
`docs/superpowers/specs/2026-10-20-supabase-migration-design.md`.

Appwrite is never written to at any point, so it remains a complete fallback.
Every command runs from the repo root and reads only `.env.appwrite.local` /
`.env.supabase.local`.

## Before the day (dashboard settings)

- [x] Supabase → Authentication → Sign In / Providers → Email: **Confirm email off** (verified 2026-10-20)
- [x] Supabase → Authentication → URL Configuration (https://cashly.mvp.bd):
      Site URL = the production URL; Redirect URLs add
      `https://<production-domain>/auth/reset-password` and
      `http://localhost:3000/auth/reset-password`
- [x] No custom SMTP for now (owner's decision). Supabase's built-in sender only
      reaches project team members, so `/auth/forgot-password` shows
      `PASSWORD_RESET_CONTACT` (src/lib/constants.ts) instead of a form, and
      resets are done by hand:
      `node --env-file=.env.supabase.local scripts/set-user-password.mjs <email>`.
      When SMTP is added (Authentication → Emails → SMTP settings), set the
      constant to null to bring the form back.
- [ ] Supabase → Organization → Billing: **Pro plan** (daily backups; Free pauses
      after a week idle)
- [ ] Vercel → Project → Settings → Environment Variables (Production and
      Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
      `SUPABASE_SECRET_KEY`. Leave the Appwrite variables in place until the
      cleanup step.
- [ ] Open a Vercel preview of the `supabase-migration` branch and log in with a
      test account to confirm the build works there.

## Cutover (about 20 minutes, users told in advance)

1. **Fresh backup**
   ```
   node --env-file=.env.appwrite.local scripts/backup-appwrite.mjs
   ```
   Note the snapshot path it prints. Every count must say `OK`.

2. **Final copy** (resets the rehearsal data, copies, verifies, marks live)
   ```
   npx vite-node --config vitest.config.ts scripts/copy-to-supabase.ts <snapshot> --final
   ```
   Must end with `ALL CHECKS PASSED` and `Marked as the live copy`. If it does
   not, stop: production is still on Appwrite and nothing is lost. Fix and
   repeat from step 1.

3. **Deploy**: merge `supabase-migration` into `main` (Vercel deploys `main`).
   Wait for the deployment to be Ready.

4. **Smoke test on production** with a real account: log in with the usual
   password, check the Home balance and a person balance match what Appwrite
   showed, add and delete one transaction.

5. **Drift check**, now and again the next day:
   ```
   node --env-file=.env.appwrite.local scripts/check-appwrite-drift.mjs <snapshot>
   ```
   Anything listed was written through the old build after the snapshot and
   exists only in Appwrite — carry it over by hand before deciding cleanup.

## Rollback

Redeploy the previous `main` build in Vercel (Deployments → … → Promote).
Appwrite is exactly as it was. Anything written to Supabase after cutover would
need copying back by hand, so decide early.

## Cleanup (after a week without problems)

- Remove the Appwrite variables from Vercel and `.env.local`.
- Uninstall `appwrite` and `node-appwrite`; delete the Appwrite-only scripts.
- Delete `.env.appwrite.local` and `.env.supabase.local`; revoke the Appwrite
  API key.
- Keep the snapshot files in `../Cashly-backups/` (copy them somewhere off this
  machine too). Keep the Appwrite project paused rather than deleted for a while.
