/**
 * File Name: api-client.ts
 * Description: Centralized fetch utility for all client-side API calls.
 *
 *   Features:
 *   - GET deduplication  : concurrent identical GET requests share one in-flight fetch.
 *   - Retry with backoff : retries network errors + 500/502/503/504 (not 4xx user errors).
 *   - Timeout            : AbortController cancels hung requests after `timeout` ms.
 *   - Safe JSON parsing  : never throws on malformed responses; returns {ok:false} instead.
 *   - Consistent shape   : every call resolves to { ok, status, data } — no unhandled rejections.
 *
 * Developer: KP-184
 * Created Date: 2026-07-15
 */

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T;
}

interface ApiOptions extends Omit<RequestInit, "signal"> {
  /** Max retry attempts for transient errors (network + 5xx). Default: 2 for GET, 1 for others. */
  retries?: number;
  /** Base delay between retries in ms (doubles each attempt). Default: 300. */
  retryDelay?: number;
  /** Abort request after this many ms. Default: 12000. */
  timeout?: number;
}

// ─── In-flight GET deduplication ─────────────────────────────────────────────
// If two callers fetch the same URL simultaneously, they share one Promise.
// The entry is deleted as soon as the fetch resolves (success or error).
//
// Every caller receives response.clone(), NEVER the original Response. A body
// can only be read once — if two callers shared the raw Response (e.g. React
// StrictMode double-mounting the checkout effect), the second .json() would
// throw, _safe_json would swallow it, and the caller would see ok:true with
// empty data → "Could not load checkout" with a perfectly healthy backend.
// Clones read independently as long as the original body is never consumed.
const _inFlight = new Map<string, Promise<Response>>();

function _deduped_get(url: string, init: RequestInit): Promise<Response> {
  const existing = _inFlight.get(url);
  if (existing) return existing.then((r) => r.clone());

  const req = fetch(url, init).finally(() => _inFlight.delete(url));
  _inFlight.set(url, req);
  return req.then((r) => r.clone());
}

// ─── Safe JSON parser ────────────────────────────────────────────────────────
async function _safe_json<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

// ─── Retry helper ────────────────────────────────────────────────────────────
function _should_retry(status: number): boolean {
  return status === 500 || status === 502 || status === 503 || status === 504;
}

async function _sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
async function _fetch_with_retry<T>(
  url: string,
  init: RequestInit,
  isGet: boolean,
  retries: number,
  retryDelay: number,
  timeout: number
): Promise<ApiResult<T>> {
  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = isGet
        ? await _deduped_get(url, { ...init, signal: controller.signal })
        : await fetch(url, { ...init, signal: controller.signal });

      clearTimeout(timer);

      if (_should_retry(response.status) && attempt < retries) {
        attempt++;
        await _sleep(retryDelay * attempt);
        continue;
      }

      const data = await _safe_json<T>(response);
      return { ok: response.ok, status: response.status, data };
    } catch {
      clearTimeout(timer);

      // Network errors AND timeouts are both transient — retry each. A slow
      // WP roundtrip that trips the client timeout once often succeeds on the
      // second attempt (WP object cache warm, PHP worker free).
      if (attempt < retries) {
        attempt++;
        await _sleep(retryDelay * attempt);
        continue;
      }

      // Exhausted retries — resolve gracefully (no unhandled rejection).
      return { ok: false, status: 0, data: {} as T };
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET request with in-flight deduplication, retry, and timeout.
 *
 * @example
 * const { ok, data } = await apiGet<CartData>("/api/cart");
 */
export async function apiGet<T>(
  url: string,
  options: ApiOptions = {}
): Promise<ApiResult<T>> {
  const {
    retries = 2,
    retryDelay = 300,
    timeout = 12_000,
    ...init
  } = options;

  return _fetch_with_retry<T>(
    url,
    { method: "GET", credentials: "same-origin", ...init },
    true,
    retries,
    retryDelay,
    timeout
  );
}

/**
 * POST (or PUT/PATCH/DELETE) with JSON body, retry on transient errors.
 *
 * @example
 * const { ok, data } = await apiPost<PlaceOrderResponse>("/api/checkout", payload);
 */
export async function apiPost<T>(
  url: string,
  body: unknown,
  options: ApiOptions = {}
): Promise<ApiResult<T>> {
  const {
    retries = 1,
    retryDelay = 300,
    timeout = 15_000,
    ...init
  } = options;

  return _fetch_with_retry<T>(
    url,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      ...init,
    },
    false,
    retries,
    retryDelay,
    timeout
  );
}

/**
 * DELETE request.
 */
export async function apiDelete<T>(
  url: string,
  options: ApiOptions = {}
): Promise<ApiResult<T>> {
  const {
    retries = 1,
    retryDelay = 300,
    timeout = 10_000,
    ...init
  } = options;

  return _fetch_with_retry<T>(
    url,
    { method: "DELETE", credentials: "same-origin", ...init },
    false,
    retries,
    retryDelay,
    timeout
  );
}
