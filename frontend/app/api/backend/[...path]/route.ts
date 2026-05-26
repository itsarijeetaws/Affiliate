import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stripTrailingSlash(s: string): string {
  return s.replace(/\/$/, "");
}

function backendOrigin(): string {
  const explicit = process.env.INTERNAL_API_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);
  const port = process.env.PORT?.trim() || "4000";
  return `http://127.0.0.1:${port}`;
}

const ALLOWED_PREFIXES = ["/auth", "/automation", "/products", "/categories", "/api/blog", "/comparisons", "/analytics", "/go"];

function allowBackendPath(path: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

async function proxy(req: NextRequest, segments: string[]): Promise<NextResponse> {
  const path = `/${segments.join("/")}`;
  if (!allowBackendPath(path)) {
    return NextResponse.json({ message: "Proxy path not allowed" }, { status: 403 });
  }

  const target = `${backendOrigin()}${path}${req.nextUrl.search}`;
  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const authorization = req.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);
  const automationKey = req.headers.get("x-automation-api-key");
  if (automationKey) headers.set("x-automation-api-key", automationKey);

  let body: string | undefined;
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    try {
      // Clone so Next.js can still read the original request body internally.
      body = await req.clone().text();
    } catch {
      // Body stream already consumed (e.g. by Express json middleware on combined server).
      // Fall back to reading directly — body can't be re-read after this but that's fine.
      try { body = await req.text(); } catch { body = undefined; }
    }
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    body: body && body.length > 0 ? body : undefined,
    cache: "no-store"
  };

  try {
    const res = await fetch(target, init);
    const text = await res.text();
    const out = new NextResponse(text, { status: res.status });
    const ct = res.headers.get("content-type");
    if (ct) out.headers.set("content-type", ct);
    return out;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { message: `Backend proxy could not reach Express at ${backendOrigin()}: ${msg}` },
      { status: 502 }
    );
  }
}

type RouteCtx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

/** Do not forward OPTIONS or read its body — avoids undici "body disturbed or locked" on some hosts. */
export async function OPTIONS(_req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  const pathStr = `/${path.join("/")}`;
  if (!allowBackendPath(pathStr)) {
    return NextResponse.json({ message: "Proxy path not allowed" }, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: "GET, HEAD, POST, OPTIONS" }
  });
}
