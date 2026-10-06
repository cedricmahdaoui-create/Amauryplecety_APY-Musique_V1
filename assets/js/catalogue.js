/* APY Musique — catalogue filtrable (aucune dépendance externe) */
(function () {
  "use strict";

  var grid = document.getElementById("cat-grid");
  var countEl = document.getElementById("cat-count");
  var emptyEl = document.getElementById("cat-empty");
  var featuredEl = document.getElementById("cat-featured");
  var featuredGrid = document.getElementById("cat-featured-grid");
  if (!grid) return;

  var items = [];
  var lightbox = null;
  var lightboxImg = null;
  var lightboxCounter = null;
  var lightboxPhotos = [];
  var lightboxPosition = 0;

  // Photos du catalogue d origine : version WebP quand elle existe, sinon le JPEG.
  function setPhoto(img, src) {
    var m = /^(assets\/img\/[A-Za-z0-9._-]+)\.jpe?g$/i.exec(src);
    if (!m) { img.src = src; return; }
    img.onerror = function () { img.onerror = null; img.src = src; };
    img.src = m[1] + ".webp";
  }

  function closeLightbox() {
    if (lightbox) { lightbox.hidden = true; document.body.classList.remove("has-lightbox"); }
  }
  function openLightbox(it, photos, position) {
    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.className = "cat-lightbox";
      lightbox.hidden = true;
      lightbox.innerHTML = '<div class="cat-lightbox-backdrop"></div><div class="cat-lightbox-panel" role="dialog" aria-modal="true" aria-label="Photos de l’instrument"><button class="cat-lightbox-close" type="button" aria-label="Fermer">×</button><button class="cat-lightbox-prev" type="button" aria-label="Photo précédente">‹</button><img alt=""><button class="cat-lightbox-next" type="button" aria-label="Photo suivante">›</button><div class="cat-lightbox-counter" aria-live="polite"></div></div>';
      document.body.appendChild(lightbox);
      lightboxImg = lightbox.querySelector("img");
      lightboxCounter = lightbox.querySelector(".cat-lightbox-counter");
      lightbox.querySelector(".cat-lightbox-close").addEventListener("click", closeLightbox);
      lightbox.querySelector(".cat-lightbox-backdrop").addEventListener("click", closeLightbox);
      lightbox.querySelector(".cat-lightbox-prev").addEventListener("click", function () { showLightbox(-1); });
      lightbox.querySelector(".cat-lightbox-next").addEventListener("click", function () { showLightbox(1); });
      document.addEventListener("keydown", function (e) { if (!lightbox || lightbox.hidden) return; if (e.key === "Escape") closeLightbox(); if (e.key === "ArrowLeft") showLightbox(-1); if (e.key === "ArrowRight") showLightbox(1); });
    }
    lightboxPhotos = photos; lightboxPosition = position || 0; lightbox.dataset.name = it.nom; lightbox.hidden = false; document.body.classList.add("has-lightbox"); showLightbox(0);
  }
  function showLightbox(delta) {
    if (!lightboxPhotos.length) return;
    lightboxPosition = (lightboxPosition + delta + lightboxPhotos.length) % lightboxPhotos.length;
    setPhoto(lightboxImg, lightboxPhotos[lightboxPosition]);
    lightboxImg.alt = lightbox.dataset.name + " — photo " + (lightboxPosition + 1);
    lightboxCounter.textContent = (lightboxPosition + 1) + " / " + lightboxPhotos.length;
  }

  var ETAT_LABEL = {
    "disponible": "Disponible",
    "revise": "Révisé, prêt à jouer",
    "a-restaurer": "À restaurer",
    "vendu": "Vendu",
    "piece": "Pièce détachée"
  };
  var FAMILLE_LABEL = {
    "vent": "Instrument à vent",
    "cordes": "Cordes — quatuor",
    "percussion": "Percussion",
    "accessoire": "Accessoire"
  };

  var f = {
    q: document.getElementById("f-q"),
    famille: document.getElementById("f-famille"),
    etat: document.getElementById("f-etat"),
    budget: document.getElementById("f-budget"),
    dispo: document.getElementById("f-dispo")
  };
  var resetBtn = document.getElementById("f-reset");

  function prix(v) {
    if (!v || v <= 0) return "Prix sur demande";
    return v.toLocaleString("fr-FR") + " €";
  }

  function inBudget(v, range) {
    if (!range) return true;
    if (!v || v <= 0) return false; // "prix sur demande" exclu des tranches chiffrées
    var parts = range.split("-");
    var min = parts[0] === "" ? -Infinity : Number(parts[0]);
    var max = parts[1] === "" || parts[1] === undefined ? Infinity : Number(parts[1]);
    return v >= min && v <= max;
  }

  function matches(it) {
    var q = (f.q.value || "").trim().toLowerCase();
    if (q) {
      var hay = (it.nom + " " + (it.sousfamille || "") + " " + (it.desc || "")).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (f.famille.value && it.famille !== f.famille.value) return false;
    if (f.etat.value && it.etat !== f.etat.value) return false;
    if (!inBudget(it.prix, f.budget.value)) return false;
    if (f.dispo.checked && !it.dispo) return false;
    return true;
  }

  function card(it) {
    var el = document.createElement("article");
    el.className = "cat-card" + (it.dispo ? "" : " is-unavailable");

    var media = document.createElement("div");
    media.className = "cat-card-media";
    var photos = [it.photo].concat(Array.isArray(it.photos) ? it.photos : []).filter(function (src, index, all) {
      return typeof src === "string" && src.trim() && all.indexOf(src) === index;
    });
    if (photos.length) {
      var img = document.createElement("img");
      setPhoto(img, photos[0]);
      img.alt = it.nom;
      img.loading = "lazy";
      media.appendChild(img);
      if (photos.length > 1) {
        var position = 0;
        media.classList.add("cat-carousel");
        media.setAttribute("role", "group");
        media.setAttribute("aria-label", "Photos de " + it.nom);
        var controls = document.createElement("div");
        controls.className = "cat-carousel-controls";
        var previous = document.createElement("button");
        previous.type = "button";
        previous.textContent = "‹";
        previous.setAttribute("aria-label", "Photo précédente de " + it.nom);
        var counter = document.createElement("span");
        counter.setAttribute("aria-live", "polite");
        counter.setAttribute("aria-atomic", "true");
        var next = document.createElement("button");
        next.type = "button";
        next.textContent = "›";
        next.setAttribute("aria-label", "Photo suivante de " + it.nom);
        function show(delta) {
          position = (position + delta + photos.length) % photos.length;
          setPhoto(img, photos[position]);
          img.alt = it.nom + " — photo " + (position + 1) + " sur " + photos.length;
          counter.textContent = (position + 1) + " / " + photos.length;
          if (delta) {
            img.classList.remove("cat-slide-next", "cat-slide-prev");
            void img.offsetWidth;
            img.classList.add(delta > 0 ? "cat-slide-next" : "cat-slide-prev");
          }
        }
        previous.addEventListener("click", function () { show(-1); });
        next.addEventListener("click", function () { show(1); });
        controls.append(previous, counter, next);
        media.appendChild(controls);
        media.addEventListener("keydown", function (event) {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            show(event.key === "ArrowLeft" ? -1 : 1);
          }
        });
        var touchStart;
        var hoverTimer;
        media.addEventListener("mouseenter", function () { hoverTimer = setInterval(function () { show(1); }, 1800); });
        media.addEventListener("mouseleave", function () { clearInterval(hoverTimer); hoverTimer = null; });
        media.addEventListener("click", function (event) { if (event.target.closest("button")) return; openLightbox(it, photos, position); });
        media.setAttribute("tabindex", "0");
        media.addEventListener("touchstart", function (event) {
          touchStart = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
        }, { passive: true });
        media.addEventListener("touchend", function (event) {
          if (!touchStart) return;
          var dx = event.changedTouches[0].clientX - touchStart.x;
          var dy = event.changedTouches[0].clientY - touchStart.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(dx < 0 ? 1 : -1);
          touchStart = null;
        }, { passive: true });
        show(0);
      }
    } else {
      var ph = document.createElement("div");
      ph.className = "placeholder";
      ph.setAttribute("role", "img");
      ph.setAttribute("aria-label", "Photo à venir — " + it.nom);
      var logo = document.createElement("img");
      logo.className = "cat-placeholder-logo";
      logo.src = "assets/img/logo-apy.png";
      logo.alt = "";
      ph.appendChild(logo);
      media.appendChild(ph);
    }
    var badge = document.createElement("span");
    badge.className = "cat-badge" + (it.dispo ? " cat-badge--ok" : "");
    badge.textContent = it.dispo ? "Disponible" : "Indisponible / sur demande";
    media.appendChild(badge);
    el.appendChild(media);

    var body = document.createElement("div");
    body.className = "cat-card-body";

    var bits = [];
    if (it.sousfamille) bits.push(it.sousfamille);
    if (ETAT_LABEL[it.etat]) bits.push(ETAT_LABEL[it.etat]);
    if (it.annee) bits.push(it.annee);
    if (bits.length) {
      var meta = document.createElement("p");
      meta.className = "cat-card-meta";
      meta.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 19a3 3 0 1 1-2-2.83V4.3a1 1 0 0 1 .78-.97l9-2A1 1 0 0 1 18 2.3V15a3 3 0 1 1-2-2.83V6.1l-7 1.56Z"/></svg>';
      meta.appendChild(document.createTextNode(bits.join(" · ")));
      body.appendChild(meta);
    }

    var h = document.createElement("h3");
    h.textContent = it.nom;
    body.appendChild(h);

    if (it.desc) {
      var d = document.createElement("p");
      d.className = "cat-card-desc";
      d.textContent = it.desc;
      body.appendChild(d);
      var more = document.createElement("button");
      more.type = "button";
      more.className = "cat-card-more";
      more.textContent = "Voir plus";
      more.hidden = true;
      more.setAttribute("aria-label", "Voir l’annonce complète : " + it.nom);
      more.addEventListener("click", function () { openDetail(it, photos, bits); });
      body.appendChild(more);
    }

    var foot = document.createElement("div");
    foot.className = "cat-card-foot";
    var p = document.createElement("span");
    p.className = "cat-card-price";
    p.textContent = it.prix > 0 ? prix(it.prix) : "Prix sur demande";
    foot.appendChild(p);
    var a = document.createElement("a");
    a.className = "btn btn--ghost";
    a.href = "/?instrument=" + encodeURIComponent(it.nom) + "#contact";
    a.textContent = "Réserver un essai";
    a.addEventListener("click", function (e) { reserve(e, it); });
    foot.appendChild(a);
    body.appendChild(foot);

    el.appendChild(body);
    return el;
  }

  function render() {
    var list = items.filter(matches);
    if (featuredEl && featuredGrid) {
      var featured = items.filter(function (it) { return it.featured && matches(it); });
      featuredGrid.innerHTML = "";
      featured.forEach(function (it) { featuredGrid.appendChild(card(it)); });
      featuredEl.hidden = featured.length === 0;
    }
    grid.innerHTML = "";
    list.forEach(function (it) { grid.appendChild(card(it)); });

    countEl.textContent = "";
    emptyEl.hidden = list.length !== 0;
    grid.hidden = list.length === 0;

    syncMoreButtons();
    syncUrl();
  }

  // « Voir plus » seulement quand la description dépasse les 4 lignes affichées.
  function syncMoreButtons() {
    document.querySelectorAll(".cat-card-more").forEach(function (btn) {
      var desc = btn.previousElementSibling;
      btn.hidden = desc.scrollHeight <= desc.clientHeight + 1;
    });
  }
  var resizeTimer;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(syncMoreButtons, 150); });

  // Ouvre le formulaire « Écrire à l'atelier » pré-rempli pour cet instrument.
  function reserve(e, it) {
    if (!window.apyOpenContact || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    e.preventDefault();
    var details = [it.sousfamille, it.annee, it.prix > 0 ? prix(it.prix) : ""].filter(Boolean).join(", ");
    window.apyOpenContact({
      objet: "Réserver un essai",
      message: "Je souhaite réserver un essai pour l'instrument : " + it.nom + (details ? " (" + details + ")" : "") + ".\n"
    });
    return true;
  }

  /* ----- Annonce détaillée (modale) ----- */
  var detail = null;
  function openDetail(it, photos, bits) {
    if (!detail) {
      detail = document.createElement("dialog");
      detail.className = "editeur-dialog cat-detail";
      detail.setAttribute("aria-labelledby", "cat-detail-title");
      detail.innerHTML = '<button type="button" class="editeur-dialog-close" aria-label="Fermer">×</button>' +
        '<div class="cat-detail-media"><img alt=""><div class="cat-carousel-controls"><button type="button" class="cat-detail-prev" aria-label="Photo précédente">‹</button><span aria-live="polite"></span><button type="button" class="cat-detail-next" aria-label="Photo suivante">›</button></div></div>' +
        '<p class="cat-card-meta"></p><h2 id="cat-detail-title"></h2><p class="cat-detail-desc"></p>' +
        '<div class="cat-card-foot"><span class="cat-card-price"></span><a class="btn"></a></div>';
      document.body.appendChild(detail);
      detail.querySelector(".editeur-dialog-close").addEventListener("click", function () { detail.close(); });
      detail.addEventListener("click", function (e) { if (e.target === detail) detail.close(); });
      detail.querySelector(".cat-detail-prev").addEventListener("click", function () { detail.step(-1); });
      detail.querySelector(".cat-detail-next").addEventListener("click", function () { detail.step(1); });
    }
    var img = detail.querySelector(".cat-detail-media img");
    var counter = detail.querySelector(".cat-detail-media span");
    var position = 0;
    detail.step = function (delta) {
      position = (position + delta + photos.length) % photos.length;
      setPhoto(img, photos[position]);
      img.alt = it.nom + " — photo " + (position + 1) + " sur " + photos.length;
      counter.textContent = (position + 1) + " / " + photos.length;
    };
    detail.querySelector(".cat-detail-media").hidden = !photos.length;
    detail.querySelector(".cat-carousel-controls").hidden = photos.length < 2;
    if (photos.length) detail.step(0);
    detail.querySelector(".cat-card-meta").textContent = bits.join(" · ");
    detail.querySelector("h2").textContent = it.nom;
    detail.querySelector(".cat-detail-desc").textContent = it.desc || "";
    detail.querySelector(".cat-card-price").textContent = it.prix > 0 ? prix(it.prix) : "Prix sur demande";
    var link = detail.querySelector(".cat-card-foot .btn");
    link.href = "/?instrument=" + encodeURIComponent(it.nom) + "#contact";
    link.textContent = "Réserver un essai";
    link.onclick = function (e) { if (reserve(e, it)) detail.close(); };
    detail.showModal();
    detail.scrollTop = 0;
  }

  /* ----- Synchronisation légère avec l'URL (partage / retour arrière) ----- */
  function syncUrl() {
    var p = new URLSearchParams();
    if (f.q.value.trim()) p.set("q", f.q.value.trim());
    if (f.famille.value) p.set("famille", f.famille.value);
    if (f.etat.value) p.set("etat", f.etat.value);
    if (f.budget.value) p.set("budget", f.budget.value);
    if (f.dispo.checked) p.set("dispo", "1");
    var qs = p.toString();
    history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  }

  function readUrl() {
    var p = new URLSearchParams(location.search);
    if (p.has("q")) f.q.value = p.get("q");
    if (p.has("famille")) f.famille.value = p.get("famille");
    if (p.has("etat")) f.etat.value = p.get("etat");
    if (p.has("budget")) f.budget.value = p.get("budget");
    if (p.get("dispo") === "1") f.dispo.checked = true;
  }

  Object.keys(f).forEach(function (k) {
    f[k].addEventListener(f[k].type === "search" ? "input" : "change", render);
  });
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      f.q.value = ""; f.famille.value = ""; f.etat.value = "";
      f.budget.value = ""; f.dispo.checked = false;
      render();
    });
  }

  /* ----- Chargement des données ----- */
  countEl.textContent = "Chargement du catalogue…";

  /* Données : fichier statique du catalogue. */
  fetch("assets/data/catalogue.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r; })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      items = Array.isArray(data) ? data : (data && data.instruments) || [];
      (Array.isArray(data.families) ? data.families : []).forEach(function (family) {
        if (!family || typeof family.id !== 'string' || typeof family.label !== 'string') return;
        if (!Array.from(f.famille.options).some(function (option) { return option.value === family.id; })) f.famille.add(new Option(family.label, family.id));
      });
      items.forEach(function (it) { if (it.famille && !Array.from(f.famille.options).some(function (option) { return option.value === it.famille; })) f.famille.add(new Option(it.famille, it.famille)); });
      readUrl();
      render();
    })
    .catch(function () {
      countEl.textContent = "";
      grid.hidden = true;
      emptyEl.hidden = false;
      emptyEl.textContent = "Le catalogue est momentanément indisponible. ";
      var a = document.createElement("a");
      a.href = "/#contact";
      a.textContent = "Contactez-nous pour connaître le stock du moment.";
      emptyEl.appendChild(a);
    });
})();
