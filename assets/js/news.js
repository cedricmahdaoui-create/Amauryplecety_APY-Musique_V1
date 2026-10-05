(function () {
  var root = document.getElementById('news-list');
  if (!root) return;
  root.textContent = 'Chargement des actualités…';

  function isPhoto(src) {
    return typeof src === 'string' && /^(data:image\/(jpeg|png|webp);base64,|https?:\/\/|\/?assets\/|\/?media\/)/i.test(src);
  }

  function formatDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return iso || '';
    var d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function excerpt(text, max) {
    var t = (text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    var cut = t.slice(0, max);
    var lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > 40) cut = cut.slice(0, lastSpace);
    return cut + '…';
  }

  fetch('assets/data/catalogue.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(); return r; }).then(function (r) { return r.json(); }).then(function (data) {
    var articles = (data.articles || []).filter(function (a) { return a.published === true; });
    root.replaceChildren();
    if (!articles.length) { root.textContent = 'Les prochaines nouvelles de l’atelier seront publiées ici.'; return; }
    articles.forEach(function (a, index) {
      var article = document.createElement('a'); article.className = 'news-article'; article.href = 'actualite.html?i=' + index;

      var head = document.createElement('div'); head.className = 'news-article-head';
      var kicker = document.createElement('span'); kicker.className = 'news-article-kicker'; kicker.textContent = 'Atelier'; head.appendChild(kicker);
      if (a.date) { var date = document.createElement('time'); date.className = 'news-article-date'; date.dateTime = a.date; date.textContent = formatDate(a.date); head.appendChild(date); }
      var title = document.createElement('h2'); title.className = 'news-article-title'; title.textContent = a.title; head.appendChild(title);
      article.appendChild(head);

      var photo = a.photo && isPhoto(a.photo) ? a.photo : (Array.isArray(a.photos) ? a.photos.find(isPhoto) : null);
      if (photo) {
        var media = document.createElement('div'); media.className = 'news-article-media';
        var img = document.createElement('img'); img.src = photo; img.alt = a.title || ''; img.loading = 'lazy';
        media.appendChild(img); article.appendChild(media);
      }

      var body = document.createElement('div'); body.className = 'news-article-body';
      var text = document.createElement('p'); text.textContent = excerpt(a.text, 160); body.appendChild(text);
      article.appendChild(body);

      var more = document.createElement('span'); more.className = 'news-article-more'; more.textContent = 'Lire l’article →';
      article.appendChild(more);

      root.appendChild(article);
    });
  }).catch(function () { root.textContent = 'Les actualités sont momentanément indisponibles.'; });
})();
