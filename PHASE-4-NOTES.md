# Phase 4: Security & Authentication

## 📋 Objectifs

Sécuriser le module alerts en ajoutant l'authentification JWT et l'autorisation basée sur les rôles (RBAC) pour protéger les endpoints sensibles.

## 🎯 Changements Principaux

### 1. Protection des Endpoints Alerts

**Endpoints Publics (Aucun):**
- Tous les endpoints nécessitent maintenant une authentification

**Endpoints Authentifiés (Tous les utilisateurs):**
- `GET /alerts` - Liste des alertes (filtrées par utilisateur)
- `GET /alerts/:id` - Détail d'une alerte (si propriétaire)
- `GET /alerts/settings` - Paramètres utilisateur

**Endpoints avec Rôles Spécifiques:**
- `POST /alerts` - Création manuelle (admin, fleet_manager uniquement)
- `DELETE /alerts/:id` - Suppression (admin uniquement)
- `PATCH /alerts/settings` - Mise à jour paramètres (utilisateur authentifié)
- `POST /alerts/test/email` - Test email (admin uniquement)
- `POST /alerts/test/sms` - Test SMS (admin uniquement)

### 2. Architecture de Sécurité

```
Request
  ↓
authMiddleware (vérifie JWT token)
  ↓
roleMiddleware (vérifie les rôles autorisés)
  ↓
validateInput (validation Zod - Phase 1)
  ↓
asyncHandler (gestion erreurs - Phase 2)
  ↓
Controller
  ↓
Service (filtre par userId/role)
  ↓
Repository (Phase 3)
```

### 3. Filtrage par Utilisateur

**Service Layer:**
- Les requêtes GET filtrent automatiquement par userId
- Les admins peuvent voir toutes les alertes
- Les fleet_managers voient les alertes de leurs trackers
- Les owners voient uniquement leurs propres alertes

## 📁 Fichiers Modifiés

### Nouveaux Fichiers
- `PHASE-4-NOTES.md` - Ce document
- `PHASE-4-SUMMARY.md` - Résumé de l'implémentation

### Fichiers Modifiés
1. **`src/modules/alerts/alerts.routes.js`**
   - Ajout de `authMiddleware` pour tous les endpoints
   - Ajout de `roleMiddleware` pour les endpoints administratifs
   - Protection des endpoints de test

2. **`src/modules/alerts/alerts.service.js`**
   - Ajout du paramètre `userContext` à toutes les méthodes publiques
   - Filtrage automatique par userId/role
   - Vérification des permissions de propriété

3. **`src/modules/alerts/alerts.controller.js`**
   - Passage de `req.user` au service layer
   - Extraction du contexte utilisateur (userId, role)

4. **`src/modules/alerts/alerts.repository.js`**
   - Support du filtrage par userId
   - Méthodes pour vérifier la propriété des alertes

## 🔒 Modèle de Permission

### Rôles Disponibles
- `admin` - Accès complet
- `fleet_manager` - Gestion de flotte
- `owner` - Propriétaire de trackers
- `user` - Utilisateur standard

### Matrice de Permissions

| Endpoint | admin | fleet_manager | owner | user |
|----------|-------|---------------|-------|------|
| GET /alerts | ✅ Toutes | ✅ Sa flotte | ✅ Ses alertes | ✅ Ses alertes |
| GET /alerts/:id | ✅ | ✅ Si sa flotte | ✅ Si sienne | ✅ Si sienne |
| POST /alerts | ✅ | ✅ | ❌ | ❌ |
| DELETE /alerts/:id | ✅ | ❌ | ❌ | ❌ |
| GET /settings | ✅ | ✅ | ✅ | ✅ |
| PATCH /settings | ✅ | ✅ | ✅ | ✅ |
| POST /test/email | ✅ | ❌ | ❌ | ❌ |
| POST /test/sms | ✅ | ❌ | ❌ | ❌ |

## ⚠️ Risques Techniques

### Risque 1: Breaking Changes pour les Clients Existants
**Impact:** Élevé
**Probabilité:** Élevée
**Mitigation:**
- Les clients doivent maintenant envoyer un JWT token
- Documentation claire des changements
- Messages d'erreur explicites (401 Unauthorized)

### Risque 2: Filtrage Incorrect des Données
**Impact:** Critique (fuite de données)
**Probabilité:** Faible
**Mitigation:**
- Tests unitaires pour chaque scénario de filtrage
- Vérification stricte des permissions dans le service
- Double vérification userId/trackerId

### Risque 3: Performance sur les Requêtes Filtrées
**Impact:** Moyen
**Probabilité:** Faible
**Mitigation:**
- Indexes sur userId et trackerId dans Prisma
- Pagination obligatoire
- Monitoring des performances

## 🧪 Tests Nécessaires

### Tests Unitaires
```javascript
// Service Layer
- createAlert avec userContext admin
- createAlert avec userContext owner (devrait échouer)
- listAlerts filtrées par userId
- listAlerts par admin (toutes les alertes)
- getAlert vérifie propriété

// Repository Layer
- findAlertsByUserId
- checkAlertOwnership
```

### Tests d'Intégration
```javascript
// Sans token
- GET /alerts → 401 Unauthorized
- POST /alerts → 401 Unauthorized

// Avec token owner
- GET /alerts → Retourne uniquement ses alertes
- GET /alerts/:id d'un autre → 403 Forbidden
- POST /alerts → 403 Forbidden (pas admin)

// Avec token admin
- GET /alerts → Retourne toutes les alertes
- POST /alerts → 201 Created
- DELETE /alerts/:id → 200 OK
```

### Tests de Sécurité
```javascript
// Token invalide
- Token expiré → 401
- Token manipulé → 401
- Token sans role → 403

// Injection de paramètres
- userId dans query params (ignoré)
- role dans body (ignoré)
```

## 📊 Métriques de Succès

### Sécurité
- ✅ 0 endpoint sans authentification
- ✅ 100% des endpoints sensibles protégés par rôles
- ✅ Aucune fuite de données cross-user

### Performance
- ✅ < 10ms overhead pour vérification JWT
- ✅ Pas de régression sur les temps de réponse

### Compatibilité
- ✅ Tous les tests existants passent (après mise à jour)
- ✅ Aucune régression fonctionnelle

## 🔄 Migration Guide

### Pour les Développeurs

**Avant (Phase 3):**
```javascript
// Appel service sans contexte
const alerts = await alertsService.listAlerts({ type: 'GEOFENCE_ENTER' });
```

**Après (Phase 4):**
```javascript
// Appel service avec contexte utilisateur
const userContext = { userId: req.user.userId, role: req.user.role };
const alerts = await alertsService.listAlerts({ type: 'GEOFENCE_ENTER' }, userContext);
```

### Pour les Clients API

**Avant (Phase 3):**
```bash
curl http://localhost:3000/api/alerts
```

**Après (Phase 4):**
```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" http://localhost:3000/api/alerts
```

## 🎯 Alignement avec les Autres Modules

Cette phase aligne le module alerts avec les patterns de sécurité existants:

- **trackers**: `authMiddleware` + `roleMiddleware` ✅
- **geofences**: `authMiddleware` + `roleMiddleware` ✅
- **positions**: `authMiddleware` ✅
- **alerts**: `authMiddleware` + `roleMiddleware` ✅ (Phase 4)

## 📝 Checklist d'Implémentation

- [ ] Mettre à jour `alerts.routes.js` avec middlewares
- [ ] Ajouter paramètre `userContext` aux méthodes service
- [ ] Implémenter filtrage par userId dans le repository
- [ ] Mettre à jour les controllers pour passer `req.user`
- [ ] Ajouter vérifications de propriété
- [ ] Créer tests unitaires de sécurité
- [ ] Créer tests d'intégration avec tokens
- [ ] Mettre à jour la documentation API
- [ ] Valider avec `npm run lint`
- [ ] Valider avec `npm test`

## 🚀 Commandes de Validation

```bash
# Installation
npm install

# Linting
npm run lint

# Tests unitaires
npm run test:unit -- alerts

# Tests d'intégration
npm run test:integration -- alerts

# Vérifier la couverture de sécurité
npm run test -- --coverage
```

## 📚 Références

- JWT Documentation: https://jwt.io/
- Express Middleware: https://expressjs.com/en/guide/using-middleware.html
- Role-Based Access Control: https://en.wikipedia.org/wiki/Role-based_access_control
- Prisma Security Best Practices: https://www.prisma.io/docs/guides/security
