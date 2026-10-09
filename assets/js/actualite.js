(function () {
  var root = document.getElementById('article-detail');
  if (!root) return;

  function isPhoto(src) {
    return typeof src === 'string' && /^(data:image\/(jpeg|png|webp);base64,|https?:\/\/|\/?assets\/|\/?media\/)/i.test(src);
  }

  function formatDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return iso || '';
    var d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function notFound() {
    root.replaceChildren();
    var p = document.createElement('p');
    p.textContent = 'Cette actualité est introuvable — elle a peut-être été retirée.';
    var a = document.createElement('p');
    a.innerHTML = '<a class="btn" href="index.html#a-la-une">Retour à « À la une »</a>';
    root.append(p, a);
  }

  var params = new URLSearchParams(location.search);
  var i = parseInt(params.get('i'), 10);
  if (!Number.isInteger(i) || i < 0) { notFound(); return; }

  fetch('api/catalogue').then(function (r) { if (!r.ok) throw new Error(); return r; }).catch(function () { return fetch('assets/data/catalogue.json', { cache: 'no-cache' }); }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); }).then(function (data) {
    var articles = (data.articles || []).filter(function (a) { return a.published === true; });
    var a = articles[i];
    if (!a) { notFound(); return; }

    document.title = a.title + ' — APY Musique';
    var descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta) { descMeta = document.createElement('meta'); descMeta.name = 'description'; document.head.appendChild(descMeta); }
    descMeta.content = (a.text || '').slice(0, 160);

    var photos = [a.photo].concat(Array.isArray(a.photos) ? a.photos : []).filter(function (src, idx, all) {
      return isPhoto(src) && all.indexOf(src) === idx;
    });

    root.replaceChildren();
    var head = document.createElement('div'); head.className = 'news-article-head';
    var kicker = document.createElement('span'); kicker.className = 'news-article-kicker'; kicker.textContent = 'Atelier'; head.appendChild(kicker);
    if (a.date) { var date = document.createElement('time'); date.className = 'news-article-date'; date.dateTime = a.date; date.textContent = formatDate(a.date); head.appendChild(date); }
    var title = document.createElement('h1'); title.className = 'news-article-title'; title.textContent = a.title; head.appendChild(title);
    root.appendChild(head);

    if (photos.length) {
      var main = document.createElement('div'); main.className = 'news-article-media';
      var mainImg = document.createElement('img'); mainImg.src = photos[0]; mainImg.alt = a.title || ''; main.appendChild(mainImg);
      root.appendChild(main);
    }

    var body = document.createElement('div'); body.className = 'news-article-body';
    var text = document.createElement('p'); text.textContent = a.text || ''; body.appendChild(text);
    root.appendChild(body);

    if (photos.length > 1) {
      var gal = document.createElement('div'); gal.className = 'article-gallery';
      photos.forEach(function (src, idx) {
        var thumb = document.createElement('img');
        thumb.src = src; thumb.alt = a.title + ' — photo ' + (idx + 1); thumb.loading = 'lazy';
        gal.appendChild(thumb);
      });
      root.appendChild(gal);
    }

    var back = document.createElement('p'); back.className = 'mt-2';
    back.innerHTML = '<a class="btn btn--ghost" href="index.html#a-la-une">← Toutes les actualités</a>';
    root.appendChild(back);
  }).catch(notFound);
})();
