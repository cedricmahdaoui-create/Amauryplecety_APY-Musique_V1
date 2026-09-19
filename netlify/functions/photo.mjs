import { mediaStore, json, requireAdmin } from "../lib/common.mjs";
import { jpegSize, looksLikeJpeg, tagJpeg } from "../lib/jpeg.mjs";

const NAME = /^[a-z0-9][a-z0-9-]{0,80}\.jpg$/;
const MAX_BYTES = 4_500_000;

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405, { Allow: "POST" });
  const denied = await requireAdmin(req, context);
  if (denied) return denied;

  const url = new URL(req.url);
  const name = url.searchParams.get("name") || "";
  if (!NAME.test(name)) return json({ error: "Nom de fichier non valide." }, 400);

  if (url.pathname.endsWith("/delete-photo")) {
    // Le nettoyage des photos inutilisées est fait à l'enregistrement du catalogue
    // (voir housekeeping) : on ne supprime rien ici, pour ne jamais casser une page publiée.
    return json({ ok: true, deferred: true });
  }

  const original = Buffer.from(await req.arrayBuffer());
  if (original.length > MAX_BYTES) return json({ error: "Photo trop volumineuse." }, 413);
  if (!looksLikeJpeg(original)) return json({ error: "Le fichier n'est pas une image JPEG valide." }, 400);
  const size = jpegSize(original);
  if (!size || size.width < 50 || size.height < 50 || size.width > 6000 || size.height > 6000) {
    return json({ error: "Dimensions de photo non valides." }, 400);
  }

  const { data } = tagJpeg(original);
  const store = mediaStore();
  let finalName = name;
  for (let n = 2; n < 50 && (await store.getMetadata("img/" + finalName)); n++) {
    finalName = name.replace(/\.jpg$/, "-" + n + ".jpg");
  }

  const bytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  await store.set("img/" + finalName, bytes, { metadata: { uploadedAt: new Date().toISOString() } });
  return json({ ok: true, path: "media/" + finalName });
};

export const config = { path: ["/api/upload-photo", "/api/delete-photo"] };
