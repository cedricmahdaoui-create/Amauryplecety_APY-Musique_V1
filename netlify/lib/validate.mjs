const PHOTO_PATH = /^(?:assets\/img\/[A-Za-z0-9._-]{1,120}\.(?:jpe?g|png|webp)|media\/[a-z0-9][a-z0-9-]{0,90}\.jpg)$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const LIMITS = { instruments: 300, families: 60, articles: 100, photos: 12 };

export function isPhotoPath(value) {
  return typeof value === "string" && PHOTO_PATH.test(value);
}

/** Nom des photos hébergées côté serveur (media/xxx.jpg -> xxx.jpg). */
export function mediaNames(catalogue) {
  const names = new Set();
  const add = (p) => { if (typeof p === "string" && p.startsWith("media/")) names.add(p.slice(6)); };
  for (const it of (catalogue && catalogue.instruments) || []) {
    add(it.photo);
    for (const p of it.photos || []) add(p);
  }
  for (const a of (catalogue && catalogue.articles) || []) add(a.photo);
  return [...names];
}

/**
 * Valide et nettoie le catalogue reçu. Ne conserve que les champs connus
 * et refuse toute valeur hors format (photos en base64, chemins arbitraires...).
 */
export function cleanCatalogue(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Format de catalogue invalide." };
  }
  const errors = [];
  const text = (value, max, label, { required = false } = {}) => {
    const v = typeof value === "string" ? value.trim() : (value == null ? "" : null);
    if (v === null) { errors.push(`${label} : texte attendu.`); return ""; }
    if (v.length > max) { errors.push(`${label} : ${max} caractères maximum.`); return v.slice(0, max); }
    if (required && !v) errors.push(`${label} : obligatoire.`);
    return v;
  };
  const photo = (value, label) => {
    if (value == null || value === "") return "";
    if (!isPhotoPath(value)) { errors.push(`${label} : chemin de photo non valide.`); return ""; }
    return value;
  };

  if (!Array.isArray(input.instruments)) return { ok: false, error: "Liste d'instruments manquante." };
  if (input.instruments.length > LIMITS.instruments) return { ok: false, error: `${LIMITS.instruments} instruments maximum.` };

  const instruments = input.instruments.map((raw, i) => {
    const it = raw && typeof raw === "object" ? raw : {};
    const nom = text(it.nom, 120, `Instrument ${i + 1} — nom`, { required: true });
    const label = `« ${nom || "Instrument " + (i + 1)} »`;
    const prixNum = it.prix == null || it.prix === "" ? 0 : Number(it.prix);
    if (!Number.isFinite(prixNum) || prixNum < 0 || prixNum > 10000000) errors.push(`${label} : prix non valide.`);
    const photos = Array.isArray(it.photos) ? it.photos : [];
    if (photos.length > LIMITS.photos) errors.push(`${label} : ${LIMITS.photos} photos supplémentaires maximum.`);
    return {
      nom,
      famille: text(it.famille, 60, `${label} — famille`),
      sousfamille: text(it.sousfamille, 120, `${label} — sous-famille`),
      etat: text(it.etat, 40, `${label} — état`),
      prix: Math.max(0, Math.round(Number.isFinite(prixNum) ? prixNum : 0)),
      dispo: it.dispo !== false,
      featured: it.featured === true,
      annee: text(it.annee, 40, `${label} — année`),
      photo: photo(it.photo, `${label} — photo principale`),
      photos: photos.slice(0, LIMITS.photos).map((p, k) => photo(p, `${label} — photo ${k + 2}`)).filter(Boolean),
      desc: text(it.desc, 2000, `${label} — description`),
    };
  });

  const families = [];
  if (input.families != null) {
    if (!Array.isArray(input.families) || input.families.length > LIMITS.families) {
      errors.push("Liste de familles non valide.");
    } else {
      for (const f of input.families) {
        if (!f || typeof f.id !== "string" || !SLUG.test(f.id)) { errors.push("Famille : identifiant non valide."); continue; }
        families.push({ id: f.id, label: text(f.label, 80, "Famille — nom", { required: true }) });
      }
    }
  }

  const articles = [];
  if (input.articles != null) {
    if (!Array.isArray(input.articles) || input.articles.length > LIMITS.articles) {
      errors.push("Liste d'actualités non valide.");
    } else {
      input.articles.forEach((a, i) => {
        const raw = a && typeof a === "object" ? a : {};
        const date = typeof raw.date === "string" && DATE.test(raw.date) ? raw.date : "";
        if (!date) errors.push(`Actualité ${i + 1} : date non valide.`);
        articles.push({
          title: text(raw.title, 180, `Actualité ${i + 1} — titre`),
          text: text(raw.text, 10000, `Actualité ${i + 1} — texte`),
          date,
          published: raw.published === true,
          photo: photo(raw.photo, `Actualité ${i + 1} — photo`),
        });
      });
    }
  }

  if (errors.length) return { ok: false, error: errors.slice(0, 5).join(" ") };
  return { ok: true, value: { instruments, families, articles } };
}
