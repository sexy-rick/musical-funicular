import { fetch } from 'sdk';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_ANY_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function isMarketplaceUuid(value) {
  return UUID_RE.test(String(value || '').trim());
}

export function extractMarketplaceUuid(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (UUID_RE.test(text)) return text.toLowerCase();
  const embedded = text.match(UUID_ANY_RE);
  if (embedded) return embedded[0].toLowerCase();
  const url = text.match(/https?:\/\/[^\s"'<>]+/i);
  if (url) {
    const fromQuery = /[?&](?:id|itemId)=([0-9a-f-]{36})/i.exec(url[0]);
    if (fromQuery && UUID_RE.test(fromQuery[1])) return fromQuery[1].toLowerCase();
    for (const segment of url[0].split('/')) {
      if (UUID_RE.test(segment)) return segment.toLowerCase();
    }
  }
  return null;
}

export function extractMarketplaceUrl(value) {
  const match = String(value || '').match(/https?:\/\/[^\s"'<>]+/i);
  return match ? match[0] : null;
}

export function collectMarketplaceIdentity(message) {
  const sources = [];
  const scan = (node) => {
    if (!node) return;
    sources.push(node.text, node.caption);
    if (node.document) sources.push(node.document.file_name);
    if (node.video) sources.push(node.video.file_name);
  };
  scan(message);
  scan(message.reply_to_message);

  let uuid = null;
  let url = null;
  for (const source of sources) {
    if (!source) continue;
    if (!uuid) uuid = extractMarketplaceUuid(source);
    if (!url) url = extractMarketplaceUrl(source);
    if (uuid && url) break;
  }
  return { uuid, url };
}

export function cleanMarketplaceTitle(raw) {
  let value = String(raw || '').trim();
  if (!value) return 'Unknown';
  // Only strip real file extensions. A bare /\.[A-Za-z0-9]{1,6}$/ also ate version
  // suffixes on Marketplace page titles ("Roller Coaster Add-On 1.0" -> "... Add-On 1").
  value = value.replace(/\.(mcaddon|mcpack|mcworld|mctemplate|apk|zip|rar|7z|png|jpe?g|webp|gif|txt|pdf|docx?|xlsx?)$/i, '');
  value = value.replace(/\s+BY\s+MARKETPLACE\s+TRADER.*$/i, '');
  value = value.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return value || 'Unknown';
}

export function slugifyTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function findImageDeep(value, depth = 0) {
  if (value === null || value === undefined || depth > 5) return null;
  if (typeof value === 'string') {
    return /^https?:\/\/[^\s]+\.(png|jpe?g|webp)(\?[^\s]*)?$/i.test(value) ? value : null;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findImageDeep(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== 'object') return null;
  const preferred = ['thumbnail', 'thumbnailUrl', 'thumbnail_url', 'image', 'imageUrl', 'image_url', 'url', 'Url'];
  for (const key of preferred) {
    if (key in value) {
      const found = findImageDeep(value[key], depth + 1);
      if (found) return found;
    }
  }
  for (const key of Object.keys(value)) {
    const found = findImageDeep(value[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function pickPrice(product) {
  let priceCoins = null;
  let priceDollar = null;
  if (!product || !product.offers) return { priceCoins, priceDollar };
  const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
  for (const offer of offers) {
    if (!offer || typeof offer !== 'object') continue;
    // Live pages put fiat prices ONLY inside priceSpecification (EUR/USD/GBP offers have no
    // top-level price), so reading offer.price alone missed USD and fell back to coins/175.
    const spec = offer.priceSpecification && typeof offer.priceSpecification === 'object' ? offer.priceSpecification : null;
    const rawPrice = offer.price !== undefined && offer.price !== null ? offer.price : (spec ? spec.price : undefined);
    const price = Number(rawPrice);
    if (!Number.isFinite(price) || price < 0) continue;
    const currency = String(offer.priceCurrency || (spec ? spec.priceCurrency : '') || '').toUpperCase();
    if (currency === 'XMC') priceCoins = String(Math.round(price));
    if (currency === 'USD') priceDollar = `$${price.toFixed(price % 1 === 0 ? 0 : 2)}`;
  }
  if (priceCoins && !priceDollar) priceDollar = `$${(Number(priceCoins) / 175).toFixed(2)}`;
  return { priceCoins, priceDollar };
}

function extractMetaVersion(title) {
  const match = /(?:^|\b)v?(\d+(?:\.\d+)*)(?:\b|$)/.exec(String(title || ''));
  return match ? match[1] : null;
}

function cleanCreator(value) {
  if (!value) return null;
  let name = String(value).trim();
  name = name.replace(/\s*-\s*Minecraft Bedrock Marketplace Explorer.*$/i, '');
  name = name.replace(/\s+on the minecraft marketplace$/i, '');
  name = name.replace(/\s*\(Minecraft Marketplace.*$/i, '');
  name = name.replace(/\s*for the official Minecraft Marketplace.*$/i, '');
  name = name.replace(/\s+by\s+.+$/i, '');
  return name.trim() || null;
}

const TAG_CATEGORY = {
  'category.skinpack': 'SKIN PACK',
  'category.addon': 'ADD-ON',
  'category.mashup': 'MASHUP PACK',
  'category.texture': 'TEXTURE PACK',
  'category.resourcepack': 'TEXTURE PACK',
  'category.world': 'WORLD',
  'category.worldtemplate': 'WORLD',
  'category.template': 'TEMPLATE',
  'category.application': 'APPLICATION',
};

// Bedrock Explorer embeds the product's OFFICIAL Minecraft category tag in productTags
// (e.g. "category.skinpack"). This is the only page signal used for the category now: the old
// whole-page regexes matched navigation/related-product links and the "has-skinpack" tag
// (which means *contains* a skin pack), which is how Jungle Zoo (category.worldtemplate)
// ended up flagged SKIN PACK and routed to the skin channel.
function categoryFromProductTags(html) {
  const tagsBlock = (String(html || '').match(/productTags\s*=\s*(\[[^\]]*\])/) || [])[1];
  if (!tagsBlock) return '';
  for (const raw of tagsBlock.match(/"[a-z0-9._-]+"/g) || []) {
    const mapped = TAG_CATEGORY[raw.replace(/"/g, '')];
    if (mapped) return mapped;
  }
  return '';
}

function normalizeCategoryValue(value) {
  const raw = String(value || '').trim().toUpperCase().replace(/[\u2013\u2014]/g, '-');
  if (!raw) return '';
  if (raw === 'MASH UP' || raw === 'MASHUP' || raw === 'MASH-UP') return 'MASHUP PACK';
  if (raw === 'SKIN' || raw === 'SKINPACK' || raw === 'SKIN PACK') return 'SKIN PACK';
  if (raw === 'TEXTURE' || raw === 'RESOURCE' || raw === 'TEXTUREPACK' || raw === 'RESOURCE PACK') return 'TEXTURE PACK';
  if (raw === 'WORLD' || raw === 'MAP' || raw === 'WORLDTEMPLATE' || raw === 'WORLD TEMPLATE') return 'WORLD';
  if (raw === 'TEMPLATE') return 'TEMPLATE';
  if (raw === 'ADDON' || raw === 'ADD-ON') return 'ADD-ON';
  if (raw === 'APPLICATION') return 'APPLICATION';
  return raw;
}

function inferMarketplaceCategory(title, html, product) {
  const fromProduct = normalizeCategoryValue(product && (product.category || product.additionalType));
  if (fromProduct && fromProduct !== 'UNKNOWN' && fromProduct !== 'CONTENT') return fromProduct;
  const fromTags = categoryFromProductTags(html);
  if (fromTags) return fromTags;
  if (/mash[-\s]?up|mashup/i.test(String(title || ''))) return 'MASHUP PACK';
  return '';
}

function normalizeMeta(uuid, url, data) {
  const item = data && (data[0] || data.product || data.item || data.data || data);
  if (!item || typeof item !== 'object') return { uuid, marketplaceUrl: url };

  const localized = (value) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      return firstString(value.neutral, value.NEUTRAL, value['en-US'], value.en_US);
    }
    return null;
  };

  const title = localized(item.Title || item.title || item.name || item.DisplayName || item.displayName);
  const display = item.DisplayProperties || item.displayProperties || {};
  const creator = cleanCreator(firstString(display.creatorName, item.creator, item.creatorName, item.CreatorId));
  const thumbnailUrl = findImageDeep(item.Images || item.images || item.thumbnail || item.thumbnailUrl || item.item);
  const { priceCoins, priceDollar } = pickPrice(item);
  const version = extractMetaVersion(title);
  const category = inferMarketplaceCategory(title, '', item);

  return { uuid, marketplaceUrl: url, title, creator, thumbnailUrl, priceCoins, priceDollar, version, category };
}

const DEFAULT_TIMEOUT_MS = 8000;

// Every third-party call is time-boxed. Bedrock Explorer answers unknown slugs and UUIDs with
// HTTP 503 after ~30s, which used to block the handler for 31s (unknown UUID) or 60s (title search,
// two URLs). Promise.race is used instead of AbortSignal because the runtime fetch is only fetch-like.
async function raceFetch(url, accept, ms, bare) {
  const call = () => (bare
    ? fetch(url)
    : fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: accept || 'text/html',
      },
    }));
  // The Serverless runtime documents only the SDK surface; timers are not guaranteed. If setTimeout
  // is missing (or the race construction throws for any runtime reason) fall back to a plain fetch —
  // losing the deadline is far better than killing every metadata lookup, which is exactly what
  // happened when the race was unconditional (production trace: bedrock:err · mcnet:err · ...).
  if (typeof setTimeout !== 'function') return call();
  let timer = null;
  try {
    return await Promise.race([
      call(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`fetch timeout ${ms}ms ${url}`)), ms);
      }),
    ]);
  } catch (error) {
    if (timer && typeof clearTimeout === 'function') clearTimeout(timer);
    if (/^fetch timeout/i.test(String((error && error.message) || error))) throw error;
    return call();
  }
}

async function fetchWithTimeout(url, accept, timeoutMs) {
  const ms = Number(timeoutMs) > 0 ? Number(timeoutMs) : DEFAULT_TIMEOUT_MS;
  try {
    return await raceFetch(url, accept, ms, false);
  } catch (error) {
    const msg = String((error && error.message) || error);
    if (/^fetch timeout/i.test(msg)) throw error;
    // Insurance for runtimes whose fetch-like rejects the options/headers object outright:
    // retry the same URL once with a bare fetch before declaring the source dead.
    return await raceFetch(url, accept, ms, true);
  }
}

function traceSource(url) {
  const u = String(url || '');
  if (u.includes('bedrockexplorer.com')) return 'bedrock';
  if (u.includes('mcmarketplace.net')) return 'mcmkt';
  if (u.includes('minecraft.net') && u.includes('.json')) return 'mcjson';
  if (u.includes('minecraft.net')) return 'mcnet';
  try { return new URL(u).host; } catch { return u.slice(0, 24); }
}

function traceResult(error) {
  const msg = String((error && error.message) || error);
  if (/^fetch timeout/i.test(msg)) return 'timeout';
  const status = /fetch failed (\d+)/.exec(msg);
  if (status) return status[1];
  return 'err';
}

export function formatMetaTrace(meta) {
  const trace = (meta && Array.isArray(meta._trace)) ? meta._trace : [];
  return trace.map((t) => `${t.src}:${t.result}${t.ms ? '@' + t.ms + 'ms' : ''}`).join(' · ');
}

async function fetchText(url, accept, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const response = await fetchWithTimeout(url, accept, timeoutMs);
  if (!response || !response.ok) throw new Error(`fetch failed ${response ? response.status : 'no-response'} ${url}`);
  return response.text();
}

function htmlMatch(html, regex) {
  const match = regex.exec(String(html || ''));
  return match ? match[1].replace(/&amp;/g, '&').trim() : null;
}

function findProductJsonLd(html) {
  const blocks = String(html || '').match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of blocks) {
    const json = block
      .replace(/^<script[^>]*>/i, '')
      .replace(/<\/script>$/i, '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .trim();
    try {
      const parsed = JSON.parse(json);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of list) {
        if (entry && typeof entry['@type'] === 'string' && entry['@type'].includes('Product')) return entry;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function imageFromProductImage(image) {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return imageFromProductImage(image[0]);
  if (typeof image === 'object') return image.url || image.contentUrl || null;
  return null;
}

function creatorFromHtml(html, title) {
  const patterns = [
    /<title>[^<]*\bby\s+([^<|]+)/i,
    /property=["']og:title["'][^>]*content=["']([^"']*)\bby\s+([^"']+)/i,
    /created by\s+([A-Za-z0-9&.'\- ]{2,60})\s+for the official Minecraft Marketplace/i,
    /####\s*\[\*\*([^*\]]+)\*\*\]/i,
  ];
  const fromTitle = patterns[0].exec(String(html || ''));
  if (fromTitle) return cleanCreator(fromTitle[1]);
  const og = patterns[1].exec(String(html || ''));
  if (og) return cleanCreator(og[2]);
  const created = patterns[2].exec(String(html || ''));
  if (created) return cleanCreator(created[1]);
  const bracket = patterns[3].exec(String(html || ''));
  if (bracket) return cleanCreator(bracket[1]);
  const byInTitle = /\bby\s+(.+)$/i.exec(String(title || ''));
  if (byInTitle) return cleanCreator(byInTitle[1]);
  return null;
}

const GENERIC_PAGE_TITLES = ['minecraft dlc marketplace', 'minecraft marketplace', 'minecraft', 'not found', 'page not found', '404'];

function normalizePageTitle(rawTitle) {
  return String(rawTitle || '')
    .toLowerCase()
    .replace(/\s*\|\s*minecraft.*$/, '')
    .replace(/[-\u2013\u2014]\s*minecraft.*$/, '')
    .trim();
}

function isGenericPageTitle(rawTitle) {
  const normalized = normalizePageTitle(rawTitle);
  return !normalized || GENERIC_PAGE_TITLES.includes(normalized);
}

// mcmarketplace.net/pdp/{unknown-uuid} answers 200 with a ~394KB generic landing page whose <title>
// is "Minecraft DLC Marketplace | Minecraft" and which carries an unrelated product's UUID plus
// featured-product thumbnails. Scraping it put junk titles into channel captions and files.title.
function isGenericListingPage(html) {
  const rawTitle = htmlMatch(html, /<title>([^<(|]+)/i);
  // A page with no <title> at all is NOT generic: h1 / og:title / JSON-LD / og:image still get a chance.
  return Boolean(rawTitle) && isGenericPageTitle(rawTitle);
}

function emptyMeta(uuid, url) {
  return {
    uuid: uuid || null,
    marketplaceUrl: url || null,
    title: null,
    creator: null,
    thumbnailUrl: null,
    priceCoins: '',
    priceDollar: '',
    version: '',
    category: '',
  };
}

function metaFromHtml(uuid, url, html) {
  if (isGenericListingPage(html)) return emptyMeta(uuid, url);
  const product = findProductJsonLd(html);
  const title = htmlMatch(html, /<h1[^>]*>([^<]+)<\/h1>/i)
    || htmlMatch(html, /<title>([^<(|]+)/i)
    || htmlMatch(html, /property=["']og:title["'][^>]*content=["']([^"']+)/i);

  let thumbnailUrl = null;
  if (product) {
    thumbnailUrl = imageFromProductImage(product.image) || product.thumbnailUrl || null;
  }
  if (!thumbnailUrl) thumbnailUrl = htmlMatch(html, /property=["']og:image["'][^>]*content=["']([^"']+)/i);
  if (!thumbnailUrl) thumbnailUrl = htmlMatch(html, /name=["']twitter:image["'][^>]*content=["']([^"']+)/i);
  if (!thumbnailUrl) {
    const imgTag = /<img[^>]+(?:alt|title)=["']([^"']*(?:marketplace|cover|thumbnail|product|pack|add-on|world|mash-up)[^"']*)["'][^>]+src=["']([^"']+xforgeassets[^"']+)["']/i.exec(html)
      || /<img[^>]+src=["']([^"']*xforgeassets[^"']+)["'][^>]+(?:alt|title)=["']([^"']*(?:marketplace|cover|thumbnail|product|pack|add-on|world|mash-up)[^"']*)["']/i.exec(html);
    if (imgTag) thumbnailUrl = imgTag[2].includes('xforgeassets') ? imgTag[2] : imgTag[1];
  }
  if (!thumbnailUrl) {
    // mcmarketplace.net/pdp/{uuid} carries no JSON-LD, no og:image and no h1 — its single <img> is
    // bedrockexplorer's media-CDN proxy wrapping the pack's playfab thumbnail. Without this rule the
    // page yielded a title but no thumbnail, so degraded posts went out as plain text.
    thumbnailUrl = htmlMatch(html, /<img[^>]+src=["'](https?:\/\/media-cdn\.bedrockexplorer\.com\/[^"']+)/i);
  }
  if (!thumbnailUrl) {
    thumbnailUrl = htmlMatch(htmlish(html), /(https?:\/\/[^"'\s]+thumbnail[^"'\s]*\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s]*)?)/i);
  }

  // Pages without an <h1> (mcmarketplace.net) expose the name only inside <title>, with site suffixes:
  // "Roller Coaster Add-On 1.0 by Lofi Girl on the Minecraft Marketplace". Strip the site suffix first so
  // the "by ..." creator extraction stays clean, then drop the creator part for the displayed title.
  const siteTitle = String(title || '')
    .replace(/\s+on the minecraft marketplace$/i, '')
    .replace(/\s*[-\u2013\u2014]\s*minecraft bedrock marketplace explorer$/i, '');
  const creator = creatorFromHtml(html, siteTitle || title)
    || (product ? cleanCreator(firstString(product.brand && product.brand.name, product.creator, product.creatorName)) : null);
  const { priceCoins, priceDollar } = pickPrice(product);
  const category = inferMarketplaceCategory(title, html, product);
  const displayTitle = siteTitle.replace(/\s+by\s+.+$/i, '');

  return {
    uuid: uuid || extractMarketplaceUuid(html),
    marketplaceUrl: url,
    title: displayTitle ? cleanMarketplaceTitle(displayTitle) : null,
    creator,
    thumbnailUrl,
    priceCoins,
    priceDollar,
    version: extractMetaVersion(title),
    category,
  };
}

function htmlish(value) {
  return String(value || '');
}

const META_BUDGET_MS = 12000;

export async function fetchMarketplaceMeta(uuid, marketplaceUrl, budgetMs = META_BUDGET_MS) {
  // Ordered by likelihood. Bedrock Explorer is the only source returning product data today; the two
  // minecraft.net JSON endpoints are permanently HTTP 404 (385KB error body each), so they are kept
  // last as a fallback instead of costing ~432ms and ~771KB on every single lookup.
  const candidates = [
    { url: `https://www.bedrockexplorer.com/marketplace-content/${uuid}`, accept: 'text/html', json: false, timeout: 8000 },
    { url: marketplaceUrl || `https://mcmarketplace.net/pdp/${uuid}`, accept: 'text/html', json: false, timeout: 4000 },
    // Independent of marketplaceUrl: when the admin pastes a minecraft.net link (client-rendered shell,
    // always rejected as generic) this page used to be shadowed and never fetched — yet it is the only
    // source that still serves the pack thumbnail when Bedrock Explorer itself is down or missing a pack.
    { url: `https://mcmarketplace.net/pdp/${uuid}`, accept: 'text/html', json: false, timeout: 4000 },
    { url: `https://www.minecraft.net/bin/minecraft/productmanagement.productdetails.json?id=${uuid}`, accept: 'application/json', json: true, timeout: 2500 },
    { url: `https://www.minecraft.net/bin/minecraft/productmanagement.uuiddata.json?locale=en-us&type=addon&uuid=${uuid}`, accept: 'application/json', json: true, timeout: 2500 },
  ];

  const startedAt = Date.now();
  const tried = new Set();
  const trace = [];
  for (let ci = 0; ci < candidates.length; ci++) {
    const candidate = candidates[ci];
    const src = traceSource(candidate.url);
    const dedupeKey = candidate.retry ? `${candidate.url}#retry` : candidate.url;
    if (tried.has(dedupeKey)) continue;
    tried.add(dedupeKey);
    const left = Number(budgetMs) > 0 ? Number(budgetMs) - (Date.now() - startedAt) : candidate.timeout;
    if (left <= 500) {
      trace.push({ src, result: 'budget', ms: Date.now() - startedAt });
      break;
    }
    const t0 = Date.now();
    try {
      const body = await fetchText(candidate.url, candidate.accept, Math.min(candidate.timeout, left));
      let meta;
      if (candidate.json) {
        meta = normalizeMeta(uuid, marketplaceUrl, JSON.parse(body));
      } else {
        meta = metaFromHtml(uuid, marketplaceUrl, body);
      }
      const ms = Date.now() - t0;
      if (meta && (meta.thumbnailUrl || (meta.title && meta.uuid))) {
        meta._trace = trace.concat([{ src, result: meta.thumbnailUrl ? 'ok+thumb' : 'ok+title', ms }]);
        return meta;
      }
      trace.push({ src, result: isGenericListingPage(body) ? 'generic' : 'noparse', ms });
    } catch (error) {
      const ms = Date.now() - t0;
      const result = traceResult(error);
      trace.push({ src, result, ms });
      // Bedrock Explorer sometimes answers a perfectly valid UUID with a fast 503. One immediate
      // retry converts most of those inside the same window. Timeouts (slow/hostile host) are NOT
      // retried, and the retry reserves >=4.5s of the budget so the fallback candidates never starve.
      if (src === 'bedrock' && !candidate.retry && result !== 'timeout' && ms < 4000) {
        const leftAfter = Number(budgetMs) - (Date.now() - startedAt);
        const retryTimeout = Math.min(6000, leftAfter - 4500);
        if (retryTimeout >= 1500) {
          // Insert directly after the failed attempt so the retry happens BEFORE the fallbacks;
          // queueing it at the end meant a successful fallback always preempted it.
          candidates.splice(ci + 1, 0, { url: candidate.url, accept: candidate.accept, json: candidate.json, timeout: retryTimeout, retry: true });
        }
      }
    }
  }
  return { uuid, marketplaceUrl, _trace: trace };
}

export async function searchMarketplaceByTitle(rawTitle) {
  const title = cleanMarketplaceTitle(rawTitle);
  const slug = slugifyTitle(title);
  const urls = [
    `https://www.bedrockexplorer.com/marketplace-content/${slug}`,
    `https://www.bedrockexplorer.com/marketplace-offer/${slug}`,
  ];
  for (const url of urls) {
    try {
      const html = await fetchText(url, 'text/html', 6000);
      const uuid = extractMarketplaceUuid(html);
      if (!uuid) continue;
      const meta = metaFromHtml(uuid, url, html);
      if (!meta.title) continue;
      return {
        ...meta,
        title: meta.title ? String(meta.title).replace(/\s+by\s+.+$/i, '') : title,
        searchTitle: title,
        sourceUrl: url,
      };
    } catch {
      continue;
    }
  }
  return { title, searchTitle: title };
}
