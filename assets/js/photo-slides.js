/* Photos qui défilent : au survol / focus (souris), au toucher (mobile). */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".story-slides, .service-slides").forEach(function (box) {
    var pics = box.querySelectorAll("picture");
    var dots = box.querySelectorAll(".story-slides-dots i");
    var bubble = box.parentElement && box.parentElement.querySelector(".service-bubble");
    var current = 0, timer = null;
    function show(n) {
      current = (n + pics.length) % pics.length;
      pics.forEach(function (p, i) { p.classList.toggle("is-active", i === current); });
      dots.forEach(function (d, i) { d.classList.toggle("is-active", i === current); });
      var text = pics[current] && pics[current].getAttribute("data-bubble");
      if (bubble && text) bubble.textContent = text;
    }
    function start() { if (reduce || timer) return; timer = setInterval(function () { show(current + 1); }, 1700); show(current + 1); }
    function stop() { clearInterval(timer); timer = null; show(0); }
    show(0);
    var zone = box.closest(".service") || box;
    zone.addEventListener("mouseenter", start);
    zone.addEventListener("mouseleave", stop);
    box.addEventListener("focus", start);
    box.addEventListener("blur", stop);
    box.addEventListener("click", function () { if (!timer) show(current + 1); });
  });
})();
