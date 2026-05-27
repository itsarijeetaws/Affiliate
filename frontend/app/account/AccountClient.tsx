"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Shield, Zap, LayoutDashboard, AlertTriangle,
  User, Lock, Settings, Check, Eye, EyeOff,
  Camera, Pencil, ShieldCheck, LogOut, KeyRound
} from "lucide-react";
import { clientFetchJson, clientFetchUrl } from "@/lib/api";
import { AUTH_EVENT_NAME, clearStoredToken, getStoredToken, setStoredToken, type AuthUser } from "@/lib/auth";

type Mode = "login" | "register";
type ProfileTab = "profile" | "security" | "account";

const inputCls =
  "mt-1.5 w-full rounded-xl border border-gray-200 dark:border-white/[0.09] bg-gray-50 dark:bg-[#0f0f18] px-4 py-2.5 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 outline-none transition focus:border-[#FF9900]/60 focus:ring-2 focus:ring-[#FF9900]/15";

const labelCls = "block text-[11.5px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-white/38";

function getAvatarUrl(user: AuthUser): string {
  if (user.avatarUrl) return user.avatarUrl;
  const initials = encodeURIComponent(user.name || user.email.split("@")[0]);
  return `https://ui-avatars.com/api/?name=${initials}&background=FF9900&color=000000&size=128&bold=true&format=svg`;
}

function getInitials(user: AuthUser): string {
  const src = user.name || user.email;
  return src.split(/[\s@]+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

/* ── Avatar component ── */
function Avatar({ user, size = 80 }: { user: AuthUser; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(user);

  if (imgError || !user.avatarUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-gradient-to-br from-[#FF9900] to-[#e68a00] font-bold text-black shadow-[0_0_24px_rgba(255,153,0,0.3)]"
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getAvatarUrl(user)}
      alt={user.name ?? user.email}
      width={size}
      height={size}
      className="rounded-full object-cover shadow-[0_0_24px_rgba(255,153,0,0.2)]"
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
    />
  );
}

/* ── Password input with show/hide ── */
function PasswordInput({ value, onChange, placeholder, label }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative mt-1.5">
        <input
          type={show ? "text" : "password"}
          className={`${inputCls} mt-0 pr-10`}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/* ── Message banner ── */
function Banner({ message, isError }: { message: string; isError: boolean }) {
  if (!message) return null;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] leading-snug ${
      isError
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
    }`}>
      {isError
        ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
        : <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />}
      {message}
    </div>
  );
}

export function AccountClient() {
  const [mode, setMode] = useState<Mode>("login");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile settings state
  const [profileTab, setProfileTab] = useState<ProfileTab>("profile");
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function loadUser() {
      const token = getStoredToken();
      if (!token) { setUser(null); return; }
      const response = await fetch(clientFetchUrl("/auth/me"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) { clearStoredToken(); setUser(null); return; }
      const data = await response.json() as { user: AuthUser };
      setUser(data.user);
      setEditName(data.user.name ?? "");
      setEditBio(data.user.bio ?? "");
      setEditAvatarUrl(data.user.avatarUrl ?? "");
    }
    void loadUser();
    window.addEventListener(AUTH_EVENT_NAME, loadUser);
    return () => window.removeEventListener(AUTH_EVENT_NAME, loadUser);
  }, []);

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
      const { ok, data } = await clientFetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ...(mode === "register" ? { name } : {}) })
      });

      if (!ok) {
        const base = typeof data.message === "string"
          ? data.message
          : `${mode === "register" ? "Registration" : "Login"} failed`;
        const issues = data.errors;
        if (Array.isArray(issues) && issues.length > 0) {
          const first = issues[0] as { message?: string };
          setMessage(first?.message ? `${base}: ${first.message}` : base);
        } else {
          setMessage(base);
        }
        setIsError(true);
        return;
      }

      const token = data.token;
      const userPayload = data.user as AuthUser | undefined;
      if (typeof token !== "string" || !userPayload) {
        setMessage("Unexpected server response.");
        setIsError(true);
        return;
      }

      setStoredToken(token);
      setUser(userPayload);
      setEditName(userPayload.name ?? "");
      setEditBio(userPayload.bio ?? "");
      setEditAvatarUrl(userPayload.avatarUrl ?? "");
      setPassword("");
      setIsError(false);
      setMessage(mode === "register" ? "Account created successfully." : "Welcome back!");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const token = getStoredToken();
    setLoading(true);
    setMessage("");
    setIsError(false);
    try {
      const response = await fetch(clientFetchUrl("/auth/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName, bio: editBio, avatarUrl: editAvatarUrl })
      });
      const data = await response.json() as { user?: AuthUser; message?: string };
      if (!response.ok) {
        setMessage(data.message ?? "Failed to update profile");
        setIsError(true);
        return;
      }
      if (data.user) {
        setUser(data.user);
        setEditName(data.user.name ?? "");
        setEditBio(data.user.bio ?? "");
        setEditAvatarUrl(data.user.avatarUrl ?? "");
      }
      setMessage("Profile updated successfully.");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      setIsError(true);
      return;
    }
    if (newPassword.length < 8) {
      setMessage("New password must be at least 8 characters.");
      setIsError(true);
      return;
    }
    const token = getStoredToken();
    setLoading(true);
    try {
      const response = await fetch(clientFetchUrl("/auth/change-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) {
        setMessage(data.message ?? "Failed to change password");
        setIsError(true);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed successfully.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearStoredToken();
    setUser(null);
    setMessage("");
  }

  /* ── Logged in — profile dashboard ── */
  if (user) {
    const PROFILE_TABS: { id: ProfileTab; label: string; Icon: typeof User }[] = [
      { id: "profile",  label: "Profile",  Icon: User },
      { id: "security", label: "Security", Icon: Lock },
      { id: "account",  label: "Account",  Icon: Settings },
    ];

    return (
      <div className="space-y-5">

        {/* Profile header card */}
        <div className="flex flex-col gap-5 rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-white/[0.07] dark:bg-[#16161e] sm:flex-row sm:items-center sm:gap-6">
          <div className="relative">
            <Avatar user={user} size={80} />
            <button
              onClick={() => { setProfileTab("profile"); setMessage(""); }}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#FF9900] shadow-md transition hover:bg-[#e68a00] dark:border-[#16161e]"
              title="Edit avatar"
            >
              <Camera className="h-3.5 w-3.5 text-black" strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {user.name || user.email.split("@")[0]}
              </h2>
              {user.isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FF9900]/15 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#FF9900] border border-[#FF9900]/25">
                  <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
                  Admin
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[13px] text-gray-400 dark:text-white/40">{user.email}</p>
            {user.bio && (
              <p className="mt-1.5 text-[13px] text-gray-600 dark:text-white/60 leading-relaxed">{user.bio}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            {user.isAdmin && (
              <a href="/admin" className="btn-orange rounded-xl px-4 py-2 text-[13px] font-bold">
                Admin panel
              </a>
            )}
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-[13px] font-semibold text-gray-600 transition hover:bg-gray-100 hover:border-gray-300 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/60 dark:hover:bg-white/[0.08]"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
              Log out
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-2xl border border-gray-200/80 bg-gray-50/80 p-1 dark:border-white/[0.07] dark:bg-[#0f0f18]">
          {PROFILE_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { setProfileTab(id); setMessage(""); setIsError(false); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-semibold transition-all ${
                profileTab === id
                  ? "bg-white text-gray-900 shadow-sm dark:bg-[#1e1e28] dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-white/40 dark:hover:text-white/65"
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>

        {/* Message banner */}
        <Banner message={message} isError={isError} />

        {/* ── Profile tab ── */}
        {profileTab === "profile" && (
          <form onSubmit={saveProfile} className="rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-white/[0.07] dark:bg-[#16161e]">
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Pencil className="h-4 w-4 text-[#FF9900]" strokeWidth={2} />
              Edit Profile
            </h3>
            <p className="mt-1 text-[12.5px] text-gray-400 dark:text-white/35">
              Update your display name, bio, and profile picture.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className={labelCls}>Display name</label>
                <input
                  className={inputCls}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Your name"
                  maxLength={120}
                />
              </div>

              <div>
                <label className={labelCls}>Bio <span className="normal-case tracking-normal text-gray-300 dark:text-white/20">— optional, max 300 chars</span></label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="Tell us a bit about yourself…"
                  maxLength={300}
                />
                <p className="mt-1 text-right text-[11px] text-gray-300 dark:text-white/20">{editBio.length}/300</p>
              </div>

              <div>
                <label className={labelCls}>Profile picture URL <span className="normal-case tracking-normal text-gray-300 dark:text-white/20">— optional</span></label>
                <input
                  type="url"
                  className={inputCls}
                  value={editAvatarUrl}
                  onChange={e => setEditAvatarUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                />
                {editAvatarUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editAvatarUrl}
                      alt="Preview"
                      className="h-12 w-12 rounded-full object-cover border-2 border-[#FF9900]/30"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                    <p className="text-[12px] text-gray-400 dark:text-white/35">Preview</p>
                  </div>
                )}
                <p className="mt-2 text-[11.5px] text-gray-400 dark:text-white/30">
                  Leave blank to use initials avatar. Tip: use a direct link to a square image.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-orange mt-6 rounded-xl px-6 py-2.5 text-[13px] font-bold disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save profile"}
            </button>
          </form>
        )}

        {/* ── Security tab ── */}
        {profileTab === "security" && (
          <form onSubmit={changePassword} className="rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-white/[0.07] dark:bg-[#16161e]">
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#FF9900]" strokeWidth={2} />
              Change Password
            </h3>
            <p className="mt-1 text-[12.5px] text-gray-400 dark:text-white/35">
              Use a strong password of at least 8 characters.
            </p>

            <div className="mt-6 space-y-4">
              <PasswordInput
                label="Current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Your current password"
              />
              <PasswordInput
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="At least 8 characters"
              />
              <div>
                <PasswordInput
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Repeat new password"
                />
                {confirmPassword && newPassword && (
                  <p className={`mt-1.5 text-[12px] flex items-center gap-1 ${
                    confirmPassword === newPassword ? "text-emerald-500" : "text-red-400"
                  }`}>
                    {confirmPassword === newPassword
                      ? <><Check className="h-3.5 w-3.5" strokeWidth={3} /> Passwords match</>
                      : <><AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} /> Passwords do not match</>}
                  </p>
                )}
              </div>
            </div>

            {/* Password strength hint */}
            {newPassword.length > 0 && (
              <div className="mt-4 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-white/30">Strength</p>
                <div className="flex gap-1">
                  {[8, 12, 16].map((threshold, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        newPassword.length >= threshold
                          ? i === 0 ? "bg-red-400" : i === 1 ? "bg-amber-400" : "bg-emerald-400"
                          : "bg-gray-200 dark:bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 dark:text-white/25">
                  {newPassword.length < 8 ? "Too short" : newPassword.length < 12 ? "Fair" : newPassword.length < 16 ? "Good" : "Strong"}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || newPassword !== confirmPassword}
              className="btn-orange mt-6 rounded-xl px-6 py-2.5 text-[13px] font-bold disabled:opacity-60"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}

        {/* ── Account tab ── */}
        {profileTab === "account" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-white/[0.07] dark:bg-[#16161e]">
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#FF9900]" strokeWidth={2} />
                Account Details
              </h3>

              <div className="mt-5 space-y-4">
                <div>
                  <p className={labelCls}>Email address</p>
                  <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-gray-50 dark:bg-[#0f0f18] px-4 py-2.5">
                    <span className="flex-1 text-[14px] text-gray-500 dark:text-white/50 font-mono">{user.email}</span>
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-gray-300 dark:text-white/20">Read only</span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-gray-400 dark:text-white/30">
                    Email cannot be changed. Contact support if you need to update it.
                  </p>
                </div>

                <div>
                  <p className={labelCls}>Account role</p>
                  <div className={`mt-1.5 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-semibold ${user.isAdmin ? 'border-[#FF9900]/25 bg-[#FF9900]/10 text-[#FF9900]' : 'border-gray-200 dark:border-white/[0.09] bg-gray-50 dark:bg-[#0f0f18] text-gray-600 dark:text-white/60'}`}>
                    {user.isAdmin
                      ? <><ShieldCheck className="h-4 w-4" strokeWidth={2} /> Administrator</>
                      : <><User className="h-4 w-4" strokeWidth={2} /> Member</>}
                  </div>
                  {!user.isAdmin && (
                    <p className="mt-1.5 text-[11.5px] text-gray-400 dark:text-white/30">
                      Admin access is granted by server configuration to specific email addresses.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sign out everywhere */}
            <div className="rounded-2xl border border-red-200/60 bg-red-50/50 p-6 dark:border-red-500/15 dark:bg-red-500/[0.05]">
              <h3 className="text-[15px] font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                <LogOut className="h-4 w-4" strokeWidth={2} />
                Sign out
              </h3>
              <p className="mt-1 text-[12.5px] text-red-500/80 dark:text-red-400/60">
                This will clear your session from this browser.
              </p>
              <button
                onClick={logout}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-red-600 transition hover:bg-red-50 hover:border-red-300 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
                Log out of this device
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  /* ── Auth form (logged out) ── */
  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      {/* Left info panel */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-7 dark:border-white/[0.07] dark:bg-[#16161e]">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF9900]">Access</span>
        <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          Create an account or sign in
        </h2>
        <p className="mt-3 text-[14px] leading-7 text-gray-500 dark:text-white/45">
          Anyone can register and log in. Admin tools only unlock for email addresses configured on the server.
        </p>

        <div className="mt-6 space-y-3">
          {[
            { Icon: Shield,          text: "Secure JWT authentication" },
            { Icon: Zap,             text: "Instant access after login" },
            { Icon: LayoutDashboard, text: "Admin panel for approved accounts" },
          ].map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5 text-[13px] text-gray-500 dark:text-white/45">
              <Icon className="h-4 w-4 shrink-0 text-[#FF9900]/70" strokeWidth={1.75} />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-7 dark:border-white/[0.07] dark:bg-[#16161e]">
        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl border border-gray-200 dark:border-white/[0.07] bg-gray-50 dark:bg-[#0f0f18] p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setMessage(""); setIsError(false); }}
              className={`flex-1 rounded-lg py-2 text-[13px] font-bold capitalize transition ${
                mode === m
                  ? "bg-gradient-to-r from-[#FF9900] to-[#ffb347] text-black shadow-sm"
                  : "text-gray-500 dark:text-white/45 hover:text-gray-700 dark:hover:text-white/70"
              }`}
            >
              {m === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submitAuth} className="mt-6 space-y-4">
          {mode === "register" && (
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required />
            </div>
          )}

          <div>
            <label className={labelCls}>
              {mode === "login" ? "Email or username" : "Email"}
            </label>
            <input
              type={mode === "login" ? "text" : "email"}
              className={inputCls}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={mode === "login" ? "you@example.com or admin" : "you@example.com"}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Password</label>
            <div className="relative mt-1.5">
              <input
                type="password"
                className={`${inputCls} mt-0`}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-orange mt-2 w-full rounded-xl py-3 text-[14px] font-bold disabled:opacity-60"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign in →" : "Create account →"}
          </button>

          <Banner message={message} isError={isError} />

          {isError && message.includes("Failed to fetch") && (
            <p className="text-[11px] text-gray-400 dark:text-white/30">
              Make sure the backend server is running on port 4000.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
