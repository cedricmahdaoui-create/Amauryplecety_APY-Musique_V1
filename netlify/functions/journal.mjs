import { json, requireAdmin, safeHeaders } from "../lib/common.mjs";
import { TYPES, purgeOld, readEvents } from "../lib/journal.mjs";

/* Journal depuis /admin/journal.html (mot de passe propre : JOURNAL_PASSWORD, distinct de l'admin catalogue).
   GET  /api/journal?type=visite|mail|tout&from=AAAA-MM-JJ&to=AAAA-MM-JJ&format=json|csv|jsonl
   POST /api/journal  { "action": "purge" } → efface ce qui dépasse la durée de conservation. */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const COLUMNS = ["ts", "type", "page", "provenance", "formulaire", "statut", "objet", "nom", "email", "tel",
  "message", "erreur", "ip", "pays", "region", "ville", "appareil", "navigateur", "user_agent"];

// Point-virgule + BOM : s'ouvre directement dans Excel en français avec les accents.
function toCsv(events) {
  const cell = (v) => {
    const s = v == null ? "" : String(v);
    return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [COLUMNS.join(";")].concat(events.map((e) => COLUMNS.map((c) => cell(e[c])).join(";")));
  return "﻿" + lines.join("\r\n");
}

export default async (req, context) => {
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405, { Allow: "GET, POST" });
  const denied = await requireAdmin(req, context, "JOURNAL_PASSWORD");
  if (denied) return denied;

  if (req.method === "POST") {
    let body = {};
    try { body = await req.json(); } catch (e) { /* corps invalide */ }
    if (body.action !== "purge") return json({ error: "Action inconnue." }, 400);
    return json({ ok: true, removed: await purgeOld() });
  }

  const params = new URL(req.url).searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const to = DATE.test(params.get("to") || "") ? params.get("to") : today;
  const from = DATE.test(params.get("from") || "") ? params.get("from")
    : new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const type = params.get("type");
  const types = TYPES.includes(type) ? [type] : TYPES;
  const format = params.get("format");

  let events = [];
  for (const t of types) events = events.concat(await readEvents(t, from, to));
  events.sort((a, b) => (a.ts < b.ts ? 1 : -1));

  const name = `journal-apy-${types.length > 1 ? "tout" : types[0]}-${from}_${to}`;
  if (format === "csv" || format === "jsonl") {
    const csv = format === "csv";
    return new Response(csv ? toCsv(events) : events.map((e) => JSON.stringify(e)).join("\n") + "\n", {
      status: 200,
      headers: {
        "Content-Type": csv ? "text/csv; charset=utf-8" : "application/x-ndjson; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}.${format}"`,
        "Cache-Control": "no-store",
        ...safeHeaders,
      },
    });
  }
  return json({ from, to, count: events.length, events: events.slice(0, 500) });
};

export const config = { path: "/api/journal" };
