"use client";

export const AUTH_TOKEN_KEY = "affiliate_auth_token";
export const AUTH_EVENT_NAME = "affiliate-auth-changed";

export type AuthUser = {
  id: number;
  email: string;
  name?: string | null;
  isAdmin: boolean;
};

export function getStoredToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? "";
}

export function setStoredToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_EVENT_NAME));
}

export function clearStoredToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT_NAME));
}
