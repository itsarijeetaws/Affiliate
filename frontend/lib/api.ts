const DEFAULT_PUBLIC_FALLBACK = "https://whitesmoke-lapwing-348992.hostingersite.com";

function stripTrailingSlash(s: string): string {
  return s.replace(/\/$/, "");
}

function internalApiBase(): string {
  return stripTrailingSlash(
    process.env.INTERNAL_API_URL?.trim() ||
      process.env.NEXT_PUBLIC_API_URL?.trim() ||
      DEFAULT_PUBLIC_FALLBACK
  );
}

/**
 * Base URL for browser fetches. Uses NEXT_PUBLIC_API_URL when set; otherwise the current
 * page origin (works for combined Express + Next on one host without extra env).
 *
 * When the env URL matches the page origin, returns a **relative** path (e.g. `/auth/login`)
 * so the browser talks to the same host that served the page — avoids edge/DNS issues on
 * some hosts where an absolute public URL behaves differently.
 */
export function clientFetchUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    const base = stripTrailingSlash(fromEnv);
    if (typeof window !== "undefined") {
      try {
        const absoluteBase = base.includes("://") ? base : `https://${base}`;
        if (new URL(absoluteBase).origin === window.location.origin) {
          return p;
        }
      } catch {
        /* fall through to absolute URL below */
      }
    }
    return `${base}${p}`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${p}`;
  }
  return `${stripTrailingSlash(DEFAULT_PUBLIC_FALLBACK)}${p}`;
}

/**
 * @deprecated Use clientFetchUrl("/path") for new code — resolves same-origin correctly.
 */
export const API_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_PUBLIC_FALLBACK
);

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const p = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${internalApiBase()}${p}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    ...(typeof window === "undefined" ? { next: { revalidate: 300 } } : {})
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function clientFetchJson(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const { timeoutMs = 30000, ...fetchInit } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(clientFetchUrl(path), {
      ...fetchInit,
      signal: controller.signal
    });
    const text = await response.text();
    let data: Record<string, unknown> = {};
    if (text) {
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        data = { message: "Server returned a non-JSON response. Check API URL and server logs." };
      }
    }
    return { ok: response.ok, status: response.status, data };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const aborted =
      (e instanceof DOMException && e.name === "AbortError") ||
      message.toLowerCase().includes("abort");
    return {
      ok: false,
      status: 0,
      data: {
        message: aborted
          ? "Request timed out (30s). The API did not respond. Fix: on Hostinger Node, set INTERNAL_API_URL=http://127.0.0.1:PORT (same PORT as your app — not your public https URL). Check DATABASE_URL reaches MySQL and the Node process (Express + Next) is actually running."
          : `Could not reach the server (${message}). Check CORS (FRONTEND_URL / FRONTEND_URLS) and the API base URL.`
      }
    };
  } finally {
    clearTimeout(timer);
  }
}
