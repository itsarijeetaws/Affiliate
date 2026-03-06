"use client";

import { FormEvent, useState } from "react";
import { API_URL } from "@/lib/api";

type ProductInput = {
  name: string;
  amazonAsin: string;
  price: number;
  rating: number;
  imageUrl: string;
  categoryId: number;
  description: string;
  pros: string[];
  cons: string[];
  affiliateUrl: string;
};

const initial: ProductInput = {
  name: "",
  amazonAsin: "",
  price: 0,
  rating: 4,
  imageUrl: "",
  categoryId: 1,
  description: "",
  pros: [""],
  cons: [""],
  affiliateUrl: ""
};

export function AdminClient() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [product, setProduct] = useState<ProductInput>(initial);
  const [message, setMessage] = useState("");

  async function login(e: FormEvent) {
    e.preventDefault();
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message || "Login failed");
      return;
    }

    setToken(data.token);
    setMessage("Logged in");
  }

  async function addProduct(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setMessage("Login first");
      return;
    }

    const response = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(product)
    });

    if (!response.ok) {
      const data = await response.json();
      setMessage(data.message || "Failed to create product");
      return;
    }

    setMessage("Product added");
    setProduct(initial);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={login} className="space-y-3 rounded border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-semibold">Admin Login</h2>
        <input className="w-full rounded border p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          type="password"
          className="w-full rounded border p-2"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="rounded bg-brand-700 px-4 py-2 text-white">Login</button>
      </form>

      <form onSubmit={addProduct} className="space-y-3 rounded border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-semibold">Add Product</h2>
        <input className="w-full rounded border p-2" placeholder="Name" value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} />
        <input className="w-full rounded border p-2" placeholder="ASIN" value={product.amazonAsin} onChange={(e) => setProduct({ ...product, amazonAsin: e.target.value })} />
        <input className="w-full rounded border p-2" placeholder="Image URL" value={product.imageUrl} onChange={(e) => setProduct({ ...product, imageUrl: e.target.value })} />
        <input className="w-full rounded border p-2" placeholder="Affiliate URL" value={product.affiliateUrl} onChange={(e) => setProduct({ ...product, affiliateUrl: e.target.value })} />
        <textarea className="w-full rounded border p-2" placeholder="Description" value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} />
        <button className="rounded bg-brand-700 px-4 py-2 text-white">Save Product</button>
      </form>

      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}
