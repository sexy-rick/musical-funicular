# Website engine research — performance, abuse protection and reliability

**Date:** 27 November 2026
**Status:** Research and recommendations only. No implementation, deployment, plan change, schema change or new paid service was made.
**Scope:** Current InfinityFree PHP website → visitor browser → public Cloudflare Worker → D1 metadata; Telegram bot → authenticated Worker sync; Telegram currently delivers files. No login, public submissions or upload forms are planned for v1. R2 and its quota controls are not implemented.

## 1. Executive summary

The best early investments are (1) loading the visible catalog quickly, (2) protecting the public Worker from excessive requests without blocking normal users or the Telegram bot, (3) fixing synchronization/recovery gaps, and (4) monitoring the free-tier limits. A CAPTCHA on every page would add friction and would not by itself protect the Worker API. There is no public form to spam today; public API scraping and request floods are the more relevant risks.

## 2. What exists today, based on source inspection

- `website/assets/catalog.js` retrieves public metadata directly from the Worker. All card thumbnails are currently marked `loading=lazy`, including ones that may appear immediately. Images have a placeholder for missing URLs but no explicit image-error fallback.
- `cloudflare/worker.js` supports public `GET /addons` and `GET /addons/{uuid}`, and `POST /sync` protected by a secret. The Worker currently returns `Cache-Control: no-store` for all responses. Do not mistake site-specific CORS for authentication: a browser can be prevented from reading a cross-origin response, but non-browser callers can still request the public API.
- Each catalog list request does a count query and a page query (24 items per page). Search uses a leading-and-trailing wildcard on title and creator. The endpoint allows pages up to 100,000, which can mean large offsets.
- Sync validates a secret and UUID, limits declared body length, and checks body text length **after** reading it. If the length header is absent or dishonest, that post-read check is not a strict streaming memory limit. This is a hardening opportunity, not proof of a compromise.
- The website consumes only public metadata and the secret stays server-to-server. Existing sync problems include no persistent retry queue, failed deletions not reconciled by ordinary backfill, and same-second ordering ambiguity.
- The existing worker host is `workers.dev`. The InfinityFree site and Worker are on different hosting layers; features requiring ownership of a Cloudflare zone cannot simply be assumed to cover both. InfinityFree blocks its servers from accessing `workers.dev`, so any architecture relying on PHP server-side calls to it is unsuitable without a proven alternative.

## 3. Speed and load efficiency

### 3.1 Image lazy loading — high priority

**Recommendation:** Load near-viewport/likely LCP images without lazy delay; use native lazy loading for lower cards. Do not assign high fetch priority to every image. Reserve a consistent thumbnail area and implement a neutral fallback on error. Measure on mobile and slow networks; the identity of the LCP element can vary by layout. Current URLs are returned by an API after JavaScript executes, so removing lazy loading does not eliminate the API → image discovery waterfall. [web.dev image loading](https://web.dev/learn/images/performance-issues), [LCP guidance](https://web.dev/articles/optimize-lcp).

**Image size and permissions:** Reuse real thumbnails where authorized. Send appropriately sized variants only if the image provider actually supplies them or we later build a permitted optimization pipeline; cannot shrink transfer bytes merely by using CSS. Third-party thumbnails can fail, disappear or cost their host resources. Never run an arbitrary user-controlled server-side image proxy; that introduces SSRF and bandwidth risk.

### 3.2 Cache deliberately — high priority, test freshness

- Browser-cache fingerprinted CSS/JS for longer; HTML and unversioned assets need a safe revalidation or shorter lifetime so updates do not strand users on old code. Verify InfinityFree supports chosen headers.
- Consider a short **30–60 second trial TTL** for successful public list and detail responses only, after testing Worker cache capabilities and costs on the actual `workers.dev` deployment. Current `no-store` means a deliberate response/header change is necessary; it is not already happening.
- Never cache `/sync` responses or unauthorized responses. Define separate cache keys for normalized query, category, page and any response-affecting headers; do not serve one query's results for another. Limit caching arbitrary one-off search strings, which can waste cache space.
- Short TTL means updates and removals may remain visible until expiry. For takedowns, stronger invalidation and a verified route/capability are needed; do not promise instant global deletion. Cloudflare's Workers Cache API is local to each data center; `cache.delete()` is not a global purge. Verify current platform-specific caching support instead of assuming a zone-based purge works on `workers.dev`. [Workers Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/).
- Cache can reduce repeat D1 work but does not automatically protect or eliminate every Worker invocation, particularly when using the Worker Cache API. Measure requests, rows read and hit behavior.

### 3.3 Search and pagination — high priority as catalog grows

The leading wildcard `LIKE '%term%'` may scan many rows; the count and page queries can each add work, and large `OFFSET` values become inefficient. D1 meters rows scanned, not only rows returned. Use `EXPLAIN QUERY PLAN` and D1 metrics to measure realistic queries before adding indexes. A normal index generally does not optimize a leading wildcard; evaluate prefix search or FTS5/trigram only after measuring, checking D1 support and accounting for index writes/storage and changed search behavior. Limit unreasonable pagination, and consider cursor-based pagination when scale warrants it. [Cloudflare D1 indexing](https://developers.cloudflare.com/d1/best-practices/use-indexes/).

Keep the existing 24-per-page cap. If live search is added later, debounce around 300–500 ms as a starting experiment, cancel stale requests and preserve explicit submit/keyboard behavior. This improves normal usage but does not prevent a malicious caller from issuing direct requests.

## 4. Bot guard and spam protection

### 4.1 Public read endpoints

The catalog is deliberately public; no technical control can guarantee that public information cannot be copied. The realistic objective is to limit disruptive traffic and resource consumption, not to make the catalog secret.

- Evaluate the **Cloudflare Workers Rate Limiting binding** for `GET /addons` and detail requests, with a generous threshold based on observed legitimate behavior. Return 429 with a readable retry instruction; monitor false positives, shared household/mobile networks and accessibility. Use trusted Cloudflare-provided connection information, not an arbitrary client-supplied forwarding header.
- This rate limiter is **approximate and per Cloudflare location**, not a global hard quota. Traffic from many sources can still exhaust daily quotas. Confirm binding availability and account plan in the real deployment before relying on it. [Cloudflare Workers Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [OWASP resource consumption](https://api-security.owasp.org/editions/2023/en/0x11-t10/).
- Cloudflare lists one rate-limiting WAF rule on its Free zone plan, but **do not assume zone WAF settings can be configured on the current shared `workers.dev` hostname or the InfinityFree-hosted subdomain**. Verify ownership, routing and dashboard eligibility first. A paid custom domain or moving the site would change the budget/architecture; neither is proposed now. [Cloudflare WAF](https://developers.cloudflare.com/waf/), [workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).
- Avoid blanket JS or managed challenges on JSON API calls: challenges can return HTML instead of JSON, break browsers, search engines and machine clients, and especially break Telegram `/sync`. Apply any control to a narrowly defined route after testing and keep a rollback.

### 4.2 Private sync endpoint

- Keep `/sync` authenticated independently of CORS and human challenges. Preserve the bot's current secret and D1 binding on deploy.
- Validate method, content type and bounded fields; read the body with a true byte limit while streaming, including requests without Content-Length; test multi-byte payloads and aborted requests. Make unauthorized requests cheap and avoid detailed authentication error messages.
- Consider a separate coarse limit for repeated unauthorized sync calls only if it does not block real bot retries or an owner import of 20 items. Do not expose the token or put it into browser code, URLs or logs.
- Replays, stale events and update/delete ordering need explicit event semantics; request throttling alone does not fix correctness. Restrict what can be changed using a dedicated secret and validate payload values.

### 4.3 CAPTCHA/Turnstile — defer for current v1

There is no public upload, request or comment form to spam, so do not add a CAPTCHA to ordinary browsing by default. If an actual public form is introduced later, evaluate Turnstile on that **specific action**, with expiry/error/accessibility handling and mandatory server-side Siteverify validation. A widget alone is not security, and a robot challenge must not protect the machine-to-machine bot sync. Note InfinityFree's outgoing restrictions must be tested for Siteverify or use a deliberately designed backend; do not assume PHP can reach it. [Turnstile verification](https://developers.cloudflare.com/turnstile/get-started/).

## 5. Reliability and data integrity

1. **Finish the catalog import:** resume the owner-only batch cursor until Finished; record partial failures. Confirm real bot file delivery separately.
2. **Persistent retry and safe idempotency:** design a durable retry mechanism appropriate to Telegram Serverless limitations and quotas. Use exponential backoff with bounded retries and jitter, preserving event identity and ordering. Do not implement an in-memory-only queue and claim persistence.
3. **Reconciliation including deletion:** compare an authoritative complete snapshot or deletion log with the public catalog only after the full import succeeds. Do not delete entries based on a partial or failed batch. Tombstone retention and eventual consistency need a deliberate policy.
4. **Ordering:** second-resolution timestamps currently lose some same-second updates; use a reliable monotonic version or event ID with a deterministic conflict policy, testing updates and deletions. Do not casually apply migrations to the Telegram database; the pending BotFather schema changes are explicitly out of scope.
5. **Recoverable UI:** timeout/abort the browser fetch, show actionable retry, distinguish 404, 429 and outage, keep filters and restore scroll after Back. Avoid retry storms and infinite automatic refresh.
6. **Safe backups:** document backups/restores for public metadata and bot source without exposing secrets. Test restoring against a separate test environment. A Worker `/health` response verifies Worker reachability only; it does not prove D1 or Telegram delivery.
7. **Operational visibility:** track aggregate errors, slow queries, quota usage, sync failures and failed delivery tests without logging tokens, Telegram file IDs or sensitive user data. Use minimal retention and avoid invasive analytics by default.

## 6. Budget and quotas — documented values, not guarantees

Cloudflare's published Workers Free plan lists **100,000 requests/day** (shared at the account level; resets at midnight UTC), and D1 Free lists **5 million rows read/day, 100,000 rows written/day and 5 GB total storage**. Availability and limits can change; check the account dashboard. Exceeding Worker limits can result in 1027 errors; D1 limits can stop queries. These limits are not a per-user safety firewall. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [pricing](https://developers.cloudflare.com/workers/platform/pricing/).

**Later R2, not active:** R2 Standard's published allowance is 10 GB-month of storage, 1 million Class A and 10 million Class B operations per month, with separate overage pricing. A storage cap alone cannot guarantee a $0 bill: operation counts, temporary upload/replacement peaks and account-wide usage also matter. [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

**Important unit mismatch:** the old unused guard uses 10,092,649,186 bytes, approximately 9.4 GiB or 10.093 decimal GB. That is not the same as 9.4 decimal GB (9,400,000,000 bytes). Before implementing the user's desired 9.4 GB cap, confirm Cloudflare's current billing unit and account usage, use an explicit conservative byte limit and leave headroom. The guard is not connected to R2 or the bot and enforces nothing. A hard cap would require atomic reservations, concurrency control, accounting for multipart uploads, replacement overlap, cleanup, reconciliation, and a single controlled write path. Alerts alone are not hard enforcement; there is no demonstrated zero-cost guarantee.

## 7. Suggested implementation order, if requested later

| Priority | Work | Why | Risk/verification |
|---|---|---|---|
| P0 | Verify actual Telegram delivery and complete import | Core product works before polishing | Don't delete or alter real content for testing |
| P0 | Harden sync input/body limits; preserve credentials/bindings | Protect authenticated updates | Test current bot's 20-item import and new/update/delete flows |
| P1 | Correct visible image loading and broken-image fallback | Faster first view and stable layout | Test real photos on mobile and desktop |
| P1 | Add narrowly scoped Worker rate limit | Reduce abusive read traffic | Approximate/per-location; avoid blocking sync or shared IPs |
| P1 | Search/query measurement and sane pagination | Protect D1 as catalog grows | Measure plans and row reads before changing search semantics |
| P1 | Retry, event ordering and deletion reconciliation design | Prevent missing/stale catalog entries | Never act on incomplete snapshots; no bot schema migration |
| P2 | Short public-response cache | Reduce repeated D1 reads | Stale deletions; cache key/TTL/invalidation testing |
| P2 | Minimal monitoring and rollback | Know when the site is failing | No secrets/personal data in logs |
| Future | Turnstile for a real public form, R2 guarded uploads | Only if a new feature requires it | Different architecture and possible billing; do not enable now |

## 8. Verification required before claiming this is done

- Local tests: request size boundaries without Content-Length, unauthorized sync, valid batch, duplicate/reordered updates and deletions, long searches, page bounds, rate-limit behavior and different origins.
- Separate safe deployment: test Worker bindings remain intact, browser CORS works, 429 is understandable, no challenges intercept `/sync`, and normal Telegram import/update/delete remains functional.
- Real browsers/devices: slow network, image failure, 320 px layout, keyboard/reduced motion, back navigation, search/filters, JS disabled and actual Telegram delivery.
- Quotas/monitoring: measure request and D1 read patterns under realistic test data; no real load test against the live service without a safe plan.

**Unchecked:** No live changes, load testing, security audit, WAF eligibility check, D1 query-plan measurement, completed import, end-to-end file delivery, R2 cap or budget enforcement in this research turn.
