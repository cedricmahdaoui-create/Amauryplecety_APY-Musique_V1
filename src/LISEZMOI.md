# Gabarits du site

Chaque fichier de ce dossier est un **gabarit**. `scripts/generer-site.mjs` le remplit avec les
valeurs de `site.config.json`, puis l'écrit au même chemin à la racine du projet
(`src/index.html` → `index.html`, `src/assets/css/style.css` → `assets/css/style.css`…).

**Ne modifiez pas les copies générées à la racine** : modifiez le gabarit ici, puis relancez :

```bash
node scripts/generer-site.mjs
```

Pour vérifier que les fichiers générés sont à jour sans rien écrire :

```bash
node scripts/generer-site.mjs --verifier
```

## Syntaxe

| Balise | Effet |
|---|---|
| `{{ entreprise.nom }}` | valeur, échappée pour le HTML |
| `{{{ accueil.sous_titre }}}` | valeur brute (peut contenir du HTML) |
| `{{json chemin}}` / `{{json chemin 4}}` | valeur en JSON (données structurées), lignes suivantes décalées de 4 espaces |
| `{{jsonstr chemin}}` | texte à l'intérieur d'une chaîne JSON ou JavaScript entre guillemets doubles |
| `{{#if chemin}} … {{else}} … {{/if}}` | bloc conditionnel (vide, `false`, `null`, liste vide = faux) |
| `{{#each liste}} {{this.champ}} {{/each}}` | répétition |

Une balise de bloc seule sur sa ligne disparaît avec sa ligne. Un chemin inconnu arrête la génération
(protection contre les fautes de frappe).

Raccourcis disponibles : `blocs.*` (= `blocs_actifs`), `page.*` (titre, description, url de la page
en cours), `calc.*` (valeurs calculées : SIRET formaté, lignes d'horaires, lien WhatsApp, JSON-LD…,
voir `scripts/generer-site.mjs`).
