#!/usr/bin/env node
/**
 * Copy all objects from Supabase Storage buckets → Cloudflare R2.
 *
 * Prerequisites (never commit these):
 *   SUPABASE_URL              e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY service role (Storage list + download)
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET                 default: rtr-hub-media
 *   R2_PUBLIC_BASE            default: https://pub-….r2.dev
 *
 * Optional:
 *   DRY_RUN=1                 list only, no upload
 *   BUCKETS=track-weather,track-images,ChampionshipLogos
 *
 * Usage:
 *   node scripts/migrate-supabase-storage-to-r2.mjs
 *
 * After a successful run, apply:
 *   supabase/migrations/20260928230000_rewrite_media_urls_to_r2.sql
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BUCKET_TO_PREFIX = {
  "track-weather": "track-weather",
  "track-images": "track-images",
  ChampionshipLogos: "championship-logos",
  "championship-logos": "championship-logos",
  drivers: "drivers",
};

const DEFAULT_BUCKETS = ["track-weather", "track-images", "ChampionshipLogos"];

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env ${name}`);
    process.exit(1);
  }
  return v;
}

function toR2Key(bucket, objectPath) {
  const prefix = BUCKET_TO_PREFIX[bucket] ?? bucket;
  const clean = objectPath.replace(/^\/+/, "");
  if (clean.startsWith(`${prefix}/`)) return clean;
  return `${prefix}/${clean}`;
}

async function listAllFiles(supabase, bucket, prefix = "") {
  const out = [];
  const pageSize = 100;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data?.length) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders have id === null in supabase storage list
      if (entry.id === null || entry.metadata == null) {
        const nested = await listAllFiles(supabase, bucket, path);
        out.push(...nested);
      } else {
        out.push({
          path,
          size: entry.metadata?.size ?? null,
          mime: entry.metadata?.mimetype ?? "application/octet-stream",
        });
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return out;
}

async function putToR2({
  accountId,
  accessKeyId,
  secretAccessKey,
  bucket,
  key,
  body,
  contentType,
}) {
  // Use aws4fetch-compatible signing via Undici + AWS SigV4 lightweight impl
  const { AwsClient } = await import("aws4fetch");
  const aws = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const res = await aws.fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 PUT ${key} failed: ${res.status} ${text}`);
  }
}

async function main() {
  const supabaseUrl = required("SUPABASE_URL");
  const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const accountId = required("R2_ACCOUNT_ID");
  const accessKeyId = required("R2_ACCESS_KEY_ID");
  const secretAccessKey = required("R2_SECRET_ACCESS_KEY");
  const r2Bucket = process.env.R2_BUCKET || "rtr-hub-media";
  const r2PublicBase = (
    process.env.R2_PUBLIC_BASE ||
    "https://pub-f0a47a1e0660483ca04c343f23495c08.r2.dev"
  ).replace(/\/$/, "");
  const dryRun = process.env.DRY_RUN === "1";
  const buckets = (process.env.BUCKETS || DEFAULT_BUCKETS.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // aws4fetch is a dependency of the worker; ensure it's resolvable from root
  try {
    await import("aws4fetch");
  } catch {
    console.error(
      "Install aws4fetch at repo root: npm install aws4fetch --no-save\n" +
        "Or run from workers/r2-presign after npm install there."
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const report = {
    startedAt: new Date().toISOString(),
    dryRun,
    buckets: {},
    copied: [],
    errors: [],
  };

  for (const bucket of buckets) {
    console.log(`\nListing bucket: ${bucket}`);
    let files;
    try {
      files = await listAllFiles(supabase, bucket);
    } catch (err) {
      console.error(`  list failed:`, err.message || err);
      report.errors.push({ bucket, error: String(err.message || err) });
      continue;
    }
    report.buckets[bucket] = files.length;
    console.log(`  ${files.length} object(s)`);

    for (const file of files) {
      const key = toR2Key(bucket, file.path);
      const publicUrl = `${r2PublicBase}/${key}`;
      process.stdout.write(`  ${dryRun ? "[dry] " : ""}${bucket}/${file.path} → ${key}\n`);

      if (dryRun) {
        report.copied.push({ bucket, path: file.path, key, publicUrl, dryRun: true });
        continue;
      }

      try {
        const { data, error } = await supabase.storage.from(bucket).download(file.path);
        if (error) throw error;
        const buffer = Buffer.from(await data.arrayBuffer());
        const contentType = file.mime || data.type || "application/octet-stream";
        await putToR2({
          accountId,
          accessKeyId,
          secretAccessKey,
          bucket: r2Bucket,
          key,
          body: buffer,
          contentType,
        });
        report.copied.push({
          bucket,
          path: file.path,
          key,
          publicUrl,
          bytes: buffer.length,
          sha256: createHash("sha256").update(buffer).digest("hex"),
        });
      } catch (err) {
        console.error(`    FAIL:`, err.message || err);
        report.errors.push({
          bucket,
          path: file.path,
          key,
          error: String(err.message || err),
        });
      }
    }
  }

  report.finishedAt = new Date().toISOString();
  await mkdir("scripts/out", { recursive: true });
  const outPath = join(
    "scripts/out",
    `storage-to-r2-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  await writeFile(outPath, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${outPath}`);
  console.log(
    `Copied: ${report.copied.filter((c) => !c.dryRun).length}, errors: ${report.errors.length}`
  );
  if (report.errors.length) process.exitCode = 1;
  else {
    console.log(
      "\nNext: apply supabase/migrations/20260928230000_rewrite_media_urls_to_r2.sql in the Supabase SQL editor (or supabase db push)."
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
