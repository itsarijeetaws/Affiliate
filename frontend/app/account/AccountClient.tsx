"use client";

import { FormEvent, useEffect, useState } from "react";
import { clientFetchJson, clientFetchUrl } from "@/lib/api";
import { AUTH_EVENT_NAME, clearStoredToken, getStoredToken, setStoredToken, type AuthUser } from "@/lib/auth";

type Mode = "login" | "register";

export function AccountClient() {
  const [mode, setMode] = useState<Mode>("login");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        return;
      }

      const response = await fetch(clientFetchUrl("/auth/me"), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        clearStoredToken();
        setUser(null);
        return;
      }

      const data = await response.json() as { user: AuthUser };
      setUser(data.user);
    }

    void loadUser();
    window.addEventListener(AUTH_EVENT_NAME, loadUser);
    return () => window.removeEventListener(AUTH_EVENT_NAME, loadUser);
  }, []);

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
      const { ok, data } = await clientFetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(mode === "register" ? { name } : {})
        })
      });

      if (!ok) {
        const base =
          typeof data.message === "string"
            ? data.message
            : `${mode === "register" ? "Registration" : "Login"} failed`;
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
      setPassword("");
      setMessage(mode === "register" ? "Account created successfully." : "Logged in successfully.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearStoredToken();
    setUser(null);
    setMessage("Logged out.");
  }

  if (user) {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.08] p-6 text-white backdrop-blur-xl">
          <h2 className="text-2xl font-semibold">Your account</h2>
          <p className="mt-3 text-white/68">{user.name || user.email}</p>
          <p className="text-sm text-white/52">{user.email}</p>
          <p className="mt-4 text-sm text-amber-200">{user.isAdmin ? "Admin access is enabled for this account." : "Standard user account."}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {user.isAdmin ? (
              <a href="/admin" className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200">
                Open admin panel
              </a>
            ) : null}
            <button onClick={logout} className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Log out
            </button>
          </div>
        </div>
        {message ? <p className="text-sm text-white/68">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 text-white/72 backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">Access</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Create an account or sign in</h2>
        <p className="mt-3 leading-7">
          Anyone can register and log in. Admin tools only unlock for the email addresses you allow on the server.
        </p>
      </div>

      <form onSubmit={submitAuth} className="rounded-[28px] border border-white/10 bg-white/[0.08] p-6 text-white backdrop-blur-xl">
        <div className="flex gap-3">
          <button type="button" onClick={() => setMode("login")} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "login" ? "bg-amber-300 text-slate-950" : "bg-white/6 text-white"}`}>
            Login
          </button>
          <button type="button" onClick={() => setMode("register")} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "register" ? "bg-amber-300 text-slate-950" : "bg-white/6 text-white"}`}>
            Register
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {mode === "register" ? (
            <div>
              <label className="text-sm text-white/70">Name</label>
              <input className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white outline-none transition focus:border-amber-300/50" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            </div>
          ) : null}
          <div>
            <label className="text-sm text-white/70">{mode === "login" ? "Email or admin" : "Email"}</label>
            <input className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white outline-none transition focus:border-amber-300/50" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={mode === "login" ? "you@example.com or admin" : "you@example.com"} />
          </div>
          <div>
            <label className="text-sm text-white/70">Password</label>
            <input type="password" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white outline-none transition focus:border-amber-300/50" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
          </div>
        </div>

        <button disabled={loading} className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60">
          {loading ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}
        </button>

        {message ? <p className="mt-4 text-sm text-amber-200">{message}</p> : null}
      </form>
    </div>
  );
}
