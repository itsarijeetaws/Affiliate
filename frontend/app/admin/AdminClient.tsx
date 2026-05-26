"use client";

import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { clientFetchUrl } from "@/lib/api";
import { AUTH_EVENT_NAME, clearStoredToken, getStoredToken, setStoredToken, type AuthUser } from "@/lib/auth";
import { Rocket, PenLine, Package, ClipboardList, Wand2, CheckCircle2, XCircle, Loader2, Upload } from "lucide-react";

type Log = { id: number; event: string; status: string; message: string | null; createdAt: string };
type Product = { id: number; name: string; slug: string; price: number; rating: number };
type Tab = "pipeline" | "manual" | "import" | "logs" | "products";
type AuthMode = "login" | "register";

export function AdminClient() {
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
  const [asins, setAsins] = useState("B09G9FPHY6\nB08L5TNJHG");
  const [categoryId, setCategoryId] = useState(1);
  const [generateContent, setGenerateContent] = useState(true);
  const [pipelineResults, setPipelineResults] = useState<unknown[]>([]);
  const [manual, setManual] = useState({
    asin: "", name: "", price: 999, rating: 4.0,
    imageUrl: "", categoryId: 1, description: "", affiliateUrl: ""
  });
  const [automationKey, setAutomationKey] = useState("");

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
    setAutomationKey(localStorage.getItem("automation_api_key") ?? "");
    void loadSession();
    window.addEventListener(AUTH_EVENT_NAME, loadSession);
    return () => window.removeEventListener(AUTH_EVENT_NAME, loadSession);
  }, [loadSession]);

  function saveKey() {
    localStorage.setItem("automation_api_key", automationKey);
    setMessage("API key saved");
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const response = await fetch(clientFetchUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) { setMessage(data.message ?? "Login failed"); return; }
    setToken(data.token);
    setMessage("ok:Logged in successfully");
  }

  const fetchLogs = useCallback(async () => {
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) return;
    const r = await fetch(clientFetchUrl("/automation/logs?limit=30"), {
      headers: { "x-automation-api-key": key }
    });
    if (r.ok) setLogs((await r.json()).items);
  }, [automationKey]);

  const fetchProducts = useCallback(async () => {
    const r = await fetch(clientFetchUrl("/products?limit=50"));
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
    setMessage("loading:Running pipeline...");
    const asinList = asins.split(/[\n,]+/).map((a) => a.trim()).filter(Boolean);
    const r = await fetch(clientFetchUrl("/automation/run-pipeline"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-automation-api-key": key },
      body: JSON.stringify({ asins: asinList, categoryId: Number(categoryId), generateContent })
    });
    const data = await r.json();
    setLoading(false);
    if (!r.ok) { setMessage(`err:${data.message ?? "Failed"}`); return; }
    setPipelineResults(data.results ?? []);
    setMessage(`ok:Pipeline complete — ${asinList.length} ASINs processed`);
  }

  async function addManualProduct(e: FormEvent) {
    e.preventDefault();
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) { setMessage("Enter your Automation API key first"); return; }
    setLoading(true);
    const r = await fetch(clientFetchUrl("/automation/manual-add-product"), {
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
    if (!r.ok) { setMessage(`err:${data.message}`); return; }
    setMessage(`ok:Product added: ${data.product?.name}`);
  }

  async function generatePost(productId: number) {
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) { setMessage("Enter your Automation API key first"); return; }
    setLoading(true);
    setMessage(`loading:Generating AI content for product #${productId}...`);
    const r = await fetch(clientFetchUrl("/automation/generate-post"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-automation-api-key": key },
      body: JSON.stringify({ productId, type: "review" })
    });
    const data = await r.json();
    setLoading(false);
    if (!r.ok) { setMessage(`err:${data.message}`); return; }
    setMessage(`ok:Blog post created: "${data.blogPost?.title}"`);
  }

  const tabs: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: "pipeline", label: "Pipeline",   Icon: Rocket },
    { id: "manual",   label: "Manual Add", Icon: PenLine },
    { id: "import",   label: "CSV Import", Icon: Upload },
    { id: "products", label: "Products",   Icon: Package },
    { id: "logs",     label: "Logs",       Icon: ClipboardList },
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
        <p className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
        <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
        Logged in as {email}
      </p>
        <div className="flex gap-2">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${tab === id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {message && (() => {
        const isErr  = message.startsWith("err:");
        const isLoad = message.startsWith("loading:");
        const text   = message.replace(/^(err|ok|loading):/, "");
        return (
          <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${isErr ? "border-red-200 bg-red-50 text-red-700" : isLoad ? "border-blue-100 bg-blue-50 text-blue-700" : "border-green-200 bg-green-50 text-green-700"}`}>
            {isErr  ? <XCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
             : isLoad ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={2} />
             : <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />}
            {text}
          </div>
        );
      })()}

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
          <button disabled={loading} className="inline-flex items-center gap-2 rounded bg-blue-600 px-6 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />Running...</>
              : <><Rocket className="h-4 w-4" strokeWidth={2} />Run Pipeline</>}
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
          <button disabled={loading} className="inline-flex items-center gap-2 rounded bg-blue-600 px-6 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />Saving...</>
              : <><PenLine className="h-4 w-4" strokeWidth={2} />Add Product</>}
          </button>
        </form>
      )}

      {/* ── CSV Import Tab ── */}
      {tab === "import" && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-5 text-slate-900">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">CSV Bulk Import</h2>
            <p className="text-sm text-slate-500 mt-1">Upload a CSV to create multiple products at once. No PA API needed.</p>
          </div>

          {/* Template */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Required CSV format</p>
            <code className="text-xs text-slate-700 block whitespace-pre">
{`asin,name,price,rating,imageUrl,categoryId,description,affiliateUrl
B09C3MKLF7,Samsung Galaxy Buds2,4999,4.2,https://m.media-amazon.com/images/I/61CGHv6kmWL._SL500_.jpg,1,Great wireless earbuds,
B07MSSHP5J,boAt Rockerz 450,1299,4.1,https://m.media-amazon.com/images/I/71Swqqe7XAL._SL500_.jpg,1,,`}
            </code>
            <p className="text-xs text-slate-400 mt-2">affiliateUrl column is optional — auto-generated from ASIN if blank.</p>
          </div>

          {/* Upload form */}
          <form onSubmit={async (e) => {
            e.preventDefault();
            const input = (e.currentTarget.elements.namedItem("csvfile") as HTMLInputElement);
            const file = input?.files?.[0];
            if (!file) { setMessage("err:Select a CSV file first"); return; }
            const key = localStorage.getItem("automation_api_key") ?? "";
            if (!key) { setMessage("err:Enter Automation API key first"); return; }
            setLoading(true);
            setMessage("loading:Importing...");
            const fd = new FormData();
            fd.append("file", file);
            const r = await fetch(clientFetchUrl("/automation/bulk-import"), {
              method: "POST",
              headers: { "x-automation-api-key": key },
              body: fd,
            });
            const data = await r.json() as { created: number; failed: number; skipped: number; results: Array<{ row: number; asin: string; status: string; error?: string }> };
            setLoading(false);
            if (!r.ok) { setMessage(`err:${(data as { message?: string }).message ?? "Import failed"}`); return; }
            setMessage(`ok:Imported ${data.created} products (${data.failed} failed, ${data.skipped} skipped)`);
            if (data.results.some(r => r.status === "failed")) {
              console.table(data.results.filter(r => r.status === "failed"));
            }
          }} className="space-y-3">
            <input
              name="csvfile"
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-sm text-slate-700 file:mr-4 file:rounded file:border-0 file:bg-[#FF9900] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-[#e68a00]"
            />
            <button disabled={loading} className="inline-flex items-center gap-2 rounded bg-[#FF9900] px-6 py-2 text-sm font-bold text-black hover:bg-[#e68a00] disabled:opacity-50">
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />Importing...</>
                : <><Upload className="h-4 w-4" strokeWidth={2} />Import Products</>}
            </button>
          </form>
        </div>
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
                      <button onClick={() => void generatePost(p.id)} disabled={loading} className="inline-flex items-center gap-1 rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-700 disabled:opacity-50">
                        <Wand2 className="h-3 w-3" strokeWidth={2} />Gen Post
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
