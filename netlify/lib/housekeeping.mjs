import { mediaNames } from "./validate.mjs";

const KEEP_VERSIONS = 40;
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * Après chaque enregistrement :
 *  - ne garde que les 40 dernières versions de l'historique ;
 *  - supprime les photos que plus aucune version (actuelle ou historique)
 *    n'utilise, au bout de 24 h (le délai évite d'effacer une photo qu'un
 *    onglet ouvert est en train d'ajouter).
 * Ne doit jamais faire échouer un enregistrement : l'appelant l'entoure d'un try/catch.
 */
export async function housekeeping(dataStore, mediaStore, current) {
  const { blobs } = await dataStore.list({ prefix: "history/" });
  const keys = blobs.map((b) => b.key).sort();
  const excess = keys.slice(0, Math.max(0, keys.length - KEEP_VERSIONS));
  await Promise.all(excess.map((k) => dataStore.delete(k)));

  const referenced = new Set(mediaNames(current));
  for (const key of keys.slice(-KEEP_VERSIONS)) {
    try {
      const raw = await dataStore.get(key, { type: "text" });
      mediaNames(JSON.parse(raw)).forEach((n) => referenced.add(n));
    } catch (e) { /* version illisible : ignorée */ }
  }

  const media = await mediaStore.list({ prefix: "img/" });
  const cutoff = Date.now() - ORPHAN_GRACE_MS;
  for (const blob of media.blobs) {
    const name = blob.key.slice(4);
    if (referenced.has(name)) continue;
    const meta = await mediaStore.getMetadata(blob.key).catch(() => null);
    const uploadedAt = Date.parse(meta && meta.metadata && meta.metadata.uploadedAt);
    if (!Number.isNaN(uploadedAt) && uploadedAt < cutoff) await mediaStore.delete(blob.key);
  }
}
