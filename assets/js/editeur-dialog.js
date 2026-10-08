/* Fenêtre « Écrire à l'éditeur du site » : ouverte depuis le crédit « Cédric » du
   pied de page (toutes les pages) et depuis le lien « droit au retrait d'information »
   de la politique de confidentialité. L'objet est imposé par le lien cliqué et n'est
   pas modifiable par le visiteur. Le message contextuel (ex. depuis le crédit du pied
   de page) s'affiche en gris ; Tab le reprend pour l'éditer. */
(function () {
  "use strict";
  var dialog = document.getElementById("editeur-dialog");
  if (!dialog) return;
  var form = document.getElementById("editeur-form");
  var objetDisplay = dialog.querySelector("[data-objet-display]");
  var objetInput = dialog.querySelector("[data-objet-input]");
  var note = form.querySelector("[data-editeur-note]");
  var submitBtn = form.querySelector('button[type="submit"]');
  var defaultNote = note.textContent;
  var defaultClass = note.className;
  var openers = document.querySelectorAll("[data-editeur-objet]");
  var openedAt = 0; // anti-spam : mesuré depuis l'ouverture de la fenêtre, pas le chargement de la page.
  var messageField = form.querySelector('textarea[name="message"]');
  var pendingSuggestion = ""; // message contextuel : affiché en gris, Tab pour le reprendre et l'éditer

  function reset() {
    form.reset();
    Array.prototype.slice.call(form.elements).forEach(function (el) { el.disabled = false; });
    note.textContent = defaultNote;
    note.className = defaultClass;
    submitBtn.disabled = false;
    pendingSuggestion = "";
    if (messageField) messageField.placeholder = "";
  }

  if (messageField) messageField.addEventListener("keydown", function (event) {
    if (event.key !== "Tab" || event.shiftKey || !pendingSuggestion || messageField.value) return;
    event.preventDefault();
    messageField.value = pendingSuggestion;
    pendingSuggestion = "";
    messageField.placeholder = "";
    messageField.setSelectionRange(messageField.value.length, messageField.value.length);
  });

  Array.prototype.forEach.call(openers, function (opener) {
    opener.addEventListener("click", function (event) {
      event.preventDefault();
      reset();
      var objet = opener.getAttribute("data-editeur-objet");
      objetDisplay.textContent = objet;
      objetInput.value = objet;
      var prefill = opener.getAttribute("data-editeur-message");
      if (messageField && prefill) { pendingSuggestion = prefill; messageField.placeholder = prefill; }
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      openedAt = Date.now();
      var firstField = form.querySelector('input[name="nom"]');
      if (firstField) firstField.focus();
    });
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });
  var closeBtn = dialog.querySelector(".editeur-dialog-close");
  if (closeBtn) closeBtn.addEventListener("click", function () { dialog.close(); });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var data = new FormData(form);
    submitBtn.disabled = true;
    note.textContent = "Envoi en cours…"; note.className = defaultClass;
    fetch("api/contact-editeur", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: data.get("nom"), email: data.get("email"), tel: data.get("tel"), objet: data.get("objet"),
        message: data.get("message"), site: data.get("site"), elapsed: Date.now() - openedAt
      })
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { ok: r.ok, body: b }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.body && res.body.error ? res.body.error : "Envoi impossible.");
        note.textContent = "Message envoyé.";
        note.className = defaultClass + " form-note--ok";
        Array.prototype.slice.call(form.elements).forEach(function (el) { el.disabled = true; });
        // Fermer la fenêtre après confirmation, pour ne pas laisser un formulaire figé ouvert.
        setTimeout(function () { if (dialog.open) dialog.close(); }, 2500);
      })
      .catch(function (err) {
        note.textContent = err.message;
        note.className = defaultClass + " form-note--warn";
        submitBtn.disabled = false;
      });
  });
})();
