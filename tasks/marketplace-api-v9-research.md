# Marketplace API research for v9

Date: 2026-11-27. User requested a current GitHub alternative and a build.

## Candidate

`https://github.com/Daniel-Ric/PlayFab-Catalog-Service-Bedrock`, inspected at commit `d6676eabaf5cb6e056b9019ffe3579ceae763dbf`, is active (GitHub reports pushed 2026-11-25) and has an Apache-2.0 LICENSE; its package.json separately declares ISC, so license details would need review before copying. It describes a Node/Express service, PlayFab anonymous device login/session tokens, catalog search and item details, and projections for item creator, price and CreationDate. Generic PlayFab creation dates are not necessarily the website's file upload dates. Whether prices, studio logos and rights are available for each Minecraft pack was not independently verified.

## Decision

Do not copy, install or ship its implementation or embed an unverified public server or token in the website. InfinityFree cannot run a persistent Node/Express service, and the required PlayFab sessions, upstream use rights, availability, rate/cost, current response semantics, hosting and secrets have not been tested. A GitHub repository is not itself a running public API. Sandbox outbound restrictions prevented direct live PlayFab tests. The repo is a useful research candidate, not a tested integration. Never ask the owner to paste any tokens. If the user wants the integration, design a separate permitted zero-cost hosting/auth and data-refresh experiment, validate actual item IDs, provenance and price/icon reliability, and obtain separate approval before changing schemas, bot or deployments.

The local v9 build uses the existing Worker/D1 metadata; price is labeled Not available rather than fabricated. Studio names work as exact-name filters in the existing catalog; they are not verified stable creator identities. Real studio logos are not included because no permitted source was validated. No code copied from the candidate.

## Re-check for the v10 request

User explicitly asked to use this repository. Its README at the inspected commit describes authenticated `POST` advanced search with content kinds including `persona`, PlayFab creation/last-modified dates, and `ratingMin`; `/marketplace/popular/:alias` sorts by `rating/totalcount`. The advanced search sort-field list does **not** list rating, so do not assume both requested rating directions are supported by that endpoint. Those descriptions are not proof that fields exist for our UUIDs or correspond to the Telegram catalog. Most routes require a bearer JWT obtained using configured server admin credentials, and the separate project contains optional watchers and token-exposing routes that need hardening before public deployment. A browser must never receive the admin credentials or JWT merely to call this API.

A usable integration still requires a separately hosted Node service, a safe server-side public adapter/access boundary, secrets configured outside the website and chat, upstream connectivity/terms, cost and rate-limit review, and tests of identifier mapping, data provenance, pagination and relevance. This sandbox cannot reach PlayFab to establish actual data availability. No repository source was copied, service installed, external requests performed, auth embedded, integration deployed or metadata invented. v10 website fixes use the existing public catalog only. The screenshot's rating/new DLC/persona filter options remain deferred rather than misleading.
