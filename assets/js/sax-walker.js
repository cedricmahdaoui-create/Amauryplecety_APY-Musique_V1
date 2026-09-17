/* APY Musique — petit saxophoniste silhouette qui marche sur les lignes
   qui délimitent header / fil d'Ariane / pied de page. Pur décor, aucune
   interaction. */
(function () {
  "use strict";

  var figure =
    '<svg viewBox="0 0 40 50" class="sax-walker-figure" aria-hidden="true" focusable="false">' +
      '<g transform="rotate(-8 20 20)">' +
        '<circle cx="22" cy="8" r="5"/>' +
        '<rect x="16" y="12" width="10" height="18" rx="4"/>' +
      '</g>' +
      '<path d="M19,29 L13,37 L16,46 L19,46 L21,37 Z"/>' +
      '<path d="M23,29 L30,35 L28,46 L25,46 L22,37 Z"/>' +
      '<path d="M25,11 Q35,11 35,20 Q35,29 27,33" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' +
      '<circle cx="27" cy="33" r="3.4"/>' +
    '</svg>';

  var placements = [
    { selector: ".site-header", cls: "sax-walker--inline" },
    { selector: "nav.breadcrumb", cls: "sax-walker--inline" },
    { selector: ".site-footer", cls: "sax-walker--footer" }
  ];

  placements.forEach(function (p, i) {
    var host = document.querySelector(p.selector);
    if (!host) return;
    var wrap = document.createElement("div");
    wrap.className = "sax-walker " + p.cls;
    wrap.style.animationDelay = (i * -5.5) + "s";
    wrap.innerHTML = figure;
    host.appendChild(wrap);
  });
})();
