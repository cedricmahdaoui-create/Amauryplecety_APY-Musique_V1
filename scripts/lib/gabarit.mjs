/* Moteur de gabarits minimal, sans dépendance.
 *
 *   {{ chemin }}            valeur échappée pour le HTML (& < > ")
 *   {{{ chemin }}}          valeur brute (déjà du HTML)
 *   {{json chemin [n]}}     valeur encodée en JSON ; n = indentation des lignes suivantes
 *   {{jsonstr chemin}}      contenu d'une chaîne JSON, sans les guillemets
 *   {{url chemin}}          valeur encodée pour une URL
 *   {{#if chemin}} … {{else}} … {{/if}}
 *   {{#each chemin}} … {{this.champ}} … {{@index}} … {{/each}}
 *
 * Un chemin absent provoque une erreur (protection contre les fautes de frappe).
 * Une balise de bloc seule sur sa ligne fait disparaître la ligne entière.
 */

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);

/* JSON lisible : les petits objets et listes restent sur une ligne, comme dans le HTML écrit à la main. */
const LARGEUR_MAX = 170;
function enLigne(v) {
  if (Array.isArray(v)) return "[" + v.map(enLigne).join(", ") + "]";
  if (v && typeof v === "object") return "{ " + Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${enLigne(x)}`).join(", ") + " }";
  return JSON.stringify(v);
}
function formater(v, indent, niveau) {
  if (!v || typeof v !== "object") return JSON.stringify(v);
  const ligne = enLigne(v);
  if (niveau > 0 && indent + ligne.length <= LARGEUR_MAX) return ligne;
  const pad = " ".repeat(indent + 2);
  const fin = " ".repeat(indent);
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    return "[\n" + v.map((x) => pad + formater(x, indent + 2, niveau + 1)).join(",\n") + "\n" + fin + "]";
  }
  const entrees = Object.entries(v);
  if (!entrees.length) return "{}";
  return "{\n" + entrees.map(([k, x]) => `${pad}${JSON.stringify(k)}: ${formater(x, indent + 2, niveau + 1)}`).join(",\n") + "\n" + fin + "}";
}

/* JSON sûr dans un <script type="application/ld+json"> : « < » ne doit pas fermer la balise.
 * `indent` = colonne de départ de la valeur ; les lignes suivantes sont décalées d'autant. */
export function jsonIndente(valeur, indent = 0, document = false) {
  return formater(valeur, indent, document ? 0 : 1).replace(/</g, "\\u003c");
}

const vrai = (v) => !(v === undefined || v === null || v === false || v === "" || v === 0 || (Array.isArray(v) && v.length === 0));

function lire(pile, chemin, ou) {
  if (chemin === "this") return pile[pile.length - 1].this;
  if (chemin === "@index") return pile[pile.length - 1]["@index"];
  const morceaux = chemin.split(".");
  // On cherche la première racine connue, du contexte le plus proche au plus lointain.
  for (let i = pile.length - 1; i >= 0; i--) {
    if (morceaux[0] in pile[i]) {
      let v = pile[i];
      for (const m of morceaux) {
        if (v === null || v === undefined || !(m in Object(v))) {
          throw new Error(`${ou} : « ${chemin} » introuvable dans la configuration (arrêt sur « ${m} »).`);
        }
        v = v[m];
      }
      return v;
    }
  }
  throw new Error(`${ou} : « ${chemin} » introuvable dans la configuration.`);
}

/* Découpe le gabarit en arbre : texte, variables, blocs if/each. */
function analyser(source, nom) {
  // Balises de bloc seules sur leur ligne : on retire l'indentation et le saut de ligne.
  const src = source.replace(/^[ \t]*(\{\{(?:#if|#each|\/if|\/each|else)\b[^}]*\}\})[ \t]*\r?\n/gm, "$1");
  const re = /\{\{\{\s*([^}]+?)\s*\}\}\}|\{\{\s*([^}]+?)\s*\}\}/g;
  const racine = { type: "racine", enfants: [] };
  const pile = [racine];
  let pos = 0;
  let m;
  const ligne = (i) => src.slice(0, i).split("\n").length;
  while ((m = re.exec(src))) {
    const courant = pile[pile.length - 1];
    if (m.index > pos) courant.enfants.push({ type: "texte", valeur: src.slice(pos, m.index) });
    pos = re.lastIndex;
    const ou = `${nom}:${ligne(m.index)}`;
    if (m[1] !== undefined) { courant.enfants.push({ type: "brut", chemin: m[1], ou }); continue; }
    const tag = m[2];
    let r;
    if ((r = /^#(if|each)\s+(\S+)$/.exec(tag))) {
      const bloc = { type: r[1], chemin: r[2], enfants: [], sinon: null, ou };
      courant.enfants.push(bloc);
      pile.push(bloc);
    } else if (tag === "else") {
      const bloc = pile[pile.length - 1];
      if (bloc.type !== "if") throw new Error(`${ou} : {{else}} hors d'un {{#if}}.`);
      bloc.sinon = [];
      bloc.dansSinon = true;
    } else if ((r = /^\/(if|each)$/.exec(tag))) {
      const bloc = pile.pop();
      if (bloc.type !== r[1]) throw new Error(`${ou} : {{/${r[1]}}} ne ferme pas le bloc ouvert ({{#${bloc.type}}} ligne ${bloc.ou}).`);
    } else if ((r = /^(json|jsonstr|url)\s+(\S+)(?:\s+(\d+))?$/.exec(tag))) {
      courant.enfants.push({ type: r[1], chemin: r[2], indent: Number(r[3] || 0), ou });
    } else if (/^[\w@.-]+$/.test(tag)) {
      courant.enfants.push({ type: "var", chemin: tag, ou });
    } else {
      throw new Error(`${ou} : balise inconnue {{${tag}}}.`);
    }
    // Les enfants d'un {{else}} vont dans « sinon ».
    const haut = pile[pile.length - 1];
    if (haut.dansSinon && haut.enfants !== haut.sinon) { haut.enfantsSi = haut.enfants; haut.enfants = haut.sinon; }
  }
  if (pile.length > 1) throw new Error(`${nom} : bloc {{#${pile[pile.length - 1].type}}} (${pile[pile.length - 1].ou}) jamais fermé.`);
  racine.enfants.push({ type: "texte", valeur: src.slice(pos) });
  return racine;
}

function produire(noeuds, pile) {
  let out = "";
  for (const n of noeuds) {
    switch (n.type) {
      case "texte": out += n.valeur; break;
      case "var": out += escapeHtml(lire(pile, n.chemin, n.ou) ?? ""); break;
      case "brut": out += String(lire(pile, n.chemin, n.ou) ?? ""); break;
      case "json": out += jsonIndente(lire(pile, n.chemin, n.ou), n.indent); break;
      case "jsonstr": out += JSON.stringify(String(lire(pile, n.chemin, n.ou) ?? "")).slice(1, -1).replace(/</g, "\\u003c"); break;
      case "url": out += encodeURIComponent(lire(pile, n.chemin, n.ou) ?? ""); break;
      case "if": {
        const si = n.enfantsSi || n.enfants;
        const sinon = n.enfantsSi ? n.enfants : [];
        out += produire(vrai(lire(pile, n.chemin, n.ou)) ? si : sinon, pile);
        break;
      }
      case "each": {
        const liste = lire(pile, n.chemin, n.ou) || [];
        if (!Array.isArray(liste)) throw new Error(`${n.ou} : « ${n.chemin} » n'est pas une liste.`);
        liste.forEach((el, i) => { out += produire(n.enfants, [...pile, { this: el, "@index": i }]); });
        break;
      }
    }
  }
  return out;
}

export function rendre(source, contexte, nom = "gabarit") {
  return produire(analyser(source, nom).enfants, [contexte]);
}
