#!/usr/bin/env node
/* Script pour synchroniser les 52 instruments depuis Netlify KV vers le fichier local */

import { getStore } from "@netlify/blobs";
import { writeFileSync } from "fs";
import { resolve } from "path";

const cataloguePath = resolve("assets/data/catalogue.json");

console.log("🔄 Récupération des instruments depuis Netlify KV...");

try {
  const store = getStore("default");

  /* Récupérer le catalogue depuis Netlify KV */
  const catalogue = await store.get("catalogue.json", { type: "text" });

  if (!catalogue) {
    console.error("❌ Aucun catalogue trouvé dans Netlify KV");
    process.exit(1);
  }

  /* Parser et valider les données */
  const data = JSON.parse(catalogue);

  if (!data.instruments || !Array.isArray(data.instruments)) {
    console.error("❌ Structure du catalogue invalide");
    process.exit(1);
  }

  /* Écrire dans le fichier local */
  writeFileSync(cataloguePath, JSON.stringify(data, null, 2));

  console.log(`✅ Synchronisation réussie!`);
  console.log(`📊 ${data.instruments.length} instruments importés dans ${cataloguePath}`);

} catch (error) {
  console.error("❌ Erreur lors de la synchronisation:");
  console.error(error.message);
  process.exit(1);
}
