// popup.js — manages product list display and CSV/JSON export
// v1.2

let products = [];

function loadProducts() {
  chrome.runtime.sendMessage({ type: "GET_PRODUCTS" }, (res) => {
    products = res?.products || [];
    renderList();
  });
}

function renderList() {
  const list = document.getElementById("productList");
  const count = document.getElementById("count");
  const hint = document.getElementById("hint");

  count.textContent = `${products.length} product${products.length !== 1 ? "s" : ""}`;

  if (!products.length) {
    list.innerHTML = `
      <div class="empty-state">
        No products captured yet.<br>
        <strong style="color:#FF9900">Product pages</strong> — visit any amazon.in/dp/… URL.<br>
        <strong style="color:#FF9900">Bulk capture</strong> — open a Bestsellers or search page.
      </div>`;
    hint.style.display = "block";
    return;
  }

  hint.style.display = "none";
  list.innerHTML = "";

  // Show newest first
  [...products].reverse().forEach((p) => {
    const item = document.createElement("div");
    item.className = "product-item";

    const imgSrc = p.imageUrl || "";
    const priceDisplay = p.price ? `₹${Number(p.price).toLocaleString("en-IN")}` : "N/A";
    const mrpDisplay = p.mrp && Number(p.mrp) > Number(p.price)
      ? `<span class="meta-chip mrp" style="text-decoration:line-through;opacity:.6">₹${Number(p.mrp).toLocaleString("en-IN")}</span>`
      : "";
    const ratingDisplay = p.rating ? `★ ${p.rating}` : "";
    const reviewsDisplay = p.reviews ? `(${Number(p.reviews).toLocaleString("en-IN")})` : "";
    const catDisplay = p.category ? `<span class="meta-chip cat" title="Category">📂 ${escHtml(p.category)}</span>` : "";

    item.innerHTML = `
      ${imgSrc ? `<img class="product-img" src="${imgSrc}" alt="" />` : `<div class="product-img"></div>`}
      <div class="product-info">
        <div class="product-name" title="${escHtml(p.name)}">${escHtml(p.name)}</div>
        <div class="product-meta">
          <span class="meta-chip price">${priceDisplay}</span>
          ${mrpDisplay}
          ${ratingDisplay ? `<span class="meta-chip rating">${ratingDisplay}</span>` : ""}
          ${reviewsDisplay ? `<span class="meta-chip">${reviewsDisplay}</span>` : ""}
          <span class="meta-chip asin">${p.asin}</span>
          ${p.brand ? `<span class="meta-chip">· ${escHtml(p.brand)}</span>` : ""}
        </div>
        ${catDisplay ? `<div style="margin-top:3px">${catDisplay}</div>` : ""}
      </div>
      <button class="btn-delete" data-asin="${p.asin}" title="Remove">✕</button>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => deleteProduct(btn.dataset.asin));
  });
}

function deleteProduct(asin) {
  chrome.runtime.sendMessage({ type: "DELETE_PRODUCT", asin }, () => loadProducts());
}

function escHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── CSV Export ──────────────────────────────────────────────────────────────

const CSV_COLUMNS = [
  "asin", "name", "brand", "price", "mrp", "rating", "reviews",
  "availability", "category", "imageUrl", "affiliateUrl", "bullets",
  "url", "scrapedAt",
];

function csvCell(val) {
  const s = String(val ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

function buildCSV(data) {
  const header = CSV_COLUMNS.join(",");
  const rows = data.map((p) => CSV_COLUMNS.map((col) => csvCell(p[col])).join(","));
  return [header, ...rows].join("\r\n");
}

function downloadText(content, filename, mime = "text/csv") {
  const blob = new Blob(["﻿" + content], { type: mime }); // BOM for Excel UTF-8
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  if (!products.length) { alert("No products to export."); return; }
  const csv = buildCSV(products);
  const ts = new Date().toISOString().slice(0, 10);
  downloadText(csv, `amazon-products-${ts}.csv`);
}

function exportJSON() {
  if (!products.length) { alert("No products to export."); return; }
  const ts = new Date().toISOString().slice(0, 10);
  downloadText(
    JSON.stringify(products, null, 2),
    `amazon-products-${ts}.json`,
    "application/json"
  );
}

function clearAll() {
  if (!products.length) return;
  if (!confirm(`Delete all ${products.length} captured products?`)) return;
  chrome.runtime.sendMessage({ type: "CLEAR_PRODUCTS" }, () => loadProducts());
}

// ── Category override ───────────────────────────────────────────────────────

function applyCategory() {
  const cat = document.getElementById("catInput").value;
  if (!cat) { alert("Select a category first."); return; }
  if (!products.length) { alert("No products captured yet."); return; }

  const updated = products.map((p) => ({ ...p, category: cat }));
  chrome.runtime.sendMessage({ type: "SET_PRODUCTS", products: updated }, () => {
    loadProducts();
  });
}

// ── Init ────────────────────────────────────────────────────────────────────
document.getElementById("btnExport").addEventListener("click", exportCSV);
document.getElementById("btnExportJSON").addEventListener("click", exportJSON);
document.getElementById("btnClear").addEventListener("click", clearAll);
document.getElementById("btnApplyCat").addEventListener("click", applyCategory);

// Persist category selection across popup open/close
chrome.storage.local.get(["lastCategory"], (r) => {
  if (r.lastCategory) document.getElementById("catInput").value = r.lastCategory;
});
document.getElementById("catInput").addEventListener("change", (e) => {
  chrome.storage.local.set({ lastCategory: e.target.value });
});

loadProducts();
