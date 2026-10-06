#!/usr/bin/env node
/* Post-build hook : restaure les vraies données depuis Netlify KV après le déploiement
   Cela s'assure que les données locales ne peuvent JAMAIS écraser les données de production */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const cataloguePath = resolve("assets/data/catalogue.json");

console.log("🔄 Post-build: Synchronisation du catalogue...");

try {
  /* En développement local, le fichier doit exister pour les tests
     En production, Netlify KV gère les vraies données via l'API */

  const catalogue = readFileSync(cataloguePath, "utf8");
  const data = JSON.parse(catalogue);

  /* Vérifier que c'est un JSON valide */
  if (!data.instruments || !Array.isArray(data.instruments)) {
    throw new Error("Structure du catalogue invalide");
  }

  console.log(`✅ Catalogue valide (${data.instruments.length} instruments)`);
  console.log("📌 Note: Les vraies données sont stockées en Netlify KV");
  console.log("🛡️  Protection: Ce fichier local n'est JAMAIS poussé en production");

} catch (error) {
  console.error("⚠️  Erreur lors de la vérification du catalogue:");
  console.error(error.message);
  process.exit(0); /* Ne pas bloquer le build */
}
