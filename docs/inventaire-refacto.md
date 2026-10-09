# Inventaire des valeurs codées en dur — refacto « template »

Branche : `refacto-template` · Relevé du 2026-10-09 sur les fichiers suivis par git
(hors `assets/data/catalogue.json`, `assets/img/`, `assets/fonts/`, `node_modules/`, fichiers `.md`).
Notation : `fichier:ligne`. Les blocs répétés à l'identique sur les 14 pages publiques sont regroupés.

Pages publiques concernées (14) : `index`, `catalogue`, `reparations`, `reparation-instruments-vent-eure`,
`achat-vente-instruments-normandie`, `instruments-a-vent`, `instruments-a-cordes`, `amaury-plecety`,
`actualite`, `merci`, `mentions-legales`, `politique-confidentialite`, `plan-du-site`, `404`.

---

## 0. Écarts avec les inventaires de `_sources-apy/`

| Point | Inventaire fourni | Constat dans le dépôt |
|---|---|---|
| Domaine canonique | `apy-musique.netlify.app` | **`apymusique.fr`** partout (canonical, og:url, JSON-LD, sitemap, robots, llms). `netlify.app` n'apparaît que dans `netlify/lib/common.mjs:35` et `audit/`. Un 3ᵉ domaine, `lacaveauxinstrum.fr`, reste dans `netlify.toml:36-37` et `.htaccess:14-15`. |
| E-mail `amaury.plecety@laposte.net` | « contact, footer, JSON-LD » | **Absent du site.** Il n'est que dans `README.md:59,134`. Le formulaire envoie vers la variable d'environnement `CONTACT_TO` (`netlify/functions/contact.mjs:71`). |
| Bandeau « Le plus gros stock… » | bandeau d'annonce | **Absent du HTML actuel** (présent seulement dans `_sources-apy/_t-index-avant.html`). Restent : le CSS `.announce-bar` (`assets/css/style.css:266-290 env.`) et une formule voisine « L'un des plus grands stocks d'instruments » (`catalogue.html:88`). |
| Note Google | 5,0 / 17 avis | Visible : 5,0 / 17 (`index.html:272`). **JSON-LD contradictoire : 4,8 / 12** (`index.html:72-76`). |
| README lié en dur | illisible | Lu sans difficulté, pas besoin de copie. |

---

## 1. Identité (→ `entreprise`)

| Valeur | Où |
|---|---|
| Nom « APY Musique » dans `<title>` | `404:7`, `achat-vente…:7`, `actualite:7`, `amaury-plecety:7`, `index:7`, `instruments-a-cordes:7`, `instruments-a-vent:7`, `mentions-legales:7`, `merci:7`, `plan-du-site:7`, `politique-confidentialite:7`, `reparation-…-eure:7`, `reparations:7` (`catalogue:7` n'a pas le nom) |
| `og:site_name` « APY Musique » | `achat-vente…:12`, `amaury-plecety:12`, `catalogue:12`, `index:15`, `instruments-a-cordes:12`, `instruments-a-vent:12`, `reparation-…-eure:12`, `reparations:12` |
| En-tête : `APY Musique<small>Atelier familial · Bourg-Achard</small>` | `404:24`, `achat-vente…:68`, `actualite:25`, `amaury-plecety:80`, `catalogue:46`, `index:102`, `instruments-a-cordes:46`, `instruments-a-vent:46`, `mentions-legales:25`, `merci:25`, `plan-du-site:25`, `politique-confidentialite:25`, `reparation-…-eure:73`, `reparations:103` |
| Pied de page : `<strong>APY Musique</strong>` + « À propos d'APY Musique » | `404:74,76` · `achat-vente…:148,150` · `actualite:74,76` · `amaury-plecety:187,189` · `catalogue:176,178` · `index:387,389` · `instruments-a-cordes:138,140` · `instruments-a-vent:140,142` · `mentions-legales:110,112` · `merci:67,69` · `plan-du-site:78,80` · `politique-confidentialite:104,106` · `reparation-…-eure:151,153` · `reparations:190,192` |
| Logo `assets/img/logo-apy.png` (en-tête, pied, favicon) | `index:26,101,386` et même schéma sur toutes les pages |
| `meta author` « Amaury & Jean-Michel Plecety — APY Musique » | `index:10` |
| Manifeste PWA : `name`, `short_name`, `description` | `site.webmanifest:2,3,4` |
| `document.title = … + ' — APY Musique'` | `assets/js/actualite.js:33` |
| Expéditeur e-mail « Site APY Musique » | `netlify/functions/contact.mjs:74`, `netlify/functions/contact-editeur.mjs:79,82` |
| Métadonnées EXIF des photos (Copyright, Artist, Description) | `netlify/lib/jpeg.mjs:35,36,37` |
| Filigrane « © APY Musique » des photos admin | `admin/catalogue.js:89` |
| Admin : titre et en-tête | `admin/index.html:9,20,133`, `admin/journal.html:9,20,70` |
| `package.json` description | `package.json:5` |
| Commentaires d'en-tête de fichiers (`/* APY Musique — … */`) | `assets/js/main.js:1`, `catalogue.js:1`, `galerie.js:1`, `admin/catalogue.js:1`, `admin/journal.js:1`, `netlify.toml:1`, `robots.txt:1` |
| `llms.txt` (nom, description, liens) | `llms.txt:1,3,5,9,10,22,31` |

### Personnes (→ `equipe`)

| Valeur | Où |
|---|---|
| Amaury Plecety (repreneur) / Jean-Michel Plecety (fondateur) — JSON-LD | `index:57,59,60`, `amaury-plecety:32,46` |
| Signature du hero « Amaury » | `index:144` |
| « Amaury vous répond sous 1 à 2 jours » (fenêtre de contact, 14 pages) | `404:109`, `achat-vente…:183`, `actualite:110`, `amaury-plecety:223`, `catalogue:212`, `index:424`, `instruments-a-cordes:173`, `instruments-a-vent:175`, `mentions-legales:145`, `merci:102`, `plan-du-site:113`, `politique-confidentialite:139`, `reparation-…-eure:186`, `reparations:226` |
| Textes de pré-remplissage « Bonjour Amaury… » | `assets/js/contact-dialog.js:25,26` |
| Prénoms dans les textes (Amaury, Jean-Michel) | `index:167-190,299,338`, `catalogue:89,164`, `reparation-…-eure:127`, toute la page `amaury-plecety.html` |
| `alt` des photos nominatives | `index:154,156,159,228,229`, `amaury-plecety:121-132`, `reparations:164` |

---

## 2. Coordonnées (→ `contact`)

| Valeur | Où |
|---|---|
| Adresse « 993 rue du Château d'Eau, 27310 Bourg-Achard » (texte) | `index:319`, `achat-vente…:134`, `mentions-legales:72`, `politique-confidentialite:68`, `llms.txt:38` |
| Adresse (JSON-LD `streetAddress` / `postalCode` / `addressLocality` / `addressRegion`) | `index:49-52`, `achat-vente…:40-43`, `amaury-plecety:39-42`, `reparation-…-eure:39-42`, `reparations:39-42` |
| Accès « Entre Rouen et Pont-Audemer, près de l'A13… » | `index:323`, `achat-vente…:134` |
| Téléphone 1 `06 34 50 91 97` / `+33634509197` | `index:42,307,311`, `achat-vente…:35`, `reparation-…-eure:36`, `reparations:36`, `mentions-legales:73`, `merci:57`, `llms.txt:39` |
| Téléphone 2 `02 32 56 80 61` / `+33232568061` | `index:307`, `llms.txt:39` |
| E-mail public | **aucun** sur le site (voir §0) |
| Destinataire du formulaire | variable d'env. `CONTACT_TO` (`netlify/functions/contact.mjs:71`) — à ne pas toucher |
| Copie cachée des messages à l'éditeur `cedricmahdaoui@gmail.com` | `netlify/functions/contact.mjs:76` |
| Destinataire « écrire à l'éditeur » `cedricmahdaoui@gmail.com` | `netlify/functions/contact-editeur.mjs:15` |
| Délai de réponse « sous 24 h à 48 h » / « 1 à 2 jours » | `index:299,338`, `merci:57` + les 14 `data-contact-note` ci-dessus |

### WhatsApp (→ `contact.whatsapp`, bloc `whatsapp`)

| Valeur | Où |
|---|---|
| Lien `wa.me/33634509197?text=…site APY Musique…` (bouton flottant, 14 pages) | `404:92`, `achat-vente…:166`, `actualite:92`, `amaury-plecety:205`, `catalogue:194`, `index:405`, `instruments-a-cordes:156`, `instruments-a-vent:158`, `mentions-legales:128`, `merci:85`, `plan-du-site:96`, `politique-confidentialite:122`, `reparation-…-eure:169`, `reparations:208` |
| Carte WhatsApp de la section contact | `index:310-311` |
| Mention « écrire par WhatsApp » dans le message d'erreur | `assets/js/contact-dialog.js:136` |
| Animation liée au lien Contact | `assets/js/main.js:31`, `assets/css/style.css:1262-1300 env.` |

### Réseaux (→ `contact.reseaux`)

| Valeur | Où |
|---|---|
| Facebook `facebook.com/people/Amaury-PlecetY-APY-Musique/100054372527027/` | `index:71` (JSON-LD), `index:315`, `amaury-plecety:48` (JSON-LD), `amaury-plecety:171`, `catalogue:155` |

---

## 3. Horaires (→ `horaires`)

| Valeur | Où |
|---|---|
| Lun-sam 9 h-12 h · 14 h-18 h 30, dimanche fermé (affichage) | `index:329,330` |
| Source « fiche Google, relevés le 8 septembre 2026 » | `index:332` |
| `openingHoursSpecification` JSON-LD | `index:67-70` |
| Version texte | `llms.txt:40` |

---

## 4. Légal (→ `legal`)

| Valeur | Où |
|---|---|
| SIRET `841 052 764 00013` dans le pied de page (14 pages), avec « Plecety » | `404:85`, `achat-vente…:159`, `actualite:85`, `amaury-plecety:198`, `catalogue:187`, `index:398`, `instruments-a-cordes:149`, `instruments-a-vent:151`, `mentions-legales:121`, `merci:78`, `plan-du-site:89`, `politique-confidentialite:115`, `reparation-…-eure:162`, `reparations:201` |
| SIRET JSON-LD `84105276400013` | `index:44`, `achat-vente…:36` |
| Éditeur, forme (entrepreneur individuel), noms commerciaux, responsable de publication | `mentions-legales:69-71` |
| SIREN, code APE 95.29Z, date de création 3 sept. 2018 | `mentions-legales:74-77` ; `foundingDate` JSON-LD `index:45` |
| TVA (franchise art. 293 B, « à confirmer ») | `mentions-legales:65,78-81` |
| Hébergeur Netlify, Inc. + adresse | `mentions-legales:84` |
| Conception : « Cédric — 07 49 99 28 51 » | `mentions-legales:86` |
| Responsable de traitement (confidentialité) | `politique-confidentialite:68` |
| Messagerie OVH, journal Netlify | `politique-confidentialite:79` |
| Date de mise à jour « 8 septembre 2026 » | `politique-confidentialite:95` |
| Crédit pied de page « Fait avec ❤ par Cédric » (14 pages) | `404:86`, `achat-vente…:160`, `actualite:86`, `amaury-plecety:199`, `catalogue:188`, `index:399`, `instruments-a-cordes:150`, `instruments-a-vent:152`, `mentions-legales:122`, `merci:79`, `plan-du-site:90`, `politique-confidentialite:116`, `reparation-…-eure:163`, `reparations:202` |

---

## 5. Carte et Google Maps (→ `contact.geo`, bloc `carte`)

| Valeur | Où |
|---|---|
| Lien fiche Google « Plecety Jean Michel » (`/maps/place/…@49.3620309,0.8053628…`) | `index:71` (JSON-LD `sameAs`), `index:274` (bouton avis), `index:344` (plan) |
| Itinéraire `maps/dir/?api=1&destination=49.3620309,0.8053628` | `index:372` |
| `geo` latitude / longitude JSON-LD | `index:55`, `achat-vente…:46`, `reparation-…-eure:45`, `reparations:45` |
| Libellé « Voir le plan · Bourg-Achard » | `index:368` |
| Illustration SVG du plan (couleur `#7c8a52` en dur) | `index:347-365` |

---

## 6. Domaines (→ `seo.domaine`)

| Valeur | Où |
|---|---|
| `https://apymusique.fr/…` : canonical, `og:url`, `og:image` | lignes 10/12, 16/19, 17/20 de chaque page à en-tête SEO (voir §8) ; canonical seul : `actualite:9`, `mentions-legales:10`, `merci:10`, `plan-du-site:10`, `politique-confidentialite:10` |
| `apymusique.fr` dans le JSON-LD (`@id`, `url`, `image`, fil d'Ariane) | `index:38,41,46,89`, `catalogue:33-34`, `instruments-a-vent:33-34`, `instruments-a-cordes:33-34`, `amaury-plecety:68`, `achat-vente…:56`, `reparation-…-eure:61`, `reparations` (blocs 28-80) |
| `sitemap.xml` (11 URL) | `sitemap.xml:4,9,14,19,24,29,34,39,44,49,54` |
| `robots.txt` | `robots.txt:18` |
| `llms.txt` | `llms.txt:14,15,19-26,32,34` |
| CORS autorisés (`apymusique.fr`, `www.`, `apy-musique.netlify.app`) | `netlify/lib/common.mjs:35` |
| Proxy des photos distantes du serveur local | `tools/dev-server.mjs:75` |
| Redirection `lacaveauxinstrum.fr` → `www.lacaveauxinstrum.fr` (**ancien domaine**) | `netlify.toml:36-37` (prod, **hors périmètre**), `.htaccess:14-15` |
| Domaines dans `audit/` (doc interne) | `audit/deploy.sh:193,258,259`, `audit/healthcheck.sh:18,19,180,181,198`, `audit/infrastructure.json:4,5,135,136` |

---

## 7. JSON-LD (→ généré depuis la config)

| Bloc | Où | Contenu propre au client |
|---|---|---|
| `MusicStore` complet | `index:34-78` | nom, description, url, tél., `priceRange €€`, SIRET, `foundingDate`, adresse, geo, `areaServed`, fondateur, employés, offres, horaires, `sameAs`, `aggregateRating 4.8/12` (**faux par rapport au 5,0/17 affiché**) |
| `BreadcrumbList` accueil | `index:80-93` | domaine |
| Commerce local (page achat-vente) | `achat-vente…:28-49` | nom, tél., SIRET, adresse, geo, `areaServed` |
| Fil d'Ariane | `achat-vente…:50`, `amaury-plecety:62`, `catalogue:28`, `instruments-a-cordes:28`, `instruments-a-vent:28`, `reparation-…-eure:55`, `reparations:52` | domaine, libellés |
| `Person` Amaury | `amaury-plecety:28-51` | nom, parent, employeur, adresse, `sameAs` |
| `WebPage`/`ProfilePage` | `amaury-plecety:52` | |
| `Service` réparation | `reparation-…-eure:28-54`, `reparations:28-51` | nom, tél., adresse, geo, zones |
| `FAQPage` | `reparations:62-90 env.` (« garanties 1 an » `:85`) | textes |
| Autre | `reparations:72` | |

Note : `tools/csp-hashes.mjs` doit être relancé si un bloc JSON-LD change (`tools/csp-hashes.mjs:8`).

---

## 8. Balises meta et SEO (→ `seo`, `pages[].seo`)

| Valeur | Où |
|---|---|
| `<title>` propres à chaque page | ligne 7 de chaque page (voir §1) |
| `meta description` | ligne 8 de : `404`, `achat-vente…`, `amaury-plecety`, `catalogue`, `index`, `instruments-a-cordes`, `instruments-a-vent`, `mentions-legales`, `merci`, `plan-du-site`, `politique-confidentialite`, `reparation-…-eure`, `reparations` |
| `meta keywords` | `index:9` |
| `og:type` (`business.business`, `profile`, `website`) | `index:14`, `amaury-plecety:11`, ligne 11 des autres pages SEO |
| `og:title` / `og:description` | `index:16-17`, `achat-vente…:13-14`, `amaury-plecety:13-14`, `catalogue:13-14`, `instruments-a-cordes:13-14`, `instruments-a-vent:13-14`, `reparation-…-eure:13-14`, `reparations:13-14` |
| `og:image` `og-image.jpg` 1200×630 | ligne 17-19 (20-22 sur `index`) |
| `theme-color #241812` | `404:10`, `actualite:10`, `mentions-legales:11`, `merci:11`, `plan-du-site:11`, `politique-confidentialite:11`, ligne 21 des autres pages, `index:24` |
| CSP en `<meta>` | ligne 5 de chaque page (à garder telle quelle) |

---

## 9. Couleurs et typographie (→ `theme`)

| Valeur | Où |
|---|---|
| Palette clair : `--walnut-900…600`, `--wood-500`, `--ivory`, `--ivory-2`, `--paper`, `--brass*`, `--copper`, `--verdigris`, `--ink`, `--text`, `--text-soft`, `--line`, `--focus` | `assets/css/style.css:35-56` |
| Dégradés | `style.css:73-74` |
| Palette sombre (deux blocs identiques) | `style.css:80-93`, `style.css:102-115` |
| Rappel palette claire | `style.css:1474-1477` |
| Thème « noir et or » de l'accueil et des pages internes (`#dfb748`, `#140d08`, `#1a120c`…) | `style.css:1545-1664`, `style.css:1777-1798` |
| ~60 couleurs littérales hors variables | `style.css:156-159, 269, 465-1418, 1484-1983` (détail dans le relevé brut) |
| Bandeau d'annonce rouge `#7a1f1f → #b13030` | `style.css:269` |
| Vert WhatsApp `#25d366` | `style.css:1273` |
| Couleurs du manifeste | `site.webmanifest:9,10` |
| Police Fraunces (préchargée) | ligne 30 de `index.html` et équivalent sur chaque page ; `@font-face` dans `style.css` |

---

## 10. Textes éditoriaux (→ `pages`, `services`)

| Bloc | Où |
|---|---|
| Hero : sur-titre, titre, sous-titre, boutons, citation | `index:136-144` |
| Histoire : titre, 2 paragraphes, 3 étapes, citation de Jean-Michel, encart « La relève » | `index:165-190` |
| Services : en-tête, 2 cartes (tag, titre, texte, puces, bouton), bulles photo | `index:201-240` |
| À la une : en-tête (contenu chargé par `assets/js/news.js`) | `index:250-254` |
| Contact : en-tête, encart « Écrire à l'atelier » | `index:297-299,337-339` |
| Navigation (menu, sous-menus Cuivres/Bois) | `index:107-123`, identique sur les autres pages |
| Page catalogue : chapeau « L'un des plus grands stocks d'instruments… » | `catalogue:88` |
| Pages réparations, SEO locales, instruments, Amaury | contenus entiers propres au client |
| Communes desservies | `reparation-…-eure:137`, `achat-vente…:134` |
| Phrases « galerie à compléter » / mentions prudentes du catalogue | `assets/js/catalogue.js` (mentions « à confirmer ») |

---

## 11. Témoignages et avis (→ `temoignages`, bloc `temoignages`)

| Valeur | Où |
|---|---|
| Résumé « 5,0 / 5 sur Google · 17 avis », lien, date du relevé | `index:271-275` |
| **3 témoignages « Exemple de témoignage »** (à retirer, règle 6) | `index:277-280`, `index:281-284`, `index:285-288` |
| Commentaire « Témoignages d'exemple… Voir README.md » | `index:267-268` |
| `aggregateRating` 4.8 / 12 (incohérent) | `index:72-76` |

---

## 12. Éléments à ne pas reprendre (règles 7 et 8)

| Élément | Où | Traitement prévu |
|---|---|---|
| « d'après le reportage de France 3 Normandie » | `amaury-plecety:173` | retrait |
| Bandeau « plus gros stock de France » | absent du HTML ; CSS `style.css:266+` | bloc `bandeau` optionnel, désactivé par défaut, sans texte par défaut |
| « L'un des plus grands stocks d'instruments » | `catalogue:88` | **à trancher** (formule proche, voir points à trancher) |

---

## 13. Hors périmètre de la configuration (je n'y touche pas)

- `netlify.toml`, `_headers`, `.htaccess` : production, règle 3.
- Variables d'environnement (`CONTACT_TO`, `CONTACT_SMTP_*`, mots de passe admin).
- `assets/data/catalogue.json` : règle 2 (`skip-worktree` vérifié : `S`).
- `audit/` : documentation interne.

---

## 14. Points à trancher avant l'étape 3

1. **Le schéma `site.schema.json` n'est qu'un squelette.** Il exige 8 clés
   (`version`, `entreprise`, `contact`, `horaires`, `legal`, `seo`, `pages`, `blocs_actifs`)
   mais ne déclare aucune `properties` et pose `additionalProperties: false`.
   Conséquence : **aucun fichier ne peut être valide** (chaque clé obligatoire est
   aussi une propriété interdite). Il faut le compléter. Je peux proposer une version
   complète (`properties` pour les 8 blocs + `equipe`, `services`, `temoignages`,
   `theme`, avec `temoignages[].verifie`) : à valider par vous, car c'est votre fichier.
2. **Comment le site lit la configuration.** Le site est statique, sans build, avec une
   CSP `script-src 'self'`. Deux options :
   - **A. Générateur Node sans dépendance** (`scripts/build-config.mjs`) qui réécrit
     les zones balisées des pages HTML, du JSON-LD, du sitemap, etc. à partir de
     `site.config.json`. Le HTML livré reste complet : SEO et JSON-LD intacts, rien
     ne change pour la production tant qu'on ne relance pas le script. **Recommandé.**
   - **B. Lecture en JavaScript dans le navigateur** (`fetch('/site.config.json')`).
     Mauvais pour le SEO (title, meta et JSON-LD injectés après coup), et
     `.htaccess` bloque déjà les `.json`.
3. **`.gitignore` et production.** Si `site.config.json` est ignoré par git, Netlify
   (déploiement par git) ne le verra jamais. Avec l'option A ce n'est pas gênant :
   le HTML généré est commité, la config reste locale. Avec B, le site de prod casserait.
4. **Domaine** : `apymusique.fr` (actuel) ; `lacaveauxinstrum.fr` est un reste dans
   `netlify.toml` et `.htaccess` (je n'y touche pas).
5. **E-mail public** : aucun sur le site. Je laisse `contact.email` vide ou je reprends
   `amaury.plecety@laposte.net` du README (« à confirmer » selon le README) ?
6. **Note JSON-LD 4,8/12 contre 5,0/17 affiché** : je génère le JSON-LD depuis la valeur
   affichée (5,0/17, relevée le 8/09/2026), ou je supprime `aggregateRating`
   (Google déconseille les avis auto-déclarés sur sa propre fiche) ?
7. **« L'un des plus grands stocks d'instruments »** (`catalogue:88`) : même nature que
   le bandeau interdit. Je le passe dans la config (texte modifiable) ou je le retire ?
8. **Crédit éditeur et copie cachée** (« Cédric », `cedricmahdaoui@gmail.com` en dur
   dans `contact.mjs` et `contact-editeur.mjs`) : je les rends paramétrables dans un bloc
   `editeur` de la config, ou je les laisse en dur (c'est votre signature sur tous les sites du kit) ?
9. **Portée des pages** : les pages très spécifiques (`amaury-plecety`, `instruments-a-vent`,
   `instruments-a-cordes`, les 2 pages SEO locales) : je ne paramètre que les valeurs
   transverses (nom, coordonnées, domaine, SIRET, JSON-LD, meta), et leurs textes
   restent en HTML ? Les passer entièrement en config alourdirait beaucoup le fichier.
10. **Fonctions et admin** (`jpeg.mjs`, `contact*.mjs`, `admin/`) : lecture de la config
    côté serveur aussi, ou seulement le site public pour cette version ?
