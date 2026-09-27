# 🚨 Analyse des Risques d'Hébergement
**APY Musique • Netlify Edition**

---

## 📊 Matrice de Risques

| Risque | Criticité | Probabilité | Impact | Mitigation | Statut |
|--------|-----------|-------------|--------|-----------|--------|
| Pas de monitoring erreurs | 🔴 CRITIQUE | Haute | Catastr. | Sentry | ❌ NON MITIGÉ |
| Pas d'audit trail admin | 🔴 CRITIQUE | Moyenne | Grave | Logging | ❌ NON MITIGÉ |
| Défaillance Netlify Blobs | 🟠 ÉLEVÉ | Très basse | Grave | Backup | ❌ NON MITIGÉ |
| ADMIN_PASSWORD exposé | 🟠 ÉLEVÉ | Basse | Grave | Secret Manager | ⚠️ PARTIELLEMENT |
| Pas de DR plan | 🟠 ÉLEVÉ | Basse | Catastr. | RTO/RPO | ❌ NON MITIGÉ |
| Rate limiting bypassé | 🟡 MOYEN | Très basse | Moyen | WAF | ✅ MITIGÉ (Netlify) |
| HTTP non-redirigé | 🟡 MOYEN | Basse | Faible | Redirect | ❌ À FAIRE |
| Pas de SRI | 🔵 FAIBLE | Basse | Faible | CSP | ✅ MITIGÉ (CSP stricte) |

---

## 🔴 Risques Critiques

### 1️⃣ Pas de Monitoring des Erreurs Production

**Symptôme**: Un utilisateur rencontre un bug → vous l'apprenez par email 3 jours après.

**Cause**: Aucune intégration monitoring (Sentry, Datadog).

**Scénario de Crise**:
```
T+0h  : Bug en production (fonction auth cassée)
T+3j  : Admin reçoit email: "le mot de passe ne marche plus"
T+4j  : Vous identifiez le bug
T+5j  : Fix en production
```

**Impact Estimé**:
- Revenue: -$500 (utilisateurs frustés)
- Reputation: Haute (admin incapable, support nul)
- Temps diagnostic: 4–8 h

**Mitigation Immédiate** (30 min):
```bash
# Installer Sentry
npm install @sentry/netlify-functions

# Ajouter à netlify/lib/common.mjs
import * as Sentry from "@sentry/netlify-functions";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [new Sentry.Integrations.Http({ tracing: true })],
  tracesSampleRate: 1.0,
});

export default Sentry.wrapHandler(async (req, context) => {
  // Erreurs automatiquement envoyées
});
```

**Coût**: $29/mois (Sentry) — peanuts vs risque.

---

### 2️⃣ Pas d'Audit Trail Administrateur

**Symptôme**: "Qui a supprimé les 100 photos de la galerie hier ?" → Aucune trace.

**Cause**: Zéro logging des actions admin.

**Scénario de Crise**:
```
T+0h  : Admin A modifie le catalogue
T+1h  : Admin B remarque des changements bizarres
T+2h  : Vous recevez un mail paniqué
T+3h  : Impossible de savoir qui a fait quoi
T+4h  : Vous roulez back aveugle = risque d'autre corruption
```

**Impact Estimé**:
- Data integrity: Impossible à vérifier
- Compliance: RGPD requis = trace des modifications
- Recovery: 50% de chance de faire pire en rollback

**Mitigation Immédiate** (1–2 h):

```javascript
// netlify/lib/audit.mjs
export async function logAction(action, details, ip) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, action, details, ip };
  
  const store = dataStore();
  const key = `audit/${timestamp.replace(/[:.]/g, '-')}`;
  
  await store.set(key, JSON.stringify(entry)).catch(err => {
    console.error('Audit log failed:', err);
    // Alert: audit log unavailable = block the action
    throw new Error('Audit system down, contact admin');
  });
}

// netlify/functions/catalogue.mjs
export default Sentry.wrapHandler(async (req, context) => {
  const denied = await requireAdmin(req, context);
  if (denied) return denied;

  if (req.method === 'PUT') {
    const oldCatalog = await getCatalog();
    const result = await updateCatalog(req.body);
    
    // Log the change
    await logAction(
      'catalogue_update',
      { old: oldCatalog, new: result, diff: getDiff(oldCatalog, result) },
      context.ip
    );
    
    return json({ ok: true, ...result });
  }
});
```

**Coût**: $0 (Netlify Blobs) — déjà payé.

---

### 3️⃣ Défaillance Netlify Blobs → Perte de Données

**Probabilité**: Très basse (0.01% par an), mais **Impact Catastr.** = haute criticité.

**Scénario**:
```
Même scenario que AWS S3 down le 27 sept 2021:
- Durée: 6–12 h
- Impact: Tous les sites statiques down globalement
- Your site: Offline + impossible d'ajouter catalogues
```

**Mitigation**:

#### Plan A: Backup Quotidien (Recommandé)
```bash
#!/bin/bash
# backup-to-github.sh (schedule quotidiennement)

export AUTH_PASSWORD="$(pass show apy/admin)"

# Export catalogue
curl -s -H "Authorization: Bearer $AUTH_PASSWORD" \
  https://apy-musique.netlify.app/api/catalogue \
  -o catalogue-backup-$(date +%Y-%m-%d).json

# Export audit logs
curl -s -H "Authorization: Bearer $AUTH_PASSWORD" \
  https://apy-musique.netlify.app/api/history \
  -o history-backup-$(date +%Y-%m-%d).json

# Commit to GitHub
git add backup-*
git commit -m "Auto: Daily backup $(date)"
git push origin main
```

**Coût**: $0 (GitHub private repo)

#### Plan B: Google Drive Sync (Fallback)
```javascript
// netlify/functions/backup.mjs
import { google } from 'googleapis';

export default async (req, context) => {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS)
  });
  
  const drive = google.drive({ version: 'v3', auth });
  const catalog = await getCatalog();
  
  await drive.files.create({
    resource: {
      name: `catalogue-${new Date().toISOString()}.json`,
      parents: [process.env.GOOGLE_DRIVE_FOLDER],
    },
    media: {
      mimeType: 'application/json',
      body: JSON.stringify(catalog),
    },
  });
  
  return json({ ok: true, backup: 'Google Drive' });
};
```

**Coût**: $0 (Google Drive free tier = 15 GB)

---

## 🟠 Risques Élevés

### 4️⃣ ADMIN_PASSWORD Exposé Accidentellement

**Scénario**: Quelqu'un fuite `ADMIN_PASSWORD` dans:
- Un email
- Un commit Git
- Un screenshot
- Une intégration tiers (Zapier, IFTTT)

**Probabilité**: ~5% par an (sur longue durée).

**Mitigation**:

#### ✅ Déjà en place (Netlify):
```
Netlify masque les secrets dans les logs deploy.
Pas visible dans GitHub, npm scripts, etc.
```

#### À améliorer:
```
[ ] Password rotation tous les 90 jours
[ ] Audit: qui a accédé au secret?
[ ] Alertes si token utilisé d'une IP inconnue
[ ] Backup du ancien password (en cas de rollback)
```

**Implementation**:
```bash
# Rotation script
./rotate-admin-password.sh new_password

# Notification
echo "Admin password rotated at $(date)" | \
  mail -s "🔐 APY Security" admin@...
```

---

### 5️⃣ Pas de Plan DR (Disaster Recovery)

**Définition**: Vous avez un plan pour récupérer en cas de:
- Netlify entièrement down (impossible)
- Vos données Blobs corrompues (possible)
- Votre domaine compromis (possible)
- Votre GitHub hacké (possible)

**RTO** (Recovery Time Objective): Combien de temps avant le site en ligne?
- **Target**: < 1 h
- **Current**: Impossible (dépend Netlify)

**RPO** (Recovery Point Objective): Vous perdez combien de données?
- **Target**: < 1 jour
- **Current**: Tout (si Blobs down)

**DR Plan Recommandé**:

```markdown
## Disaster Recovery Plan

### Scenario 1: Netlify Down (0.01% probabilité)
RTO: 4–24 h (attendre Netlify)
RPO: 0 (Netlify recopie auto)
Action: Rien à faire, wait.

### Scenario 2: Blobs Données Corrompues (0.1% probabilité)
RTO: 30 min
RPO: 1 jour
Action: Restore depuis backup GitHub + redeploy

### Scenario 3: Domaine Hacké (1% probabilité)
RTO: 15 min
RPO: 0
Action: Update DNS vers Netlify backup site (apy-musique.netlify.app)

### Scenario 4: GitHub Hacké (0.5% probabilité)
RTO: 1 h
RPO: 1 jour
Action: Restore from Google Drive backup, new GitHub repo
```

**Implementation** (Immédiate):
1. Backup GitHub quotidien ✅ (voir risque 3)
2. Document DNS failover
3. Test recovery 1x/mois

---

## 🟡 Risques Moyens

### 6️⃣ HTTP Non Redirigé → HTTPS

**Problème**: Un utilisateur visite `http://lacaveauxinstrum.fr`:
```
❌ Pas de redirection 301 en place
✓ HSTS force HTTPS après 1ère visite
⚠️  Première visite sur HTTP = vulnérable MITM (Man-In-The-Middle)
```

**Mitigation** (10 min):

Ajouter à `netlify.toml`:
```toml
[[redirects]]
  from = "http://lacaveauxinstrum.fr/*"
  to = "https://www.lacaveauxinstrum.fr/:splat"
  status = 301
  force = true

[[redirects]]
  from = "http://www.lacaveauxinstrum.fr/*"
  to = "https://www.lacaveauxinstrum.fr/:splat"
  status = 301
  force = true
```

**Impact**: Zéro (requête redirigée avant transmission données).

---

### 7️⃣ CORS Non Explicitement Défini

**Problème**: Si une API tiers appelle vos endpoints:
```
GET /api/catalogue
❌ Pas d'Access-Control-Allow-Origin explicite
✓ Netlify applique CORS restrictif par défaut
⚠️  Comportement implicite = fragile
```

**Mitigation** (5 min):

```toml
[[headers]]
  for = "/api/*"
  [headers.values]
    Access-Control-Allow-Origin = "https://www.lacaveauxinstrum.fr"
    Access-Control-Allow-Methods = "POST, OPTIONS"
    Access-Control-Allow-Headers = "Authorization, Content-Type"
    Access-Control-Max-Age = "3600"
```

---

## 🔵 Risques Faibles

### 8️⃣ Pas de SRI (Subresource Integrity)

**Problème**: Si un asset externe est modifié (malveillant):
```html
<script src="https://cdn.example.com/lib.js"></script>
❌ Aucune vérification d'intégrité
✓ CSP: script-src 'self' = local only, donc safe
```

**Status**: ✅ MITIGÉ (CSP stricte = 'self' only)

---

## 📋 Roadmap de Mitigation

### ⚡ Semaine 1 (CRITIQUE)
- [ ] Intégrer Sentry pour error tracking
- [ ] Implémenter audit trail (logging actions admin)
- [ ] Tester health checks

**Effort**: 4–6 h | **Coût**: $29/mois | **ROI**: 10x (éviter downtime)

### 📅 Semaine 2–3 (IMPORTANT)
- [ ] Backup automatique GitHub
- [ ] Backup Google Drive (fallback)
- [ ] Test DR plan (disaster recovery)
- [ ] Rotation password

**Effort**: 6–8 h | **Coût**: $0 | **ROI**: Infinite (accès data assuré)

### 🔧 Mois 1 (OPPORTUNITÉS)
- [ ] CORS explicite dans headers
- [ ] HTTP → HTTPS redirects
- [ ] Monitoring performance (Datadog)
- [ ] Rate limiting avancé

**Effort**: 2–4 h | **Coût**: $0–50 | **ROI**: Bonne opérationnalité

---

## 🎯 Checklist Final

- [ ] Sentry intégré et opérationnel
- [ ] Audit trail en place pour actions admin
- [ ] Backup quotidien GitHub + Google Drive
- [ ] Health checks automatisés 24/7
- [ ] DR plan documenté et testé
- [ ] Password rotation process
- [ ] CORS, HTTP redirects configurés
- [ ] Monitoring performance en place
- [ ] Équipe sensibilisée aux risques

---

## 📞 Escalade

**Qui appeler si**:

| Problème | Contact | Temps |
|----------|---------|-------|
| Site down | Netlify support | 2–24 h |
| Données perdues | Vous (backup) | ASAP |
| Attaque (hack) | Netlify security | 30 min |
| Email pas reçu | Amaury | 24 h |

---

*Analyse complète de risques • APY Musique • Netlify • 2026-09-27*
