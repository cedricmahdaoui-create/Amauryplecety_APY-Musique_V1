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

  function media(a) {
    var wrap = document.createElement('div');
    wrap.className = 'news-article-media';
    var photos = [a.photo].concat(Array.isArray(a.photos) ? a.photos : []).filter(function (src, index, all) {
      return isPhoto(src) && all.indexOf(src) === index;
    });
    if (!photos.length) return wrap;
    var img = document.createElement('img');
    img.src = photos[0];
    img.alt = a.title || '';
    img.loading = 'lazy';
    wrap.appendChild(img);
    if (photos.length > 1) {
      var position = 0;
      wrap.classList.add('cat-carousel');
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', 'Photos — ' + (a.title || 'actualité'));
      var controls = document.createElement('div');
      controls.className = 'cat-carousel-controls';
      var previous = document.createElement('button');
      previous.type = 'button'; previous.textContent = '‹';
      previous.setAttribute('aria-label', 'Photo précédente');
      var counter = document.createElement('span');
      counter.setAttribute('aria-live', 'polite'); counter.setAttribute('aria-atomic', 'true');
      var next = document.createElement('button');
      next.type = 'button'; next.textContent = '›';
      next.setAttribute('aria-label', 'Photo suivante');
      function show(delta) {
        position = (position + delta + photos.length) % photos.length;
        img.src = photos[position];
        img.alt = (a.title || '') + ' — photo ' + (position + 1) + ' sur ' + photos.length;
        counter.textContent = (position + 1) + ' / ' + photos.length;
        if (delta) {
          img.classList.remove('cat-slide-next', 'cat-slide-prev');
          void img.offsetWidth;
          img.classList.add(delta > 0 ? 'cat-slide-next' : 'cat-slide-prev');
        }
      }
      previous.addEventListener('click', function () { show(-1); });
      next.addEventListener('click', function () { show(1); });
      controls.append(previous, counter, next);
      wrap.appendChild(controls);
      wrap.style.cursor = 'default';
      wrap.setAttribute('tabindex', '0');
      wrap.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); show(event.key === 'ArrowLeft' ? -1 : 1); }
      });
      var hoverTimer;
      wrap.addEventListener('mouseenter', function () { hoverTimer = setInterval(function () { show(1); }, 1800); });
      wrap.addEventListener('mouseleave', function () { clearInterval(hoverTimer); hoverTimer = null; });
      var touchStart;
      wrap.addEventListener('touchstart', function (event) { touchStart = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }; }, { passive: true });
      wrap.addEventListener('touchend', function (event) {
        if (!touchStart) return;
        var dx = event.changedTouches[0].clientX - touchStart.x, dy = event.changedTouches[0].clientY - touchStart.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(dx < 0 ? 1 : -1);
        touchStart = null;
      }, { passive: true });
      show(0);
    }
    return wrap;
  }

  fetch('api/catalogue').then(function (r) { if (!r.ok) throw new Error(); return r; }).catch(function () { return fetch('assets/data/catalogue.json', { cache: 'no-cache' }); }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); }).then(function (data) {
    var articles = (data.articles || []).filter(function (a) { return a.published === true; });
    root.replaceChildren();
    if (!articles.length) root.textContent = 'Les prochaines nouvelles de l’atelier seront publiées ici.';
    articles.forEach(function (a) {
      var article = document.createElement('article'); article.className = 'news-article';
      var head = document.createElement('div'); head.className = 'news-article-head';
      if (a.date) { var date = document.createElement('time'); date.className = 'news-article-date'; date.dateTime = a.date; date.textContent = formatDate(a.date); head.appendChild(date); }
      var title = document.createElement('h2'); title.className = 'news-article-title'; title.textContent = a.title; head.appendChild(title);
      article.appendChild(head);
      var m = media(a);
      if (m.children.length) article.appendChild(m);
      var body = document.createElement('div'); body.className = 'news-article-body';
      var text = document.createElement('p'); text.textContent = a.text; body.appendChild(text);
      article.appendChild(body);
      root.appendChild(article);
    });
  }).catch(function () { root.textContent = 'Les actualités sont momentanément indisponibles.'; });
})();
