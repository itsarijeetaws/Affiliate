"use client";

import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { clientFetchJson, clientFetchUrl } from "@/lib/api";
import { AUTH_EVENT_NAME, clearStoredToken, getStoredToken, setStoredToken, type AuthUser } from "@/lib/auth";

type Log = { id: number; event: string; status: string; message: string | null; createdAt: string };
type Product = { id: number; name: string; slug: string; price: number; rating: number; imageUrl: string; affiliateUrl: string };
type EditForm = { name: string; price: string; rating: string; imageUrl: string; affiliateUrl: string; description: string };
type Tab = "fetch" | "pipeline" | "manual" | "import" | "logs" | "products" | "blogs" | "subscribers";
type FetchedProduct = {
  asin: string; title: string; price: number; mrp: number; rating: number;
  reviewCount: number; imageUrl: string; affiliateUrl: string;
  features: string[]; availability: string; brand: string; source: string;
};
type Subscriber = { id: number; email: string; createdAt: string };
type BlogPost = { id: number; title: string; slug: string; excerpt?: string; status: string; createdAt: string; updatedAt: string };
type BlogEditForm = { title: string; excerpt: string; content: string; status: string; seoTitle: string; seoDescription: string };
type AuthMode = "login" | "register";
type Category = { id: number; name: string; slug: string };

export function AdminDashboard() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("pipeline");
  const [logs, setLogs] = useState<Log[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCategorySlug, setProductCategorySlug] = useState("");
  const [asins, setAsins] = useState("B09G9FPHY6\nB08L5TNJHG");
  const [categoryId, setCategoryId] = useState(6);
  const [generateContent, setGenerateContent] = useState(true);
  const [pipelineResults, setPipelineResults] = useState<unknown[]>([]);
  const [manual, setManual] = useState({
    asin: "", name: "", price: 999, rating: 4.0,
    imageUrl: "", categoryId: 6, description: "", affiliateUrl: ""
  });
  const [automationKey, setAutomationKey] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{ upserted?: number; created?: number; failed: number; total?: number; results: Array<{ row: number; status: string; name?: string; error?: string }> } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", price: "", rating: "", imageUrl: "", affiliateUrl: "", description: "" });
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkStop, setBulkStop] = useState(false);
  const bulkStopRef = React.useRef(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; current: string; failed: number } | null>(null);
  const [generatedIds, setGeneratedIds] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("generated_post_ids");
      return stored ? new Set(JSON.parse(stored) as number[]) : new Set();
    } catch { return new Set(); }
  });

  // Fetch ASIN state
  const [fetchAsin, setFetchAsin] = useState("");
  const [fetchedProduct, setFetchedProduct] = useState<FetchedProduct | null>(null);
  const [fetchEdit, setFetchEdit] = useState<Partial<FetchedProduct & { categoryId: number }>>({});
  const [fetchLoading, setFetchLoading] = useState(false);

  // Subscribers state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subscribersTotal, setSubscribersTotal] = useState(0);
  const [deletingSubId, setDeletingSubId] = useState<number | null>(null);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastHtml, setBroadcastHtml] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number } | null>(null);

  // Blog state
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [blogsTotal, setBlogsTotal] = useState(0);
  const [editingBlog, setEditingBlog] = useState<number | null>(null);
  const [blogEditForm, setBlogEditForm] = useState<BlogEditForm>({ title: "", excerpt: "", content: "", status: "draft", seoTitle: "", seoDescription: "" });
  const [blogEditLoading, setBlogEditLoading] = useState(false);
  const [deletingBlogId, setDeletingBlogId] = useState<number | null>(null);

  const loadSession = useCallback(async () => {
    const storedToken = getStoredToken();
    setToken(storedToken);

    if (!storedToken) {
      setUser(null);
      return;
    }

    const response = await fetch(clientFetchUrl("/auth/me"), {
      headers: { Authorization: `Bearer ${storedToken}` }
    });

    if (!response.ok) {
      clearStoredToken();
      setToken("");
      setUser(null);
      return;
    }

    const data = await response.json() as { user: AuthUser };
    setUser(data.user);
  }, []);

  useEffect(() => {
    // Load from localStorage (only safe in useEffect on client)
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem("automation_api_key") ?? "";
      setAutomationKey(savedKey);
    }

    void loadSession();
    window.addEventListener(AUTH_EVENT_NAME, loadSession);
    return () => window.removeEventListener(AUTH_EVENT_NAME, loadSession);
  }, [loadSession]);

  function saveKey() {
    localStorage.setItem("automation_api_key", automationKey);
    setMessage("API key saved");
  }

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const endpoint = authMode === "register" ? "/auth/register" : "/auth/login";
      const { ok, data } = await clientFetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(authMode === "register" ? { name } : {})
        })
      });

      if (!ok) {
        const base =
          typeof data.message === "string" ? data.message : "Authentication failed";
        const issues = data.errors;
        if (Array.isArray(issues) && issues.length > 0) {
          const first = issues[0] as { message?: string };
          setMessage(first?.message ? `${base}: ${first.message}` : base);
        } else {
          setMessage(base);
        }
        return;
      }

      const token = data.token;
      const userPayload = data.user as AuthUser | undefined;
      if (typeof token !== "string" || !userPayload) {
        setMessage("Unexpected server response. Try again or check server logs.");
        return;
      }

      setStoredToken(token);
      setUser(userPayload);
      setToken(token);
      setPassword("");
      setMessage(
        userPayload.isAdmin
          ? "Admin access granted."
          : "Logged in, but this account is not an admin."
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearStoredToken();
    setUser(null);
    setToken("");
    setMessage("Logged out.");
  }

  const fetchLogs = useCallback(async () => {
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) return;

    const response = await fetch(clientFetchUrl("/automation/logs?limit=30"), {
      headers: { "x-automation-api-key": key }
    });

    if (response.ok) {
      setLogs((await response.json()).items);
    }
  }, [automationKey]);

  const fetchCategories = useCallback(async () => {
    const response = await fetch(clientFetchUrl("/categories"));
    if (response.ok) {
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : (data.items ?? []));
    }
  }, []);

  // Load categories on mount for dropdowns
  useEffect(() => { void fetchCategories(); }, [fetchCategories]);

  const fetchProducts = useCallback(async (slugFilter?: string) => {
    const slug = slugFilter ?? productCategorySlug;
    const url = slug
      ? clientFetchUrl(`/products?categorySlug=${slug}&limit=1000`)
      : clientFetchUrl("/products?limit=1000");
    const response = await fetch(url);
    if (response.ok) {
      setProducts((await response.json()).items);
    }
  }, [productCategorySlug]);

  const fetchSubscribers = useCallback(async () => {
    const tok = getStoredToken();
    if (!tok) return;
    const res = await fetch(clientFetchUrl("/subscribe?limit=500"), {
      headers: { Authorization: `Bearer ${tok}` }
    });
    if (res.ok) {
      const d = await res.json();
      setSubscribers(d.items ?? []);
      setSubscribersTotal(d.pagination?.total ?? 0);
    }
  }, []);

  async function deleteSub(id: number) {
    const tok = getStoredToken();
    if (!tok) return;
    await fetch(clientFetchUrl(`/subscribe/${id}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tok}` }
    });
    setDeletingSubId(null);
    void fetchSubscribers();
  }

  async function sendBroadcastEmail(e: FormEvent) {
    e.preventDefault();
    if (!broadcastSubject || !broadcastHtml) return;
    const tok = getStoredToken();
    if (!tok) return;
    setBroadcastLoading(true);
    setBroadcastResult(null);
    try {
      const res = await fetch(clientFetchUrl("/subscribe/broadcast"), {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: JSON.stringify({ subject: broadcastSubject, html: broadcastHtml, text: broadcastSubject }),
      });
      const d = await res.json() as { sent?: number; failed?: number; message?: string };
      if (!res.ok) { setMessage(d.message ?? "Broadcast failed"); return; }
      setBroadcastResult({ sent: d.sent ?? 0, failed: d.failed ?? 0 });
      setMessage(`Broadcast sent to ${d.sent} subscribers.`);
    } finally {
      setBroadcastLoading(false);
    }
  }

  function exportSubsCsv() {
    const rows = ["email,subscribed_at", ...subscribers.map(s => `${s.email},${s.createdAt}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "subscribers.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const fetchBlogs = useCallback(async () => {
    const tok = getStoredToken();
    if (!tok) return;
    const res = await fetch(clientFetchUrl("/api/blog/admin/list?limit=200"), {
      headers: { Authorization: `Bearer ${tok}` }
    });
    if (res.ok) {
      const d = await res.json();
      setBlogs(d.items ?? []);
      setBlogsTotal(d.pagination?.total ?? 0);
    }
  }, []);

  async function deleteBlog(id: number) {
    const tok = getStoredToken();
    if (!tok) return;
    await fetch(clientFetchUrl(`/api/blog/${id}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tok}` }
    });
    setDeletingBlogId(null);
    void fetchBlogs();
  }

  async function toggleBlogStatus(post: BlogPost) {
    const tok = getStoredToken();
    if (!tok) return;
    const newStatus = post.status === "published" ? "draft" : "published";
    await fetch(clientFetchUrl(`/api/blog/${post.id}/status`), {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    void fetchBlogs();
  }

  async function openBlogEdit(id: number) {
    const tok = getStoredToken();
    if (!tok) return;
    setBlogEditLoading(true);
    setEditingBlog(id);
    const res = await fetch(clientFetchUrl(`/api/blog/admin/${id}`), {
      headers: { Authorization: `Bearer ${tok}` }
    });
    if (res.ok) {
      const p = await res.json();
      setBlogEditForm({
        title: p.title ?? "",
        excerpt: p.excerpt ?? "",
        content: p.content ?? "",
        status: p.status ?? "draft",
        seoTitle: p.seoTitle ?? "",
        seoDescription: p.seoDescription ?? ""
      });
    }
    setBlogEditLoading(false);
  }

  async function saveBlogEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingBlog) return;
    const tok = getStoredToken();
    if (!tok) return;
    setBlogEditLoading(true);
    await fetch(clientFetchUrl(`/api/blog/${editingBlog}`), {
      method: "PUT",
      headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
      body: JSON.stringify(blogEditForm)
    });
    setBlogEditLoading(false);
    setEditingBlog(null);
    void fetchBlogs();
    setMessage("Blog post updated.");
  }

  useEffect(() => {
    if (!user?.isAdmin) return;
    if (tab === "logs") void fetchLogs();
    if (tab === "products") {
      void fetchCategories();
      void fetchProducts();
    }
    if (tab === "blogs") void fetchBlogs();
    if (tab === "subscribers") void fetchSubscribers();
  }, [tab, user, fetchLogs, fetchProducts, fetchCategories, fetchBlogs, fetchSubscribers]);

  async function runPipeline(event: FormEvent) {
    event.preventDefault();
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) {
      setMessage("Enter your Automation API key first");
      return;
    }

    setLoading(true);
    setMessage("Running pipeline...");
    try {
      const asinList = asins.split(/[\n,]+/).map((asin) => asin.trim()).filter(Boolean);
      const response = await fetch(clientFetchUrl("/automation/run-pipeline"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-automation-api-key": key },
        body: JSON.stringify({ asins: asinList, categoryId: Number(categoryId), generateContent })
      });
      let data: Record<string, unknown> = {};
      try {
        data = (await response.json()) as Record<string, unknown>;
      } catch {
        setMessage("Pipeline failed: invalid response from server");
        return;
      }

      if (!response.ok) {
        setMessage(typeof data.message === "string" ? data.message : "Pipeline failed");
        return;
      }

      setPipelineResults((data.results as unknown[]) ?? []);
      setMessage(`Pipeline complete. ${asinList.length} ASINs processed.`);
    } finally {
      setLoading(false);
    }
  }

  async function addManualProduct(event: FormEvent) {
    event.preventDefault();
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) {
      setMessage("Enter your Automation API key first");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(clientFetchUrl("/automation/manual-add-product"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-automation-api-key": key },
        body: JSON.stringify({
          ...manual,
          price: Number(manual.price),
          rating: Number(manual.rating),
          categoryId: Number(manual.categoryId),
          pros: ["Good quality"],
          cons: ["Check reviews"],
          affiliateUrl: manual.affiliateUrl || undefined
        })
      });
      let data: Record<string, unknown> = {};
      try {
        data = (await response.json()) as Record<string, unknown>;
      } catch {
        setMessage("Failed to add product: invalid response");
        return;
      }

      if (!response.ok) {
        setMessage(typeof data.message === "string" ? data.message : "Failed to add product");
        return;
      }

      const product = data.product as { name?: string } | undefined;
      setMessage(`Product added: ${product?.name ?? "OK"}`);
    } finally {
      setLoading(false);
    }
  }

  async function generatePost(productId: number) {
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) {
      setMessage("Enter your Automation API key first");
      return;
    }

    setLoading(true);
    setMessage(`Generating content for product #${productId}...`);
    try {
      const response = await fetch(clientFetchUrl("/automation/generate-post"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-automation-api-key": key },
        body: JSON.stringify({ productId, type: "review" })
      });
      let data: Record<string, unknown> = {};
      try {
        data = (await response.json()) as Record<string, unknown>;
      } catch {
        setMessage("Content generation failed: invalid response");
        return;
      }

      if (!response.ok) {
        setMessage(typeof data.message === "string" ? data.message : "Content generation failed");
        return;
      }

      const blogPost = data.blogPost as { title?: string } | undefined;
      setMessage(`Blog post created: "${blogPost?.title ?? ""}"`);
      setGeneratedIds(prev => {
        const next = new Set(prev);
        next.add(productId);
        try { localStorage.setItem("generated_post_ids", JSON.stringify([...next])); } catch { /* ignore */ }
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  async function bulkGeneratePosts() {
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) { setMessage("Enter your Automation API key first"); return; }
    if (!products.length) { setMessage("Load products first (click Refresh)"); return; }

    bulkStopRef.current = false;
    setBulkStop(false);
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: products.length, current: "", failed: 0 });

    let failed = 0;
    const newIds = new Set(generatedIds);

    for (let i = 0; i < products.length; i++) {
      if (bulkStopRef.current) break;
      const p = products[i];
      setBulkProgress({ done: i, total: products.length, current: p.name, failed });

      try {
        const res = await fetch(clientFetchUrl("/automation/generate-post"), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-automation-api-key": key },
          body: JSON.stringify({ productId: p.id, type: "review" })
        });
        if (res.ok) {
          newIds.add(p.id);
          setGeneratedIds(new Set(newIds));
          try { localStorage.setItem("generated_post_ids", JSON.stringify([...newIds])); } catch { /* ignore */ }
        } else { failed++; }
      } catch { failed++; }

      setBulkProgress({ done: i + 1, total: products.length, current: p.name, failed });
    }

    setBulkRunning(false);
    const stopped = bulkStopRef.current;
    setBulkProgress(prev => prev ? { ...prev, current: stopped ? "Stopped." : "Complete!" } : null);
    setMessage(stopped
      ? `Stopped after ${bulkProgress?.done ?? 0} posts. ${failed} failed.`
      : `Bulk generation done: ${products.length - failed} posts created, ${failed} failed.`
    );
  }

  function stopBulk() {
    bulkStopRef.current = true;
    setBulkStop(true);
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      price: String(Number(product.price).toFixed(0)),
      rating: String(Number(product.rating).toFixed(1)),
      imageUrl: product.imageUrl ?? "",
      affiliateUrl: product.affiliateUrl ?? "",
      description: "",
    });
  }

  async function saveProduct(event: FormEvent, productId: number) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(clientFetchUrl(`/products/${productId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          name: editForm.name,
          price: editForm.price,
          rating: Number(editForm.rating),
          imageUrl: editForm.imageUrl || null,
          affiliateUrl: editForm.affiliateUrl || null,
          ...(editForm.description ? { description: editForm.description } : {}),
        })
      });
      if (response.ok) {
        setMessage(`Saved: ${editForm.name}`);
        setEditingId(null);
        void fetchProducts();
      } else {
        const data = await response.json() as { message?: string };
        setMessage(data.message ?? "Save failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function importCsv(event: FormEvent) {
    event.preventDefault();
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) { setMessage("Enter your Automation API key first"); return; }
    if (!csvFile) { setMessage("Select a CSV file first"); return; }

    setLoading(true);
    setMessage("Uploading CSV...");
    setImportResults(null);
    try {
      const form = new FormData();
      form.append("file", csvFile);
      const response = await fetch(clientFetchUrl("/automation/bulk-import"), {
        method: "POST",
        headers: { "x-automation-api-key": key },
        body: form
      });
      let data: Record<string, unknown> = {};
      try { data = (await response.json()) as Record<string, unknown>; } catch { /* empty */ }
      if (!response.ok) {
        setMessage(typeof data.message === "string" ? data.message : "Import failed");
        return;
      }
      setImportResults(data as typeof importResults);
      setMessage(`Import done — ${data.created} created, ${data.skipped} skipped, ${data.failed} failed.`);
    } finally {
      setLoading(false);
    }
  }

  const [priceUpdateRunning, setPriceUpdateRunning] = useState(false);
  const [priceUpdateResult, setPriceUpdateResult] = useState<{ updated: number; skipped: number; failed: number } | null>(null);

  async function runPriceUpdate() {
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) { setMessage("Enter your Automation API key first"); return; }
    setPriceUpdateRunning(true);
    setPriceUpdateResult(null);
    setMessage("Price update running — this may take several minutes for large catalogs…");
    try {
      const res = await fetch(clientFetchUrl("/automation/update-prices"), {
        method: "POST",
        headers: { "x-automation-api-key": key }
      });
      const d = await res.json() as { updated?: number; skipped?: number; failed?: number; message?: string };
      if (!res.ok) { setMessage(d.message ?? "Price update failed"); return; }
      const r = { updated: d.updated ?? 0, skipped: d.skipped ?? 0, failed: d.failed ?? 0 };
      setPriceUpdateResult(r);
      setMessage(`Price update complete — ${r.updated} updated, ${r.skipped} unchanged, ${r.failed} failed.`);
    } finally {
      setPriceUpdateRunning(false);
    }
  }

  async function fetchProduct(e: React.FormEvent) {
    e.preventDefault();
    const asin = fetchAsin.trim().toUpperCase();
    if (!asin) return;
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) { setMessage("Enter Automation API key first"); return; }
    setFetchLoading(true);
    setFetchedProduct(null);
    setMessage("Fetching product data from Amazon…");
    try {
      const r = await fetch(clientFetchUrl(`/automation/fetch-product/${asin}`), {
        headers: { "x-automation-api-key": key },
      });
      const data = await r.json() as { ok: boolean; product?: FetchedProduct; error?: string };
      if (!data.ok || !data.product) {
        setMessage(`Error: ${data.error ?? "Fetch failed — Amazon may be blocking the server. Try again or add manually."}`);
      } else {
        setFetchedProduct(data.product);
        setFetchEdit({ ...data.product, categoryId: 1 });
        setMessage(`✓ Fetched via ${data.product.source} — review details and save`);
      }
    } catch (err) { setMessage(`Error: ${String(err)}`); }
    setFetchLoading(false);
  }

  async function saveFetchedProduct() {
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key || !fetchEdit.asin) return;
    setLoading(true);
    setMessage("Saving product…");
    try {
      const r = await fetch(clientFetchUrl("/automation/save-fetched-product"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-automation-api-key": key },
        body: JSON.stringify(fetchEdit),
      });
      const data = await r.json() as { ok: boolean; product?: { id: number; name: string }; action?: string; error?: string };
      if (!data.ok) { setMessage(`Error: ${data.error ?? "Save failed"}`); }
      else {
        setMessage(`✓ Product ${data.action} — "${data.product?.name?.slice(0, 60)}"`);
        setFetchedProduct(null);
        setFetchAsin("");
      }
    } catch (err) { setMessage(`Error: ${String(err)}`); }
    setLoading(false);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "fetch",       label: "🔍 Fetch ASIN" },
    { id: "pipeline",    label: "Pipeline" },
    { id: "manual",      label: "Manual Add" },
    { id: "import",      label: "CSV Import" },
    { id: "products",    label: "Products" },
    { id: "blogs",       label: `Blogs${blogsTotal ? ` (${blogsTotal})` : ""}` },
    { id: "subscribers", label: `Subscribers${subscribersTotal ? ` (${subscribersTotal})` : ""}` },
    { id: "logs",        label: "Logs" },
  ];

  if (!token) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={submitAuth} className="rounded-xl border border-white/[0.08] bg-[#16161e] p-6 text-white">
          <div className="flex gap-3">
            <button type="button" onClick={() => setAuthMode("login")} className={`rounded-full px-4 py-2 text-sm font-semibold ${authMode === "login" ? "bg-amber-300 text-slate-950" : "bg-white/6 text-white"}`}>
              Login
            </button>
            <button type="button" onClick={() => setAuthMode("register")} className={`rounded-full px-4 py-2 text-sm font-semibold ${authMode === "register" ? "bg-amber-300 text-slate-950" : "bg-white/6 text-white"}`}>
              Register
            </button>
          </div>

          <h2 className="mt-6 text-2xl font-semibold">Admin access</h2>
          <p className="mt-2 text-white/62">
            Anyone can create an account, but only allowlisted admin emails can open the admin dashboard.
          </p>

          <div className="mt-6 space-y-4">
            {authMode === "register" ? (
              <input className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
            ) : null}
            <input className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={authMode === "login" ? "Email or admin" : "Email"} />
            <input type="password" className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
          </div>

          <button disabled={loading} className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60">
            {loading ? "Please wait..." : authMode === "register" ? "Create account" : "Sign in"}
          </button>

          {message ? <p className="mt-4 text-sm text-amber-200">{message}</p> : null}
        </form>

        <div className="rounded-xl border border-white/[0.08] bg-[#16161e] p-6 text-white">
          <h2 className="text-xl font-semibold">Automation API Key</h2>
          <p className="mt-2 text-sm text-white/62">
            Required for pipelines and content generation. Stored only in this browser.
          </p>
          <input className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 font-mono text-sm text-white" placeholder="Your AUTOMATION_API_KEY" value={automationKey} onChange={(event) => setAutomationKey(event.target.value)} />
          <button onClick={saveKey} className="mt-4 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            Save key
          </button>
        </div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="rounded-[28px] border border-amber-300/20 bg-amber-300/10 p-6 text-white">
        <h2 className="text-2xl font-semibold">Admin access required</h2>
        <p className="mt-3 text-white/72">
          You are logged in as {user?.email}, but this account is not on the admin allowlist.
        </p>
        <div className="mt-5 flex gap-3">
          <a href="/account" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200">
            Open account
          </a>
          <button onClick={logout} className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#16161e] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-emerald-300">Logged in as {user.email}</p>
          <p className="mt-1 text-white/60">Admin access is active for this account.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === item.id ? "bg-amber-300 text-slate-950" : "border border-white/15 bg-white/5 text-white hover:bg-white/10"}`}>
              {item.label}
            </button>
          ))}
          <button onClick={logout} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
            Logout
          </button>
        </div>
      </div>

      {/* Quick actions row */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.07] bg-[#1a1a24] px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Quick Actions</span>
        <button
          onClick={() => void runPriceUpdate()}
          disabled={priceUpdateRunning}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#FF9900]/30 bg-[#FF9900]/10 px-4 py-1.5 text-xs font-semibold text-[#FF9900] transition hover:bg-[#FF9900]/20 disabled:opacity-50"
        >
          {priceUpdateRunning ? "⏳ Updating prices…" : "↻ Update All Prices Now"}
        </button>
        {priceUpdateResult && !priceUpdateRunning && (
          <span className="text-[11px] text-white/50">
            ✓ {priceUpdateResult.updated} updated · {priceUpdateResult.skipped} unchanged · {priceUpdateResult.failed} failed
          </span>
        )}
      </div>

      {/* Automation key row — always visible when logged in */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.07] bg-[#1a1a24] px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Automation key</span>
        <input
          className="flex-1 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 font-mono text-xs text-white min-w-[220px]"
          placeholder="adfirst-auto-2024-secure"
          value={automationKey}
          onChange={(e) => setAutomationKey(e.target.value)}
        />
        <button
          onClick={saveKey}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          Save
        </button>
        {automationKey && <span className="text-[11px] text-emerald-400">✓ key set</span>}
      </div>

      {message ? (
        <div className="rounded-xl border border-white/[0.07] bg-[#1a1a24] p-4 text-sm text-white/82">
          {message}
        </div>
      ) : null}

      {tab === "fetch" ? (
        <div className="space-y-5">
          {/* Search form */}
          <form onSubmit={fetchProduct} className="rounded-xl border border-white/[0.08] bg-[#16161e] p-6 text-white space-y-4">
            <h2 className="text-xl font-semibold">Fetch Product by ASIN</h2>
            <p className="text-sm text-white/55">Enter any Amazon ASIN — fetches live title, price, image, rating and features. Review before saving to DB.</p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-2.5 font-mono text-sm uppercase text-white placeholder:normal-case placeholder:text-white/30"
                placeholder="e.g. B09G9FPHY6"
                value={fetchAsin}
                onChange={e => setFetchAsin(e.target.value.trim().toUpperCase())}
                maxLength={12}
              />
              <button
                type="submit"
                disabled={fetchLoading || !fetchAsin}
                className="rounded-2xl bg-[#FF9900] px-6 py-2.5 text-sm font-bold text-black hover:bg-[#e68a00] disabled:opacity-50 transition"
              >
                {fetchLoading ? "Fetching…" : "Fetch"}
              </button>
            </div>
          </form>

          {/* Preview card */}
          {fetchedProduct && (
            <div className="rounded-xl border border-white/[0.08] bg-[#16161e] p-6 text-white space-y-5">
              <div className="flex gap-5 items-start">
                {fetchEdit.imageUrl && (
                  <img src={fetchEdit.imageUrl} alt="" className="w-28 h-28 object-contain rounded-xl border border-white/10 bg-slate-950/40 shrink-0" />
                )}
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">via {fetchedProduct.source}</span>
                    <span className="text-[11px] text-white/40">{fetchedProduct.availability}</span>
                  </div>
                  <p className="text-xs font-mono text-white/30">{fetchedProduct.asin}</p>
                  {fetchedProduct.brand && <p className="text-xs text-white/50">Brand: <span className="text-white/80">{fetchedProduct.brand}</span></p>}
                  <p className="text-sm text-yellow-400">★ {fetchedProduct.rating.toFixed(1)}
                    {fetchedProduct.reviewCount > 0 && <span className="text-white/35 text-xs ml-1">({fetchedProduct.reviewCount.toLocaleString()} ratings)</span>}
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Title</label>
                  <input className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-sm text-white"
                    value={fetchEdit.title ?? ""} onChange={e => setFetchEdit(v => ({ ...v, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Price (₹)</label>
                    <input type="number" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-sm text-white"
                      value={fetchEdit.price ?? 0} onChange={e => setFetchEdit(v => ({ ...v, price: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Rating</label>
                    <input type="number" step="0.1" min="0" max="5" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-sm text-white"
                      value={fetchEdit.rating ?? 0} onChange={e => setFetchEdit(v => ({ ...v, rating: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Category ID</label>
                    <select className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-sm text-white"
                      value={fetchEdit.categoryId ?? 1} onChange={e => setFetchEdit(v => ({ ...v, categoryId: Number(e.target.value) }))}>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Image URL</label>
                  <input className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs font-mono text-white/70"
                    value={fetchEdit.imageUrl ?? ""} onChange={e => setFetchEdit(v => ({ ...v, imageUrl: e.target.value }))} />
                </div>
                {fetchedProduct.features.length > 0 && (
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Features (saved as Pros)</label>
                    <ul className="mt-2 space-y-1">
                      {fetchedProduct.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                          <span className="text-[#FF9900] shrink-0">›</span>{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => void saveFetchedProduct()} disabled={loading}
                  className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-50 transition">
                  {loading ? "Saving…" : "✓ Add to DB"}
                </button>
                <button onClick={() => { setFetchedProduct(null); setFetchAsin(""); }}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition">
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {tab === "pipeline" ? (
        <form onSubmit={runPipeline} className="rounded-xl border border-white/[0.08] bg-[#16161e] p-6 text-white">
          <h2 className="text-xl font-semibold">Run automation pipeline</h2>
          <p className="mt-2 text-sm text-white/62">Paste ASINs one per line and optionally generate AI content.</p>
          <textarea rows={5} className="mt-5 w-full rounded-2xl border border-white/10 bg-slate-950/35 p-4 font-mono text-sm text-white" value={asins} onChange={(event) => setAsins(event.target.value)} placeholder={"B09G9FPHY6\nB08L5TNJHG"} />
          <div className="mt-4 flex flex-wrap gap-4">
            <select className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" value={categoryId} onChange={(event) => setCategoryId(Number(event.target.value))}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name} (id:{c.id})</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-white/82">
              <input type="checkbox" checked={generateContent} onChange={(event) => setGenerateContent(event.target.checked)} />
              Generate AI content
            </label>
          </div>
          <button disabled={loading} className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60">
            {loading ? "Running..." : "Run pipeline"}
          </button>

          {pipelineResults.length > 0 ? (
            <div className="mt-6 overflow-auto">
              <table className="w-full border-collapse text-sm text-white">
                <thead>
                  <tr className="bg-white/[0.06]">
                    <th className="border border-white/10 p-2 text-left">ASIN</th>
                    <th className="border border-white/10 p-2">Status</th>
                    <th className="border border-white/10 p-2">Product ID</th>
                    <th className="border border-white/10 p-2">Blog Post ID</th>
                  </tr>
                </thead>
                <tbody>
                  {(pipelineResults as Array<{ asin: string; status: string; productId?: number; blogPostId?: number }>).map((result) => (
                    <tr key={result.asin}>
                      <td className="border border-white/10 p-2 font-mono">{result.asin}</td>
                      <td className="border border-white/10 p-2 text-center">{result.status}</td>
                      <td className="border border-white/10 p-2 text-center">{result.productId ?? "-"}</td>
                      <td className="border border-white/10 p-2 text-center">{result.blogPostId ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </form>
      ) : null}

      {tab === "manual" ? (
        <form onSubmit={addManualProduct} className="rounded-xl border border-white/[0.08] bg-[#16161e] p-6 text-white">
          <h2 className="text-xl font-semibold">Manual product add</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <input className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 font-mono text-white" placeholder="ASIN" value={manual.asin} onChange={(event) => setManual({ ...manual, asin: event.target.value })} />
            <input className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" placeholder="Product name" value={manual.name} onChange={(event) => setManual({ ...manual, name: event.target.value })} />
            <input type="number" className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" placeholder="Price" value={manual.price} onChange={(event) => setManual({ ...manual, price: Number(event.target.value) })} />
            <input type="number" step="0.1" min="0" max="5" className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" placeholder="Rating" value={manual.rating} onChange={(event) => setManual({ ...manual, rating: Number(event.target.value) })} />
            <select className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" value={manual.categoryId} onChange={(event) => setManual({ ...manual, categoryId: Number(event.target.value) })}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" placeholder="Image URL" value={manual.imageUrl} onChange={(event) => setManual({ ...manual, imageUrl: event.target.value })} />
          </div>
          <input className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" placeholder="Affiliate URL (optional)" value={manual.affiliateUrl} onChange={(event) => setManual({ ...manual, affiliateUrl: event.target.value })} />
          <textarea rows={3} className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-white" placeholder="Description" value={manual.description} onChange={(event) => setManual({ ...manual, description: event.target.value })} />
          <button disabled={loading} className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60">
            {loading ? "Saving..." : "Add product"}
          </button>
        </form>
      ) : null}

      {tab === "import" ? (
        <form onSubmit={importCsv} className="rounded-xl border border-white/[0.08] bg-[#16161e] p-6 text-white">
          <h2 className="text-xl font-semibold">CSV bulk import</h2>
          <p className="mt-2 text-sm text-white/62">
            Upload a CSV file to create multiple products at once. First row must be a header row.
          </p>

          {/* Format guide */}
          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Required CSV columns</p>
            <p className="mt-2 font-mono text-xs text-amber-200/80">
              asin, name, price, rating, imageUrl, categoryId, description, affiliateUrl
            </p>
            <p className="mt-2 text-xs text-white/45">
              <span className="text-white/65">affiliateUrl</span> is optional — auto-built from ASIN if blank.{" "}
              <span className="text-white/65">description</span> can be left empty.
            </p>
          </div>

          {/* File picker */}
          <div className="mt-5">
            <label className="block text-sm font-semibold text-white/80 mb-2">Select CSV file</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white/80 file:mr-4 file:rounded-full file:border-0 file:bg-amber-300 file:px-4 file:py-1 file:text-xs file:font-semibold file:text-slate-950 hover:file:bg-amber-200"
            />
            {csvFile ? (
              <p className="mt-2 text-xs text-emerald-400">✓ {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={loading || !csvFile}
            className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
          >
            {loading ? "Importing..." : "Import products"}
          </button>

          {/* Results */}
          {importResults ? (
            <div className="mt-6 overflow-auto">
              <div className="mb-3 flex gap-4 text-sm">
                <span className="text-emerald-400 font-semibold">{importResults.upserted ?? importResults.created} upserted</span>
                <span className="text-white/50">{importResults.total ?? 0} total</span>
                {importResults.failed > 0 ? <span className="text-rose-400 font-semibold">{importResults.failed} failed</span> : null}
              </div>
              <table className="w-full border-collapse text-sm text-white">
                <thead>
                  <tr className="bg-white/[0.06]">
                    <th className="border border-white/10 p-2 text-left">Row</th>
                    <th className="border border-white/10 p-2 text-left">Status</th>
                    <th className="border border-white/10 p-2 text-left">Name / Error</th>
                  </tr>
                </thead>
                <tbody>
                  {importResults.results.map((r) => (
                    <tr key={r.row}>
                      <td className="border border-white/10 p-2 font-mono text-white/60">{r.row}</td>
                      <td className="border border-white/10 p-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${r.status === "created" ? "bg-emerald-500/20 text-emerald-300" : r.status === "skipped" ? "bg-white/10 text-white/50" : "bg-rose-500/20 text-rose-300"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="border border-white/10 p-2 text-white/75">{r.name ?? r.error ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </form>
      ) : null}

      {tab === "products" ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#16161e] p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              {productCategorySlug
                ? `${categories.find(c => c.slug === productCategorySlug)?.name ?? productCategorySlug} (${products.length})`
                : `All products (${products.length})`}
            </h2>
            <div className="flex items-center gap-3">
              <select
                value={productCategorySlug}
                onChange={e => {
                  const slug = e.target.value;
                  setProductCategorySlug(slug);
                  void fetchProducts(slug);
                }}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-300/40"
              >
                <option value="">All categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
              <button onClick={() => void fetchProducts()} className="text-sm font-semibold text-amber-200 transition hover:text-amber-100">
                Refresh
              </button>
              {bulkRunning ? (
                <button
                  onClick={stopBulk}
                  disabled={bulkStop}
                  className="rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-1.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-400/20 disabled:opacity-50"
                >
                  {bulkStop ? "Stopping…" : "⏹ Stop"}
                </button>
              ) : (
                <button
                  onClick={() => void bulkGeneratePosts()}
                  disabled={loading || products.length === 0}
                  className="rounded-full border border-[#FF9900]/30 bg-[#FF9900]/10 px-4 py-1.5 text-sm font-semibold text-[#FF9900] transition hover:bg-[#FF9900]/20 disabled:opacity-40"
                >
                  ⚡ Bulk Gen Posts ({products.length})
                </button>
              )}
            </div>
          </div>

          {/* Bulk progress bar */}
          {bulkProgress && (
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white/70">
                  {bulkProgress.done}/{bulkProgress.total} posts generated
                  {bulkProgress.failed > 0 && <span className="ml-2 text-rose-400">{bulkProgress.failed} failed</span>}
                </span>
                <span className="text-white/40">{Math.round((bulkProgress.done / bulkProgress.total) * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(bulkProgress.done / bulkProgress.total) * 100}%`,
                    background: bulkRunning ? "linear-gradient(90deg,#FF9900,#ffb347)" : bulkProgress.failed > 0 ? "#f87171" : "#34d399"
                  }}
                />
              </div>
              <p className="truncate text-[11px] text-white/35">{bulkProgress.current}</p>
            </div>
          )}
          <div className="mt-5 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-white/[0.06]">
                  <th className="border border-white/10 p-2 text-left w-8"></th>
                  <th className="border border-white/10 p-2 text-left">Name</th>
                  <th className="border border-white/10 p-2 w-24">Price</th>
                  <th className="border border-white/10 p-2 w-16">Rating</th>
                  <th className="border border-white/10 p-2 w-48">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <React.Fragment key={product.id}>
                    <tr className={editingId === product.id ? "bg-amber-300/[0.04]" : ""}>
                      {/* Thumbnail */}
                      <td className="border border-white/10 p-1.5 text-center">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.imageUrl} alt="" className="h-8 w-8 rounded object-contain bg-white/5" referrerPolicy="no-referrer"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0.2"; }} />
                        ) : (
                          <div className="h-8 w-8 rounded bg-white/[0.06] flex items-center justify-center text-white/20 text-[9px]">N/A</div>
                        )}
                      </td>
                      <td className="border border-white/10 p-2">
                        <a href={`/product/${product.slug}`} target="_blank" className="text-amber-200 hover:text-amber-100">{product.name}</a>
                      </td>
                      <td className="border border-white/10 p-2 text-center text-white/80">₹{Number(product.price).toFixed(0)}</td>
                      <td className="border border-white/10 p-2 text-center text-white/80">{Number(product.rating).toFixed(1)}</td>
                      <td className="border border-white/10 p-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => editingId === product.id ? setEditingId(null) : startEdit(product)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${editingId === product.id ? "bg-amber-300 text-slate-950" : "border border-white/15 bg-white/5 text-white hover:bg-white/10"}`}
                          >
                            {editingId === product.id ? "Cancel" : "Edit"}
                          </button>
                          <button
                            onClick={() => void generatePost(product.id)}
                            disabled={loading}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                              generatedIds.has(product.id)
                                ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                                : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                            }`}
                          >
                            {generatedIds.has(product.id) ? "✓ Regenerate" : "Gen post"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline edit row */}
                    {editingId === product.id ? (
                      <tr>
                        <td colSpan={5} className="border border-amber-300/20 bg-[#1a1a24] p-4">
                          <form onSubmit={(e) => void saveProduct(e, product.id)} className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/70">Editing — {product.name}</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="sm:col-span-2">
                                <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/35">Product name</label>
                                <input
                                  className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white"
                                  value={editForm.name}
                                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                  placeholder="Product name"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/35">Price (₹)</label>
                                <input
                                  type="number"
                                  className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white"
                                  value={editForm.price}
                                  onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                                  placeholder="Price"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/35">Rating (0–5)</label>
                                <input
                                  type="number" step="0.1" min="0" max="5"
                                  className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white"
                                  value={editForm.rating}
                                  onChange={e => setEditForm(f => ({ ...f, rating: e.target.value }))}
                                  placeholder="Rating"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/35">Image URL</label>
                                <div className="flex gap-2">
                                  <input
                                    className="flex-1 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white"
                                    value={editForm.imageUrl}
                                    onChange={e => setEditForm(f => ({ ...f, imageUrl: e.target.value }))}
                                    placeholder="https://m.media-amazon.com/images/I/..."
                                  />
                                  {editForm.imageUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={editForm.imageUrl} alt="preview" className="h-10 w-10 shrink-0 rounded object-contain bg-white/5" referrerPolicy="no-referrer" />
                                  )}
                                </div>
                              </div>
                              <div className="sm:col-span-2">
                                <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/35">Affiliate URL</label>
                                <input
                                  className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white"
                                  value={editForm.affiliateUrl}
                                  onChange={e => setEditForm(f => ({ ...f, affiliateUrl: e.target.value }))}
                                  placeholder="https://www.amazon.in/dp/ASIN/?tag=adfirststore-21"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                type="submit"
                                disabled={loading}
                                className="rounded-full bg-amber-300 px-5 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
                              >
                                {loading ? "Saving…" : "Save changes"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ── Blogs tab ── */}
      {tab === "blogs" ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#16161e] p-6 text-white">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold">Blog Posts <span className="text-white/40 text-sm font-normal">{blogsTotal} total</span></h2>
            <button onClick={() => void fetchBlogs()} className="text-sm font-semibold text-amber-200 hover:text-amber-100 transition">
              Refresh
            </button>
          </div>

          {blogs.length === 0 ? (
            <p className="text-sm text-white/50">No blog posts yet. Generate some from the Products tab.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-white/40 text-[11px] uppercase tracking-wider border-b border-white/[0.08]">
                    <th className="pb-2 pr-4">Title</th>
                    <th className="pb-2 pr-4 whitespace-nowrap">Status</th>
                    <th className="pb-2 pr-4 whitespace-nowrap hidden sm:table-cell">Created</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {blogs.map(post => (
                    <tr key={post.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-white/85 line-clamp-1 max-w-xs sm:max-w-sm">{post.title}</p>
                        {post.excerpt && <p className="text-[11px] text-white/35 line-clamp-1 mt-0.5">{post.excerpt}</p>}
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => void toggleBlogStatus(post)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all hover:opacity-80 cursor-pointer ${
                            post.status === "published"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                              : "bg-white/[0.07] text-white/40 border border-white/10"
                          }`}
                          title="Click to toggle published/draft"
                        >
                          {post.status === "published" ? "● Published" : "○ Draft"}
                        </button>
                      </td>
                      <td className="py-3 pr-4 text-white/35 text-[11px] whitespace-nowrap hidden sm:table-cell">
                        {new Date(post.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-all"
                          >
                            View
                          </a>
                          <button
                            onClick={() => void openBlogEdit(post.id)}
                            className="rounded-lg bg-amber-500/15 border border-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/25 transition-all"
                          >
                            Edit
                          </button>
                          {deletingBlogId === post.id ? (
                            <span className="flex items-center gap-1">
                              <button
                                onClick={() => void deleteBlog(post.id)}
                                className="rounded-lg bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 text-[11px] font-bold text-rose-400 hover:bg-rose-500/30 transition-all"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeletingBlogId(null)}
                                className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/50 hover:bg-white/10 transition-all"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setDeletingBlogId(post.id)}
                              className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-rose-400/70 hover:bg-rose-500/15 hover:text-rose-400 transition-all"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {/* ── Blog edit modal ── */}
      {editingBlog !== null && (
        <div className="fixed inset-0 z-[500] flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/[0.1] bg-[#13131c] p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">Edit Blog Post</h3>
              <button onClick={() => setEditingBlog(null)} className="text-white/40 hover:text-white text-xl leading-none transition">✕</button>
            </div>

            {blogEditLoading && !blogEditForm.title ? (
              <p className="text-white/50 text-sm py-8 text-center">Loading post…</p>
            ) : (
              <form onSubmit={e => void saveBlogEdit(e)} className="space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Title *</label>
                  <input
                    value={blogEditForm.title}
                    onChange={e => setBlogEditForm(f => ({ ...f, title: e.target.value }))}
                    required
                    className="w-full rounded-xl bg-white/[0.07] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Excerpt</label>
                  <input
                    value={blogEditForm.excerpt}
                    onChange={e => setBlogEditForm(f => ({ ...f, excerpt: e.target.value }))}
                    className="w-full rounded-xl bg-white/[0.07] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400/50"
                    placeholder="Short summary shown on listing pages"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Content (HTML)</label>
                  <textarea
                    value={blogEditForm.content}
                    onChange={e => setBlogEditForm(f => ({ ...f, content: e.target.value }))}
                    rows={16}
                    className="w-full rounded-xl bg-white/[0.07] border border-white/10 px-3 py-2 text-[12px] text-white font-mono placeholder:text-white/30 outline-none focus:border-amber-400/50 resize-y"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Status</label>
                    <select
                      value={blogEditForm.status}
                      onChange={e => setBlogEditForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full rounded-xl bg-white/[0.07] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/50"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">SEO Title</label>
                    <input
                      value={blogEditForm.seoTitle}
                      onChange={e => setBlogEditForm(f => ({ ...f, seoTitle: e.target.value }))}
                      className="w-full rounded-xl bg-white/[0.07] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400/50"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">SEO Description</label>
                  <input
                    value={blogEditForm.seoDescription}
                    onChange={e => setBlogEditForm(f => ({ ...f, seoDescription: e.target.value }))}
                    className="w-full rounded-xl bg-white/[0.07] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400/50"
                    placeholder="Optional meta description"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.07]">
                  <button
                    type="button"
                    onClick={() => setEditingBlog(null)}
                    className="rounded-xl bg-white/[0.07] px-5 py-2 text-sm font-semibold text-white/60 hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={blogEditLoading}
                    className="rounded-xl bg-amber-400 px-6 py-2 text-sm font-bold text-slate-950 hover:bg-amber-300 transition-all disabled:opacity-50"
                  >
                    {blogEditLoading ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Subscribers tab ── */}
      {tab === "subscribers" ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#16161e] p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-xl font-semibold">
              Email Subscribers
              <span className="ml-2 text-white/40 text-sm font-normal">{subscribersTotal} total</span>
            </h2>
            <div className="flex gap-2">
              <button
                onClick={exportSubsCsv}
                disabled={subscribers.length === 0}
                className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-40"
              >
                ↓ Export CSV
              </button>
              <button onClick={() => void fetchSubscribers()} className="text-sm font-semibold text-amber-200 hover:text-amber-100 transition">
                Refresh
              </button>
            </div>
          </div>

          {/* Broadcast form */}
          <form onSubmit={e => void sendBroadcastEmail(e)} className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300/70">Send Email to All Subscribers</p>
            <input
              value={broadcastSubject}
              onChange={e => setBroadcastSubject(e.target.value)}
              placeholder="Subject line"
              required
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400/50"
            />
            <textarea
              value={broadcastHtml}
              onChange={e => setBroadcastHtml(e.target.value)}
              placeholder={"HTML body — e.g.:\n<p>Hi there!</p>\n<p>Check out this week's deals: <a href='https://bestbuysindia.com'>bestbuysindia.com</a></p>"}
              rows={6}
              required
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white font-mono placeholder:text-white/25 outline-none focus:border-amber-400/50 resize-y"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={broadcastLoading || !broadcastSubject || !broadcastHtml}
                className="rounded-full bg-amber-300 px-5 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-200 disabled:opacity-50"
              >
                {broadcastLoading ? "Sending…" : `Send to ${subscribersTotal} subscribers`}
              </button>
              {broadcastResult && (
                <span className="text-xs text-emerald-400 font-semibold">
                  ✓ {broadcastResult.sent} sent{broadcastResult.failed > 0 ? `, ${broadcastResult.failed} failed` : ""}
                </span>
              )}
            </div>
          </form>

          {subscribers.length === 0 ? (
            <p className="text-sm text-white/50">No subscribers yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-white/40 text-[11px] uppercase tracking-wider border-b border-white/[0.08]">
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4 whitespace-nowrap hidden sm:table-cell">Subscribed</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {subscribers.map((sub, i) => (
                    <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 pr-4 text-white/30 text-xs">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-mono text-white/80 text-[13px]">{sub.email}</td>
                      <td className="py-2.5 pr-4 text-white/35 text-[11px] hidden sm:table-cell whitespace-nowrap">
                        {new Date(sub.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                      </td>
                      <td className="py-2.5 text-right">
                        {deletingSubId === sub.id ? (
                          <span className="inline-flex items-center gap-1">
                            <button
                              onClick={() => void deleteSub(sub.id)}
                              className="rounded-lg bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 text-[11px] font-bold text-rose-400 hover:bg-rose-500/30 transition-all"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingSubId(null)}
                              className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/50 hover:bg-white/10 transition-all"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeletingSubId(sub.id)}
                            className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-rose-400/70 hover:bg-rose-500/15 hover:text-rose-400 transition-all"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {tab === "logs" ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#16161e] p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Automation logs</h2>
            <button onClick={() => void fetchLogs()} className="text-sm font-semibold text-amber-200 transition hover:text-amber-100">
              Refresh
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {logs.length === 0 ? <p className="text-sm text-white/50">No logs yet.</p> : null}
            {logs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono">{log.event}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70">{log.status}</span>
                </div>
                {log.message ? <p className="mt-2 text-white/65">{log.message}</p> : null}
                <p className="mt-2 text-xs text-white/42">{new Date(log.createdAt).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
