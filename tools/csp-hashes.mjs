/**
 * Calcule les empreintes SHA-256 de tous les scripts inline (<script> sans src)
 * présents dans les fichiers .html du dossier, pour la directive CSP `script-src`.
 *
 * Usage :  node tools/csp-hashes.mjs
 *
 * Reportez la liste affichée dans `.htaccess` et `_headers` (directive script-src).
 * À relancer chaque fois qu'un bloc <script type="application/ld+json"> est modifié.
 */
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = readdirSync(root).filter((f) => f.endsWith(".html"));

const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
const hashes = new Map();

for (const file of files) {
  const html = readFileSync(join(root, file), "utf8");
  let m;
  while ((m = re.exec(html)) !== null) {
    const body = m[1];
    const h = createHash("sha256").update(body, "utf8").digest("base64");
    const entry = `'sha256-${h}'`;
    if (!hashes.has(entry)) hashes.set(entry, []);
    hashes.get(entry).push(file);
  }
}

if (hashes.size === 0) {
  console.log("Aucun script inline trouvé.");
} else {
  console.log("Empreintes à ajouter à script-src :\n");
  for (const [entry, inFiles] of hashes) {
    console.log(`  ${entry}   # ${[...new Set(inFiles)].join(", ")}`);
  }
  console.log("\nDirective complète :\n");
  console.log(
    "  script-src 'self' " + [...hashes.keys()].join(" ") + ";"
  );
}
