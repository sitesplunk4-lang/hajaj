(function () {
  const roots = document.querySelectorAll("[data-affiliate-lb-live]");
  if (!roots.length) return;

  const fmt = (n) => new Intl.NumberFormat("id-ID").format(Number(n) || 0);

  const onHome = document.body && document.body.dataset && document.body.dataset.homepage === "1";
  const POLL_MS = onHome ? 60000 : 30000;
  let pollTimer = null;

  function medalHtml(rank) {
    if (rank === 1) return '<span class="leaderboard-medal leaderboard-medal--gold">1</span>';
    if (rank === 2) return '<span class="leaderboard-medal leaderboard-medal--silver">2</span>';
    if (rank === 3) return '<span class="leaderboard-medal leaderboard-medal--bronze">3</span>';
    return '<span class="leaderboard-rank-num">' + rank + "</span>";
  }

  function renderRows(root, rows, highlightId) {
    const mod = root.getAttribute("data-lb-class") || "";
    const listClass = "leaderboard affiliate-lb" + (mod ? " " + mod : "");
    if (!rows || !rows.length) {
      root.innerHTML =
        '<p class="affiliate-lb-empty">Belum ada peringkat — ajak referral <strong>beli cookie</strong> untuk masuk leaderboard.</p>';
      return;
    }
    let html = '<div class="' + listClass + '">';
    rows.forEach((entry) => {
      const rank = Number(entry.rank) || 0;
      const uid = Number(entry.user_id) || 0;
      const cookies = Number(entry.cookies_referred ?? entry.points_earned) || 0;
      const points = Number(entry.points_earned) || cookies;
      const masked = String(entry.username_masked || entry.username || "");
      const rankClass = rank <= 3 ? " leaderboard-row--rank-" + rank : "";
      const youClass = highlightId > 0 && uid === highlightId ? " leaderboard-row--you" : "";
      html +=
        '<div class="leaderboard-row' +
        rankClass +
        youClass +
        '">' +
        '<div class="leaderboard-rank" aria-label="Peringkat ' +
        rank +
        '">' +
        medalHtml(rank) +
        "</div>" +
        '<div class="leaderboard-user"><span class="leaderboard-username" title="Affiliate">' +
        masked +
        "</span>" +
        (youClass ? '<span class="affiliate-lb-you">Kamu</span>' : "") +
        "</div>" +
        '<div class="leaderboard-count affiliate-lb-stat"><strong>' +
        fmt(cookies) +
        "</strong><span>cookie · " +
        fmt(points) +
        " poin</span></div></div>";
    });
    html += "</div>";
    root.innerHTML = html;
  }

  async function tick() {
    const limit = 10;
    try {
      const res = await fetch("/api/affiliate-leaderboard.php?limit=" + limit, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.ok || !Array.isArray(data.rows)) return;
      roots.forEach((root) => {
        const highlightId = Number(root.getAttribute("data-highlight-user-id") || "0");
        renderRows(root, data.rows, highlightId);
      });
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
