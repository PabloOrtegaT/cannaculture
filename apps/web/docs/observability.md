# Observability

This document describes how logs and telemetry are wired in the Cannaculture Workers application and how to connect them to a persistent destination.

## Current state

- `wrangler.jsonc` has `observability.enabled: true`.
- `src/server/observability/telemetry.ts` emits structured JSON to `console.*`.
- By default, logs are visible only in the Cloudflare Workers dashboard with Cloudflare's default retention window.

## Structured log format

The telemetry module emits JSON lines that look like this:

```json
{
  "level": "error",
  "scope": "payment/webhook",
  "message": "Signature verification failed",
  "timestamp": "2026-04-25T11:30:00.000Z",
  "service": "cannaculture-web",
  "environment": "production"
}
```

When `metadata` is provided it is included as a top-level object:

```json
{
  "level": "info",
  "scope": "inventory/sweep",
  "message": "Sweep completed",
  "metadata": { "itemsUpdated": 42 },
  "timestamp": "2026-04-25T11:30:00.000Z",
  "service": "cannaculture-web",
  "environment": "production"
}
```

## Destination options

### 1. R2 Logpush (recommended for retention on Cloudflare)

**Pros:** No external vendor, stays inside Cloudflare, cheap long-term storage.  
**Cons:** Querying requires downloading objects or using external tools.

Steps:

1. Create an R2 bucket (e.g. `cannaculture-logs`).
2. In the Cloudflare dashboard go to **Analytics > Logs > Logpush**.
3. Create a job, select **R2** as the destination, and point it at the bucket.
4. Add `"logpush": true` inside the `observability` block of `wrangler.jsonc`:

```jsonc
"observability": {
  "enabled": true,
  "head_sampling_rate": 1,
  "logpush": true
}
```

5. Redeploy (`npm run deploy`).

Logs will begin arriving in the R2 bucket as gzipped NDJSON within a few minutes.

### 2. Axiom

**Pros:** Fast search, dashboards, alerting.  
**Cons:** Requires an Axiom account and ingest token.

Steps:

1. Create an Axiom dataset (e.g. `cannaculture-logs`).
2. Copy the **Ingest API token** and the **dataset ingest URL** from Axiom settings.
3. Set the following environment variables (via `wrangler secret put` or `.dev.vars` locally):

```
TELEMETRY_DESTINATION=axiom
TELEMETRY_INGEST_URL=https://api.axiom.co/v1/datasets/cannaculture-logs/ingest
TELEMETRY_INGEST_TOKEN=xaat-xxxxxxxx
```

4. Redeploy.

The telemetry sink reformats the payload for Axiom (`_time` instead of `timestamp`) and forwards it over HTTP in addition to the console output.

### 3. Baselime

**Pros:** Tail-based, good Cloudflare Workers integration.  
**Cons:** Requires Baselime account.

Steps:

1. Create a Baselime project and copy the **API key**.
2. Set the environment variables:

```
TELEMETRY_DESTINATION=baselime
TELEMETRY_INGEST_URL=https://events.baselime.io/v1/logs
TELEMETRY_INGEST_TOKEN=bl-xxxxxxxx
```

3. Redeploy.

The telemetry sink reformats the payload for Baselime (`@timestamp` and nested `data`).

### 4. Tail Worker

For advanced use cases you can send logs to a separate Worker that acts as a consumer.

1. Create a Tail Worker (e.g. `cannaculture-log-consumer`) that ingests log streams.
2. Add a `tail_consumers` array to `wrangler.jsonc`:

```jsonc
"tail_consumers": [
  { "service": "cannaculture-log-consumer" }
]
```

3. Redeploy.

See Cloudflare docs for Tail Worker event shape.

## Local development

Local Workers (via `wrangler dev` / `npm run dev`) still emit JSON to the terminal. No external destination is contacted unless the three `TELEMETRY_*` variables are set in `.dev.vars`.

## Security notes

- `TELEMETRY_INGEST_TOKEN` should be treated as a secret. Use `wrangler secret put TELEMETRY_INGEST_TOKEN` in production; do not commit it to the repo.
- The HTTP forward in `telemetry.ts` is fire-and-forget. A failing destination will not crash the request, but errors are printed to `console.error` so they remain visible in the dashboard.
