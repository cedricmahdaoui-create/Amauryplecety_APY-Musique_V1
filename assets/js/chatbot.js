/* APY Musique — petit assistant conversationnel « Piston » (aucune dépendance,
   aucun serveur : arbre de réponses préécrites + quelques mots-clés). */
(function () {
  "use strict";

  var TEL = "06 34 50 91 97";
  var TEL_HREF = "tel:+33634509197";
  var WA_HREF = "https://wa.me/33634509197";
  var MAIL_HREF = "mailto:amaury.plecety@laposte.net";

  var nodes = {
    start: {
      text: "Bonjour ! Moi c'est Piston 🎺, la mascotte pas très douée en solfège de l'atelier. Je peux vous aider à trouver votre chemin. C'est pour quoi ?",
      options: [
        { label: "🎷 Trouver un instrument", to: "find" },
        { label: "🔧 Faire réparer", to: "repair" },
        { label: "🕐 Horaires & adresse", to: "infos" },
        { label: "🙋 Parler à quelqu'un", to: "human" }
      ]
    },
    find: {
      text: "Très bon choix. Vous cherchez plutôt quoi ?",
      options: [
        { label: "Un instrument à vent", to: "find-vent" },
        { label: "Un instrument à cordes", to: "find-cordes" },
        { label: "Je ne sais pas encore", to: "find-conseil" },
        { label: "⬅ Retour au menu", to: "start" }
      ]
    },
    "find-vent": {
      text: "Saxophones, trompettes, clarinettes, cors... l'atelier en a toujours en stock, tous révisés avant la vente. 🎷",
      options: [
        { label: "Voir le catalogue", href: "catalogue.html" },
        { label: "⬅ Retour au menu", to: "start" }
      ]
    },
    "find-cordes": {
      text: "Violon, alto, violoncelle, contrebasse : le quatuor est là aussi, en lien avec des luthiers partenaires. 🎻",
      options: [
        { label: "Voir le catalogue", href: "catalogue.html" },
        { label: "⬅ Retour au menu", to: "start" }
      ]
    },
    "find-conseil": {
      text: "Pas de souci ! Le mieux, c'est de passer à l'atelier ou d'appeler : Amaury conseille selon le niveau et le budget, sans pression commerciale.",
      options: [
        { label: "Appeler " + TEL, href: TEL_HREF },
        { label: "⬅ Retour au menu", to: "start" }
      ]
    },
    repair: {
      text: "Aïe. Qu'est-ce qui lui arrive ?",
      options: [
        { label: "Il ne sonne plus bien", to: "repair-son" },
        { label: "Il a pris un coup", to: "repair-choc" },
        { label: "Autre chose", to: "repair-autre" },
        { label: "⬅ Retour au menu", to: "start" }
      ]
    },
    "repair-son": {
      text: "Ça sent la révision complète : tampons, clés, étanchéité. Diagnostic gratuit à l'atelier, devis sans engagement.",
      options: [
        { label: "Voir les réparations", href: "reparations.html" },
        { label: "⬅ Retour au menu", to: "start" }
      ]
    },
    "repair-choc": {
      text: "Un bon débosselage et il repart comme neuf. C'est une spécialité de l'atelier.",
      options: [
        { label: "Voir les réparations", href: "reparations.html" },
        { label: "⬅ Retour au menu", to: "start" }
      ]
    },
    "repair-autre": {
      text: "Dans le doute, direction diagnostic gratuit : Amaury regarde et vous dit ce qu'il en est, sans engagement.",
      options: [
        { label: "Voir les réparations", href: "reparations.html" },
        { label: "⬅ Retour au menu", to: "start" }
      ]
    },
    infos: {
      text: "Lundi–Samedi, 9h–12h puis 14h–18h30. Fermé le dimanche (même les lutins de l'atelier se reposent). 993 rue du Château d'Eau, Bourg-Achard.",
      options: [
        { label: "Voir le plan d'accès", href: "index.html#contact" },
        { label: "⬅ Retour au menu", to: "start" }
      ]
    },
    human: {
      text: "Le plus rapide, c'est d'appeler directement. Sinon WhatsApp ou e-mail marchent aussi.",
      options: [
        { label: "📞 Appeler " + TEL, href: TEL_HREF },
        { label: "💬 WhatsApp", href: WA_HREF },
        { label: "✉️ Écrire un e-mail", href: MAIL_HREF },
        { label: "⬅ Retour au menu", to: "start" }
      ]
    }
  };

  var keywordRoutes = [
    { re: /merci/i, reply: "Avec plaisir ! 🎶" },
    { re: /bonjour|salut|coucou/i, reply: "Bonjour à vous aussi ! Utilisez les boutons ci-dessous pour qu'on avance plus vite." },
    { re: /prix|tarif|combien/i, node: "find-conseil" },
    { re: /horaire|ouvert|adresse|où/i, node: "infos" },
    { re: /répar|casse|panne/i, node: "repair" },
    { re: /instrument|achat|vente|catalogue/i, node: "find" }
  ];

  function build() {
    var wrap = document.createElement("div");
    wrap.className = "chatbot";
    wrap.innerHTML =
      '<button type="button" class="chatbot-toggle" id="chatbot-toggle" aria-expanded="false" aria-controls="chatbot-panel">' +
        '<span class="chatbot-toggle-icon" aria-hidden="true">🎺</span>' +
        '<span class="chatbot-toggle-label">Besoin d’un coup de main ?</span>' +
      '</button>' +
      '<div class="chatbot-panel" id="chatbot-panel" hidden>' +
        '<header class="chatbot-header">' +
          '<span>🎺 Piston — l’assistant de l’atelier</span>' +
          '<button type="button" class="chatbot-close" aria-label="Fermer l’assistant">×</button>' +
        '</header>' +
        '<div class="chatbot-messages" id="chatbot-messages" role="log" aria-live="polite"></div>' +
        '<div class="chatbot-quick" id="chatbot-quick"></div>' +
        '<form class="chatbot-form" id="chatbot-form">' +
          '<input type="text" id="chatbot-input" placeholder="…ou écrivez votre question" autocomplete="off">' +
          '<button type="submit">Envoyer</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(wrap);
    return wrap;
  }

  function init() {
    var wrap = build();
    var toggle = wrap.querySelector("#chatbot-toggle");
    var panel = wrap.querySelector("#chatbot-panel");
    var closeBtn = wrap.querySelector(".chatbot-close");
    var messages = wrap.querySelector("#chatbot-messages");
    var quick = wrap.querySelector("#chatbot-quick");
    var form = wrap.querySelector("#chatbot-form");
    var input = wrap.querySelector("#chatbot-input");
    var started = false;

    function addMessage(text, from) {
      var el = document.createElement("p");
      el.className = "chatbot-msg chatbot-msg--" + from;
      el.textContent = text;
      messages.appendChild(el);
      messages.scrollTop = messages.scrollHeight;
    }

    function say(text) {
      var typing = document.createElement("p");
      typing.className = "chatbot-msg chatbot-msg--bot chatbot-typing";
      typing.textContent = "…";
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;
      setTimeout(function () {
        typing.remove();
        addMessage(text, "bot");
      }, 450);
    }

    function renderOptions(options) {
      quick.replaceChildren();
      options.forEach(function (opt) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chatbot-option";
        btn.textContent = opt.label;
        btn.addEventListener("click", function () {
          addMessage(opt.label, "user");
          if (opt.href) {
            say("C'est par ici 👉");
            setTimeout(function () { window.location.href = opt.href; }, 350);
          } else {
            goTo(opt.to);
          }
        });
        quick.appendChild(btn);
      });
    }

    function goTo(id) {
      var node = nodes[id] || nodes.start;
      setTimeout(function () {
        say(node.text);
        setTimeout(function () { renderOptions(node.options); }, 500);
      }, 150);
    }

    function openPanel() {
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      if (!started) {
        started = true;
        say(nodes.start.text);
        setTimeout(function () { renderOptions(nodes.start.options); }, 500);
      }
      input.focus();
    }

    function closePanel() {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }

    toggle.addEventListener("click", function () {
      if (panel.hidden) openPanel(); else closePanel();
    });
    closeBtn.addEventListener("click", closePanel);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) closePanel();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = input.value.trim();
      if (!value) return;
      addMessage(value, "user");
      input.value = "";
      var match = keywordRoutes.find(function (r) { return r.re.test(value); });
      if (match && match.node) {
        goTo(match.node);
      } else if (match && match.reply) {
        say(match.reply);
      } else {
        say("Je suis un petit robot artisanal, pas un vrai luthier ! Utilisez les boutons ci-dessous, ou appelez directement Amaury au " + TEL + ".");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
