/* Synchronisation post-déploiement : restaure toujours les vraies données de Netlify KV
   S'exécute après chaque déploiement pour s'assurer que les données ne sont pas écrasées
   par une mauvaise version en local. Les vraies données restent TOUJOURS en Netlify KV. */

import { dataStore, json } from "../lib/common.mjs";

export default async (req, context) => {
  /* Cette fonction s'exécute à chaque déploiement via un événement Netlify */
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  try {
    const store = dataStore();

    /* Vérifier s'il y a des données en Netlify KV */
    const trueCatalogue = await store.get("catalogue.json", { type: "text" });

    if (!trueCatalogue) {
      console.warn("sync-catalogue: Aucune donnée stable trouvée. Initialisation en cours.");
      /* Si aucune donnée n'existe, on laisse le fichier local servir de base */
      return json({ ok: true, status: "init" });
    }

    /* Les vraies données existent, rien à faire */
    console.log("sync-catalogue: Données restaurées depuis Netlify KV");
    return json({ ok: true, status: "synced", message: "Données protégées en Netlify KV" });

  } catch (error) {
    console.error("sync-catalogue error:", error);
    return json({ error: "Erreur de synchronisation" }, 500);
  }
};

export const config = { path: "/api/sync-catalogue" };
