/* APY Musique — réalisations « avant / après » gérées depuis l'admin.
   Complète la galerie statique de la page sans y toucher. */
(function () {
  "use strict";
  var grid = document.getElementById("galerie-grid");
  if (!grid) return;

  // Comme assets/js/catalogue.js : essaie le .webp d'une photo d'origine
  // (assets/img/xxx.jpg), sinon garde le JPEG. Les photos ajoutées depuis
  // l'admin (media/xxx.jpg) n'ont pas de .webp : on ne tente rien pour elles.
  function setPhoto(img, src) {
    var m = /^(assets\/img\/[A-Za-z0-9._-]+)\.jpe?g$/i.exec(src);
    if (!m) { img.src = src; return; }
    img.onerror = function () { img.onerror = null; img.src = src; };
    img.src = m[1] + ".webp";
  }

  function half(src, label, titre) {
    var div = document.createElement("div");
    div.className = "realisation-half";
    if (src) {
      var img = document.createElement("img");
      img.alt = label + " — " + (titre || "instrument à l'atelier");
      img.loading = "lazy";
      setPhoto(img, src);
      div.appendChild(img);
    }
    var badge = document.createElement("span");
    badge.className = "realisation-badge";
    badge.textContent = label;
    div.appendChild(badge);
    return div;
  }

  function render(realisations) {
    (realisations || []).forEach(function (r) {
      if (!r || (!r.avant && !r.apres)) return;
      var figure = document.createElement("figure");
      figure.className = "gallery-realisation";
      if (r.titre) {
        var title = document.createElement("h3");
        title.className = "realisation-title";
        title.textContent = r.titre;
        figure.appendChild(title);
      }
      var photos = document.createElement("div");
      photos.className = "realisation-photos";
      photos.appendChild(half(r.avant, "Avant", r.titre));
      photos.appendChild(half(r.apres, "Après", r.titre));
      figure.appendChild(photos);
      if (r.texte) {
        var cap = document.createElement("figcaption");
        cap.textContent = r.texte;
        figure.appendChild(cap);
      }
      grid.appendChild(figure);
    });
  }

  fetch("api/catalogue", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error(); return r; })
    .catch(function () { return fetch("assets/data/catalogue.json", { cache: "no-cache" }); })
    .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function (data) { render(data && data.realisations); })
    .catch(function () { /* pas de réalisations à afficher : la galerie statique suffit */ });
})();
