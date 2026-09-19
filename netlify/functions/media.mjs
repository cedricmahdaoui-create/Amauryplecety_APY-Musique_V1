import { mediaStore, json, safeHeaders } from "../lib/common.mjs";

const NAME = /^[a-z0-9][a-z0-9-]{0,90}\.jpg$/;

export default async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") return json({ error: "Méthode non autorisée." }, 405, { Allow: "GET, HEAD" });
  const name = decodeURIComponent(new URL(req.url).pathname.replace(/^\/media\//, ""));
  if (!NAME.test(name)) return json({ error: "Introuvable." }, 404);

  const data = await mediaStore().get("img/" + name, { type: "arrayBuffer" });
  if (data == null) return json({ error: "Introuvable." }, 404);

  return new Response(req.method === "HEAD" ? null : data, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Netlify-CDN-Cache-Control": "public, max-age=31536000, durable",
      ...safeHeaders,
      // Politique adaptée à une image affichée seule (même approche que GitHub pour les fichiers bruts).
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
};

export const config = { path: "/media/*" };
