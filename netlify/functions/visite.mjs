import { ALLOWED_ORIGINS } from "../lib/common.mjs";
import { logEvent, requestInfo } from "../lib/journal.mjs";

/* Journal des visites : appelé par assets/js/main.js à chaque page affichée.
   Pas de cookie : seule la requête elle-même (IP, navigateur, géolocalisation Netlify) est enregistrée. */

const BOT_RE = /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse|curl|wget|python|node-fetch/i;
const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export default async (req, context) => {
  if (req.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });
  if (!ALLOWED_ORIGINS.includes(req.headers.get("origin") || "")) return noContent();

  const info = requestInfo(req, context);
  if (BOT_RE.test(info.user_agent)) return noContent();

  let body = {};
  try { body = JSON.parse(await req.text()); } catch (e) { /* corps vide ou illisible : on garde l'essentiel */ }
  const page = typeof body.page === "string" ? body.page.slice(0, 200) : "";
  let provenance = "";
  try {
    const ref = new URL(body.ref);
    if (!ALLOWED_ORIGINS.includes(ref.origin)) provenance = ref.hostname;
  } catch (e) { /* accès direct */ }

  await logEvent("visite", { page, provenance, ...info });
  return noContent();
};

export const config = { path: "/api/visite" };
