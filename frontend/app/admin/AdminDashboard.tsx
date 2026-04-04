"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { AUTH_EVENT_NAME, clearStoredToken, getStoredToken, setStoredToken, type AuthUser } from "@/lib/auth";

type Log = { id: number; event: string; status: string; message: string | null; createdAt: string };
type Product = { id: number; name: string; slug: string; price: number; rating: number };
type Tab = "pipeline" | "manual" | "logs" | "products";
type AuthMode = "login" | "register";

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

    const response = await fetch(`${API_URL}/auth/me`, {
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

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const endpoint = authMode === "register" ? "/auth/register" : "/auth/login";
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        ...(authMode === "register" ? { name } : {})
      })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.message ?? "Authentication failed");
      return;
    }

    setStoredToken(data.token);
    setUser(data.user);
    setToken(data.token);
    setPassword("");
    setMessage(data.user.isAdmin ? "Admin access granted." : "Logged in, but this account is not an admin.");
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

    const response = await fetch(`${API_URL}/automation/logs?limit=30`, {
      headers: { "x-automation-api-key": key }
    });

    if (response.ok) {
      setLogs((await response.json()).items);
    }
  }, [automationKey]);

  const fetchProducts = useCallback(async () => {
    const response = await fetch(`${API_URL}/products?limit=50`);
    if (response.ok) {
      setProducts((await response.json()).items);
    }
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) return;
    if (tab === "logs") void fetchLogs();
    if (tab === "products") void fetchProducts();
  }, [tab, user, fetchLogs, fetchProducts]);

  async function runPipeline(event: FormEvent) {
    event.preventDefault();
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) {
      setMessage("Enter your Automation API key first");
      return;
    }

    setLoading(true);
    setMessage("Running pipeline...");
    const asinList = asins.split(/[\n,]+/).map((asin) => asin.trim()).filter(Boolean);
    const response = await fetch(`${API_URL}/automation/run-pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-automation-api-key": key },
      body: JSON.stringify({ asins: asinList, categoryId: Number(categoryId), generateContent })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.message ?? "Pipeline failed");
      return;
    }

    setPipelineResults(data.results ?? []);
    setMessage(`Pipeline complete. ${asinList.length} ASINs processed.`);
  }

  async function addManualProduct(event: FormEvent) {
    event.preventDefault();
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) {
      setMessage("Enter your Automation API key first");
      return;
    }

    setLoading(true);
    const response = await fetch(`${API_URL}/automation/manual-add-product`, {
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
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.message ?? "Failed to add product");
      return;
    }

    setMessage(`Product added: ${data.product?.name}`);
  }

  async function generatePost(productId: number) {
    const key = localStorage.getItem("automation_api_key") ?? automationKey;
    if (!key) {
      setMessage("Enter your Automation API key first");
      return;
    }

    setLoading(true);
    setMessage(`Generating content for product #${productId}...`);
    const response = await fetch(`${API_URL}/automation/generate-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-automation-api-key": key },
      body: JSON.stringify({ productId, type: "review" })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.message ?? "Content generation failed");
      return;
    }

    setMessage(`Blog post created: "${data.blogPost?.title}"`);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "pipeline", label: "Pipeline" },
    { id: "manual", label: "Manual Add" },
    { id: "products", label: "Products" },
    { id: "logs", label: "Logs" }
  ];

  if (!token) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={submitAuth} className="rounded-[28px] border border-white/10 bg-white/[0.08] p-6 text-white backdrop-blur-xl">
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
            <input className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
            <input type="password" className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
          </div>

          <button disabled={loading} className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60">
            {loading ? "Please wait..." : authMode === "register" ? "Create account" : "Sign in"}
          </button>

          {message ? <p className="mt-4 text-sm text-amber-200">{message}</p> : null}
        </form>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 text-white backdrop-blur-xl">
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
      <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/[0.06] p-6 text-white backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
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

      {message ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 text-sm text-white/82">
          {message}
        </div>
      ) : null}

      {tab === "pipeline" ? (
        <form onSubmit={runPipeline} className="rounded-[28px] border border-white/10 bg-white/[0.08] p-6 text-white backdrop-blur-xl">
          <h2 className="text-xl font-semibold">Run automation pipeline</h2>
          <p className="mt-2 text-sm text-white/62">Paste ASINs one per line and optionally generate AI content.</p>
          <textarea rows={5} className="mt-5 w-full rounded-2xl border border-white/10 bg-slate-950/35 p-4 font-mono text-sm text-white" value={asins} onChange={(event) => setAsins(event.target.value)} placeholder={"B09G9FPHY6\nB08L5TNJHG"} />
          <div className="mt-4 flex flex-wrap gap-4">
            <input type="number" className="w-32 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" value={categoryId} onChange={(event) => setCategoryId(Number(event.target.value))} />
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
                  <tr className="bg-white/6">
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
        <form onSubmit={addManualProduct} className="rounded-[28px] border border-white/10 bg-white/[0.08] p-6 text-white backdrop-blur-xl">
          <h2 className="text-xl font-semibold">Manual product add</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <input className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 font-mono text-white" placeholder="ASIN" value={manual.asin} onChange={(event) => setManual({ ...manual, asin: event.target.value })} />
            <input className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" placeholder="Product name" value={manual.name} onChange={(event) => setManual({ ...manual, name: event.target.value })} />
            <input type="number" className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" placeholder="Price" value={manual.price} onChange={(event) => setManual({ ...manual, price: Number(event.target.value) })} />
            <input type="number" step="0.1" min="0" max="5" className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" placeholder="Rating" value={manual.rating} onChange={(event) => setManual({ ...manual, rating: Number(event.target.value) })} />
            <input type="number" className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" placeholder="Category ID" value={manual.categoryId} onChange={(event) => setManual({ ...manual, categoryId: Number(event.target.value) })} />
            <input className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" placeholder="Image URL" value={manual.imageUrl} onChange={(event) => setManual({ ...manual, imageUrl: event.target.value })} />
          </div>
          <input className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white" placeholder="Affiliate URL (optional)" value={manual.affiliateUrl} onChange={(event) => setManual({ ...manual, affiliateUrl: event.target.value })} />
          <textarea rows={3} className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-white" placeholder="Description" value={manual.description} onChange={(event) => setManual({ ...manual, description: event.target.value })} />
          <button disabled={loading} className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60">
            {loading ? "Saving..." : "Add product"}
          </button>
        </form>
      ) : null}

      {tab === "products" ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.08] p-6 text-white backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">All products ({products.length})</h2>
            <button onClick={() => void fetchProducts()} className="text-sm font-semibold text-amber-200 transition hover:text-amber-100">
              Refresh
            </button>
          </div>
          <div className="mt-5 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-white/6">
                  <th className="border border-white/10 p-2 text-left">Name</th>
                  <th className="border border-white/10 p-2">Price</th>
                  <th className="border border-white/10 p-2">Rating</th>
                  <th className="border border-white/10 p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="border border-white/10 p-2">
                      <a href={`/product/${product.slug}`} target="_blank" className="text-amber-200 hover:text-amber-100">{product.name}</a>
                    </td>
                    <td className="border border-white/10 p-2 text-center">Rs. {Number(product.price).toFixed(0)}</td>
                    <td className="border border-white/10 p-2 text-center">{Number(product.rating).toFixed(1)}</td>
                    <td className="border border-white/10 p-2 text-center">
                      <button onClick={() => void generatePost(product.id)} disabled={loading} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50">
                        Generate post
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "logs" ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.08] p-6 text-white backdrop-blur-xl">
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
