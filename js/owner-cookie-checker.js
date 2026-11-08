(function () {
  const tabBtns = document.querySelectorAll("[data-owner-tab]");
  const panels = document.querySelectorAll("[data-owner-panel]");
  const input = document.getElementById("ownerCookieInput");
  const checkBtn = document.getElementById("ownerCheckBtn");
  const clearBtn = document.getElementById("ownerClearBtn");
  const resultEl = document.getElementById("ownerResult");
  const progressWrap = document.getElementById("ownerProgress");
  const progressFill = document.getElementById("ownerProgressFill");
  const progressText = document.getElementById("ownerProgressText");
  const poolEl = document.getElementById("ownerPoolResult");
  const recentEl = document.getElementById("ownerRecentResult");

  if (!input || !checkBtn) return;

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function fmtNum(n) {
    if (n == null || n === "") return "—";
    return new Intl.NumberFormat("id-ID").format(Number(n));
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-owner-tab");
      tabBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
      panels.forEach((p) => p.classList.toggle("is-active", p.getAttribute("data-owner-panel") === name));
      if (name === "pool") loadPool();
      if (name === "recent") loadRecent();
    });
  });

  clearBtn?.addEventListener("click", () => {
    input.value = "";
    resultEl.innerHTML = "";
    progressWrap.hidden = true;
    progressText.hidden = true;
  });

  function setProgress(done, total) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    progressWrap.hidden = false;
    progressText.hidden = false;
    progressFill.style.width = pct + "%";
    progressText.textContent = `${done} / ${total} (${pct}%)`;
  }

  function renderResults(data) {
    if (!data.ok) {
      resultEl.innerHTML = `<p class="owner-empty">Error: ${esc(data.error || "unknown")}</p>`;
      return;
    }
    const s = data.summary || {};
    let html = `<div class="owner-result__summary">
      <span class="owner-chip">Total: ${s.total || 0}</span>
      <span class="owner-chip owner-chip--ok">Valid: ${s.valid || 0}</span>
      <span class="owner-chip owner-chip--bad">Invalid: ${s.invalid || 0}</span>
      ${s.other ? `<span class="owner-chip owner-chip--warn">Lain: ${s.other}</span>` : ""}
    </div>`;

    html += `<div class="owner-table-wrap"><table class="owner-table"><thead><tr>
      <th>#</th><th>Status</th><th>Username</th><th>User ID</th>
      <th>Robux</th><th>RAP</th><th>Premium</th><th>Pesan</th>
    </tr></thead><tbody>`;

    (data.results || []).forEach((r, i) => {
      const pillClass =
        r.status === "valid" ? "owner-pill--valid" :
        r.status === "invalid" ? "owner-pill--invalid" : "owner-pill--pending";
      html += `<tr>
        <td>${i + 1}</td>
        <td><span class="owner-pill ${pillClass}">${esc(r.status)}</span></td>
        <td>${r.username ? `<code>${esc(r.username)}</code>` : "—"}</td>
        <td>${r.user_id ?? "—"}</td>
        <td>${fmtNum(r.robux)}</td>
        <td>${fmtNum(r.rap)}</td>
        <td>${r.premium === true ? "Ya" : r.premium === false ? "Tidak" : "—"}</td>
        <td>${esc(r.message || "")}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    resultEl.innerHTML = html;
  }

  checkBtn.addEventListener("click", async () => {
    const lines = input.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) {
      resultEl.innerHTML = `<p class="owner-empty">Isi minimal satu cookie.</p>`;
      return;
    }
    checkBtn.disabled = true;
    checkBtn.textContent = "Mengecek…";
    resultEl.innerHTML = `<p class="owner-empty">Memproses ${lines.length} cookie…</p>`;
    setProgress(0, lines.length);

    try {
      const res = await fetch("/api/owner-cookie-check.php", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookies: lines }),
      });
      const data = await res.json().catch(() => ({ ok: false, error: "bad_json" }));
      setProgress(lines.length, lines.length);
      renderResults(data);
    } catch (e) {
      resultEl.innerHTML = `<p class="owner-empty">Gagal: ${esc(e.message || "network")}</p>`;
    } finally {
      checkBtn.disabled = false;
      checkBtn.textContent = "Cek Sekarang";
      setTimeout(() => { progressWrap.hidden = true; progressText.hidden = true; }, 1200);
    }
  });

  async function loadPool() {
    poolEl.innerHTML = `<p class="owner-empty">Memuat…</p>`;
    try {
      const pools = ["premium", "elite"];
      const rows = [];
      for (const pool of pools) {
        const res = await fetch(`/api/cookie-stock-public.php?pool=${pool}`, { credentials: "same-origin" });
        if (!res.ok) continue;
        const d = await res.json();
        const live = (d.items || []).find((i) => i.id === "live");
        const dead = (d.items || []).find((i) => i.id === "dead");
        rows.push({
          pool,
          sellable: d.sellable ?? "—",
          can_order: d.can_order,
          live: live?.value ?? "—",
          dead: dead?.value ?? "—",
          stock_label: d.stock_label ?? "",
        });
      }
      if (!rows.length) {
        poolEl.innerHTML = `<p class="owner-empty">Tidak ada data.</p>`;
        return;
      }
      poolEl.innerHTML = `<div class="owner-table-wrap"><table class="owner-table">
        <thead><tr><th>Pool</th><th>Sellable</th><th>Can Order</th><th>Live</th><th>Mati</th><th>Label</th></tr></thead>
        <tbody>${rows.map((r) => `<tr>
          <td><code>${esc(r.pool)}</code></td>
          <td>${esc(r.sellable)}</td>
          <td><span class="owner-pill ${r.can_order ? "owner-pill--valid" : "owner-pill--invalid"}">${r.can_order ? "ya" : "tidak"}</span></td>
          <td>${esc(r.live)}</td>
          <td>${esc(r.dead)}</td>
          <td>${esc(r.stock_label)}</td>
        </tr>`).join("")}</tbody></table></div>`;
    } catch (e) {
      poolEl.innerHTML = `<p class="owner-empty">Gagal: ${esc(e.message || "network")}</p>`;
    }
  }

  async function loadRecent() {
    recentEl.innerHTML = `<p class="owner-empty">Memuat…</p>`;
    try {
      const res = await fetch("/api/owner-recent-cookies.php?limit=50", { credentials: "same-origin" });
      const data = await res.json();
      if (!data.ok) {
        recentEl.innerHTML = `<p class="owner-empty">Error: ${esc(data.error || "unknown")}</p>`;
        return;
      }
      const rows = data.rows || [];
      if (!rows.length) {
        recentEl.innerHTML = `<p class="owner-empty">Belum ada cookie.</p>`;
        return;
      }
      recentEl.innerHTML = `<div class="owner-table-wrap"><table class="owner-table">
        <thead><tr><th>ID</th><th>User</th><th>Tier</th><th>Status</th><th>Ditambahkan</th></tr></thead>
        <tbody>${rows.map((r) => `<tr>
          <td>${esc(r.id)}</td>
          <td>${r.username ? `<code>${esc(r.username)}</code>` : "—"}</td>
          <td>${esc(r.tier || "—")}</td>
          <td><span class="owner-pill ${r.status === "valid" ? "owner-pill--valid" : r.status === "invalid" ? "owner-pill--invalid" : "owner-pill--pending"}">${esc(r.status || "—")}</span></td>
          <td>${esc(r.created_at || "—")}</td>
        </tr>`).join("")}</tbody></table></div>`;
    } catch (e) {
      recentEl.innerHTML = `<p class="owner-empty">Gagal: ${esc(e.message || "network")}</p>`;
    }
  }
})();
