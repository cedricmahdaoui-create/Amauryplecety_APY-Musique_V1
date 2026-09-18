/* APY Musique — éditeur de catalogue (hors ligne, aucun backend).
   Charge assets/data/catalogue.json, laisse modifier, régénère le fichier. */
(function () {
  "use strict";

  var KEYS = ["nom", "famille", "sousfamille", "etat", "prix", "dispo", "featured", "annee", "photo", "photos", "desc"];
  var listEl = document.getElementById("a-list");
  var tpl = document.getElementById("a-item-tpl");
  var countEl = document.getElementById("a-count");
  var statusEl = document.getElementById("a-status");
  var jsonEl = document.getElementById("a-json");

  var items = [];
  var articles = [];
  var news = document.createElement('section');
  news.className = 'admin-news';
  news.innerHTML = '<h2>Gérer À la une</h2><p>Ajoutez vos nouveautés et articles. Cochez « Publier » pour les afficher, puis enregistrez les modifications.</p><button type="button" class="btn" data-news-add>Ajouter une actualité</button><div data-news-list></div><button type="button" class="btn" data-news-save>Enregistrer les modifications</button> <a href="a-la-une.html" target="_blank">Voir À la une</a>';
  listEl.before(news);
  function renderNews() {
    var list = news.querySelector('[data-news-list]');
    list.replaceChildren();
    if (!articles.length) { var empty = document.createElement('p'); empty.className = 'admin-news-empty'; empty.textContent = 'Aucune actualité. Cliquez sur Ajouter une actualité pour commencer.'; list.appendChild(empty); }
    articles.forEach(function (article, index) {
      var row = document.createElement('div');
      row.className = 'admin-news-card';
      row.innerHTML = '<label>Titre<input data-field="title" maxlength="180"></label><label>Date<input type="date" data-field="date"></label><label>Texte<textarea rows="6" data-field="text"></textarea></label><label>Photo<input type="file" accept="image/jpeg,image/png,image/webp" data-news-photo></label><img class="admin-news-preview" alt="Aperçu de la photo" hidden><label><input type="checkbox" data-field="published"> Publier</label><button type="button" data-news-remove>Supprimer cette actualité</button>';
      var heading = document.createElement('h3'); heading.textContent = 'Actualité ' + (index + 1); row.prepend(heading);
      row.querySelectorAll('[data-field]').forEach(function (input) {
        var key = input.dataset.field;
        if (key === 'published') input.checked = article[key] === true; else input.value = article[key] || '';
        input.addEventListener('input', function () { article[key] = key === 'published' ? input.checked : input.value; dirty = true; refreshMeta(); });
      });
      var preview = row.querySelector('img');
      if (article.photo) { preview.src = article.photo; preview.hidden = false; }
      row.querySelector('[data-news-photo]').addEventListener('change', function (event) {
        var file = event.target.files[0]; if (!file) return;
        var reader = new FileReader();
        reader.onload = function () { article.photo = reader.result; preview.src = article.photo; preview.hidden = false; dirty = true; refreshMeta(); };
        reader.onerror = function () { status('Impossible de lire cette photo.', 'warn'); };
        reader.readAsDataURL(file);
      });
      row.querySelector('[data-news-remove]').addEventListener('click', function () { if (!confirm('Supprimer cette actualité ?')) return; articles.splice(index, 1); dirty = true; renderNews(); refreshMeta(); });
      list.appendChild(row);
    });
  }
  news.querySelector('[data-news-add]').addEventListener('click', function () { articles.push({ title: '', text: '', date: new Date().toISOString().slice(0, 10), published: false, photo: '' }); dirty = true; renderNews(); refreshMeta(); });
  news.querySelector('[data-news-save]').addEventListener('click', function () { document.getElementById('a-save').click(); statusEl.scrollIntoView({ block: 'center' }); });
  var families = [];
  var defaults = Array.from(tpl.content.querySelector('[data-k="famille"]').options).map(function (o) { return { id: o.value, label: o.textContent }; });
  families = defaults.slice();
  function fillFamilies(select, value) {
    select.replaceChildren();
    families.forEach(function (family) { select.add(new Option(family.label, family.id)); });
    select.value = value;
  }
  var familyForm = document.createElement('form');
  familyForm.className = 'admin-family-form';
  familyForm.innerHTML = '<h2>Familles d’instruments</h2><label for="a-family-name">Nouvelle famille</label><input id="a-family-name" required maxlength="80" placeholder="Ex. : Claviers"><button class="btn" type="submit">Ajouter la famille</button><p>Après ajout, choisissez la famille sur vos instruments puis cliquez sur « Enregistrer sur le site ».</p><p id="a-families-list"></p>';
  listEl.before(familyForm);
  function familySummary() { familyForm.querySelector('#a-families-list').textContent = families.map(function (f) { return f.label; }).join(' · '); }
  familyForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var input = familyForm.querySelector('input');
    var label = input.value.trim().replace(/\s+/g, ' ');
    if (!label) return;
    if (families.some(function (f) { return f.label.toLocaleLowerCase('fr') === label.toLocaleLowerCase('fr'); })) { status('Cette famille existe déjà.', 'warn'); return; }
    var base = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'famille';
    var id = base, suffix = 2;
    while (families.some(function (f) { return f.id === id; })) id = base + '-' + suffix++;
    families.push({ id: id, label: label });
    listEl.querySelectorAll('[data-k="famille"]').forEach(function (select) { fillFamilies(select, select.value); });
    dirty = true; collect(); familySummary(); input.value = '';
    status('Famille ajoutée. Cliquez sur Enregistrer sur le site pour la conserver.', 'ok');
  });
  var dirty = false;

  function blank() {
    return { nom: "", famille: "vent", sousfamille: "", etat: "revise", prix: 0, dispo: true, annee: "", photo: "", desc: "" };
  }

  function status(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.className = "admin-status" + (kind ? " admin-status--" + kind : "");
  }

  /* ----- Lecture des champs d'une carte -> objet ----- */
  function readCard(card) {
    var o = {};
    KEYS.forEach(function (k) {
      var el = card.querySelector('[data-k="' + k + '"]');
      if (!el) return;
      if (k === "dispo" || k === "featured") o[k] = el.checked;
      else if (k === "prix") o[k] = Math.max(0, parseInt(el.value, 10) || 0);
      else if (k === "photos") o[k] = el.value.split(/\r?\n/).map(function (p) { return p.trim(); }).filter(Boolean);
      else o[k] = el.value.trim();
    });
    return o;
  }

  function collect() {
    items = [].map.call(listEl.querySelectorAll(".admin-item"), readCard);
    refreshMeta();
  }

  function refreshMeta() {
    countEl.textContent = items.length + (items.length > 1 ? " instruments" : " instrument");
    jsonEl.textContent = JSON.stringify({ instruments: items, families: families, articles: articles }, null, 2);
  }

  /* ----- Construction d'une carte ----- */
  function buildCard(data) {
    var frag = tpl.content.cloneNode(true);
    var card = frag.querySelector(".admin-item");
    fillFamilies(card.querySelector('[data-k="famille"]'), data.famille || 'vent');
    var photoField = card.querySelector('[data-k="photo"]');
    var photoLabel = document.createElement("label");
    photoLabel.className = "admin-wide";
    photoLabel.textContent = "Photos supplémentaires du même instrument — une adresse ou un chemin par ligne";
    var photoList = document.createElement("textarea");
    photoList.dataset.k = "photos";
    photoList.rows = 3;
    photoList.placeholder = "assets/img/instrument-detail.jpg\nassets/img/instrument-dos.jpg";
    photoLabel.appendChild(photoList);
    photoField.closest("label").after(photoLabel);
    var upload = card.querySelector("[data-upload]");

    KEYS.forEach(function (k) {
      var el = card.querySelector('[data-k="' + k + '"]');
      if (!el) return;
      if (k === "dispo") el.checked = data[k] !== false;
      else if (k === "featured") el.checked = data[k] === true;
      else if (k === "photos") el.value = Array.isArray(data.photos) ? data.photos.join("\n") : "";
      else el.value = data[k] != null ? data[k] : "";
    });

    var wrap = card.querySelector(".admin-preview");
    var previewOverrides = {}; // chemin -> blob URL, pour les photos pas encore écrites sur disque
    var MAX_EXTRA_PHOTOS = 4;
    function deleteFileOnDisk(pathOrUri) {
      if (!pathOrUri || pathOrUri.indexOf("data:") === 0) return;
      var name = pathOrUri.split("/").pop();
      fetch("/api/delete-photo?name=" + encodeURIComponent(name), { method: "POST" }).catch(function () {});
    }
    function removePhoto(index) {
      var mainField = card.querySelector('[data-k="photo"]');
      var extraLines = photoList.value.split(/\r?\n/).map(function (p) { return p.trim(); }).filter(Boolean);
      var removed;
      if (index === 0) {
        removed = mainField.value.trim();
        mainField.value = extraLines.length ? extraLines.shift() : "";
      } else {
        removed = extraLines.splice(index - 1, 1)[0];
      }
      photoList.value = extraLines.join("\n");
      delete previewOverrides[removed];
      deleteFileOnDisk(removed);
      renderGallery();
      dirty = true;
      collect();
    }
    function renderGallery() {
      var mainPath = card.querySelector('[data-k="photo"]').value.trim();
      var extra = photoList.value.split(/\r?\n/).map(function (p) { return p.trim(); }).filter(Boolean).slice(0, MAX_EXTRA_PHOTOS);
      wrap.innerHTML = "";
      var all = [];
      if (mainPath) all.push({ src: mainPath, label: "Principale" });
      extra.forEach(function (p, i) { all.push({ src: p, label: "Photo " + (i + 2) }); });
      if (!all.length) { wrap.hidden = true; return; }
      wrap.hidden = false;
      all.forEach(function (item, index) {
        var fig = document.createElement("figure");
        fig.className = "admin-preview-item";
        var media = document.createElement("div");
        media.className = "admin-preview-item-media";
        var img = document.createElement("img");
        img.src = previewOverrides[item.src] || item.src;
        img.alt = "";
        var del = document.createElement("button");
        del.type = "button";
        del.className = "admin-preview-del";
        del.textContent = "✕";
        del.setAttribute("aria-label", "Supprimer " + item.label.toLowerCase());
        del.addEventListener("click", function () {
          if (confirm("Supprimer cette photo ?")) removePhoto(index);
        });
        media.appendChild(img);
        media.appendChild(del);
        var cap = document.createElement("figcaption");
        cap.textContent = item.label;
        fig.appendChild(media);
        fig.appendChild(cap);
        wrap.appendChild(fig);
      });
    }
    renderGallery();
    function slugify(s) {
      return (s || "instrument").normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "instrument";
    }

    upload.addEventListener("change", function () {
      var files = Array.prototype.slice.call(upload.files || []);
      if (!files.length) return;
      var baseName = slugify(card.querySelector('[data-k="nom"]').value);
      var startIndex = Date.now() % 100000;
      Promise.all(files.map(function (file, i) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function () {
            var image = new Image();
            image.onload = function () {
              // Redimensionne en conservant les proportions (pas de recadrage,
              // pas de fond ajouté : la photo garde son arrière-plan d'origine).
              var maxEdge = 1400;
              var scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
              var width = Math.round(image.width * scale), height = Math.round(image.height * scale);
              var canvas = document.createElement("canvas");
              canvas.width = width; canvas.height = height;
              var ctx = canvas.getContext("2d");
              // Le JPEG n'a pas de canal alpha : une zone transparente de la
              // photo source (PNG, capture d'écran) s'exporterait en noir sans
              // ce remplissage de secours.
              ctx.fillStyle = "#fff";
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(image, 0, 0, width, height);
              var filename = baseName + "-" + (startIndex + i) + ".jpg";
              canvas.toBlob(function (blob) {
                if (!blob) { reject(new Error("toBlob a échoué")); return; }
                var blobUrl = URL.createObjectURL(blob);
                fetch("/api/upload-photo?name=" + encodeURIComponent(filename), { method: "POST", body: blob })
                  .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)); })
                  .then(function () {
                    resolve({ path: "assets/img/" + filename, blobUrl: blobUrl, saved: true });
                  })
                  .catch(function () {
                    // Pas de serveur local (site ouvert en statique) : on retombe
                    // sur le téléchargement manuel du fichier.
                    var a = document.createElement("a");
                    a.href = blobUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    resolve({ path: "assets/img/" + filename, blobUrl: blobUrl, saved: false });
                  });
              }, "image/jpeg", .85);
            };
            image.onerror = reject; image.src = reader.result;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })).then(function (results) {
        results.forEach(function (r) {
          if (!r.saved) previewOverrides[r.path] = r.blobUrl;
        });
        var mainPhoto = card.querySelector('[data-k="photo"]');
        var extra = results.slice();
        if (!mainPhoto.value.trim() && extra.length) {
          var first = extra.shift();
          mainPhoto.value = first.path;
        }
        var existing = photoList.value.split(/\r?\n/).map(function (p) { return p.trim(); }).filter(Boolean);
        photoList.value = existing.concat(extra.map(function (r) { return r.path; })).join("\n");
        renderGallery();
        dirty = true;
        collect();
        var allSaved = results.every(function (r) { return r.saved; });
        if (allSaved) {
          status(results.length + " photo(s) enregistrée(s) automatiquement dans assets/img/. Cliquez sur « Enregistrer sur le site » pour publier.", "ok");
        } else {
          status(results.length + " photo(s) téléchargée(s) (voir le dossier Téléchargements) — placez-les dans assets/img/ avant de redéployer le site. L'aperçu ci-dessus est temporaire.", "ok");
        }
      }).catch(function (err) { status("Impossible de traiter une des photos sélectionnées : " + (err && err.message ? err.message : err), "warn"); });
    });

    card.addEventListener("input", function (e) {
      if (e.target.dataset.k === "photo" || e.target.dataset.k === "photos") renderGallery();
      dirty = true;
      collect();
    });
    card.addEventListener("change", function (e) {
      if (e.target.dataset.k === "photo" || e.target.dataset.k === "photos") renderGallery();
      dirty = true;
      collect();
    });

    card.querySelector('[data-act="del"]').addEventListener("click", function () {
      if (confirm("Retirer « " + (card.querySelector('[data-k="nom"]').value || "cet instrument") + " » ?")) {
        card.remove();
        dirty = true;
        collect();
      }
    });
    card.querySelector('[data-act="up"]').addEventListener("click", function () {
      var prev = card.previousElementSibling;
      if (prev) { listEl.insertBefore(card, prev); dirty = true; collect(); }
    });
    card.querySelector('[data-act="down"]').addEventListener("click", function () {
      var next = card.nextElementSibling;
      if (next) { listEl.insertBefore(next, card); dirty = true; collect(); }
    });

    return card;
  }

  function render(list) {
    listEl.innerHTML = "";
    list.forEach(function (d) { listEl.appendChild(buildCard(d)); });
    collect();
  }

  /* ----- Chargement ----- */
  function load() {
    status("Chargement du catalogue en ligne…");
    fetch("assets/data/catalogue.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var arr = Array.isArray(data) ? data : (data && data.instruments) || [];
        articles = Array.isArray(data.articles) ? data.articles : [];
        renderNews();
        families = defaults.map(function (f) { return { id: f.id, label: f.label }; });
        (Array.isArray(data.families) ? data.families : []).forEach(function (f) { if (f && typeof f.id === 'string' && typeof f.label === 'string' && !families.some(function (known) { return known.id === f.id; })) families.push(f); });
        arr.forEach(function (it) { if (it.famille && !families.some(function (f) { return f.id === it.famille; })) families.push({ id: it.famille, label: it.famille }); });
        familySummary();
        render(arr);
        dirty = false;
        status(arr.length + " instrument(s) chargé(s).", "ok");
      })
      .catch(function () {
        render([blank()]);
        status("Impossible de charger le catalogue existant — nouveau catalogue vierge.", "warn");
      });
  }

  /* ----- Actions globales ----- */
  document.getElementById("a-add").addEventListener("click", function () {
    var card = buildCard(blank());
    listEl.appendChild(card);
    dirty = true;
    collect();
    card.querySelector('[data-k="nom"]').focus();
    card.scrollIntoView({ block: "center", behavior: "smooth" });
  });

  document.getElementById("a-reload").addEventListener("click", function () {
    if (confirm("Recharger depuis le site ? Les modifications non enregistrées seront perdues.")) load();
  });

  document.getElementById("a-save").addEventListener("click", function () {
    collect();
    status("Enregistrement en cours…");
    fetch("/api/catalogue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instruments: items, families: families, articles: articles }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function () { dirty = false; status("Catalogue enregistré sur le site.", "ok"); })
      .catch(function () { status("Enregistrement automatique indisponible. Réessayez ou rechargez la page.", "warn"); });
  });

  var downloadBtn = document.getElementById("a-download");
  if (downloadBtn) downloadBtn.addEventListener("click", function () {
    collect();
    var blob = new Blob([JSON.stringify({ instruments: items, families: families, articles: articles }, null, 2) + "\n"], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "catalogue.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    status("Fichier catalogue.json généré. À placer dans assets/data/ du site.", "ok");
  });

  var copyBtn = document.getElementById("a-copy");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    collect();
    var txt = JSON.stringify({ instruments: items, families: families, articles: articles }, null, 2) + "\n";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(
        function () { status("Contenu copié dans le presse‑papiers.", "ok"); },
        function () { fallbackCopy(txt); }
      );
    } else { fallbackCopy(txt); }
  });

  function fallbackCopy(txt) {
    var ta = document.createElement("textarea");
    ta.value = txt;
    ta.setAttribute("readonly", "");
    ta.className = "admin-hidden-ta";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); status("Contenu copié.", "ok"); }
    catch (e) { status("Copie impossible — utilisez « Télécharger ».", "warn"); }
    ta.remove();
  }

  /* Avertir avant de quitter avec des modifs */
  window.addEventListener("beforeunload", function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ""; }
  });

  load();
})();
