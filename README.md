# APY Musique — site vitrine

Refonte du site `la-cave-aux-instrum.wifeo.com` en **site vitrine une page**,
au style artisanal et chaleureux (tons bois / ivoire, accents cuivre‑laiton,
titres en serif *Fraunces*).

Site **statique** (HTML/CSS/JS), sans base de données ni build : les fichiers
se déposent tels quels sur n'importe quel hébergement.

**Atelier familial** — Amaury Plecety, qui reprend progressivement l'activité,
et son père Jean‑Michel. Vente, réparation et restauration d'instruments à
vent, cuivres et cordes. Bourg‑Achard (Eure, Normandie).
Le site met volontairement **Amaury au premier plan** (hero, section « La relève »,
services, formulaire, données structurées).

Source biographique : reportage France 3 Normandie, *« Bourg‑Achard : en famille,
ils redonnent une nouvelle vie aux instruments de musique »*.

---

## 1. Structure

```
/
├── index.html                          Vitrine : hero · #histoire · #services ·
│                                         #galerie · #avis · #contact
├── catalogue.html                      Catalogue d'instruments filtrable
├── amaury-plecety.html                 Page dédiée à la reprise de l'atelier
├── reparations.html                    Atelier, prestations, avant/après
├── reparation-instruments-vent-eure.html   Page SEO locale (réparation · Eure)
├── achat-vente-instruments-normandie.html  Page SEO locale (achat-vente · Normandie)
├── instruments-a-vent.html             Page détail — cuivres / bois
├── instruments-a-cordes.html           Page détail — quatuor
├── merci.html                          Confirmation d'envoi du formulaire
├── mentions-legales.html               À compléter (champs entre crochets)
├── politique-confidentialite.html      RGPD, à dater à la mise en ligne
├── plan-du-site.html · 404.html
├── admin/                              Espace d'administration du catalogue
│     ├── index.html · catalogue.js     Éditeur hors ligne (universel)
│     └── cms.html · config.yml         Decap CMS (optionnel, Netlify + Git)
├── robots.txt · sitemap.xml            Référencement
├── site.webmanifest                    PWA / icône mobile
├── .htaccess · _headers · netlify.toml Sécurité + redirections (3 hébergeurs)
├── lancer-le-site.bat                  Aperçu local en 1 double-clic (Windows)
├── assets/css/style.css               Feuille de style unique
├── assets/js/main.js                  Menu mobile + garde-fous formulaire + barre mobile
├── assets/js/catalogue.js             Filtres du catalogue (lit assets/data/catalogue.json)
├── assets/data/catalogue.json         Les instruments à vendre
├── assets/fonts/fraunces-*.woff2      Police auto-hébergée
├── assets/img/                        Logo, icônes, photos
└── tools/                             dev-server.mjs (aperçu) · csp-hashes.mjs
```

## 2. À personnaliser avant mise en ligne

| Élément | Où | Remarque |
|---|---|---|
| Domaine `www.lacaveauxinstrum.fr` | tous les fichiers | Rechercher / remplacer par le vrai domaine |
| Coordonnées (tél 06 34 50 91 97, e‑mail `amaury.plecety@laposte.net`, adresse) | pieds de page + `index.html` + JSON‑LD | Relevées des fiches publiques — à confirmer |
| **WhatsApp** | barre mobile (toutes les pages) + `index.html` `#contact` | Le lien `wa.me/33634509197` suppose que ce numéro est sur WhatsApp — **le retirer sinon** (commentaire dans le HTML + `.mb-wa` / `.mobile-bar` dans le CSS) |
| **Horaires** | `index.html` `#contact` + JSON‑LD | Relevés sur Google Maps le 8 sept. 2026 |
| **Témoignages** | `index.html` `#avis` | Exemples masqués — voir §6 |
| **Catalogue** | `catalogue.html` (bloc `<script type="application/json">`) | voir §7 |
| Mentions légales | `mentions-legales.html` | Coordonnées et SIRET pré-remplis à partir d'informations publiques : **à valider avec Amaury avant publication**, ainsi que le régime de TVA et l'hébergeur (Netlify pré-rempli — à changer si autre). |
| Date politique de confidentialité | `politique-confidentialite.html` | |
| Formulaire | `index.html` | Netlify Forms — activer la notification e‑mail dans Netlify (§5) |
| Photos des galeries détail | `assets/img/` | voir §8 |

Un simple rechercher‑remplacer de `lacaveauxinstrum.fr` suffit pour le domaine.

## 3. Direction artistique

- **Palette** : noyer (`--walnut-*`), ivoire (`--ivory*`), cuivre / laiton
  (`--brass*`, `--copper`). Toutes les couleurs sont des variables CSS en haut
  de `assets/css/style.css` — faciles à ajuster.
- **Typographie** : titres en **Fraunces** (serif « old style ») **auto‑hébergée**
  (`assets/fonts/fraunces-latin*.woff2`, variable 400–700) — aucun appel à Google
  Fonts. Texte en sans‑serif système. Repli serif automatique.
  Mise à jour de la police : retélécharger les `.woff2` sur
  <https://gwfh.mranftl.com> (ou fonts.google.com) et remplacer les fichiers.
- **Mode sombre** géré automatiquement (préférence système).
- Galerie avec **zoom au survol**, sections alternées ivoire / noyer, fil rouge
  « transmission ».
- **Bandeau d'accueil** : l'illustration d'ambiance `assets/img/hero-atelier-artisanal.jpg`
  (1760 px, ≈130 Ko, préchargée) a été générée pour le site. Décor uniquement — ne
  pas la légender comme une photographie de l'atelier ; les photos réelles restent
  privilégiées dans la galerie et le catalogue.
- **Icônes & favicon** : `assets/img/logo.svg` + `favicon-32.png`,
  `apple-touch-icon.png` (180), `icon-192/512.png`, `maskable-512.png`,
  et l'image de partage `og-image.jpg` (1200×630) — toutes générées à partir de
  l'identité visuelle. Pour les régénérer, adapter le script dans le commit
  ou redessiner à la main.

## 4. Référencement (SEO) — ce qui est en place

- **Titres et méta‑descriptions uniques** par page, orientés requêtes
  (« réparation instrument à vent », « restauration cuivres », « atelier Bourg‑Achard »…).
- **Données structurées Schema.org** : `MusicStore` (nom, adresse, téléphone,
  e‑mail, horaires, offres, `founder` = Jean‑Michel, `employee` = Amaury puis
  Jean‑Michel, `sameAs` Facebook + Google Maps), `Service` (réparation),
  `Person` (Amaury), `BreadcrumbList` sur toutes les pages secondaires.
  À tester : <https://search.google.com/test/rich-results>
- **Pages d'atterrissage locales** : `reparation-instruments-vent-eure.html`,
  `achat-vente-instruments-normandie.html` — titres/contenus ciblés sur les
  requêtes « réparation instrument à vent Eure », « achat vente instruments
  Normandie », liste des communes desservies, liens internes.
- **`sitemap.xml`** + **`robots.txt`**, fil d'Ariane sur chaque page.
- **HTML sémantique**, un seul `<h1>` par page, `alt` sur toutes les images.
- **Accessibilité** : lien d'évitement, `aria-*`, focus visible, contrastes,
  `scroll-margin` pour les ancres sous l'en‑tête fixe.
- **Performance** : CSS unique, JS différé (`defer`), **police auto‑hébergée
  + `preload`**, cache long sur les assets, images `loading="lazy"`, aucune
  requête tierce.
- **Mobile‑first** + barre d'actions fixe (Appeler / WhatsApp / Écrire),
  Open Graph / Twitter Card avec image dédiée, `canonical`, `lang="fr"`.

### Après la mise en ligne (à faire côté atelier)
1. **Google Search Console** + **Bing Webmaster Tools** : soumettre `sitemap.xml`.
2. **Google Business Profile** (fiche établissement) : principal levier de
   visibilité locale. Nom / adresse / téléphone **identiques** au site
   (cohérence NAP). Y publier les photos de l'atelier et répondre aux avis.
3. Annuaires de confiance (Pages Jaunes, annuaires de musiciens), mêmes infos.
4. Remplacer les exemples du **catalogue** et les **témoignages** par du réel.

## 5. Formulaire de contact

Hébergement statique = pas de PHP : il faut un service qui reçoit l'envoi.

**Netlify Forms** (configuré dans le code — `data-netlify="true"`, champ caché
`form-name`, honeypot `site_web`, redirection vers `/merci.html`)
1. Déployer le dossier sur Netlify : le formulaire `contact` est détecté
   automatiquement au premier déploiement.
2. Dans Netlify → *Forms → Notifications*, ajouter une notification e‑mail vers
   `amaury.plecety@laposte.net`.
3. Le honeypot `site_web` (Netlify + JS), le délai minimal (JS) et la case de
   consentement limitent déjà le spam — pas de CAPTCHA nécessaire.

Hébergement **hors Netlify** (OVH, o2switch…) : les Netlify Forms ne
fonctionnent pas. Repasser sur un service type **Formspree**
(`action="https://formspree.io/f/VOTRE_ID"`, retirer les attributs
`data-netlify` / `netlify-honeypot` / le champ `form-name`) et rétablir
`form-action https://formspree.io` + `connect-src https://formspree.io`
dans la CSP des trois fichiers de config.

Penser à indiquer le prestataire réel du formulaire dans
`politique-confidentialite.html`.

## 6. Témoignages

La section `#avis` de `index.html` contient **trois témoignages d'exemple**,
signalés par un commentaire HTML et libellés « Exemple de témoignage ».

Avant mise en ligne : les remplacer par de **vrais avis** (avec l'accord des
clients), ou supprimer la section. Ne pas publier de faux avis nominatifs.
Bonne pratique : reprendre les avis Google Business Profile.

## 7. Catalogue & administration

Le catalogue de `catalogue.html` est **filtrable** (recherche, famille, état,
budget, disponibilité) et fonctionne sans base de données. Les instruments sont
dans le fichier **`assets/data/catalogue.json`** (forme : `{ "instruments": [ … ] }`).
Filtres reflétés dans l'URL (`?famille=vent&budget=500-1500`) — utile pour
partager un lien pré‑filtré. Le filtre « budget » exclut les articles à
« prix sur demande ». Les 8 articles livrés sont des **exemples** (les 3
saxophones photographiés sont réels).

Le bouton **« Réserver un essai »** d'une fiche mène à `/?instrument=<nom>#contact` :
le formulaire de contact de l'accueil se **pré‑remplit** alors avec l'instrument
concerné (sujet, message et champ caché `instrument`). Tant que le stock est
fictif, les fiches affichent « Disponibilité à confirmer » et « prix… à confirmer » ;
ces mentions prudentes sont dans `assets/js/catalogue.js` (à alléger quand le
catalogue sera réel).

### Espace d'administration — `/admin/` (recommandé pour Amaury)

Page **`/admin/`** : un éditeur visuel du catalogue, **sans installation, sans
compte, fonctionne sur n'importe quel hébergement**. On y ajoute / modifie /
réordonne / supprime les instruments, puis :
1. bouton **« Télécharger `catalogue.json` »** (ou « Copier le contenu ») ;
2. déposer ce fichier dans `assets/data/` du site (FTP → `www/assets/data/`,
   ou re‑déposer le dossier sur Netlify).

`/admin/` n'est pas indexé (`robots.txt` + `noindex`) et tourne sous la CSP
stricte. Pour le protéger par mot de passe en Apache, voir le bloc commenté
dans `.htaccess` (`.htpasswd`).

### Éditeur en ligne « Decap CMS » — `/admin/cms.html` (optionnel)

Vraie interface d'admin avec connexion, édition depuis le téléphone et
publication automatique. **Prérequis** : site sur **Netlify** + **dépôt Git**
(GitHub/GitLab) + *Identity* et *Git Gateway* activés (Netlify → Site settings).
Il faut aussi **élargir la CSP** pour `/admin/cms.html` : blocs commentés prêts
à activer dans `.htaccess`, `_headers` et `netlify.toml`. Le mapping des champs
est déjà écrit dans `admin/config.yml`.

Champ d'un instrument (`catalogue.json`) :

```json
{
  "nom": "Saxophone alto Selmer Mark VI",
  "famille": "vent",              // vent | cordes | percussion | accessoire
  "sousfamille": "Saxophone alto",
  "etat": "revise",               // revise | a-restaurer | piece
  "prix": 4200,                   // nombre — 0 = « Prix sur demande »
  "dispo": true,                  // false = vendu / en préparation
  "annee": "1965",                // "" si inconnu
  "photo": "/assets/img/xxx.jpg", // "" = visuel générique rayé
  "desc": "Une à deux phrases."
}
```

## 8. Photos

**Déjà en place** (vraies balises `<img>` avec `alt` et `loading="lazy"`) :
- section « Notre histoire » : `atelier-amaury-mark-vii.jpg`
- galerie de l'accueil : `restauration-01…05.jpg` + `catalogue-selmer-mark-vi`,
  `catalogue-selmer-serie-iii`, `catalogue-king-zephyr` (8 photos, zoom au survol)

**Plan d'accès** (section `#contact`) : illustration stylisée (SVG inline, aux
couleurs du site) cliquable vers la fiche Google Maps de l'atelier + bouton
« Calculer un itinéraire ». Aucune iframe, aucun cookie, aucun appel externe
tant que l'utilisateur ne clique pas. Pour une carte plus « réelle » sans
cookie : générer une image statique (Mapbox / capture d'écran) et la placer en
`<img>` dans le `<a class="contact-map">` à la place du `<svg class="map-illus">`.

**À compléter** — les blocs `<div class="placeholder">` restants (icône SVG sur
fond rayé) :
- galeries des pages `instruments-a-vent.html` et `instruments-a-cordes.html`
- exemples avant/après de `reparations.html`

Pour en remplacer un :

```html
<img src="/assets/img/mon-instrument.jpg"
     alt="Description précise de l'instrument"
     width="800" height="600" loading="lazy">
```

Dans la galerie, l'`<img>` se place **à l'intérieur du `<div class="frame">`**
(l'effet de zoom s'applique alors à la photo).

Conseils : **WebP** ou JPEG optimisé (les JPEG actuels peuvent être recompressés),
largeur ≈ 1600 px max, nom de fichier explicite, toujours un `alt`.
Une vraie photo d'Amaury (et de Jean-Michel) au travail renforcerait la section
« Notre histoire ».

## 9. Sécurité — ce qui est en place

| Mesure | Fichier | Effet |
|---|---|---|
| Redirection HTTP → HTTPS + www | `.htaccess`, `netlify.toml` | trafic chiffré, une seule URL canonique |
| **HSTS** | `.htaccess`, `_headers`, `netlify.toml` | force HTTPS côté navigateur |
| **CSP** stricte | idem | tout en `'self'` (`default/script/style/font/img/connect/form-action`) ; aucun domaine tiers ; anti‑XSS |
| `X-Frame-Options: DENY` + `frame-ancestors 'none'` | idem | anti‑clickjacking |
| `X-Content-Type-Options: nosniff` | idem | pas de MIME‑sniffing |
| `Referrer-Policy` | idem | ne fuite pas les URL complètes |
| `Permissions-Policy` | idem | coupe caméra, micro, géoloc, paiement, FLoC |
| `Cross-Origin-Opener-Policy` / `-Resource-Policy` | idem | isolation d'origine |
| Blocage `.md`, `.mjs`, `.json`, `-Indexes` | `.htaccess` | pas d'exposition des fichiers de travail |
| Suppression `X-Powered-By` / `ServerSignature` | `.htaccess` | moins d'infos pour un attaquant |
| Aucun cookie, aucun traceur | tout le site | pas de bandeau cookies nécessaire |
| Formulaire : honeypot + délai minimal + consentement | `index.html`, `main.js` | anti‑spam sans CAPTCHA |
| `rel="noopener noreferrer"` sur les liens externes | pages | anti `window.opener` |

### Points de vigilance
- **N'activez HSTS `preload` qu'une fois le HTTPS parfaitement en place.**
- Sur mutualisé, vérifier que `mod_headers` et `mod_rewrite` sont actifs.
- La CSP est entièrement fermée (`'self'`). Tout ajout externe (Google Maps
  intégré, YouTube, Analytics, un CDN…) impose de **l'élargir** et de
  réévaluer le besoin d'un bandeau cookies.
- Tester : <https://securityheaders.com> · <https://observatory.mozilla.org> ·
  <https://www.ssllabs.com/ssltest/>

### Scripts inline
`script-src 'self'` : tout script exécutable doit être un fichier `.js`.
Les blocs `<script type="application/ld+json">` sont des données et passent.
Si vous ajoutez un `<script>` inline : `node tools/csp-hashes.mjs` puis reporter
les empreintes dans la directive `script-src` des trois fichiers de config.

## 10. Aperçu en local

**Windows** : double‑cliquer sur **`lancer-le-site.bat`** — le serveur démarre et
le navigateur s'ouvre tout seul sur `http://localhost:4321`. Fermer la fenêtre
pour arrêter.

Sinon, en ligne de commande :

```bash
node tools/dev-server.mjs
```

puis ouvrir `http://localhost:4321`. Si le port est occupé, le serveur passe
automatiquement au suivant (4322, 4323…) et affiche l'adresse exacte.

> `lancer-le-site.bat` et le dossier `tools/` ne servent qu'à l'aperçu local :
> inutile de les mettre en ligne (le `.htaccess` les bloque de toute façon).

## 11. Mise en ligne

- **OVH / o2switch / Hostinger…** : envoyer tout le dossier par FTP dans `www/`.
  Le `.htaccess` s'applique automatiquement.
- **Netlify / Cloudflare Pages** : glisser‑déposer le dossier ou connecter un
  dépôt. `_headers` / `netlify.toml` s'appliquent.
- **GitHub Pages** : possible, mais les en‑têtes de sécurité doivent passer par
  un Cloudflare placé devant.
- Faire pointer le domaine, activer HTTPS (Let's Encrypt, 1 clic en général).
