/* APY Musique — script principal (aucune dépendance externe) */
(function () {
  "use strict";

  /* Correctif d'ancrage : si la page s'ouvre avec un lien du type #contact-form,
     le contenu chargé dynamiquement plus bas (actualités, carrousels) peut décaler
     la page APRÈS que le navigateur a fait son positionnement initial. On refait
     le scroll une fois que tout est chargé, pour atterrir au bon endroit à coup sûr. */
  function fixHashScroll() {
    if (!location.hash) return;
    var target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView({ block: "start" });
  }
  window.addEventListener("load", function () {
    fixHashScroll();
    setTimeout(fixHashScroll, 400);
  });

  /* Le bouton WhatsApp flottant « sonne » quand on survole le lien Contact du menu. */
  (function () {
    var contactLink = document.querySelector('#main-nav a.btn');
    var waFloat = document.querySelector('.wa-float');
    if (!contactLink || !waFloat) return;
    function ring() { waFloat.classList.add('wa-float--ringing'); }
    function stop() { waFloat.classList.remove('wa-float--ringing'); }
    contactLink.addEventListener('mouseenter', ring);
    contactLink.addEventListener('mouseleave', stop);
    contactLink.addEventListener('focus', ring);
    contactLink.addEventListener('blur', stop);
  })();

  /* Fil d’Ariane unique, attaché au header de l’accueil. */
  if (document.body.classList.contains('home')) {
    var header = document.querySelector('.site-header');
    var breadcrumb = document.querySelector('body > .breadcrumb');
    if (header && breadcrumb) {
      function measureHeader() {
        document.documentElement.style.setProperty('--header-height', header.getBoundingClientRect().height + 'px');
        document.documentElement.style.setProperty('--navigation-height', (header.getBoundingClientRect().height + breadcrumb.getBoundingClientRect().height) + 'px');
      }
      var CRUMB_NAMES = { histoire: 'Notre histoire', services: 'Nos services', 'a-la-une': 'À la une', avis: 'Avis', contact: 'Contact', 'contact-form': 'Contact' };
      function updateBreadcrumb(hashOverride) {
        var name = CRUMB_NAMES[(hashOverride || location.hash).slice(1)];
        var list = breadcrumb.querySelector('ol');
        list.replaceChildren();
        var home = document.createElement('li');
        if (name) {
          var link = document.createElement('a'); link.href = 'index.html'; link.textContent = 'Accueil'; home.appendChild(link);
          var current = document.createElement('li'); current.setAttribute('aria-current', 'location'); current.textContent = name;
          list.append(home, current);
        } else { home.textContent = 'Accueil'; home.setAttribute('aria-current', 'page'); list.appendChild(home); }
        measureHeader();
      }
      window.addEventListener('hashchange', function () { updateBreadcrumb(); });
      new ResizeObserver(measureHeader).observe(header);
      updateBreadcrumb();

      /* Aperçu au survol : le fil d'Ariane prévisualise la section survolée, puis revient
         à la section réelle quand la souris s'en va — à la fois depuis le menu et
         directement sur les sections de la page principale. */
      function wireHoverPreview(el, hash) {
        el.addEventListener('mouseenter', function () { updateBreadcrumb(hash); });
        el.addEventListener('focus', function () { updateBreadcrumb(hash); });
        el.addEventListener('mouseleave', function () { updateBreadcrumb(); });
        el.addEventListener('blur', function () { updateBreadcrumb(); });
      }
      var navLinks = document.querySelectorAll('#main-nav a[href*="#"]');
      navLinks.forEach(function (link) {
        var hash = '#' + link.getAttribute('href').split('#')[1];
        if (!CRUMB_NAMES[hash.slice(1)]) return;
        wireHoverPreview(link, hash);
      });
      var pageSections = document.querySelectorAll('main section[id]');
      pageSections.forEach(function (section) {
        var hash = '#' + section.id;
        if (!CRUMB_NAMES[section.id]) return;
        wireHoverPreview(section, hash);
      });
    }
  }
  /* ----- Menu mobile ----- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("main-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ----- Année dans le pied de page ----- */
  var y = document.querySelector("[data-year]");
  if (y) { y.textContent = String(new Date().getFullYear()); }

  /* ----- Formulaire de contact : garde-fous côté client -----
     Le traitement réel se fait côté serveur/prestataire d'envoi.
     Ici : anti-robot (honeypot + délai) et retour visuel. */
  var form = document.querySelector("form[data-contact]");
  if (form) {
    var instrument = new URLSearchParams(window.location.search).get("instrument");
    if (instrument) {
      var subject = form.querySelector('[name="sujet"]');
      var message = form.querySelector('[name="message"]');
      if (subject && !subject.value) { subject.value = "Demande concernant : " + instrument; }
      if (message && !message.value) { message.value = "Bonjour,\n\nJe souhaiterais obtenir des informations et, si possible, réserver un essai pour : " + instrument + ".\n\nMerci."; }
      var instrumentField = document.createElement("input");
      instrumentField.type = "hidden";
      instrumentField.name = "instrument";
      instrumentField.value = instrument;
      form.appendChild(instrumentField);
    }
    var loadedAt = Date.now();
    form.addEventListener("submit", function (e) {
      var hp = form.querySelector('input[name="site_web"]');
      var tooFast = Date.now() - loadedAt < 2500;
      if ((hp && hp.value) || tooFast) {
        e.preventDefault();
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Envoi en cours…"; }
    });
  }
})();

/* Agrandissement des photographies, accessible au clavier et au toucher. */
(function () {
  var pictures = document.querySelectorAll('.gallery figure');
  if (!pictures.length || typeof HTMLDialogElement === 'undefined') return;
  var viewer = document.createElement('dialog');
  viewer.className = 'photo-viewer';
  viewer.setAttribute('aria-label', 'Photographie de l’atelier');
  var close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Fermer ×';
  var large = document.createElement('img');
  var caption = document.createElement('p');
  viewer.append(close, large, caption);
  document.body.appendChild(viewer);
  close.addEventListener('click', function () { viewer.close(); });
  viewer.addEventListener('click', function (event) {
    if (event.target !== viewer) return;
    var rect = viewer.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) viewer.close();
  });
  pictures.forEach(function (figure) {
    var img = figure.querySelector('img');
    if (!img || img.closest('a, button')) return;
    var label = figure.querySelector('figcaption');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-open';
    button.setAttribute('aria-label', 'Agrandir : ' + (label ? label.textContent : img.alt));
    var frame = img.closest('.frame') || img;
    frame.replaceWith(button);
    button.appendChild(frame);
    button.addEventListener('click', function () {
      large.src = img.currentSrc || img.src;
      large.alt = img.alt;
      caption.textContent = label ? label.textContent : img.alt;
      viewer.showModal();
    });
  });
})();
