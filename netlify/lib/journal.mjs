import { randomBytes } from "node:crypto";
import { dataStore } from "./common.mjs";

/* Journal des visites et des envois de mail. Une entrée = un blob
   « journal/<type>/<AAAA-MM-JJ>/<horodatage>-<aléa> » : pas d'ajout dans un fichier
   commun, donc deux événements simultanés ne peuvent pas s'écraser.
   Purge par date (voir RETENTION_DAYS), lancée par le bouton « Purger » de /admin/journal.html. */

export const TYPES = ["visite", "mail"];
export const RETENTION_DAYS = { visite: 396, mail: 365 }; // 13 mois / 12 mois

const day = (iso) => iso.slice(0, 10);

/** Infos communes tirées de la requête : IP complète, géolocalisation Netlify, navigateur. */
export function requestInfo(req, context) {
  const ua = req.headers.get("user-agent") || "";
  const geo = (context && context.geo) || {};
  return {
    ip: (context && context.ip) || "",
    pays: (geo.country && geo.country.code) || "",
    region: (geo.subdivision && geo.subdivision.name) || "",
    ville: geo.city || "",
    appareil: /Mobi|Android|iPhone|iPod/i.test(ua) ? "mobile" : /iPad|Tablet/i.test(ua) ? "tablette" : "ordinateur",
    navigateur: /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
      : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Autre",
    user_agent: ua.slice(0, 300),
  };
}

/** Enregistre un événement. Ne lève jamais d'erreur : le journal ne doit pas bloquer le site. */
export async function logEvent(type, entry) {
  try {
    const ts = new Date().toISOString();
    const key = `journal/${type}/${day(ts)}/${ts.replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}`;
    await dataStore().setJSON(key, { ts, type, ...entry });
  } catch (e) {
    console.error("journal:", e);
  }
}

/** Liste les jours présents pour un type (plus récent en premier). */
export async function listDays(type) {
  const { directories } = await dataStore().list({ prefix: `journal/${type}/`, directories: true });
  return directories.map((d) => d.split("/").filter(Boolean).pop())
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse();
}

/** Lit toutes les entrées d'un type sur une période [from, to] (dates AAAA-MM-JJ incluses). */
export async function readEvents(type, from, to) {
  const store = dataStore();
  const days = (await listDays(type)).filter((d) => d >= from && d <= to);
  const out = [];
  for (const d of days) {
    const { blobs } = await store.list({ prefix: `journal/${type}/${d}/` });
    const entries = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" }).catch(() => null)));
    entries.forEach((e) => { if (e) out.push(e); });
  }
  return out.sort((a, b) => (a.ts < b.ts ? 1 : -1));
}

/** Supprime les jours plus anciens que la durée de conservation. Renvoie le nombre d'entrées effacées. */
export async function purgeOld() {
  const store = dataStore();
  let removed = 0;
  for (const type of TYPES) {
    const limit = day(new Date(Date.now() - RETENTION_DAYS[type] * 86400000).toISOString());
    for (const d of await listDays(type)) {
      if (d >= limit) continue;
      const { blobs } = await store.list({ prefix: `journal/${type}/${d}/` });
      await Promise.all(blobs.map((b) => store.delete(b.key)));
      removed += blobs.length;
    }
  }
  return removed;
}
