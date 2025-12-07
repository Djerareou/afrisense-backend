# Guide d'utilisation du module Alerts

## Table des matières
1. [Introduction](#introduction)
2. [Installation et configuration](#installation-et-configuration)
3. [Migration de la base de données](#migration-de-la-base-de-données)
4. [Utilisation des API](#utilisation-des-api)
5. [Intégration dans le code](#intégration-dans-le-code)
6. [Tests](#tests)
7. [Troubleshooting](#troubleshooting)

## Introduction

Le module Alerts fournit une solution complète pour la gestion des alertes du système de géotracking AfriSense. Il permet de:

- ✅ Créer des alertes pour différents types d'événements
- ✅ Envoyer des notifications par email (Resend API) et SMS (CallMeBot API)
- ✅ Gérer les préférences utilisateur pour les alertes
- ✅ Prévenir les doublons d'alertes
- ✅ Filtrer et rechercher les alertes
- ✅ Suivre l'historique des envois de notifications

## Installation et configuration

### 1. Vérifier que le module est intégré

Le module est déjà intégré dans `src/app.js`:

```javascript
import alertsRoutes from './modules/alerts/alerts.routes.js';
// ...
app.use('/api/alerts', alertsRoutes);
```

### 2. Configurer les variables d'environnement

Créer ou mettre à jour le fichier `.env` à la racine du projet:

```env
# Base de données (déjà configuré normalement)
DATABASE_URL="postgresql://user:password@localhost:5432/afrisense?schema=public"

# Resend API pour les emails
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=alerts@votredomaine.com

# CallMeBot API pour les SMS
CALLMEBOT_API_KEY=xxxxxxxxxxxxx

# Optionnel : destinataires par défaut pour les tests
DEFAULT_ALERT_EMAIL=admin@votredomaine.com
DEFAULT_ALERT_PHONE=+237xxxxxxxxx

# Optionnel : fenêtre de prévention des doublons (en secondes, défaut: 120)
ALERT_DUPLICATE_WINDOW_SECONDS=120
```

#### Obtenir une clé API Resend

1. Créer un compte sur [resend.com](https://resend.com)
2. Aller dans "API Keys"
3. Créer une nouvelle clé API
4. Copier la clé et l'ajouter dans `.env`

#### Obtenir une clé API CallMeBot

1. Consulter la documentation sur [callmebot.com](https://www.callmebot.com)
2. Suivre les instructions pour obtenir une clé API
3. Ajouter la clé dans `.env`

## Migration de la base de données

### Appliquer la migration

La migration `20251207203340_update_alerts_module` modifie le schéma de la base de données pour le module Alerts.

**En développement:**

```bash
cd prisma
npx prisma migrate dev
```

**En production:**

```bash
cd prisma
npx prisma migrate deploy
```

### Vérifier la migration

Après l'application, vérifier que les tables existent:

```sql
-- Tables créées/modifiées
SELECT * FROM "Alert" LIMIT 1;
SELECT * FROM "AlertSetting" LIMIT 1;
SELECT * FROM "AlertDeliveryLog" LIMIT 1;

-- Vérifier les enum
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'AlertType'::regtype;
```

### Générer le client Prisma

```bash
cd prisma
npx prisma generate
```

## Utilisation des API

### 1. Créer une alerte

**Endpoint:** `POST /api/alerts`

**Body:**
```json
{
  "trackerId": "uuid-du-tracker",
  "type": "OVERSPEED",
  "positionId": "uuid-de-la-position",
  "meta": {
    "speed": 120,
    "limit": 80
  }
}
```

**Types d'alertes disponibles:**
- `GEOFENCE_ENTER` - Entrée dans une géofence
- `GEOFENCE_EXIT` - Sortie d'une géofence
- `OVERSPEED` - Excès de vitesse
- `NO_MOVEMENT` - Absence de mouvement
- `LOW_BATTERY` - Batterie faible
- `SIGNAL_LOSS` - Perte de signal
- `SUSPICIOUS_STOP` - Arrêt suspect
- `HIGH_TEMPERATURE` - Température élevée
- `DEVICE_OFFLINE` - Appareil hors ligne

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": "alert-uuid",
    "type": "OVERSPEED",
    "trackerId": "tracker-uuid",
    "positionId": "position-uuid",
    "geofenceId": null,
    "timestamp": "2025-12-07T20:30:00.000Z",
    "meta": "{\"speed\":120,\"limit\":80}",
    "tracker": { ... },
    "geofence": null
  }
}
```

### 2. Lister les alertes

**Endpoint:** `GET /api/alerts`

**Query parameters:**
- `type` - Filtrer par type d'alerte
- `trackerId` - Filtrer par tracker
- `geofenceId` - Filtrer par géofence
- `dateFrom` - Date de début (ISO 8601)
- `dateTo` - Date de fin (ISO 8601)
- `skip` - Pagination (défaut: 0)
- `take` - Nombre de résultats (défaut: 50, max: 100)

**Exemple:**
```bash
GET /api/alerts?type=OVERSPEED&trackerId=tracker-123&dateFrom=2025-12-01&take=20
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": "alert-uuid",
      "type": "OVERSPEED",
      "trackerId": "tracker-uuid",
      "timestamp": "2025-12-07T20:30:00.000Z",
      "tracker": { ... },
      "geofence": null
    }
  ],
  "count": 1
}
```

### 3. Obtenir une alerte spécifique

**Endpoint:** `GET /api/alerts/:id`

**Exemple:**
```bash
GET /api/alerts/alert-uuid-123
```

### 4. Supprimer une alerte

**Endpoint:** `DELETE /api/alerts/:id`

**Exemple:**
```bash
DELETE /api/alerts/alert-uuid-123
```

**Réponse:**
```json
{
  "success": true,
  "message": "Alert deleted"
}
```

### 5. Gérer les paramètres utilisateur

> **Note :** Les endpoints de paramètres vérifient `req.user?.id` mais n'ont pas de middleware d'authentification appliqué au niveau des routes. Il est recommandé d'ajouter un middleware d'authentification (JWT) au niveau de l'application ou des routes pour sécuriser ces endpoints.

**Obtenir les paramètres:**
```bash
GET /api/alerts/settings
# Authentication middleware should be added at app or route level
Authorization: Bearer <token>
```

**Mettre à jour les paramètres:**
```bash
PATCH /api/alerts/settings
# Authentication middleware should be added at app or route level
Authorization: Bearer <token>
Content-Type: application/json

{
  "enabled": true,
  "channels": {
    "EMAIL": true,
    "SMS": false,
    "CONSOLE": true,
    "PUSH": false
  },
  "thresholds": {
    "overspeed": 100,
    "lowBattery": 15
  }
}
```

### 6. Tester les notifications

**Test email:**
```bash
POST /api/alerts/test/email
Content-Type: application/json

{
  "email": "test@example.com"
}
```

**Test SMS:**
```bash
POST /api/alerts/test/sms
Content-Type: application/json

{
  "phoneNumber": "+237xxxxxxxxx"
}
```

## Intégration dans le code

### Exemple 1: Créer une alerte depuis le module geofences

```javascript
// Dans geofences.events.js ou geofences.service.js
import * as alertsService from '../alerts/alerts.service.js';

async function handleGeofenceEvent(trackerId, geofenceId, positionId, eventType) {
  try {
    const alertType = eventType === 'enter' ? 'GEOFENCE_ENTER' : 'GEOFENCE_EXIT';
    
    const alert = await alertsService.createAlert({
      trackerId,
      type: alertType,
      positionId,
      geofenceId,
      meta: {
        eventType,
        geofenceName: geofence.name
      }
    });
    
    if (alert) {
      console.log(`Alert created: ${alert.id}`);
    } else {
      console.log('Alert skipped (duplicate or disabled)');
    }
  } catch (err) {
    console.error('Error creating geofence alert:', err);
  }
}
```

### Exemple 2: Créer une alerte d'excès de vitesse

```javascript
// Dans positions.service.js
import * as alertsService from '../alerts/alerts.service.js';

async function checkSpeed(position, tracker) {
  const speedLimit = 80; // km/h
  
  if (position.speed > speedLimit) {
    try {
      await alertsService.createAlert({
        trackerId: tracker.id,
        type: 'OVERSPEED',
        positionId: position.id,
        meta: {
          speed: position.speed,
          limit: speedLimit,
          location: {
            lat: position.latitude,
            lng: position.longitude
          }
        }
      });
    } catch (err) {
      console.error('Error creating overspeed alert:', err);
    }
  }
}
```

### Exemple 3: Job planifié pour vérifier les appareils hors ligne

```javascript
// Dans jobs/checkOfflineDevices.js
import * as alertsService from '../modules/alerts/alerts.service.js';
import { prisma } from '../config/prismaClient.js';

export async function checkOfflineDevices() {
  const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
  
  const offlineTrackers = await prisma.tracker.findMany({
    where: {
      lastCommunication: {
        lt: threshold
      },
      status: 'active'
    },
    include: {
      positions: {
        orderBy: { timestamp: 'desc' },
        take: 1
      }
    }
  });
  
  for (const tracker of offlineTrackers) {
    if (tracker.positions.length > 0) {
      await alertsService.createAlert({
        trackerId: tracker.id,
        type: 'DEVICE_OFFLINE',
        positionId: tracker.positions[0].id,
        meta: {
          lastSeen: tracker.lastCommunication,
          minutesOffline: Math.floor((Date.now() - tracker.lastCommunication.getTime()) / 60000)
        }
      });
    }
  }
}
```

## Tests

### Lancer tous les tests du module

```bash
# Tests unitaires
npm run test:unit -- alerts

# Tests d'intégration
npx jest src/test/integration/alerts.api.integration.test.js
```

### Tests manuels avec curl

```bash
# Créer une alerte
curl -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "trackerId": "existing-tracker-id",
    "type": "OVERSPEED",
    "positionId": "existing-position-id",
    "meta": {"speed": 120}
  }'

# Lister les alertes
curl http://localhost:3000/api/alerts

# Obtenir une alerte
curl http://localhost:3000/api/alerts/alert-id

# Supprimer une alerte
curl -X DELETE http://localhost:3000/api/alerts/alert-id

# Tester l'envoi email
curl -X POST http://localhost:3000/api/alerts/test/email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Tester l'envoi SMS
curl -X POST http://localhost:3000/api/alerts/test/sms \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+237xxxxxxxxx"}'
```

## Troubleshooting

### Problème: "Prisma client not initialized"

**Solution:**
```bash
cd prisma
npx prisma generate
cd ..
npm install
```

### Problème: "RESEND_API_KEY not configured"

**Solution:** Vérifier que la variable est bien dans `.env` et redémarrer le serveur.

### Problème: Les notifications ne sont pas envoyées

**Diagnostics:**
1. Vérifier les logs pour voir les erreurs d'envoi
2. Tester avec les endpoints `/test/email` et `/test/sms`
3. Vérifier que les paramètres utilisateur ont les canaux activés
4. Vérifier la table `AlertDeliveryLog` pour voir l'historique

```sql
SELECT * FROM "AlertDeliveryLog" 
WHERE "alertId" = 'alert-uuid' 
ORDER BY "attemptedAt" DESC;
```

### Problème: Doublons d'alertes

**Solution:** Le système empêche automatiquement les doublons dans une fenêtre de 2 minutes. Si vous voyez des doublons:
1. Vérifier que les alertes ont bien le même trackerId, type, et geofenceId
2. Vérifier l'horodatage pour confirmer qu'elles sont espacées de plus de 2 minutes

### Problème: "Position not found" ou "Tracker not found"

**Solution:** S'assurer que les IDs fournis existent dans la base de données:

```sql
SELECT id FROM "Position" WHERE id = 'position-uuid';
SELECT id FROM "Tracker" WHERE id = 'tracker-uuid';
```

### Problème: Migration échoue

**Solution:**
1. Vérifier que la base de données est accessible
2. Vérifier qu'il n'y a pas de données incompatibles
3. En cas de problème, restaurer à partir d'un backup et réessayer

```bash
# Voir l'état des migrations
cd prisma
npx prisma migrate status

# Forcer la réinitialisation (ATTENTION: perte de données)
npx prisma migrate reset
```

## Support

Pour toute question ou problème:
1. Consulter la documentation dans `src/modules/alerts/README.md`
2. Vérifier les logs de l'application
3. Examiner les tests pour voir des exemples d'utilisation
4. Contacter l'équipe de développement

---

**Version du module:** 1.0.0  
**Dernière mise à jour:** 07 Décembre 2025
