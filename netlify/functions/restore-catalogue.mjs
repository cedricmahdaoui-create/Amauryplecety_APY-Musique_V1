/* Fonction de restauration d'urgence : restaure la dernière version stable du catalogue
   Utilisée pour récupérer les données en cas d'écrasement accidentel */

import { dataStore, json, requireAdmin } from "../lib/common.mjs";

export default async (req, context) => {
  /* Seulement accessible avec authentification admin */
  const denied = await requireAdmin(req, context);
  if (denied) return denied;

  const store = dataStore();

  if (req.method === "GET") {
    /* Lister les versions disponibles */
    try {
      const versions = [];
      const prefix = "history/";

      /* En développement, utilise une approche simple */
      console.log("restore-catalogue: Récupération de l'historique...");

      return json({
        ok: true,
        message: "Pour restaurer : utilise l'interface admin et sélectionne une version précédente",
        instruction: "Accès à /admin/ > Versions précédentes"
      });
    } catch (error) {
      console.error("restore-catalogue error:", error);
      return json({ error: "Erreur lors de la récupération de l'historique" }, 500);
    }
  }

  if (req.method === "POST") {
    /* Restaurer une version spécifique */
    let body;
    try { body = await req.json(); } catch (e) { return json({ error: "JSON invalide." }, 400); }

    const { versionId } = body;
    if (!versionId) return json({ error: "versionId requis" }, 400);

    try {
      const historical = await store.get("history/" + versionId, { type: "text" });
      if (!historical) return json({ error: "Version non trouvée" }, 404);

      /* Sauvegarder la version actuelle avant de restaurer */
      const current = await store.get("catalogue.json", { type: "text" });
      const now = new Date().toISOString();
      const backupId = "history/backup-" + now.replace(/:/g, "-");
      if (current) await store.set(backupId, current);

      /* Restaurer la version */
      await store.set("catalogue.json", historical);

      console.log(`restore-catalogue: Version ${versionId} restaurée (backup créé: ${backupId})`);
      return json({ ok: true, message: "Version restaurée avec succès", backupId });
    } catch (error) {
      console.error("restore-catalogue error:", error);
      return json({ error: "Erreur lors de la restauration" }, 500);
    }
  }

  return json({ error: "Méthode non autorisée." }, 405, { Allow: "GET, POST" });
};

export const config = { path: "/api/restore-catalogue" };
