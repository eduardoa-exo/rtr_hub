# Migração total de media → Cloudflare R2

**Objetivo:** Supabase fica só com **Auth + Postgres (+ Realtime)**. Toda a media pública sai do Supabase Storage para **Cloudflare R2**, eliminando o **cached egress** do free plan.

**Branch:** `cursor/media-r2-full-migration-e41b`  
**Data:** 2026-09-28

---

## O que já estava feito (antes desta branch)

| Área | Estado |
|------|--------|
| Uploads novos (weather / map / championship logos) | Já iam para R2 via worker `rtr-hub-r2-presign` |
| Landing heroes | Já em `public/images/landing/` (sem Storage) |
| Navbar / chrome | Wordmark e assets em `public/images/` |
| Dados (races, standings, FAQ, auth) | Continuam no Supabase (correto) |

O que faltava: **ficheiros antigos ainda no Storage**, URLs na DB a apontar para `*.supabase.co/storage/...`, e o frontend a servir essas URLs sem rewrite.

---

## O que esta migração fez no código

### 1. `src/lib/mediaUrl.ts` (novo)

- Detecta URLs do Supabase Storage (`/storage/v1/object/public|sign|authenticated/...`)
- Reescreve para `VITE_R2_PUBLIC_BASE` / R2 com o mesmo layout de keys
- Mapeia bucket `ChampionshipLogos` → prefixo `championship-logos/`
- Paths locais (`/images/...`) e URLs R2 passam sem alteração
- Testes: `src/lib/mediaUrl.test.ts`

### 2. Frontend — todos os `<img>` de media dinâmica usam `mediaUrl()`

- `Pilotos.tsx`, `RaceDrivers.tsx`
- `Classificacao.tsx`, `ScoreboardLiveGrid.tsx`
- `TrackInfo.tsx` (weather, map, charts, lightbox)

Assim, mesmo antes do SQL na DB, se o objecto já existir no R2 com a key correta, a imagem deixa de bater no Storage (e de gastar cached egress).

### 3. Upload de pilotos → tipo `driver`

- Antes: Pilotos fazia upload com `type: "championship"` (keys em `championship-logos/`)
- Agora: `type: "driver"` → keys em `drivers/`
- Worker atualizado: `workers/r2-presign/index.ts` (+ testes)

### 4. Script de cópia Storage → R2

`scripts/migrate-supabase-storage-to-r2.mjs`

- Lista buckets `track-weather`, `track-images`, `ChampionshipLogos`
- Faz download com **service role**
- Faz PUT no bucket R2 `rtr-hub-media`
- Escreve relatório em `scripts/out/storage-to-r2-*.json`

### 5. SQL de rewrite na DB

`supabase/migrations/20260928230000_rewrite_media_urls_to_r2.sql`

Atualiza:

- `images.url` / `images.storage_path`
- `drivers.image_url`
- `championship_standings.car_logo_url`
- `scoreboard_live_grid.car_logo_url`
- `team_achievements.image_url`

### 6. Fix `.env.example`

`VITE_R2_PUBLIC_BASE` alinhado com `wrangler.toml` (`…3ca04c…`, não `…3ac04c…`).

---

## O que tu (Eduardo) precisas de correr à mão

O agente **não tem** acesso ao projeto Supabase RTR nem às secrets R2 neste ambiente. Sem isto o cutover de bytes reais não acontece.

### Passo A — Redeploy do worker (tipo `driver`)

```bash
cd workers/r2-presign
npm install
npx wrangler deploy
```

Confirma secrets já existentes: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `SUPABASE_JWT_SECRET`.

### Passo B — Copiar objectos Storage → R2

```bash
# Na raiz do repo (precisa de @supabase/supabase-js + aws4fetch)
cd workers/r2-presign && npm install && cd ../..
# aws4fetch resolve a partir de workers/r2-presign/node_modules se NODE_PATH estiver set,
# ou: npm install aws4fetch --no-save

export SUPABASE_URL="https://ggkvgohzwwoqdeaqhkzq.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="…service_role…"   # Dashboard → Settings → API
export R2_ACCOUNT_ID="1b19ccb374ddcd2fc94563d710beac2a"
export R2_ACCESS_KEY_ID="…"
export R2_SECRET_ACCESS_KEY="…"
export R2_BUCKET="rtr-hub-media"
export R2_PUBLIC_BASE="https://pub-f0a47a1e0660483ca04c343f23495c08.r2.dev"

# Ensaio
DRY_RUN=1 npm run migrate:storage-to-r2

# Cópia real
npm run migrate:storage-to-r2
```

Verifica no Cloudflare R2 que os objectos aparecem (ex.: `track-weather/...`, `championship-logos/...`).

### Passo C — Reescrever URLs na DB

No **SQL Editor** do Supabase (projeto RTR), corre o conteúdo de:

`supabase/migrations/20260928230000_rewrite_media_urls_to_r2.sql`

Ou, se usares CLI local ligado ao projeto:

```bash
supabase db push
```

### Passo D — Validar

1. Abre `/live`, `/pilotos`, `/classificacao` — Network tab: **zero** pedidos a `…supabase.co/storage/…`
2. Imagens devem vir de `pub-….r2.dev` ou `/images/…`
3. Dashboard Supabase → Usage: cached egress deve parar de crescer por media
4. Opcional hard cut: tornar buckets `public = false` (comentário no fim do SQL)

### Passo E — Frontend env em produção

Garante `VITE_R2_PUBLIC_BASE=https://pub-f0a47a1e0660483ca04c343f23495c08.r2.dev` no deploy (Vercel/Pages).

---

## Arquitetura depois do cutover

```
Browser
  ├─ Auth / JSON / Realtime  → Supabase (uncached egress só de API)
  ├─ Media dinâmica          → Cloudflare R2 (pub-….r2.dev)  [egress R2 ≈ $0]
  └─ Chrome estático         → Hosting (public/images/…)
Admin upload
  └─ JWT Supabase → Worker presign → PUT R2 → guarda publicUrl na DB
```

## Cached egress — confirmação

| Quota free | Após cutover completo |
|------------|------------------------|
| **Cached egress (5 GB)** — só Storage CDN | → ~0 se não houver hits a `/storage/v1/object` |
| **Uncached egress (5 GB)** — API, Auth, Realtime, etc. | Continua; tipicamente muito menor que imagens |

---

## Ficheiros tocados (resumo)

- `src/lib/mediaUrl.ts`, `src/lib/mediaUrl.test.ts`
- `src/lib/r2Upload.ts` (tipo `driver` + re-export)
- `src/pages/Pilotos.tsx`, `Classificacao.tsx`
- `src/components/race/TrackInfo.tsx`, `RaceDrivers.tsx`
- `src/components/scoreboard/ScoreboardLiveGrid.tsx`
- `workers/r2-presign/index.ts`, `index.test.ts`
- `scripts/migrate-supabase-storage-to-r2.mjs`
- `supabase/migrations/20260928230000_rewrite_media_urls_to_r2.sql`
- `.env.example`, `package.json`, `vitest.config.ts`
- Este doc + `docs/supabase-egress-checklist.md` (ligação)

## Rollback

1. Não apagues buckets Storage até confirmares R2.
2. Se precisares reverter SQL: restaurar backup / reapontar URLs para Storage (só se os ficheiros ainda existirem).
3. Frontend: remover `mediaUrl()` volta a servir URLs cruas da DB.
