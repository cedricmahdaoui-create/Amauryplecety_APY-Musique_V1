/* Formulaire « Écrire à l'atelier » (accueil uniquement) : envoi direct par e-mail. */
(function () {
  'use strict';
  var form = document.getElementById('contact-form');
  if (!form) return;
  var note = form.querySelector('[data-contact-note]');
  var submitBtn = form.querySelector('button[type="submit"]');
  var defaultNote = note.textContent;
  var defaultClass = note.className;

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var data = new FormData(form);
    submitBtn.disabled = true;
    note.textContent = 'Envoi en cours…'; note.className = defaultClass;
    fetch('api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: data.get('nom'), email: data.get('email'), objet: data.get('objet'),
        message: data.get('message'), site: data.get('site')
      })
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { ok: r.ok, body: b }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.body && res.body.error ? res.body.error : 'Envoi impossible.');
        note.textContent = 'Message envoyé — l’atelier vous répond sous 1 à 2 jours.';
        note.className = defaultClass + ' form-note--ok';
        form.reset();
        Array.prototype.slice.call(form.elements).forEach(function (el) { el.disabled = true; });
      })
      .catch(function (err) {
        note.textContent = err.message + ' Vous pouvez aussi appeler, écrire par WhatsApp ou par e-mail (ci-dessous).';
        note.className = defaultClass + ' form-note--warn';
        submitBtn.disabled = false;
      });
  });
})();
