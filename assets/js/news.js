(function () {
  var root = document.getElementById('news-list');
  if (!root) return;
  root.textContent = 'Chargement des actualités…';
  fetch('assets/data/catalogue.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); }).then(function (data) {
    var articles = (data.articles || []).filter(function (a) { return a.published === true; });
    root.replaceChildren();
    if (!articles.length) root.textContent = 'Les prochaines nouvelles de l’atelier seront publiées ici.';
    articles.forEach(function (a) {
      var card = document.createElement('article'); card.className = 'cat-card';
      if (a.photo && /^(data:image\/(jpeg|png|webp);base64,|https?:\/\/|\/?assets\/)/i.test(a.photo)) { var img = document.createElement('img'); img.src = a.photo; img.alt = a.title || ''; img.loading = 'lazy'; card.appendChild(img); }
      var body = document.createElement('div'); body.className = 'cat-card-body';
      var title = document.createElement('h2'); title.textContent = a.title; body.appendChild(title);
      var date = document.createElement('time'); date.textContent = a.date || ''; body.appendChild(date);
      var text = document.createElement('p'); text.textContent = a.text; text.style.whiteSpace = 'pre-wrap'; body.appendChild(text);
      card.appendChild(body); root.appendChild(card);
    });
  }).catch(function () { root.textContent = 'Les actualités sont momentanément indisponibles.'; });
})();
