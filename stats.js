(function () {
  const cards = document.querySelectorAll("[data-stat]");
  if (!cards.length) return;

  const STATS_URLS = ["/api/stats-public.json", "/api/stats-public.php"];
  const PING_API = "/api/visitor-ping.php";
  const POLL_MS = isHomepage() ? 45000 : 20000;
  const PING_EVERY_MS = isHomepage() ? 120000 : 60000;
  let pollTimer = null;
  let lastPingAt = 0;

  function isHomepage() {
    return document.body?.dataset?.homepage === "1";
  }

  function getSessionId() {
    let sid = localStorage.getItem("stockly_sid");
    if (!sid) {
      sid = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("stockly_sid", sid);
    }
    return sid;
  }

  function animateValue(el, next) {
    const current = el.textContent;
    if (current === next) return;
    el.classList.add("stat-updating");
    el.textContent = next;
    setTimeout(() => el.classList.remove("stat-updating"), 400);
  }

  function updateDOM(data) {
    const map = {};
    (data.cards || []).forEach((card) => {
      map[card.key] = card;
    });
    [
      "terjual",
      "valid",
      "stok",
      "online",
      "total_member",
      "total_robux",
      "total_rap",
      "total_pending",
      "total_incoming",
    ].forEach((key) => {
      if (!map[key] && data[key] != null) {
        map[key] = {
          value: String(data[key]),
          label: data[key + "_label"],
          hint: data[key + "_hint"] || "",
        };
      }
    });

    cards.forEach((card) => {
      const key = card.dataset.stat;
      const next = map[key];
      if (!next) return;
      const valueEl = card.querySelector(".value");
      const labelEl = card.querySelector("[data-stat-label]");
      const hintEl = card.querySelector("[data-stat-hint]");
      if (valueEl && next.value != null) {
        animateValue(valueEl, String(next.value));
      }
      if (labelEl && next.label) {
        labelEl.textContent = next.label;
      }
      if (hintEl) {
        const hint = next.hint || "";
        hintEl.textContent = hint;
        hintEl.hidden = !hint;
        hintEl.classList.toggle("is-empty", !hint);
      }
    });
  }

  function updateOnlineCount(onlineFormatted) {
    if (onlineFormatted == null) return;
    const value = String(onlineFormatted);
    cards.forEach((card) => {
      if (card.dataset.stat !== "online") return;
      const valueEl = card.querySelector(".value");
      if (valueEl) animateValue(valueEl, value);
    });
  }

  async function pingVisitor() {
    try {
      const res = await fetch(PING_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ sid: getSessionId() }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.ok && data.online != null) {
        const fmt = Number(data.online).toLocaleString("id-ID");
        updateOnlineCount(fmt);
      }
    } catch (_) {}
  }

  async function fetchStatsPayload() {
    for (let i = 0; i < STATS_URLS.length; i++) {
      const res = await fetch(STATS_URLS[i], { credentials: "same-origin" });
      if (res.ok) return res.json();
    }
    return null;
  }

  async function tick() {
    try {
      const payload = await fetchStatsPayload();
      if (!payload) return;
      const stats = payload && payload.stats ? payload.stats : payload;
      if (stats) updateDOM(stats);

      const now = Date.now();
      if (isHomepage() && (lastPingAt === 0 || now - lastPingAt >= PING_EVERY_MS)) {
        lastPingAt = now;
        pingVisitor();
      }
    } catch (_) {}
  }

  function startPoll() {
    if (pollTimer) return;
    pollTimer = setInterval(tick, POLL_MS);
  }
  function stopPoll() {
    if (!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
  }

  tick();
  startPoll();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopPoll();
      return;
    }
    tick();
    startPoll();
  });
})();
