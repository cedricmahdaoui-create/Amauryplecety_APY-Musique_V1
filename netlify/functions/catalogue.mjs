import { dataStore, mediaStore, json, requireAdmin, safeHeaders } from "../lib/common.mjs";
import { cleanCatalogue } from "../lib/validate.mjs";
import { housekeeping } from "../lib/housekeeping.mjs";

const MAX_BODY = 1_000_000;

export default async (req, context) => {
  if (req.method === "GET") {
    const raw = await dataStore().get("catalogue.json", { type: "text" });
    if (raw == null) return json({ error: "Aucun catalogue enregistré." }, 404);
    return new Response(raw, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Netlify-CDN-Cache-Control": "public, s-maxage=15, stale-while-revalidate=120",
        ...safeHeaders,
      },
    });
  }

  if (req.method === "POST") {
    const denied = await requireAdmin(req, context);
    if (denied) return denied;

    const body = await req.text();
    if (body.length > MAX_BODY) return json({ error: "Catalogue trop volumineux." }, 413);
    let parsed;
    try { parsed = JSON.parse(body); } catch (e) { return json({ error: "JSON invalide." }, 400); }

    const result = cleanCatalogue(parsed);
    if (!result.ok) return json({ error: result.error }, 400);

    const store = dataStore();
    const savedAt = new Date().toISOString();
    const versionId = savedAt.replace(/:/g, "-");
    const previous = await store.get("catalogue.json", { type: "text" });
    if (previous) await store.set("history/" + versionId, previous);
    await store.set("catalogue.json", JSON.stringify(result.value));

    try { await housekeeping(store, mediaStore(), result.value); } catch (e) { console.error("housekeeping:", e); }
    return json({ ok: true, savedAt, versionId });
  }

  return json({ error: "Méthode non autorisée." }, 405, { Allow: "GET, POST" });
};

export const config = { path: "/api/catalogue" };
