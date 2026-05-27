// Service worker — stores scraped products in chrome.storage.local

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === "ADD_PRODUCT") {
    addProducts([msg.product], sendResponse);
    return true;
  }

  if (msg.type === "ADD_PRODUCTS_BATCH") {
    addProducts(msg.products || [], sendResponse);
    return true;
  }

  if (msg.type === "GET_PRODUCTS") {
    chrome.storage.local.get(["products"], (result) => {
      sendResponse({ products: result.products || [] });
    });
    return true;
  }

  if (msg.type === "SET_PRODUCTS") {
    chrome.storage.local.set({ products: msg.products || [] }, () => {
      sendResponse({ ok: true, total: (msg.products || []).length });
    });
    return true;
  }

  if (msg.type === "CLEAR_PRODUCTS") {
    chrome.storage.local.set({ products: [] }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "DELETE_PRODUCT") {
    chrome.storage.local.get(["products"], (result) => {
      const products = (result.products || []).filter((p) => p.asin !== msg.asin);
      chrome.storage.local.set({ products }, () => {
        sendResponse({ ok: true, total: products.length });
      });
    });
    return true;
  }
});

function addProducts(incoming, sendResponse) {
  chrome.storage.local.get(["products"], (result) => {
    const products = result.products || [];

    for (const product of incoming) {
      if (!product.asin || !product.name) continue;
      const idx = products.findIndex((p) => p.asin === product.asin);
      if (idx >= 0) {
        // Only overwrite if new data has more fields (dp page > listing page)
        if (product.bullets || product.brand || !products[idx].bullets) {
          products[idx] = { ...products[idx], ...product };
        }
      } else {
        products.push(product);
      }
    }

    chrome.storage.local.set({ products }, () => {
      sendResponse?.({ ok: true, total: products.length });
    });
  });
}
