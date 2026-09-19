import { dataStore, json, requireAdmin, safeHeaders } from "../lib/common.mjs";

const ID = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z$/;

export default async (req, context) => {
  if (req.method !== "GET") return json({ error: "Méthode non autorisée." }, 405, { Allow: "GET" });
  const denied = await requireAdmin(req, context);
  if (denied) return denied;

  const store = dataStore();
  const id = new URL(req.url).searchParams.get("id");

  if (id) {
    if (!ID.test(id)) return json({ error: "Version inconnue." }, 400);
    const raw = await store.get("history/" + id, { type: "text" });
    if (raw == null) return json({ error: "Version introuvable." }, 404);
    return new Response(raw, { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...safeHeaders } });
  }

  const { blobs } = await store.list({ prefix: "history/" });
  const versions = blobs.map((b) => b.key.slice(8)).sort().reverse().slice(0, 40);
  return json({ versions });
};

export const config = { path: "/api/history" };
