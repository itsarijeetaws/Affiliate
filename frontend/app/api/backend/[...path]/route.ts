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

function allowBackendPath(path: string): boolean {
  return path === "/auth" || path.startsWith("/auth/");
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

  const init: RequestInit = {
    method: req.method,
    headers
  };

  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 0) init.body = buf;
  }

  try {
    const res = await fetch(target, { ...init, cache: "no-store" });
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

export async function OPTIONS(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
