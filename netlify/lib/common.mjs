import { createHash, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { SITE } from "./site.mjs";

export const dataStore = () => getStore({ name: "apy-data", consistency: "strong" });
export const mediaStore = () => getStore({ name: "apy-media", consistency: "strong" });

// En-têtes de sécurité des réponses de l'API (les règles _headers ne s'appliquent
// qu'aux fichiers statiques) : rien de ce que renvoie une fonction n'est une page.
const SAFE_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

export function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...SAFE_HEADERS,
      ...extra,
    },
  });
}

export const safeHeaders = SAFE_HEADERS;

const sha = (value) => createHash("sha256").update(value).digest();

export const ALLOWED_ORIGINS = SITE.origines_autorisees;
const MIN_FORM_MS = 2500; // en dessous, quasi certainement un robot (rempli+envoyé trop vite).

/**
 * Contrôles anti-spam communs à tous les formulaires publics (contact, éditeur…) :
 * origine de la requête, délai de remplissage minimum, nombre de liens dans le message.
 * Renvoie true si la requête est suspecte (à rejeter silencieusement, comme le honeypot).
 */
export function looksLikeSpam(req, body) {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer") || "";
  if (origin) {
    if (!ALLOWED_ORIGINS.includes(origin)) return true;
  } else if (!ALLOWED_ORIGINS.some((o) => referer.startsWith(o))) {
    return true;
  }

  const elapsed = Number(body && body.elapsed);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FORM_MS) return true;

  const message = typeof (body && body.message) === "string" ? body.message : "";
  const linkCount = (message.match(/https?:\/\//gi) || []).length;
  if (linkCount >= 2) return true;

  return false;
}

const MAX_FAILURES = 8;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * Vérifie le mot de passe administrateur (en-tête Authorization: Bearer ...).
 * Renvoie une Response d'erreur si l'accès est refusé, ou null si tout est bon.
 * Échoue "fermé" : sans ADMIN_PASSWORD défini côté serveur, aucun accès n'est possible.
 */
export async function requireAdmin(req, context, envName = "ADMIN_PASSWORD") {
  const expected = process.env[envName];
  if (!expected) {
    return json({ error: "Cet espace n'est pas encore activé (mot de passe " + envName + " non défini sur le serveur)." }, 503);
  }

  const store = dataStore();
  const ip = (context && context.ip) || "inconnue";
  const key = "fail/" + sha(ip).toString("hex").slice(0, 24);
  const now = Date.now();

  let record = await store.get(key, { type: "json" }).catch(() => null);
  if (record && now - record.first > WINDOW_MS) record = null;
  if (record && record.count >= MAX_FAILURES) {
    return json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, 429, { "Retry-After": "900" });
  }

  const header = req.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const valid = given.length > 0 && given.length <= 200 && timingSafeEqual(sha(given), sha(expected));

  if (!valid) {
    await store.setJSON(key, { count: (record ? record.count : 0) + 1, first: record ? record.first : now }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 600));
    return json({ error: "Mot de passe incorrect." }, 401);
  }

  if (record) await store.delete(key).catch(() => {});
  return null;
}
