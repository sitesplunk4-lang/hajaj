(function () {
  function shouldLoad3d() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (window.matchMedia("(max-width: 900px)").matches) return false;
    if (typeof navigator !== "undefined" && navigator.connection) {
      var et = navigator.connection.effectiveType;
      if (et === "slow-2g" || et === "2g" || et === "3g") return false;
    }
    return true;
  }

  if (!shouldLoad3d()) {
    var canvas = document.getElementById("canvas-bg");
    if (canvas) canvas.remove();
    return;
  }

  var bgSrc = document.body && document.body.getAttribute("data-bg3d-src");
  if (!bgSrc) return;

  function loadBg3d() {
    var s = document.createElement("script");
    s.src = bgSrc;
    s.async = true;
    document.body.appendChild(s);
  }

  function loadThreeThenBg() {
    if (typeof THREE !== "undefined") {
      loadBg3d();
      return;
    }
    var three = document.createElement("script");
    three.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    three.async = true;
    three.onload = loadBg3d;
    document.body.appendChild(three);
  }

  function schedule() {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(loadThreeThenBg, { timeout: 3000 });
    } else {
      setTimeout(loadThreeThenBg, 800);
    }
  }

  if (document.readyState === "complete") {
    schedule();
  } else {
    window.addEventListener("load", schedule, { once: true });
  }
})();
