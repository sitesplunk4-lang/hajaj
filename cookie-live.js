(function () {
  const roots = document.querySelectorAll("[data-cookie-live]");
  if (!roots.length) return;

  // .json is premium-only (nginx static); elite must use ?pool=elite on PHP.
  const API_URLS = ["/api/cookie-stock-public.php"];
  const onHome = document.body && document.body.dataset && document.body.dataset.homepage === "1";
  const POLL_MS = onHome ? 45000 : 20000;
  let pollTimer = null;

  function applyItems(root, items) {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      const el = root.querySelector('[data-live-item="' + item.id + '"]');
      if (!el) return;
      const valueEl = el.querySelector("[data-live-value]");
      const hintEl = el.querySelector("[data-live-hint]");
      const title = item.title || "";
      el.setAttribute("title", title);
      if (valueEl && valueEl.textContent !== String(item.value)) {
        valueEl.textContent = item.value;
      }
      if (hintEl) {
        const hint = item.hint || "";
        hintEl.textContent = hint;
        hintEl.hidden = !hint;
        hintEl.classList.toggle("is-empty", !hint);
      }
    });
  }

  function applySpecialItems(root, items) {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      const el = root.querySelector('[data-special-item="' + item.id + '"]');
      if (!el) return;
      const value = Number(item.value) || 0;
      el.hidden = false;
      const valueEl = el.querySelector("[data-special-value]");
      if (valueEl && valueEl.textContent !== String(value)) {
        valueEl.textContent = String(value);
      }
    });
  }

  function applyIncomingHighMeta(root, data) {
    if (poolForRoot(root) !== "premium") return;
    const card = root.closest(".product-card");
    if (!card) return;
    const meta = card.querySelector("[data-cookie-incoming-meta]");
    if (!meta) return;
    const text = (data && data.incoming_high_meta) ? String(data.incoming_high_meta) : "";
    if (text === "") {
      meta.hidden = true;
      return;
    }
    meta.hidden = false;
    if (meta.textContent !== text) {
      meta.textContent = text;
    }
  }

  function applyStockLabel(root, data) {
    const card = root.closest(".product-card");
    if (!card || !data.stock_label) return;
    const stock = card.querySelector('[data-live="stock_label"]');
    if (!stock) return;
    stock.textContent = data.stock_label + " tersedia";
  }

  function poolForRoot(root) {
    return (root.getAttribute("data-pool") || "premium").toLowerCase() === "elite"
      ? "elite"
      : "premium";
  }

  function cardMatchesVariant(card, variant) {
    if (!card) return false;
    if (variant === "elite") {
      return (
        card.hasAttribute("data-cookie-elite-home-card") ||
        card.hasAttribute("data-cookie-elite-order-card")
      );
    }
    return card.hasAttribute("data-cookie-home-card");
  }

  /** /dashboard/order — checkout form only; no homepage CTA links. */
  function isCookieOrderCheckoutCard(card) {
    return !!card && card.hasAttribute("data-cookie-elite-order-card");
  }

  function cleanupCookieOrderCheckoutExtras(card) {
    if (!card) return;
    card.querySelectorAll("a[data-cookie-elite-order-link]").forEach((el) => el.remove());
    card.querySelectorAll("span.btn-primary--disabled").forEach((el) => {
      if (!el.closest(".order-form")) el.remove();
    });
  }

  function applyOrderEliteStockBadge(root, data) {
    if (poolForRoot(root) !== "elite") return;
    const card = root.closest(".product-card");
    if (!card || !card.hasAttribute("data-cookie-elite-order-card")) return;
    const sellable =
      typeof data.sellable === "number"
        ? data.sellable
        : parseInt(String(data.sellable ?? ""), 10);
    if (!Number.isFinite(sellable)) return;
    const badge = card.querySelector(".product-card__head .product-stock-badge");
    if (badge) {
      badge.textContent =
        String(Math.max(0, sellable)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " elite tersedia";
    }
  }

  function syncCookieCardAvailability(root, data, variant) {
    const card = root.closest(".product-card");
    if (!cardMatchesVariant(card, variant)) return;

    const sellable =
      typeof data.sellable === "number"
        ? data.sellable
        : parseInt(String(data.sellable ?? ""), 10);
    const canOrder =
      data.can_order === true ||
      (Number.isFinite(sellable) && sellable > 0 && data.can_order !== false);

    card.setAttribute("data-cookie-sellable", String(Math.max(0, sellable || 0)));
    card.setAttribute("data-cookie-sold-out", canOrder ? "0" : "1");
    card.classList.toggle("product-card--sold-out", !canOrder);

    if (isCookieOrderCheckoutCard(card)) {
      cleanupCookieOrderCheckoutExtras(card);
      return;
    }

    const stockRow = card.querySelector(".stock-row");
    if (stockRow) {
      let badge = stockRow.querySelector(".product-stock-badge--out");
      let count = stockRow.querySelector('[data-live="stock_label"]');
      if (!canOrder) {
        if (count) count.remove();
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "product-stock-badge product-stock-badge--out";
          badge.textContent = "Habis";
          stockRow.appendChild(badge);
        }
      } else {
        if (badge) badge.remove();
        if (!count && data.stock_label) {
          count = document.createElement("span");
          count.className = "stock-count low";
          count.setAttribute("data-live", "stock_label");
          count.textContent = data.stock_label + " tersedia";
          stockRow.appendChild(count);
        } else if (count && data.stock_label) {
          count.textContent = data.stock_label + " tersedia";
        }
      }
    }

    const priceWrap = card.querySelector(".price");
    let disabledBtn = card.querySelector(".btn-primary--disabled");
    let orderLink =
      variant === "elite"
        ? card.querySelector("[data-cookie-elite-order-link], a.btn-primary[href*='product=']")
        : card.querySelector("[data-cookie-order-link]");

    if (!canOrder) {
      if (orderLink) orderLink.remove();
      if (!disabledBtn) {
        disabledBtn = document.createElement("span");
        disabledBtn.className = "btn-primary btn-primary--disabled";
        disabledBtn.setAttribute("aria-disabled", "true");
        disabledBtn.textContent = "Stok Habis";
        if (priceWrap && priceWrap.parentNode) {
          priceWrap.parentNode.insertBefore(disabledBtn, priceWrap.nextSibling);
        } else {
          card.appendChild(disabledBtn);
        }
      }
    } else {
      if (disabledBtn) disabledBtn.remove();
      if (variant === "home" && !orderLink) {
        orderLink = document.createElement("a");
        orderLink.className = "btn-primary";
        orderLink.setAttribute("data-cookie-order-link", "");
        orderLink.setAttribute("data-order-href", "/dashboard/order");
        orderLink.setAttribute("data-login-href", "/auth/login");
        orderLink.textContent = "Pesan Sekarang";
        card.appendChild(orderLink);
        syncHomeCard(root);
      } else if (variant === "elite" && !orderLink) {
        const eliteId = card.getAttribute("data-elite-product-id") || "cookie-elite";
        orderLink = document.createElement("a");
        orderLink.className = "btn-primary";
        orderLink.setAttribute("data-cookie-elite-order-link", "");
        orderLink.href = "/dashboard/order?product=" + encodeURIComponent(eliteId);
        orderLink.textContent = "Pesan Sekarang";
        card.appendChild(orderLink);
      }
    }
  }

  function syncHomeCardAvailability(root, data) {
    if (poolForRoot(root) !== "premium") return;
    syncCookieCardAvailability(root, data, "home");
  }

  function syncEliteCardAvailability(root, data) {
    if (poolForRoot(root) !== "elite") return;
    syncCookieCardAvailability(root, data, "elite");
  }

  async function tickRoot(root) {
    const pool = (root.getAttribute("data-pool") || "premium").toLowerCase() === "elite"
      ? "elite"
      : "premium";
    try {
      root.setAttribute("data-pool", pool);
      let data = null;
      for (let i = 0; i < API_URLS.length; i++) {
        const res = await fetch(API_URLS[i] + "?pool=" + encodeURIComponent(pool), {
          credentials: "same-origin",
        });
        if (!res.ok) continue;
        data = await res.json();
        break;
      }
      if (!data) return;
      if (pool === "elite") {
        const staleHigh = root.querySelector('[data-live-item="incoming_high"]');
        if (staleHigh) staleHigh.remove();
      }
      applyItems(root, data.items);
      applySpecialItems(root, data.special_items);
      applyIncomingHighMeta(root, data);
      applyStockLabel(root, data);
      applyOrderEliteStockBadge(root, data);
      if (pool === "premium") {
        syncHomeCardAvailability(root, data);
      } else {
        syncEliteCardAvailability(root, data);
      }
    } catch (_) {}
  }

  function syncHomeCard(root) {
    const card = root.closest(".product-card");
    if (!card || !card.hasAttribute("data-cookie-home-card")) return;

    const summaryPrice = parseInt(card.getAttribute("data-price-summary") || "6000", 10) || 6000;
    const priceValue = card.querySelector("[data-cookie-price-value]");
    if (priceValue) priceValue.textContent = "IDR " + String(summaryPrice).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    const orderLink = card.querySelector("[data-cookie-order-link]");
    if (orderLink) {
      const loginHref = orderLink.getAttribute("data-login-href") || "/auth/login";
      const orderHref = orderLink.getAttribute("data-order-href") || "/dashboard/order";
      if (orderLink.getAttribute("data-logged-in") === "1") {
        orderLink.href = orderHref + "?product=cookie";
      } else {
        orderLink.href = loginHref;
      }
    }
  }

  function bindHomeCard(root) {
    const card = root.closest(".product-card");
    if (!card || !card.hasAttribute("data-cookie-home-card")) return;

    const orderLink = card.querySelector("[data-cookie-order-link]");
    if (orderLink && orderLink.getAttribute("data-order-href")) {
      orderLink.setAttribute(
        "data-logged-in",
        orderLink.getAttribute("href") && !orderLink.getAttribute("href").includes("/auth/login") ? "1" : "0"
      );
    }
    syncHomeCard(root);
  }

  async function tickAll() {
    const tasks = [];
    roots.forEach((root) => {
      tasks.push(tickRoot(root));
    });
    await Promise.all(tasks);
  }

  window.__cookieLiveRefresh = tickAll;

  function startPoll() {
    if (pollTimer) return;
    pollTimer = setInterval(tickAll, POLL_MS);
  }
  function stopPoll() {
    if (!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
  }

  roots.forEach((root) => bindHomeCard(root));
  tickAll();
  startPoll();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopPoll();
      return;
    }
    tickAll();
    startPoll();
  });
})();
