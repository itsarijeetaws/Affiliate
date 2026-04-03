"use client";

import { FormEvent, useState, useEffect, useCallback } from "react";
import { API_URL } from "@/lib/api";

type Log = { id: number; event: string; status: string; message: string | null; createdAt: string };
type Product = { id: number; name: string; slug: string; price: number; rating: number };

type Tab = "pipeline" | "manual" | "logs" | "products";

export function AdminClient() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("pipeline");
  const [logs, setLogs] = useState<Log[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Pipeline state
  const [asins, setAsins] = useState("B09G9FPHY6\nB08L5TNJHG");
  const [categoryId, setCategoryId] = useState(1);
  const [generateContent, setGenerateContent] = useState(true);
  const [pipelineResults, setPipelineResults] = useState<unknown[]>([]);

  // Manual add state
  const [manual, setManual] = useState({
    asin: "", name: "", price: 999, rating: 4.0,
    imageUrl: "", categoryId: 1, description: "", affiliateUrl: ""
  });

  const apiKey = typeof window !== "undefined" ? localStorage.getItem("automation_api_key") ?? "" : "";
  const [automationKey, setAutomationKey] = useState("");

  useEffect(() => {
    setAutomationKey(localStorage.getItem("automation_api_key") ?? "");
  }, []);

  function saveKey() {
    localStorage.setItem("automation_api_key", automationKey);
    setMessage("API key saved");
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) { setMessage(data.message ?? "Login failed"); return; }
    setToken(data.token);
    setMessage("✅ Logged in successfully");
  }

  const fetchLogs = useCallback(async () => {
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) return;
    const r = await fetch(`${API_URL}/automation/logs?limit=30`, {
      headers: { "x-automation-api-key": key }
    });
    if (r.ok) setLogs((await r.json()).items);
  }, [automationKey]);

  const fetchProducts = useCallback(async () => {
    const r = await fetch(`${API_URL}/products?limit=50`);
    if (r.ok) setProducts((await r.json()).items);
  }, []);

  useEffect(() => {
    if (tab === "logs") void fetchLogs();
    if (tab === "products") void fetchProducts();
  }, [tab, fetchLogs, fetchProducts]);

  async function runPipeline(e: FormEvent) {
    e.preventDefault();
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) { setMessage("Enter your Automation API key first"); return; }
    setLoading(true);
    setMessage("🚀 Running pipeline...");
    const asinList = asins.split(/[\n,]+/).map((a) => a.trim()).filter(Boolean);
    const r = await fetch(`${API_URL}/automation/run-pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-automation-api-key": key },
      body: JSON.stringify({ asins: asinList, categoryId: Number(categoryId), generateContent })
    });
    const data = await r.json();
    setLoading(false);
    if (!r.ok) { setMessage(`❌ ${data.message ?? "Failed"}`); return; }
    setPipelineResults(data.results ?? []);
    setMessage(`✅ Pipeline complete — ${asinList.length} ASINs processed`);
  }

  async function addManualProduct(e: FormEvent) {
    e.preventDefault();
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) { setMessage("Enter your Automation API key first"); return; }
    setLoading(true);
    const r = await fetch(`${API_URL}/automation/manual-add-product`, {
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
    const data = await r.json();
    setLoading(false);
    if (!r.ok) { setMessage(`❌ ${data.message}`); return; }
    setMessage(`✅ Product added: ${data.product?.name}`);
  }

  async function generatePost(productId: number) {
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) { setMessage("Enter your Automation API key first"); return; }
    setLoading(true);
    setMessage(`✍️ Generating AI content for product #${productId}...`);
    const r = await fetch(`${API_URL}/automation/generate-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-automation-api-key": key },
      body: JSON.stringify({ productId, type: "review" })
    });
    const data = await r.json();
    setLoading(false);
    if (!r.ok) { setMessage(`❌ ${data.message}`); return; }
    setMessage(`✅ Blog post created: "${data.blogPost?.title}"`);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "pipeline", label: "🚀 Pipeline" },
    { id: "manual", label: "✏️ Manual Add" },
    { id: "products", label: "📦 Products" },
    { id: "logs", label: "📋 Logs" }
  ];

  if (!token) {
    return (
      <div className="space-y-6">
        <form onSubmit={login} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4 max-w-md text-slate-900">
          <h2 className="text-xl font-semibold text-slate-900">Admin Login</h2>
          <input className="w-full rounded border border-slate-300 p-2 text-sm text-slate-900" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input type="password" className="w-full rounded border border-slate-300 p-2 text-sm text-slate-900" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button disabled={loading} className="rounded bg-blue-600 px-4 py-2 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Logging in..." : "Login"}
          </button>
          {message && <p className="text-sm text-slate-500">{message}</p>}
        </form>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm max-w-md space-y-3 text-slate-900">
          <h2 className="text-xl font-semibold text-slate-900">Automation API Key</h2>
          <p className="text-sm text-slate-500">Required to run pipelines and generate content. Stored only in your browser.</p>
          <input className="w-full rounded border border-slate-300 p-2 text-sm font-mono text-slate-900" placeholder="Your AUTOMATION_API_KEY" value={automationKey} onChange={(e) => setAutomationKey(e.target.value)} />
          <button onClick={saveKey} className="rounded bg-slate-800 px-4 py-2 text-white text-sm">Save Key</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-green-600 font-medium">✅ Logged in as {email}</p>
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${tab === t.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className={`rounded-lg border p-3 text-sm ${message.startsWith("❌") ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
          {message}
        </div>
      )}

      {/* ── Pipeline Tab ── */}
      {tab === "pipeline" && (
        <form onSubmit={runPipeline} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-slate-900">
          <h2 className="text-lg font-semibold text-slate-900">Run Automation Pipeline</h2>
          <p className="text-sm text-slate-500">Paste ASINs (one per line). The pipeline will fetch product data from Amazon PA API and optionally generate AI blog posts.</p>
          <div>
            <label className="text-sm font-medium text-slate-900">Amazon ASINs</label>
            <textarea rows={5} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm font-mono text-slate-900" value={asins} onChange={(e) => setAsins(e.target.value)} placeholder="B09G9FPHY6&#10;B08L5TNJHG" />
          </div>
          <div className="flex gap-4">
            <div>
              <label className="text-sm font-medium text-slate-900">Category ID</label>
              <input type="number" className="mt-1 w-24 rounded border border-slate-300 p-2 text-sm text-slate-900" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-5">
              <input type="checkbox" checked={generateContent} onChange={(e) => setGenerateContent(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm font-medium text-slate-900">Generate AI Content</span>
            </label>
          </div>
          <button disabled={loading} className="rounded bg-blue-600 px-6 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Running..." : "🚀 Run Pipeline"}
          </button>

          {pipelineResults.length > 0 && (
            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-slate-50"><th className="border p-2 text-left">ASIN</th><th className="border p-2">Status</th><th className="border p-2">Product ID</th><th className="border p-2">Blog Post ID</th></tr></thead>
                <tbody>
                  {(pipelineResults as Array<{ asin: string; status: string; productId?: number; blogPostId?: number }>).map((r) => (
                    <tr key={r.asin} className={r.status === "success" ? "bg-green-50" : "bg-red-50"}>
                      <td className="border p-2 font-mono">{r.asin}</td>
                      <td className="border p-2 text-center">{r.status}</td>
                      <td className="border p-2 text-center">{r.productId ?? "—"}</td>
                      <td className="border p-2 text-center">{r.blogPostId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </form>
      )}

      {/* ── Manual Add Tab ── */}
      {tab === "manual" && (
        <form onSubmit={addManualProduct} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-slate-900">
          <h2 className="text-lg font-semibold text-slate-900">Manual Product Add</h2>
          <p className="text-sm text-slate-500">Add a product without PA API — useful when API keys aren't active yet.</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">ASIN</label><input className="mt-1 w-full rounded border border-slate-300 p-2 text-sm font-mono" placeholder="B09G9FPHY6" value={manual.asin} onChange={(e) => setManual({ ...manual, asin: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Product Name</label><input className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" placeholder="Sony WH-1000XM5" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Price (₹)</label><input type="number" className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" value={manual.price} onChange={(e) => setManual({ ...manual, price: Number(e.target.value) })} /></div>
            <div><label className="text-sm font-medium">Rating</label><input type="number" step="0.1" min="0" max="5" className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" value={manual.rating} onChange={(e) => setManual({ ...manual, rating: Number(e.target.value) })} /></div>
            <div><label className="text-sm font-medium">Category ID</label><input type="number" className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" value={manual.categoryId} onChange={(e) => setManual({ ...manual, categoryId: Number(e.target.value) })} /></div>
            <div><label className="text-sm font-medium">Image URL</label><input className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" placeholder="https://..." value={manual.imageUrl} onChange={(e) => setManual({ ...manual, imageUrl: e.target.value })} /></div>
          </div>
          <div><label className="text-sm font-medium">Affiliate URL (optional — auto-generated if blank)</label><input className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" placeholder="https://amazon.in/dp/..." value={manual.affiliateUrl} onChange={(e) => setManual({ ...manual, affiliateUrl: e.target.value })} /></div>
          <div><label className="text-sm font-medium">Description</label><textarea rows={3} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" value={manual.description} onChange={(e) => setManual({ ...manual, description: e.target.value })} /></div>
          <button disabled={loading} className="rounded bg-blue-600 px-6 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Saving..." : "✏️ Add Product"}
          </button>
        </form>
      )}

      {/* ── Products Tab ── */}
      {tab === "products" && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">All Products ({products.length})</h2>
            <button onClick={() => void fetchProducts()} className="text-sm text-blue-600 hover:underline">Refresh</button>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="bg-slate-50"><th className="border p-2 text-left">Name</th><th className="border p-2">Price</th><th className="border p-2">Rating</th><th className="border p-2">Actions</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="border p-2"><a href={`/product/${p.slug}`} target="_blank" className="text-blue-600 hover:underline">{p.name}</a></td>
                    <td className="border p-2 text-center">₹{Number(p.price).toFixed(0)}</td>
                    <td className="border p-2 text-center">{Number(p.rating).toFixed(1)}</td>
                    <td className="border p-2 text-center">
                      <button onClick={() => void generatePost(p.id)} disabled={loading} className="rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-700 disabled:opacity-50">
                        ✍️ Gen Post
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Logs Tab ── */}
      {tab === "logs" && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Automation Logs</h2>
            <button onClick={() => void fetchLogs()} className="text-sm text-blue-600 hover:underline">Refresh</button>
          </div>
          <div className="space-y-2">
            {logs.length === 0 && <p className="text-sm text-slate-400">No logs yet.</p>}
            {logs.map((log) => (
              <div key={log.id} className={`rounded border p-3 text-sm ${log.status === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-medium">{log.event}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${log.status === "success" ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>{log.status}</span>
                </div>
                {log.message && <p className="mt-1 text-slate-600 text-xs">{log.message}</p>}
                <p className="mt-1 text-xs text-slate-400">{new Date(log.createdAt).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
