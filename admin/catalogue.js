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

  /* ----- Accès : mot de passe demandé seulement sur le site en ligne ----- */
  var PW_KEY = "apy-admin-pw";
  var password = "";
  try { password = sessionStorage.getItem(PW_KEY) || ""; } catch (e) { /* stockage indisponible */ }
  var loginPromise = null;

  function askPassword(message) {
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.className = "admin-login";
      overlay.innerHTML = '<form class="admin-login-box"><h2>Espace administration</h2><p class="admin-login-msg" role="alert"></p><label>Mot de passe<input type="password" autocomplete="current-password" required></label><button class="btn" type="submit">Se connecter</button><a class="admin-login-back" href="index.html">Retour au site</a></form>';
      overlay.querySelector(".admin-login-msg").textContent = message || "Saisissez le mot de passe pour continuer.";
      document.body.appendChild(overlay);
      var input = overlay.querySelector("input");
      input.focus();
      overlay.querySelector("form").addEventListener("submit", function (e) {
        e.preventDefault();
        password = input.value;
        try { sessionStorage.setItem(PW_KEY, password); } catch (err) { /* ignoré */ }
        overlay.remove();
        resolve();
      });
    });
  }

  function api(path, options) {
    options = options || {};
    var headers = {};
    Object.keys(options.headers || {}).forEach(function (k) { headers[k] = options.headers[k]; });
    if (password) headers.Authorization = "Bearer " + password;
    return fetch(path, Object.assign({}, options, { headers: headers })).then(function (r) {
      if (r.status !== 401) return r;
      var wasSent = !!headers.Authorization;
      password = "";
      try { sessionStorage.removeItem(PW_KEY); } catch (e) { /* ignoré */ }
      if (!loginPromise) {
        loginPromise = askPassword(wasSent ? "Mot de passe incorrect." : "").then(function () { loginPromise = null; });
      }
      return loginPromise.then(function () { return api(path, options); });
    });
  }

  function apiError(r) {
    return r.json().catch(function () { return {}; }).then(function (b) {
      var e = new Error(b.error || ("Erreur " + r.status));
      e.status = r.status;
      return Promise.reject(e);
    });
  }

  /* ----- Traitement d'une photo : redimensionnement, filigrane, envoi ----- */
  function drawWatermark(ctx, width, height) {
    var fontSize = Math.max(16, Math.round(width * 0.026));
    var text = "© APY Musique";
    ctx.font = fontSize + "px Georgia, 'Times New Roman', serif";
    var padX = Math.round(fontSize * 0.7), padY = Math.round(fontSize * 0.5);
    var boxW = Math.round(ctx.measureText(text).width + padX * 2), boxH = fontSize + padY * 2;
    var margin = Math.round(width * 0.02);
    var x = width - boxW - margin, y = height - boxH - margin, r = Math.round(boxH * 0.22);
    ctx.fillStyle = "rgba(0,0,0,.42)";
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + boxW, y, x + boxW, y + boxH, r);
    ctx.arcTo(x + boxW, y + boxH, x, y + boxH, r);
    ctx.arcTo(x, y + boxH, x, y, r);
    ctx.arcTo(x, y, x + boxW, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + boxW / 2, y + boxH / 2);
  }

  function processImage(file, baseName, index) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Lecture de la photo impossible.")); };
      reader.onload = function () {
        var image = new Image();
        image.onerror = function () { reject(new Error("Ce fichier n'est pas une image lisible.")); };
        image.onload = function () {
          // Redimensionne en conservant les proportions (pas de recadrage).
          var maxEdge = 1400;
          var scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
          var width = Math.round(image.width * scale), height = Math.round(image.height * scale);
          var canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          var ctx = canvas.getContext("2d");
          // Le JPEG n'a pas de canal alpha : sans ce fond, une zone transparente
          // (PNG, capture d'écran) s'exporterait en noir.
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);
          drawWatermark(ctx, width, height);
          var filename = baseName + "-" + ((Date.now() + index) % 100000) + ".jpg";
          canvas.toBlob(function (blob) {
            if (!blob) { reject(new Error("Export de la photo impossible.")); return; }
            var blobUrl = URL.createObjectURL(blob);
            api("/api/upload-photo?name=" + encodeURIComponent(filename), { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob })
              .then(function (r) { return r.ok ? r.json() : apiError(r); })
              .then(function (res) { resolve({ path: res.path || ("assets/img/" + filename), blobUrl: blobUrl, saved: true }); })
              .catch(function (err) {
                // Pas de serveur d'enregistrement (site ouvert en statique) : téléchargement manuel.
                if (err && err.status && [404, 405, 501].indexOf(err.status) === -1) { reject(err); return; }
                var a = document.createElement("a");
                a.href = blobUrl; a.download = filename;
                document.body.appendChild(a); a.click(); a.remove();
                resolve({ path: "assets/img/" + filename, blobUrl: blobUrl, saved: false });
              });
          }, "image/jpeg", .85);
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  var items = [];
  var articles = [];
  var MAX_ARTICLES = 4;
  var news = document.createElement('section');
  news.className = 'admin-news';
  news.innerHTML = '<h2>Gérer À la une</h2><p>Ajoutez vos nouveautés et articles — 4 au maximum. Cochez « Publier » pour les afficher, puis enregistrez les modifications.</p><button type="button" class="btn" data-news-add>Ajouter une actualité</button><p data-news-limit hidden>Maximum de 4 actualités atteint — supprimez-en une pour en ajouter une nouvelle.</p><div data-news-list></div><button type="button" class="btn" data-news-save>Enregistrer les modifications</button> <a href="index.html#a-la-une" target="_blank">Voir À la une</a>';
  listEl.before(news);
  function renderNews() {
    var addBtn = news.querySelector('[data-news-add]');
    var limitNote = news.querySelector('[data-news-limit]');
    addBtn.disabled = articles.length >= MAX_ARTICLES;
    limitNote.hidden = articles.length < MAX_ARTICLES;
    var list = news.querySelector('[data-news-list]');
    list.replaceChildren();
    if (!articles.length) { var empty = document.createElement('p'); empty.className = 'admin-news-empty'; empty.textContent = 'Aucune actualité. Cliquez sur Ajouter une actualité pour commencer.'; list.appendChild(empty); }
    articles.forEach(function (article, index) {
      var row = document.createElement('div');
      row.className = 'admin-news-card';
      row.innerHTML = '<label>Titre<input data-field="title" maxlength="180"></label><label>Date<input type="date" data-field="date"></label><label>Texte<textarea rows="6" data-field="text"></textarea></label><div class="admin-preview" data-news-gallery hidden></div><label>Photos — plusieurs possibles<input type="file" accept="image/jpeg,image/png,image/webp" multiple data-news-photo></label><label><input type="checkbox" data-field="published"> Publier</label><button type="button" data-news-remove>Supprimer cette actualité</button>';
      var heading = document.createElement('h3'); heading.textContent = 'Actualité ' + (index + 1); row.prepend(heading);
      row.querySelectorAll('[data-field]').forEach(function (input) {
        var key = input.dataset.field;
        if (key === 'published') input.checked = article[key] === true; else input.value = article[key] || '';
        input.addEventListener('input', function () { article[key] = key === 'published' ? input.checked : input.value; dirty = true; refreshMeta(); });
      });

      if (!Array.isArray(article.photos)) article.photos = [];
      if (!article._previewOverrides) article._previewOverrides = {};
      var wrap = row.querySelector('[data-news-gallery]');
      function deleteFileOnDisk(pathOrUri) {
        if (!pathOrUri || pathOrUri.indexOf('data:') === 0) return;
        var name = pathOrUri.split('/').pop();
        api('/api/delete-photo?name=' + encodeURIComponent(name), { method: 'POST' }).catch(function () {});
      }
      function renderGallery() {
        var all = [];
        if (article.photo) all.push({ src: article.photo, label: 'Principale' });
        article.photos.forEach(function (p, i) { all.push({ src: p, label: 'Photo ' + (i + 2) }); });
        wrap.innerHTML = '';
        if (!all.length) { wrap.hidden = true; return; }
        wrap.hidden = false;
        all.forEach(function (item, idx) {
          var fig = document.createElement('figure');
          fig.className = 'admin-preview-item';
          var media = document.createElement('div');
          media.className = 'admin-preview-item-media';
          var img = document.createElement('img');
          img.src = article._previewOverrides[item.src] || item.src;
          img.alt = '';
          var del = document.createElement('button');
          del.type = 'button';
          del.className = 'admin-preview-del';
          del.textContent = '✕';
          del.setAttribute('aria-label', 'Supprimer ' + item.label.toLowerCase());
          del.addEventListener('click', function () {
            if (!confirm('Supprimer cette photo ?')) return;
            var removed;
            if (idx === 0 && article.photo) { removed = article.photo; article.photo = article.photos.length ? article.photos.shift() : ''; }
            else { removed = article.photos.splice(article.photo ? idx - 1 : idx, 1)[0]; }
            delete article._previewOverrides[removed];
            deleteFileOnDisk(removed);
            renderGallery(); dirty = true; refreshMeta();
          });
          media.appendChild(img);
          media.appendChild(del);
          var cap = document.createElement('figcaption');
          cap.textContent = item.label;
          fig.appendChild(media);
          fig.appendChild(cap);
          wrap.appendChild(fig);
        });
      }
      renderGallery();
      row.querySelector('[data-news-photo]').addEventListener('change', function (event) {
        var files = Array.prototype.slice.call(event.target.files || []);
        if (!files.length) return;
        Promise.all(files.map(function (file, i) { return processImage(file, 'actualite', i); })).then(function (results) {
          results.forEach(function (r) { if (!r.saved) article._previewOverrides[r.path] = r.blobUrl; });
          var extra = results.slice();
          if (!article.photo && extra.length) article.photo = extra.shift().path;
          article.photos = article.photos.concat(extra.map(function (r) { return r.path; }));
          renderGallery(); dirty = true; refreshMeta();
          var allSaved = results.every(function (r) { return r.saved; });
          status(allSaved ? results.length + ' photo(s) ajoutée(s), redimensionnée(s) et protégée(s) par un filigrane. Cliquez sur « Enregistrer sur le site » pour publier.' : results.length + ' photo(s) téléchargée(s) (voir le dossier Téléchargements) — placez-les dans assets/img/ avant de redéployer le site.', 'ok');
        }).catch(function (err) { status('Impossible de traiter une des photos sélectionnées : ' + (err && err.message ? err.message : err), 'warn'); });
      });
      row.querySelector('[data-news-remove]').addEventListener('click', function () { if (!confirm('Supprimer cette actualité ?')) return; articles.splice(index, 1); dirty = true; renderNews(); refreshMeta(); });
      list.appendChild(row);
    });
  }
  news.querySelector('[data-news-add]').addEventListener('click', function () { if (articles.length >= MAX_ARTICLES) return; articles.push({ title: '', text: '', date: new Date().toISOString().slice(0, 10), published: false, photo: '' }); dirty = true; renderNews(); refreshMeta(); });
  news.querySelector('[data-news-save]').addEventListener('click', function () { document.getElementById('a-save').click(); statusEl.scrollIntoView({ block: 'center' }); });

  /* ----- « Passés entre nos mains » : exemples avant / après ----- */
  var realisations = [];
  var MAX_REALISATIONS = 10;
  var realis = document.createElement('section');
  realis.className = 'admin-news';
  realis.innerHTML = '<h2>Gérer « Passés entre nos mains »</h2><p>Une photo avant, une photo après, un petit texte : ajoutez vos exemples de réparation ou de restauration — 10 au maximum. Ils s’affichent sur la page Réparations, dans « Quelques exemples : avant / après ».</p><button type="button" class="btn" data-realis-add>Ajouter un exemple</button><p data-realis-limit hidden>Maximum de 10 exemples atteint — supprimez-en un pour en ajouter un nouveau.</p><div data-realis-list></div><button type="button" class="btn" data-realis-save>Enregistrer les modifications</button> <a href="reparations.html#galerie" target="_blank">Voir les exemples</a>';
  news.after(realis);
  function renderRealisations() {
    var addBtn = realis.querySelector('[data-realis-add]');
    var limitNote = realis.querySelector('[data-realis-limit]');
    addBtn.disabled = realisations.length >= MAX_REALISATIONS;
    limitNote.hidden = realisations.length < MAX_REALISATIONS;
    var list = realis.querySelector('[data-realis-list]');
    list.replaceChildren();
    if (!realisations.length) { var empty = document.createElement('p'); empty.className = 'admin-news-empty'; empty.textContent = 'Aucun exemple. Cliquez sur Ajouter un exemple pour commencer.'; list.appendChild(empty); }
    realisations.forEach(function (r, index) {
      var row = document.createElement('div');
      row.className = 'admin-news-card';
      row.innerHTML = '<label class="admin-wide">Titre<input data-field="titre" maxlength="80" placeholder="Ex. : Saxophone alto Selmer restauré"></label>' +
        '<div class="admin-realisation-photos">' +
        '<div><label>Photo avant<input type="file" accept="image/jpeg,image/png,image/webp" data-realis-photo="avant"></label>' +
        '<div class="admin-preview-item-media"><img class="admin-news-preview" data-preview="avant" alt="Aperçu avant" hidden>' +
        '<button type="button" class="admin-preview-del" data-preview-del="avant" hidden aria-label="Supprimer la photo avant">✕</button></div></div>' +
        '<div><label>Photo après<input type="file" accept="image/jpeg,image/png,image/webp" data-realis-photo="apres"></label>' +
        '<div class="admin-preview-item-media"><img class="admin-news-preview" data-preview="apres" alt="Aperçu après" hidden>' +
        '<button type="button" class="admin-preview-del" data-preview-del="apres" hidden aria-label="Supprimer la photo après">✕</button></div></div>' +
        '</div>' +
        '<label>Texte affiché sous les deux photos<textarea rows="3" maxlength="240" data-field="texte"></textarea></label>' +
        '<button type="button" data-realis-remove>Supprimer cet exemple</button>';
      var heading = document.createElement('h3'); heading.textContent = 'Exemple ' + (index + 1); row.prepend(heading);
      row.querySelector('[data-field="titre"]').value = r.titre || '';
      row.querySelector('[data-field="titre"]').addEventListener('input', function (e) { r.titre = e.target.value; dirty = true; refreshMeta(); });
      row.querySelector('[data-field="texte"]').value = r.texte || '';
      row.querySelector('[data-field="texte"]').addEventListener('input', function (e) { r.texte = e.target.value; dirty = true; refreshMeta(); });
      if (!r._previewOverrides) r._previewOverrides = {};
      function deleteRealisPhoto(pathOrUri) {
        if (!pathOrUri || pathOrUri.indexOf('data:') === 0) return;
        var name = pathOrUri.split('/').pop();
        api('/api/delete-photo?name=' + encodeURIComponent(name), { method: 'POST' }).catch(function () {});
      }
      ['avant', 'apres'].forEach(function (side) {
        var preview = row.querySelector('[data-preview="' + side + '"]');
        var delBtn = row.querySelector('[data-preview-del="' + side + '"]');
        function refreshSide() {
          if (r[side]) { preview.src = r._previewOverrides[r[side]] || r[side]; preview.hidden = false; delBtn.hidden = false; }
          else { preview.hidden = true; delBtn.hidden = true; }
        }
        refreshSide();
        row.querySelector('[data-realis-photo="' + side + '"]').addEventListener('change', function (event) {
          var file = event.target.files[0]; if (!file) return;
          var previous = r[side];
          processImage(file, 'realisation-' + side, side === 'apres' ? 1 : 0).then(function (res) {
            if (previous && previous !== res.path) { delete r._previewOverrides[previous]; deleteRealisPhoto(previous); }
            r[side] = res.path;
            if (!res.saved) r._previewOverrides[res.path] = res.blobUrl;
            refreshSide(); dirty = true; refreshMeta();
            status(res.saved ? 'Photo enregistrée, redimensionnée et protégée par un filigrane. Cliquez sur « Enregistrer sur le site » pour publier.' : 'Photo téléchargée dans votre dossier Téléchargements : placez-la dans assets/img/ avant de publier.', 'ok');
          }).catch(function (err) { status('Impossible de traiter cette photo : ' + (err && err.message ? err.message : err), 'warn'); });
        });
        delBtn.addEventListener('click', function () {
          if (!confirm('Supprimer la photo « ' + (side === 'avant' ? 'avant' : 'après') + ' » de cet exemple ?')) return;
          delete r._previewOverrides[r[side]];
          deleteRealisPhoto(r[side]);
          r[side] = '';
          refreshSide(); dirty = true; refreshMeta();
        });
      });
      row.querySelector('[data-realis-remove]').addEventListener('click', function () {
        if (!confirm('Supprimer cet exemple ?')) return;
        deleteRealisPhoto(r.avant);
        deleteRealisPhoto(r.apres);
        realisations.splice(index, 1); dirty = true; renderRealisations(); refreshMeta();
      });
      list.appendChild(row);
    });
  }
  realis.querySelector('[data-realis-add]').addEventListener('click', function () { if (realisations.length >= MAX_REALISATIONS) return; realisations.push({ id: '', titre: '', avant: '', apres: '', texte: '' }); dirty = true; renderRealisations(); refreshMeta(); });
  realis.querySelector('[data-realis-save]').addEventListener('click', function () { document.getElementById('a-save').click(); statusEl.scrollIntoView({ block: 'center' }); });
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

  // Retire les champs internes (aperçus de photos pas encore enregistrées)
  // avant d'envoyer ou d'exporter le catalogue : ils ne doivent jamais être écrits sur le site.
  function publicList(list) {
    return list.map(function (item) {
      var copy = {};
      Object.keys(item).forEach(function (k) { if (k !== '_previewOverrides') copy[k] = item[k]; });
      return copy;
    });
  }

  function payload() {
    return { instruments: items, families: families, articles: publicList(articles), realisations: publicList(realisations) };
  }

  function refreshMeta() {
    countEl.textContent = items.length + (items.length > 1 ? " instruments" : " instrument");
    jsonEl.textContent = JSON.stringify(payload(), null, 2);
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
      api("/api/delete-photo?name=" + encodeURIComponent(name), { method: "POST" }).catch(function () {});
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
      Promise.all(files.map(function (file, i) { return processImage(file, baseName, i); })).then(function (results) {
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
          status(results.length + " photo(s) ajoutée(s), redimensionnée(s) et protégée(s) par un filigrane. Cliquez sur « Enregistrer sur le site » pour publier.", "ok");
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
  function fetchCatalogue() {
    return fetch("/api/catalogue?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function () {
        return fetch("assets/data/catalogue.json", { cache: "no-cache" })
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
      });
  }

  function applyCatalogue(data) {
    var arr = Array.isArray(data) ? data : (data && data.instruments) || [];
    articles = Array.isArray(data.articles) ? data.articles : [];
    renderNews();
    realisations = Array.isArray(data.realisations) ? data.realisations : [];
    renderRealisations();
    families = defaults.map(function (f) { return { id: f.id, label: f.label }; });
    (Array.isArray(data.families) ? data.families : []).forEach(function (f) { if (f && typeof f.id === 'string' && typeof f.label === 'string' && !families.some(function (known) { return known.id === f.id; })) families.push(f); });
    arr.forEach(function (it) { if (it.famille && !families.some(function (f) { return f.id === it.famille; })) families.push({ id: it.famille, label: it.famille }); });
    familySummary();
    render(arr);
    return arr.length;
  }

  function load() {
    status("Chargement du catalogue en ligne…");
    fetchCatalogue()
      .then(function (data) {
        var n = applyCatalogue(data);
        dirty = false;
        status(n + " instrument(s) chargé(s).", "ok");
      })
      .catch(function () {
        render([blank()]);
        status("Impossible de charger le catalogue existant — nouveau catalogue vierge.", "warn");
      });
  }

  /* ----- Historique des versions (site en ligne uniquement) ----- */
  var historyBox = document.getElementById("a-history");
  var historyList = document.getElementById("a-history-list");

  function versionLabel(id) {
    var iso = id.replace(/T(\d\d)-(\d\d)-(\d\d)/, "T$1:$2:$3");
    var d = new Date(iso);
    return isNaN(d) ? id : d.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
  }

  function refreshHistory() {
    if (!historyBox) return;
    api("/api/history").then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data || !Array.isArray(data.versions)) { historyBox.hidden = true; return; }
      historyList.replaceChildren();
      data.versions.forEach(function (id) { historyList.add(new Option(versionLabel(id), id)); });
      historyBox.hidden = !data.versions.length;
    }).catch(function () { historyBox.hidden = true; });
  }

  var historyLoad = document.getElementById("a-history-load");
  if (historyLoad) historyLoad.addEventListener("click", function () {
    var id = historyList.value;
    if (!id) return;
    if (!confirm("Charger la version du " + versionLabel(id) + " ? Les modifications non enregistrées seront perdues.")) return;
    api("/api/history?id=" + encodeURIComponent(id)).then(function (r) { return r.ok ? r.json() : apiError(r); }).then(function (data) {
      applyCatalogue(data);
      dirty = true;
      status("Version du " + versionLabel(id) + " chargée. Cliquez sur « Enregistrer sur le site » pour la rétablir.", "ok");
    }).catch(function (err) { status("Impossible de charger cette version : " + err.message, "warn"); });
  });

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
    api("/api/catalogue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) })
      .then(function (r) { return r.ok ? r.json() : apiError(r); })
      .then(function (res) {
        dirty = false;
        status(res && res.savedAt ? "Catalogue enregistré : le site public est à jour." : "Catalogue enregistré sur le site.", "ok");
        refreshHistory();
      })
      .catch(function (err) { status(err && err.status ? err.message : "Enregistrement automatique indisponible. Réessayez ou rechargez la page.", "warn"); });
  });

  var downloadBtn = document.getElementById("a-download");
  if (downloadBtn) downloadBtn.addEventListener("click", function () {
    collect();
    var blob = new Blob([JSON.stringify(payload(), null, 2) + "\n"], { type: "application/json" });
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
    var txt = JSON.stringify(payload(), null, 2) + "\n";
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

  /* Démarrage : sur le site en ligne, /api/auth-check demande le mot de passe ;
     en local (aucun serveur d'accès) la route n'existe pas et on continue directement. */
  api("/api/auth-check").then(function (r) {
    if (r.status === 503) return r.json().then(function (b) { status(b.error, "warn"); });
    if (r.status === 429) return r.json().then(function (b) { status(b.error, "warn"); });
    load();
    refreshHistory();
  }).catch(function () { load(); });
})();
