/* APY Musique — page /admin/journal.html : lecture, export et purge du journal (/api/journal).
   Mot de passe propre à cette page (JOURNAL_PASSWORD côté serveur), distinct de l'admin catalogue. */
(function () {
  "use strict";
  var PW_KEY = "apy-journal-pw";
  var password = "";
  try { password = sessionStorage.getItem(PW_KEY) || ""; } catch (e) { /* stockage indisponible */ }
  var loginPromise = null;

  function askPassword(message) {
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.className = "admin-login";
      overlay.innerHTML = '<form class="admin-login-box"><h2>Journal du site</h2><p class="admin-login-msg" role="alert"></p><label>Mot de passe<input type="password" autocomplete="current-password" required></label><button class="btn" type="submit">Se connecter</button><a class="admin-login-back" href="index.html">Retour au site</a></form>';
      overlay.querySelector(".admin-login-msg").textContent = message || "Saisissez le mot de passe du journal.";
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
    var headers = Object.assign({}, options.headers || {});
    if (password) headers.Authorization = "Bearer " + password;
    return fetch(path, Object.assign({}, options, { headers: headers, cache: "no-store" })).then(function (r) {
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

  var typeEl = document.getElementById("j-type");
  var fromEl = document.getElementById("j-from");
  var toEl = document.getElementById("j-to");
  var statusEl = document.getElementById("j-status");
  var table = document.getElementById("j-table");
  var tbody = table.querySelector("tbody");

  var iso = function (d) { return d.toISOString().slice(0, 10); };
  toEl.value = iso(new Date());
  fromEl.value = iso(new Date(Date.now() - 6 * 86400000));

  var STATUTS = { envoye: "Envoyé", echec: "Échec", limite: "Limite atteinte", spam_bloque: "Spam bloqué", incomplet: "Incomplet" };

  function query(format) {
    var q = "type=" + encodeURIComponent(typeEl.value) + "&from=" + fromEl.value + "&to=" + toEl.value;
    return "/api/journal?" + q + (format ? "&format=" + format : "");
  }

  function fail(err) {
    statusEl.textContent = err && err.status === 404
      ? "Le journal n'est disponible que sur le site en ligne."
      : "Opération impossible : " + (err && err.message ? err.message : "erreur inconnue") + ".";
  }

  function check(r) {
    if (r.ok) return r;
    return r.json().catch(function () { return {}; }).then(function (b) {
      var e = new Error(b.error || "erreur " + r.status); e.status = r.status;
      throw e;
    });
  }

  function cell(tr, text, title) {
    var td = document.createElement("td");
    td.textContent = text || "";
    if (title) td.title = title;
    tr.appendChild(td);
  }

  function show() {
    statusEl.textContent = "Chargement…";
    api(query()).then(check).then(function (r) { return r.json(); }).then(function (data) {
      tbody.textContent = "";
      data.events.forEach(function (e) {
        var tr = document.createElement("tr");
        var mail = e.type === "mail";
        cell(tr, new Date(e.ts).toLocaleString("fr-FR"));
        cell(tr, mail ? "Message (" + e.formulaire + ")" : "Visite");
        cell(tr, mail ? e.objet : e.page + (e.provenance ? " ← " + e.provenance : ""), mail ? e.message : "");
        cell(tr, mail ? [e.nom, e.email, e.tel].filter(Boolean).join(" · ") : "");
        cell(tr, mail ? (STATUTS[e.statut] || e.statut) : "", e.erreur);
        cell(tr, [e.ville, e.region, e.pays].filter(Boolean).join(", "));
        cell(tr, [e.appareil, e.navigateur].filter(Boolean).join(" · "), e.user_agent);
        cell(tr, e.ip);
        tbody.appendChild(tr);
      });
      table.hidden = !data.events.length;
      statusEl.textContent = data.count
        ? data.count + " événement(s) du " + data.from + " au " + data.to + (data.count > 500 ? " (500 premiers affichés)." : ".")
        : "Aucun événement sur cette période.";
    }).catch(fail);
  }

  function download(format) {
    statusEl.textContent = "Préparation du fichier…";
    api(query(format)).then(check).then(function (r) {
      var cd = r.headers.get("content-disposition") || "";
      var m = /filename="([^"]+)"/.exec(cd);
      return r.blob().then(function (blob) { return { blob: blob, name: m ? m[1] : "journal." + format }; });
    }).then(function (f) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(f.blob);
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      statusEl.textContent = "Fichier téléchargé : " + f.name;
    }).catch(fail);
  }

  document.getElementById("j-show").addEventListener("click", show);
  document.getElementById("j-csv").addEventListener("click", function () { download("csv"); });
  document.getElementById("j-jsonl").addEventListener("click", function () { download("jsonl"); });
  document.getElementById("j-purge").addEventListener("click", function () {
    if (!confirm("Effacer définitivement les visites de plus de 13 mois et les messages de plus de 12 mois ?")) return;
    var purgeStatus = document.getElementById("j-purge-status");
    purgeStatus.textContent = "Purge en cours…";
    api("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "purge" }) })
      .then(check).then(function (r) { return r.json(); })
      .then(function (res) { purgeStatus.textContent = "Purge terminée : " + res.removed + " entrée(s) effacée(s)."; })
      .catch(function (err) { purgeStatus.textContent = "Purge impossible : " + err.message + "."; });
  });

  show();
})();
