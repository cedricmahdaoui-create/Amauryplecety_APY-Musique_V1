import { createHash, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

export const dataStore = () => getStore({ name: "apy-data", consistency: "strong" });
export const mediaStore = () => getStore({ name: "apy-media", consistency: "strong" });

const SAFE_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
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

const MAX_FAILURES = 8;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * Vérifie le mot de passe administrateur (en-tête Authorization: Bearer ...).
 * Renvoie une Response d'erreur si l'accès est refusé, ou null si tout est bon.
 * Échoue "fermé" : sans ADMIN_PASSWORD défini côté serveur, aucun accès n'est possible.
 */
export async function requireAdmin(req, context) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return json({ error: "L'administration en ligne n'est pas encore activée (mot de passe non défini sur le serveur)." }, 503);
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
