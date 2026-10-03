# Supabase Cached Egress Checklist

Full media cutover guide: [`docs/media-r2-full-migration.md`](./media-r2-full-migration.md).

## Before and After Validation

1. Open the app in development and clear metrics:
   - `window.__supabaseMetrics?.clear()`
2. Navigate through critical routes:
   - `/`
   - `/live`
   - `/palmares`
   - `/pilotos`
   - `/classificacao`
3. Inspect request counters:
   - `window.__supabaseMetrics?.snapshot()`
4. In DevTools Network, filter `storage/v1` — **must be empty** after cutover.
5. Compare with Supabase dashboard:
   - Storage egress (daily/weekly) / **Cached egress**
   - Bandwidth by bucket (should flatline)

## Media Guardrails

- Prefer `webp` or `avif` for hero/landing assets.
- Keep hero images under 400 KB whenever possible.
- Avoid rendering duplicated fullscreen backgrounds on the same page.
- Use versioned paths for uploads and long cache TTL.
- Keep `cacheControl` high for immutable media (`31536000`).
- Lazy-load non-critical images (`loading="lazy"` and `decoding="async"`).
- **Never** write new files to Supabase Storage — always R2 via `uploadMedia()`.
- Always render DB media through `mediaUrl()` so legacy Storage URLs rewrite to R2.

## Release Checklist

- Validate no page renders duplicated image stacks unnecessarily.
- Confirm realtime channels are filtered by entity (e.g. `race_id`).
- Verify components reuse cached driver lists instead of repeated fetches.
- Confirm `VITE_R2_PUBLIC_BASE` matches the live R2 public bucket URL.
- After `migrate:storage-to-r2` + SQL rewrite, spot-check 3–5 known images on R2.
- Check Supabase dashboard 24h after deploy for egress trend improvement.
