/**
 * Pinterest API v5 — create pins with product images and affiliate links.
 *
 * Auth: Bearer access token (long-lived).
 * On 401: attempts one token refresh using PINTEREST_REFRESH_TOKEN.
 * If refresh also fails: returns error, operator must update PINTEREST_ACCESS_TOKEN.
 *
 * How to get initial tokens:
 *   1. Create app at developers.pinterest.com
 *   2. OAuth2 flow → scopes: boards:read, pins:write
 *   3. Exchange code → access_token + refresh_token
 *   4. Set both in .env
 */

export interface PinParams {
  title: string;       // max 100 chars
  description: string; // max 500 chars
  imageUrl: string;
  link: string;        // affiliate URL
  boardId: string;
}

export interface PinResult {
  ok: boolean;
  pinId?: string;
  error?: string;
}

// Lazy getters — read at call time (ESM-safe, same pattern as telegram.service.ts)
const getAccessToken  = () => process.env.PINTEREST_ACCESS_TOKEN  ?? "";
const getRefreshToken = () => process.env.PINTEREST_REFRESH_TOKEN ?? "";
const getClientId     = () => process.env.PINTEREST_CLIENT_ID     ?? "";
const getClientSecret = () => process.env.PINTEREST_CLIENT_SECRET ?? "";

export function isPinterestConfigured(): boolean {
  return !!(getAccessToken() && process.env.PINTEREST_BOARD_ID);
}

export function getPinterestIntegrationStatus(): { configured: boolean; boardId: string } {
  return {
    configured: isPinterestConfigured(),
    boardId: process.env.PINTEREST_BOARD_ID ?? "",
  };
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

async function doPostPin(token: string, payload: object): Promise<Response> {
  return fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

async function tryRefreshToken(): Promise<string | null> {
  const rt = getRefreshToken();
  const id = getClientId();
  const secret = getClientSecret();
  if (!rt || !id || !secret) return null;

  try {
    const resp = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: rt,
      }).toString(),
    });

    if (!resp.ok) return null;
    const data = await resp.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function createPin(params: PinParams): Promise<PinResult> {
  const token = getAccessToken();
  if (!token) return { ok: false, error: "PINTEREST_ACCESS_TOKEN not set" };

  const payload = {
    link: params.link,
    title: params.title.slice(0, 100),
    description: params.description.slice(0, 500),
    board_id: params.boardId,
    media_source: {
      source_type: "image_url",
      url: params.imageUrl,
    },
  };

  let resp = await doPostPin(token, payload);

  // 401 → try refresh once
  if (resp.status === 401) {
    console.warn("[Pinterest] Access token expired — attempting refresh...");
    const newToken = await tryRefreshToken();
    if (!newToken) {
      return {
        ok: false,
        error: "Access token expired and refresh failed. Update PINTEREST_ACCESS_TOKEN in .env.",
      };
    }
    resp = await doPostPin(newToken, payload);
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "unknown error");
    return { ok: false, error: `Pinterest API ${resp.status}: ${errText.slice(0, 200)}` };
  }

  const data = await resp.json() as { id?: string };
  return { ok: true, pinId: data.id };
}
