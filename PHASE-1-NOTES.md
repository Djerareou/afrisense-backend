# Phase 1: Code Quality & Standards

## Objectifs

1. **ESLint Configuration** - Établir des règles de linting strictes et cohérentes
2. **Prettier Configuration** - Formater automatiquement le code
3. **JSDoc Documentation** - Ajouter des commentaires de type à toutes les fonctions
4. **Zod Validation Schemas** - Créer des schémas de validation pour tous les endpoints

## Fichiers Modifiés

### Configuration Files (Nouveaux)
- `.eslintrc.json` - Configuration ESLint avec règles strictes
- `.prettierrc.json` - Configuration Prettier pour formatage uniforme
- `.prettierignore` - Fichiers à exclure du formatage
- `src/validators/` - Nouveau dossier pour les schémas Zod

### Module Alerts (Exemple de refactoring)
- `src/modules/alerts/alerts.controller.js` - Ajout JSDoc + validation Zod
- `src/modules/alerts/alerts.service.js` - JSDoc complet
- `src/modules/alerts/alerts.repository.js` - JSDoc complet
- `src/modules/alerts/alerts.validators.js` - Nouveau fichier avec schémas Zod

### Package.json
- Ajout de scripts `lint`, `lint:fix`, `format`
- Ajout de Prettier comme devDependency

## Risques Techniques

### Risque Faible ⚠️
- **ESLint/Prettier** peuvent révéler des problèmes de style existants
- **Solution**: Appliquer progressivement avec `--fix`

### Risque Très Faible ✅
- **JSDoc** n'affecte pas la logique du code
- **Zod** ajoute une couche de validation mais ne change pas le comportement

## Tests Nécessaires

1. **Tests Unitaires Existants** - Vérifier qu'ils passent toujours
   ```bash
   npm run test:unit -- alerts
   ```

2. **Linting** - Vérifier que le code passe le linting
   ```bash
   npm run lint
   ```

3. **Format Check** - Vérifier le formatage
   ```bash
   npm run format:check
   ```

## Changements dans package.json

```json
{
  "scripts": {
    "lint": "eslint src/**/*.js",
    "lint:fix": "eslint src/**/*.js --fix",
    "format": "prettier --write \"src/**/*.js\"",
    "format:check": "prettier --check \"src/**/*.js\""
  },
  "devDependencies": {
    "prettier": "^3.1.0"
  }
}
```

## Points d'Attention

1. **ESLint peut signaler beaucoup d'avertissements** initialement - c'est normal
2. **Prettier reformatera le code** - les diffs seront importants mais sans impact fonctionnel
3. **JSDoc est progressif** - commence avec le module alerts comme exemple
4. **Zod validation** est additive - ne casse rien, ajoute de la sécurité

## Ordre d'Application

1. ✅ Créer configurations ESLint/Prettier
2. ✅ Ajouter scripts npm
3. ⏳ Créer schémas Zod pour module alerts
4. ⏳ Améliorer JSDoc dans module alerts
5. ⏳ Formater le code avec Prettier
6. ⏳ Exécuter les tests

## Validation

- [ ] Tous les tests unitaires passent
- [ ] ESLint ne signale aucune erreur
- [ ] Le code est formaté avec Prettier
- [ ] JSDoc complet pour le module alerts
- [ ] Validation Zod fonctionnelle pour alerts endpoints

## Prochaine Phase

Après validation de Phase 1, passer à **Phase 2: Error Handling** (branche `refactor/phase-2-error-handling`)
