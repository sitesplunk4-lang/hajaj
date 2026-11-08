(function () {
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  if (!toggle || !links) return;

  function setOpen(open) {
    links.classList.toggle("open", open);
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
    document.body.classList.toggle("nav-menu-open", open);
  }

  toggle.addEventListener("click", function () {
    setOpen(!links.classList.contains("open"));
  });

  links.querySelectorAll("a[href]").forEach(function (a) {
    a.addEventListener("click", function () {
      if (window.matchMedia("(max-width: 768px)").matches) {
        setOpen(false);
      }
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && links.classList.contains("open")) {
      setOpen(false);
    }
  });

  window.addEventListener(
    "resize",
    function () {
      if (window.matchMedia("(min-width: 769px)").matches && links.classList.contains("open")) {
        setOpen(false);
      }
    },
    { passive: true }
  );
})();
