/* Génère le site à partir des gabarits de src/ et d'un fichier de configuration.
 *
 * Usage :
 *   node scripts/generer-site.mjs                       (site.config.json -> racine du projet)
 *   node scripts/generer-site.mjs --config site.config.demo.json --sortie ../apercu-demo
 *   node scripts/generer-site.mjs --verifier            (n'écrit rien, liste les fichiers qui changeraient)
 *
 * Chaque fichier de src/ est un gabarit : il est rendu puis écrit au même chemin dans la sortie.
 * On ne modifie donc jamais directement les copies générées (index.html, sitemap.xml…) : on modifie src/.
 * Le script écrit aussi netlify/lib/site.mjs, lu par les fonctions serveur.
 * La configuration est validée avant toute écriture (scripts/validate-config.js).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { rendre, jsonIndente } from "./lib/gabarit.mjs";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (nom, defaut) => { const i = args.indexOf(nom); return i >= 0 ? args[i + 1] : defaut; };
const fichierConfig = resolve(option("--config", join(racine, "site.config.json")));
const sortie = resolve(option("--sortie", racine));
const verifier = args.includes("--verifier");

/* ---------- 1. Validation ---------- */
const v = spawnSync(process.execPath, [join(racine, "scripts/validate-config.js"), fichierConfig, join(racine, "site.schema.json")], { encoding: "utf8" });
if (v.status !== 0) {
  process.stdout.write(v.stdout || "");
  process.stderr.write(v.stderr || "");
  console.error("\n✖ Configuration invalide : aucun fichier n'a été généré.");
  process.exit(1);
}
const config = JSON.parse(readFileSync(fichierConfig, "utf8").replace(/^﻿/, ""));

/* ---------- 2. Valeurs par défaut des champs facultatifs ---------- */
const DEFAUTS = {
  entreprise: { presentation: "", date_creation: "", fourchette_prix: "", zones_desservies: [], offres: [] },
  equipe: [],
  contact: {
    interlocuteur: "", delai_reponse: "", telephone_secondaire: { affiche: "", international: "" },
    whatsapp: { numero: "", affiche: "", message: "" },
    adresse: { departement: "", region: "", pays_nom: "" }, acces: "",
    geo: { latitude: null, longitude: null }, google_maps_url: "",
    reseaux: { facebook: "", instagram: "", linkedin: "", youtube: "" },
  },
  horaires: { note: "" },
  legal: {
    noms_commerciaux: [], mention_copyright: "", registre: "", code_ape: "", libelle_ape: "",
    tva: { regime: "", numero: "", a_confirmer: false }, hebergeur: { url: "" }, messagerie: "", date_maj_confidentialite: "",
  },
  editeur: { nom: "", telephone: "", email: "", credit_actif: false, copie_cachee: false },
  seo: { mots_cles: [], auteur: "" },
  technique: { origines_autorisees: [], smtp_hote: "", exif_description: "" },
  theme: {
    couleur_navigateur: "#241812", couleur_fond_application: "#f7f0e1",
    couleurs: {
      "walnut-900": "#241812", "walnut-800": "#2f2015", "walnut-700": "#3d2a1c", "walnut-600": "#5a3d28",
      "wood-500": "#7a563a", ivory: "#f7f0e1", "ivory-2": "#efe4cf", paper: "#fffdf7",
      brass: "#b07a35", "brass-light": "#cd9a5b", "brass-dark": "#8a5c25", copper: "#a5623a", verdigris: "#4f6d5e",
      ink: "#2b2016", text: "#3a2e22", "text-soft": "#6c5c49", line: "#e0d2b8", focus: "#1a5fb4",
    },
  },
  accueil: { sur_titre: "", titre: "", sous_titre: "", citation: "", signature: "" },
  catalogue: { accroche: "" },
  temoignages: { note: { valeur: null, nombre: null, source: "", date_releve: "", url: "" }, avis: [] },
  bandeau: { texte: "" },
};
function fusionner(defaut, valeur) {
  if (valeur === undefined) return structuredClone(defaut);
  if (defaut && typeof defaut === "object" && !Array.isArray(defaut) && valeur && typeof valeur === "object" && !Array.isArray(valeur)) {
    const out = { ...valeur };
    for (const k of Object.keys(defaut)) out[k] = fusionner(defaut[k], valeur[k]);
    return out;
  }
  return valeur;
}
const cfg = fusionner(DEFAUTS, config);

/* ---------- 3. Valeurs calculées ---------- */
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const dateTexte = (iso) => {
  if (!iso) return "";
  const [a, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${a}`;
};
const elision = (nom, apostrophe) => (/^[aeiouyhàâéèêëîïôöûüœ]/i.test(nom) ? `d${apostrophe}${nom}` : `de ${nom}`);

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const JOURS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const heure = (h, sep) => { const [hh, mm] = h.split(":").map(Number); return mm ? `${hh}${sep}${String(mm).padStart(2, "0")}` : `${hh}${sep.trimEnd()}`; };
// Regroupe les jours consécutifs qui ont exactement les mêmes créneaux.
const groupes = [];
for (const [i, jour] of JOURS.entries()) {
  const creneaux = cfg.horaires.jours[jour] || [];
  const cle = JSON.stringify(creneaux);
  const dernier = groupes[groupes.length - 1];
  if (dernier && dernier.cle === cle && dernier.fin === i - 1) dernier.fin = i;
  else groupes.push({ cle, debut: i, fin: i, creneaux });
}
const nomGroupe = (g, sep, f = (j) => j) => (g.debut === g.fin ? f(JOURS[g.debut]) : `${f(JOURS[g.debut])}${sep}${f(JOURS[g.fin])}`);
const horaires_lignes = groupes.map((g) => ({
  jours: nomGroupe(g, " - ", majuscule),
  heures: g.creneaux.length ? g.creneaux.map((c) => `${heure(c.ouverture, " h ")} - ${heure(c.fermeture, " h ")}`).join(" · ") : "Fermé",
  ferme: g.creneaux.length === 0,
}));
const horaires_texte = groupes.map((g) => (g.creneaux.length
  ? `${nomGroupe(g, "-")} ${g.creneaux.map((c) => `${heure(c.ouverture, "h")}-${heure(c.fermeture, "h")}`).join(" et ")}`
  : g.debut === g.fin ? `fermé le ${JOURS[g.debut]}` : `fermé du ${JOURS[g.debut]} au ${JOURS[g.fin]}`)).join(", ");
// Schema.org : un bloc par créneau identique sur plusieurs jours.
const specs = new Map();
JOURS.forEach((jour, i) => (cfg.horaires.jours[jour] || []).forEach((c) => {
  const cle = c.ouverture + "-" + c.fermeture;
  if (!specs.has(cle)) specs.set(cle, { "@type": "OpeningHoursSpecification", dayOfWeek: [], opens: c.ouverture, closes: c.fermeture });
  specs.get(cle).dayOfWeek.push(JOURS_EN[i]);
}));

const c = cfg.contact;
const a = c.adresse;
const geoOk = typeof c.geo.latitude === "number" && typeof c.geo.longitude === "number";
const siret = cfg.legal.siret;
const note = cfg.temoignages.note;
const noteOk = typeof note.valeur === "number" && typeof note.nombre === "number" && note.nombre > 0;
const avis_verifies = cfg.temoignages.avis.filter((x) => x.verifie === true);
const fondateur = cfg.equipe.find((p) => p.fondateur) || null;
const reseaux = Object.values(c.reseaux).filter(Boolean);

const adresseLd = { "@type": "PostalAddress", streetAddress: a.rue, postalCode: a.code_postal, addressLocality: a.ville };
if (a.region) adresseLd.addressRegion = a.region;
adresseLd.addressCountry = a.pays;
const geoLd = geoOk ? { "@type": "GeoCoordinates", latitude: c.geo.latitude, longitude: c.geo.longitude } : null;
const url = (chemin) => `${cfg.seo.domaine}/${chemin}`;

const fournisseur = { "@type": cfg.entreprise.type_schema_org, name: cfg.entreprise.nom };
if (c.telephone.international) fournisseur.telephone = c.telephone.international;
fournisseur.address = adresseLd;
if (geoLd) fournisseur.geo = geoLd;

const entrepriseLd = {
  "@context": "https://schema.org",
  "@type": cfg.entreprise.type_schema_org,
  "@id": url("#business"),
  name: cfg.entreprise.nom,
  description: cfg.entreprise.description || undefined,
  url: url(""),
  telephone: c.telephone.international || undefined,
  email: c.email || undefined,
  priceRange: cfg.entreprise.fourchette_prix || undefined,
  identifier: siret ? { "@type": "PropertyValue", propertyID: "SIRET", value: siret } : undefined,
  foundingDate: cfg.entreprise.date_creation || undefined,
  image: cfg.seo.image_partage ? url(cfg.seo.image_partage) : undefined,
  address: adresseLd,
  geo: geoLd || undefined,
  areaServed: cfg.entreprise.zones_desservies.length ? cfg.entreprise.zones_desservies : undefined,
  founder: fondateur ? { "@type": "Person", name: fondateur.nom } : undefined,
  employee: cfg.equipe.length ? cfg.equipe.map((p) => ({ "@type": "Person", name: p.nom, jobTitle: p.fonction || undefined })) : undefined,
  makesOffer: cfg.entreprise.offres.length ? cfg.entreprise.offres.map((o) => ({ "@type": "Offer", name: o })) : undefined,
  openingHoursSpecification: specs.size ? [...specs.values()] : undefined,
  sameAs: [...reseaux, c.google_maps_url].filter(Boolean),
  aggregateRating: noteOk ? { "@type": "AggregateRating", ratingValue: note.valeur.toFixed(1), reviewCount: String(note.nombre) } : undefined,
};
if (!entrepriseLd.sameAs.length) delete entrepriseLd.sameAs;

const calc = {
  annee: String(new Date().getFullYear()),
  siret_affiche: siret ? `${siret.slice(0, 3)} ${siret.slice(3, 6)} ${siret.slice(6, 9)} ${siret.slice(9)}` : "",
  siren_affiche: siret ? `${siret.slice(0, 3)} ${siret.slice(3, 6)} ${siret.slice(6, 9)}` : "",
  siren: siret.slice(0, 9),
  de_nom: elision(cfg.entreprise.nom, "’"),
  de_nom_droit: elision(cfg.entreprise.nom, "'"),
  qui_repond: c.interlocuteur ? `${c.interlocuteur} vous répond` : "Nous vous répondons",
  interlocuteur_ou_atelier: c.interlocuteur || "l’atelier",
  bonjour: c.interlocuteur ? `Bonjour ${c.interlocuteur}, ` : "Bonjour, ",
  qui_repond_avec_plaisir: c.interlocuteur ? `${c.interlocuteur} vous répond avec plaisir` : "Nous vous répondons avec plaisir",
  mots_cles: cfg.seo.mots_cles.join(", "),
  whatsapp_url: c.whatsapp.numero ? `https://wa.me/${c.whatsapp.numero}?text=${encodeURIComponent(c.whatsapp.message)}` : "",
  whatsapp_actif: cfg.blocs_actifs.whatsapp && Boolean(c.whatsapp.numero),
  carte_active: cfg.blocs_actifs.carte && geoOk && Boolean(c.google_maps_url),
  itineraire_url: geoOk ? `https://www.google.com/maps/dir/?api=1&destination=${c.geo.latitude},${c.geo.longitude}` : "",
  region_departement: [a.region, a.departement && `(${a.departement})`].filter(Boolean).join(" "),
  adresse_ligne: `${a.rue}, ${a.code_postal} ${a.ville}`,
  horaires_lignes,
  horaires_texte,
  horaires_presents: specs.size > 0,
  note_ok: noteOk,
  note_affichee: noteOk ? note.valeur.toFixed(1).replace(".", ",") : "",
  note_etoiles: noteOk ? "★".repeat(Math.round(note.valeur)) + "☆".repeat(5 - Math.round(note.valeur)) : "",
  note_etoiles_label: noteOk ? `${Math.round(note.valeur)} étoiles sur 5` : "",
  note_date: dateTexte(note.date_releve),
  avis_verifies,
  temoignages_visibles: cfg.blocs_actifs.temoignages && (noteOk || avis_verifies.length > 0),
  bandeau_actif: cfg.blocs_actifs.bandeau && Boolean(cfg.bandeau.texte),
  date_creation_texte: dateTexte(cfg.entreprise.date_creation),
  date_maj_confidentialite_texte: dateTexte(cfg.legal.date_maj_confidentialite),
  noms_commerciaux: cfg.legal.noms_commerciaux.map((n) => `« ${n} »`).join(" et "),
  noms_commerciaux_barre: cfg.legal.noms_commerciaux.map((n) => `« ${n} »`).join(" / "),
  plusieurs_noms: cfg.legal.noms_commerciaux.length > 1,
  hebergeur_court: cfg.legal.hebergeur.nom.replace(/,?\s+(Inc\.?|SAS|SARL|SA|Ltd\.?|GmbH)$/i, ""),
  hebergeur_url_courte: cfg.legal.hebergeur.url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
  tva_franchise: cfg.legal.tva.regime === "franchise",
  tva_assujetti: cfg.legal.tva.regime === "assujetti",
  fondateur_nom: fondateur ? fondateur.nom : "",
  parent_nom: fondateur && cfg.equipe[0] && fondateur.nom !== cfg.equipe[0].nom ? fondateur.nom : "",
  personne: cfg.equipe[0] || { nom: "", fonction: "" },
  reseaux_liste: reseaux,
  adresse_ld: adresseLd,
  geo_ld: geoLd,
  fournisseur_ld: fournisseur,
  entreprise_ld: jsonIndente(JSON.parse(JSON.stringify(entrepriseLd)), 0, true),
  horaires_ld: [...specs.values()],
};

/* ---------- 4. Rendu des gabarits ---------- */
const PAGES_PAR_BLOC = { catalogue: ["catalogue.html"], reparations: ["reparations.html"], actualites: ["actualite.html"] };
const ignorees = new Set(Object.entries(PAGES_PAR_BLOC).filter(([b]) => !cfg.blocs_actifs[b]).flatMap(([, p]) => p));

function lister(dossier) {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const p = join(dossier, e.name);
    return e.isDirectory() ? lister(p) : [p];
  });
}

const dossierSrc = join(racine, "src");
const ecrits = [];
const changes = [];
const ecrire = (cheminRel, contenu) => {
  const cible = join(sortie, cheminRel);
  const avant = existsSync(cible) ? readFileSync(cible, "utf8") : null;
  if (avant !== contenu) changes.push(cheminRel);
  if (!verifier) {
    mkdirSync(dirname(cible), { recursive: true });
    writeFileSync(cible, contenu, "utf8");
  }
  ecrits.push(cheminRel);
};

let erreurs = 0;
for (const fichier of lister(dossierSrc)) {
  const rel = relative(dossierSrc, fichier).replace(/\\/g, "/");
  if (basename(rel) === "LISEZMOI.md") continue;
  if (ignorees.has(rel)) continue;
  const id = !rel.includes("/") && extname(rel) === ".html" ? basename(rel, ".html") : null;
  let page = null;
  if (id) {
    const p = cfg.pages[id];
    if (!p) { console.error(`✖ ${rel} : aucune entrée « pages.${id} » dans la configuration.`); erreurs++; continue; }
    page = {
      id,
      url: url(id === "index" ? "" : rel),
      titre: p.titre,
      description: p.description || "",
      og_titre: p.og_titre || p.titre,
      og_description: p.og_description || p.description || "",
      og_type: p.og_type || "website",
    };
  }
  try {
    ecrire(rel, rendre(readFileSync(fichier, "utf8"), { ...cfg, calc, page, blocs: cfg.blocs_actifs }, `src/${rel}`));
  } catch (e) {
    console.error("✖ " + e.message);
    erreurs++;
  }
}

/* ---------- 5. Module lu par les fonctions serveur ---------- */
// EXIF : texte ASCII uniquement (les accents sont retirés).
const ascii = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’]/g, "'").replace(/[^\x20-\x7e]/g, "");
const site = {
  nom: cfg.entreprise.nom,
  domaine: cfg.seo.domaine,
  exif: {
    copyright: ascii([cfg.entreprise.nom, cfg.legal.titulaire].filter(Boolean).join(" - ")),
    artiste: ascii(cfg.entreprise.nom),
    description: ascii(cfg.technique.exif_description || [cfg.entreprise.nom, a.ville].filter(Boolean).join(" - ")),
  },
  origines_autorisees: cfg.technique.origines_autorisees,
  smtp_hote: cfg.technique.smtp_hote,
  editeur_email: cfg.editeur.email,
  copie_cachee_editeur: cfg.editeur.copie_cachee && Boolean(cfg.editeur.email),
};
ecrire("netlify/lib/site.mjs",
  "// Fichier généré par scripts/generer-site.mjs à partir de la configuration : ne pas modifier à la main.\n" +
  `export const SITE = ${JSON.stringify(site, null, 2)};\n`);

/* ---------- 6. Bilan ---------- */
if (erreurs) {
  console.error(`\n✖ ${erreurs} erreur(s) : génération incomplète.`);
  process.exit(1);
}
console.log(`Configuration : ${relative(process.cwd(), fichierConfig) || fichierConfig}`);
console.log(`Sortie        : ${relative(process.cwd(), sortie) || "."}`);
if (ignorees.size) console.log(`Pages non générées (bloc désactivé) : ${[...ignorees].join(", ")}`);
if (verifier) {
  console.log(changes.length ? `\n${changes.length} fichier(s) seraient modifiés :\n  ${changes.join("\n  ")}` : "\nAucun changement : les fichiers générés sont à jour.");
  process.exit(changes.length ? 1 : 0);
}
console.log(`\n✔ ${ecrits.length} fichier(s) générés, dont ${changes.length} modifié(s).`);
for (const f of changes) console.log("  - " + f);
