/* Valide un fichier de configuration contre site.schema.json (JSON Schema 2020-12).
 * Aucune dépendance : implémente le sous-ensemble du standard utilisé par le schéma.
 *
 * Usage :  node scripts/validate-config.js [config] [schéma]
 *   config  défaut : site.config.json
 *   schéma  défaut : site.schema.json
 * Code de sortie : 0 si valide, 1 si erreurs, 2 si fichier illisible.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const [configPath = "site.config.json", schemaPath = "site.schema.json"] = process.argv.slice(2);

function lireJson(chemin, role) {
  let texte;
  try {
    texte = readFileSync(resolve(chemin), "utf8").replace(/^﻿/, "");
  } catch (e) {
    console.error(`✖ Impossible de lire le ${role} « ${chemin} » : ${e.code === "ENOENT" ? "fichier introuvable" : e.message}`);
    process.exit(2);
  }
  try {
    return JSON.parse(texte);
  } catch (e) {
    const pos = /position (\d+)/.exec(e.message);
    let ou = "";
    if (pos) {
      const avant = texte.slice(0, Number(pos[1])).split("\n");
      ou = ` (ligne ${avant.length}, colonne ${avant[avant.length - 1].length + 1})`;
    }
    console.error(`✖ Le ${role} « ${chemin} » n'est pas un JSON valide${ou} : ${e.message}`);
    process.exit(2);
  }
}

const schema = lireJson(schemaPath, "schéma");
const config = lireJson(configPath, "fichier de configuration");

const NOMS_TYPES = {
  string: "texte", number: "nombre", integer: "nombre entier", boolean: "vrai/faux (true/false)",
  array: "liste", object: "objet", null: "vide (null)",
};
const ANNOTATIONS = new Set(["$schema", "$id", "$defs", "$comment", "title", "description", "default", "examples"]);
const PRIS_EN_CHARGE = new Set(["$ref", "type", "enum", "const", "pattern", "minLength", "maxLength", "minimum", "maximum",
  "required", "properties", "patternProperties", "additionalProperties", "propertyNames", "items", "minItems", "maxItems",
  "allOf", "anyOf", "oneOf", "not", "if", "then", "else"]);

const avertissementsSchema = new Set();

function typeDe(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (Number.isInteger(v)) return "integer";
  return typeof v;
}
function correspondType(v, t) {
  const r = typeDe(v);
  return r === t || (t === "number" && r === "integer");
}
const affiche = (v) => (typeof v === "string" ? `« ${v.length > 60 ? v.slice(0, 57) + "…" : v} »` : JSON.stringify(v));
const chemin = (base, cle) => (typeof cle === "number" ? `${base}[${cle}]` : base ? `${base}.${cle}` : cle);

function resoudre(ref) {
  if (!ref.startsWith("#/")) throw new Error(`Référence non prise en charge : ${ref}`);
  return ref.slice(2).split("/").reduce((n, k) => n?.[k.replace(/~1/g, "/").replace(/~0/g, "~")], schema);
}

/* Renvoie la liste des erreurs { chemin, message } de `valeur` par rapport à `s`. */
function valider(valeur, s, ici) {
  if (s === true || s === undefined) return [];
  if (s === false) return [{ chemin: ici, message: "aucune valeur n'est autorisée ici." }];
  const err = [];
  const ajoute = (message, ch = ici) => err.push({ chemin: ch, message, aide: s.description });

  for (const k of Object.keys(s)) {
    if (!ANNOTATIONS.has(k) && !PRIS_EN_CHARGE.has(k)) avertissementsSchema.add(k);
  }

  if (s.$ref) err.push(...valider(valeur, resoudre(s.$ref), ici));

  if (s.type !== undefined) {
    const types = [].concat(s.type);
    if (!types.some((t) => correspondType(valeur, t))) {
      const recu = valeur === null ? "vide (null)" : `${NOMS_TYPES[typeDe(valeur)]} ${affiche(valeur)}`;
      ajoute(`type attendu : ${types.map((t) => NOMS_TYPES[t] || t).join(" ou ")} ; reçu : ${recu}.`);
      return err; // inutile d'aller plus loin sur une valeur du mauvais type
    }
  }
  if (s.enum && !s.enum.some((e) => JSON.stringify(e) === JSON.stringify(valeur))) {
    ajoute(`valeur ${affiche(valeur)} non autorisée. Valeurs possibles : ${s.enum.map((e) => (e === "" ? "(vide)" : JSON.stringify(e))).join(", ")}.`);
  }
  if ("const" in s && JSON.stringify(s.const) !== JSON.stringify(valeur)) {
    ajoute(`doit valoir ${JSON.stringify(s.const)}.`);
  }

  if (typeof valeur === "string") {
    if (s.minLength !== undefined && valeur.length < s.minLength) {
      ajoute(s.minLength === 1 ? "ne doit pas être vide." : `doit contenir au moins ${s.minLength} caractères.`);
    }
    if (s.maxLength !== undefined && valeur.length > s.maxLength) {
      ajoute(`trop long : ${valeur.length} caractères pour ${s.maxLength} au maximum.`);
    }
    if (s.pattern && !new RegExp(s.pattern, "u").test(valeur)) {
      ajoute(`format invalide : ${affiche(valeur)}.`);
    }
  }
  if (typeof valeur === "number") {
    if (s.minimum !== undefined && valeur < s.minimum) ajoute(`doit être supérieur ou égal à ${s.minimum} (reçu ${valeur}).`);
    if (s.maximum !== undefined && valeur > s.maximum) ajoute(`doit être inférieur ou égal à ${s.maximum} (reçu ${valeur}).`);
  }

  if (Array.isArray(valeur)) {
    if (s.minItems !== undefined && valeur.length < s.minItems) ajoute(`doit contenir au moins ${s.minItems} élément(s).`);
    if (s.maxItems !== undefined && valeur.length > s.maxItems) ajoute(`doit contenir au plus ${s.maxItems} élément(s).`);
    if (s.items !== undefined) valeur.forEach((v, i) => err.push(...valider(v, s.items, chemin(ici, i))));
  }

  if (typeDe(valeur) === "object") {
    for (const r of s.required || []) {
      if (!(r in valeur)) ajoute(`champ obligatoire « ${r} » manquant.`);
    }
    const props = s.properties || {};
    const motifs = Object.entries(s.patternProperties || {}).map(([m, sch]) => [new RegExp(m, "u"), sch]);
    for (const [cle, v] of Object.entries(valeur)) {
      const ch = chemin(ici, cle);
      if (s.propertyNames) {
        const e = valider(cle, s.propertyNames, ch);
        if (e.length) ajoute(`nom de champ « ${cle} » invalide.`, ch);
      }
      let connu = false;
      if (cle in props) { connu = true; err.push(...valider(v, props[cle], ch)); }
      for (const [re, sch] of motifs) {
        if (re.test(cle)) { connu = true; err.push(...valider(v, sch, ch)); }
      }
      if (!connu && s.additionalProperties !== undefined) {
        if (s.additionalProperties === false) ajoute(`champ « ${cle} » inconnu : il n'est pas prévu par le schéma (faute de frappe ?).`, ch);
        else err.push(...valider(v, s.additionalProperties, ch));
      }
    }
  }

  for (const sous of s.allOf || []) err.push(...valider(valeur, sous, ici));
  if (s.anyOf && !s.anyOf.some((sous) => valider(valeur, sous, ici).length === 0)) {
    ajoute("ne correspond à aucune des formes autorisées.");
  }
  if (s.oneOf) {
    const n = s.oneOf.filter((sous) => valider(valeur, sous, ici).length === 0).length;
    if (n !== 1) ajoute(n === 0 ? "ne correspond à aucune des formes autorisées." : "correspond à plusieurs formes alors qu'une seule est attendue.");
  }
  if (s.not && valider(valeur, s.not, ici).length === 0) ajoute("cette valeur est explicitement interdite.");
  if (s.if !== undefined) {
    const condition = valider(valeur, s.if, ici).length === 0;
    // $comment d'une règle conditionnelle = raison affichée à côté de chaque erreur qu'elle produit.
    if (condition && s.then !== undefined) err.push(...valider(valeur, s.then, ici).map((e) => (s.$comment ? { ...e, aide: s.$comment } : e)));
    if (!condition && s.else !== undefined) err.push(...valider(valeur, s.else, ici));
  }
  return err;
}

/* Valeurs laissées vides : signalées, sans être des erreurs. */
function vides(v, ici, out) {
  if (v === "" || v === null) out.push(ici);
  else if (Array.isArray(v)) v.forEach((x, i) => vides(x, chemin(ici, i), out));
  else if (typeDe(v) === "object") for (const [k, x] of Object.entries(v)) if (k !== "$schema") vides(x, chemin(ici, k), out);
  return out;
}

// Dédoublonne (les if/then peuvent produire deux fois la même erreur).
const vues = new Set();
const erreurs = valider(config, schema, "").filter((e) => {
  const cle = e.chemin + "|" + e.message;
  if (vues.has(cle)) return false;
  vues.add(cle);
  return true;
});

console.log(`Validation de « ${configPath} » avec « ${schemaPath} »\n`);
if (avertissementsSchema.size) {
  console.log(`⚠ Mots-clés du schéma non pris en charge (ignorés) : ${[...avertissementsSchema].join(", ")}\n`);
}

if (erreurs.length) {
  console.log(`✖ ${erreurs.length} erreur(s) :`);
  for (const e of erreurs) {
    console.log(`  - ${e.chemin || "(racine)"} : ${e.message}`);
    if (e.aide && e.chemin) console.log(`      aide : ${e.aide}`);
  }
} else {
  console.log("✔ Configuration valide.");
}

const listeVides = vides(config, "", []);
if (listeVides.length) {
  console.log(`\nℹ ${listeVides.length} valeur(s) laissée(s) vide(s) (bloc non affiché ou à compléter) :`);
  for (const c of listeVides) console.log(`  - ${c}`);
}
const avisNonVerifies = (config.temoignages?.avis || []).filter((a) => a && a.verifie !== true).length;
if (avisNonVerifies) console.log(`\nℹ ${avisNonVerifies} avis non vérifié(s) : ils ne seront pas affichés.`);

process.exit(erreurs.length ? 1 : 0);
