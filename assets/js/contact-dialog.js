(function () {
  'use strict';
  var dialog = document.createElement('dialog');
  dialog.className = 'contact-dialog';
  dialog.setAttribute('aria-labelledby', 'contact-dialog-title');
  dialog.innerHTML = `<button type="button" class="contact-close" aria-label="Fermer">×</button>
    <h2 id="contact-dialog-title">Écrire à l’atelier</h2>
    <form>
      <label>Votre nom<input name="nom" autocomplete="name" required maxlength="120"></label>
      <label>Votre adresse e-mail<input name="email" type="email" autocomplete="email" required></label>
      <label>Objet<select name="objet"><option>Achat d’un instrument</option><option>Réparation</option><option>Estimation</option><option>Autre demande</option></select></label>
      <label>Votre message<textarea name="message" rows="5" required maxlength="5000"></textarea></label>
      <p class="form-note">Le bouton ci-dessous ouvre votre messagerie avec le message préparé. Vous pourrez alors l’envoyer à l’atelier.</p>
      <button class="btn" type="submit">Préparer mon e-mail</button>
    </form>`;
  document.body.appendChild(dialog);
  dialog.querySelector('.contact-close').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (event) { if (event.target === dialog) { var r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  document.querySelectorAll('a.btn').forEach(function (link) {
    if (!/^écrire à l['’]atelier$/i.test(link.textContent.trim())) return;
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', function (event) { event.preventDefault(); dialog.showModal(); });
  });
  dialog.querySelector('form').addEventListener('submit', function (event) {
    event.preventDefault();
    var data = new FormData(event.currentTarget);
    var body = data.get('message') + '\n\n' + data.get('nom') + '\n' + data.get('email');
    location.href = 'mailto:amaury.plecety@laposte.net?subject=' + encodeURIComponent(data.get('objet')) + '&body=' + encodeURIComponent(body);
  });
})();
