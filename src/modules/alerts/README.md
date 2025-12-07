# Alerts Module

Ce module implémente la gestion complète des alertes pour le système de géotracking AfriSense.

## Vue d'ensemble

Le module Alerts permet de créer, lister, filtrer et supprimer des alertes générées par différents événements du système (entrée/sortie de géofence, excès de vitesse, perte de signal, etc.). Il intègre également l'envoi de notifications par email et SMS.

## Structure des fichiers

- `alerts.enums.js` — Énumérations des types d'alertes et canaux de notification
- `alerts.repository.js` — Accès à la base de données Prisma (CRUD alertes, settings, delivery logs)
- `alerts.service.js` — Logique métier (validation, prévention doublons, envoi notifications)
- `alerts.controller.js` — Gestionnaires Express pour les endpoints API
- `alerts.routes.js` — Router Express monté sur `/api/alerts`
- `notifications.js` — Abstraction pour l'envoi de notifications (Resend Email, CallMeBot SMS)

## Types d'alertes supportés

- `GEOFENCE_ENTER` — Entrée dans une géofence
- `GEOFENCE_EXIT` — Sortie d'une géofence
- `OVERSPEED` — Excès de vitesse
- `NO_MOVEMENT` — Absence de mouvement
- `LOW_BATTERY` — Batterie faible
- `SIGNAL_LOSS` — Perte de signal
- `SUSPICIOUS_STOP` — Arrêt suspect
- `HIGH_TEMPERATURE` — Température élevée (IoT futur)
- `DEVICE_OFFLINE` — Appareil hors ligne

## API Endpoints

### Gestion des alertes

- **POST** `/api/alerts` — Créer une alerte
  - Body: `{ trackerId, type, positionId, geofenceId?, meta? }`
  - Retourne 201 avec l'alerte créée ou 204 si ignorée (doublon/désactivée)

- **GET** `/api/alerts` — Lister les alertes (avec filtres)
  - Query params: `type`, `trackerId`, `geofenceId`, `dateFrom`, `dateTo`, `skip`, `take`
  - Retourne un tableau d'alertes avec leurs relations

- **GET** `/api/alerts/:id` — Obtenir une alerte spécifique
  - Retourne l'alerte avec ses relations (tracker, geofence)

- **DELETE** `/api/alerts/:id` — Supprimer une alerte
  - Retourne 200 avec message de confirmation

### Gestion des paramètres utilisateur

- **GET** `/api/alerts/settings` — Obtenir les paramètres d'alertes de l'utilisateur
  - Nécessite authentification
  - Retourne les canaux activés et seuils configurés

- **PATCH** `/api/alerts/settings` — Mettre à jour les paramètres
  - Body: `{ enabled?, channels?, thresholds? }`
  - Canaux: `{ EMAIL: true, SMS: false, CONSOLE: true, PUSH: false }`

### Tests des notifications

- **POST** `/api/alerts/test/email` — Tester l'envoi email
  - Body: `{ email: "test@example.com" }`
  - Envoie un email de test via Resend API

- **POST** `/api/alerts/test/sms` — Tester l'envoi SMS
  - Body: `{ phoneNumber: "+1234567890" }`
  - Envoie un SMS de test via CallMeBot API

## Fonctionnalités métier

### Validation stricte
- `trackerId` obligatoire et doit exister
- `positionId` obligatoire et doit exister  
- `type` doit être un type valide de l'enum

### Prévention des doublons
- Empêche la création d'alertes identiques dans une fenêtre de 2 minutes
- Critères: même trackerId, type, et geofenceId

### Envoi de notifications non-bloquant
- Les notifications sont envoyées de manière asynchrone
- Les échecs d'envoi n'empêchent pas la création de l'alerte
- Chaque tentative est loggée dans `AlertDeliveryLog`

### Respect des préférences utilisateur
- Les alertes ne sont pas créées si `settings.enabled = false`
- Les notifications sont envoyées uniquement sur les canaux activés

## Configuration

### Variables d'environnement requises

Pour l'envoi d'emails via Resend:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=alerts@afrisense.com
```

Pour l'envoi de SMS via CallMeBot:
```env
CALLMEBOT_API_KEY=xxxxxxxxxxxxx
```

Emails/SMS par défaut pour les tests:
```env
DEFAULT_ALERT_EMAIL=admin@example.com
DEFAULT_ALERT_PHONE=+1234567890
```

## Schéma de base de données

### Modèle Alert
```prisma
model Alert {
  id         String    @id @default(uuid())
  type       AlertType
  trackerId  String
  geofenceId String?
  positionId String
  timestamp  DateTime  @default(now())
  meta       Json?

  tracker      Tracker              @relation(...)
  geofence     Geofence?            @relation(...)
  deliveryLogs AlertDeliveryLog[]
}
```

### Modèles associés
- `AlertSetting` — Préférences utilisateur
- `AlertDeliveryLog` — Historique des envois de notifications

## Migration de la base de données

Pour appliquer les changements de schéma:

```bash
cd prisma
npx prisma migrate dev --name update_alerts_module
```

Ou en production:
```bash
cd prisma
npx prisma migrate deploy
```

## Tests

### Tests unitaires
```bash
npm run test:unit -- alerts
```

Fichiers de tests:
- `src/test/unit/alerts.service.unit.test.js` — Tests de la logique métier
- `src/test/unit/alerts.settings.unit.test.js` — Tests des paramètres utilisateur

### Tests d'intégration
```bash
npx jest src/test/integration/alerts.api.integration.test.js
```

## Intégrations

Ce module est conçu pour être appelé par:
- **Module Geofences** — Lors d'événements enter/exit
- **Module Positions** — Lors de détection d'excès de vitesse, batterie faible, etc.
- **Jobs planifiés** — Pour détecter l'absence de mouvement, perte de signal, etc.

## Comportement en production

- ✅ Les alertes sont persistées immédiatement en base
- ✅ Les notifications sont envoyées de façon asynchrone
- ✅ Les échecs de notification sont loggés mais ne bloquent pas le système
- ✅ Les doublons sont automatiquement filtrés
- ✅ Les préférences utilisateur sont respectées

## Notes importantes

1. **positionId obligatoire** : Toutes les alertes doivent être liées à une position GPS
2. **Non-bloquant** : L'envoi de notifications n'impacte pas les performances du système
3. **Extensible** : Facile d'ajouter de nouveaux types d'alertes ou canaux de notification
4. **Traçable** : Tous les envois sont enregistrés dans AlertDeliveryLog

## Exemples d'utilisation

### Créer une alerte depuis le code

```javascript
import * as alertsService from './modules/alerts/alerts.service.js';

// Créer une alerte de géofence
const alert = await alertsService.createAlert({
  trackerId: 'tracker-uuid',
  type: 'GEOFENCE_ENTER',
  positionId: 'position-uuid',
  geofenceId: 'geofence-uuid',
  meta: { 
    distance: 0,
    geofenceName: 'Zone industrielle'
  }
});
```

### Créer une alerte via API

```bash
curl -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "trackerId": "tracker-uuid",
    "type": "OVERSPEED",
    "positionId": "position-uuid",
    "meta": {
      "speed": 120,
      "limit": 80
    }
  }'
```

