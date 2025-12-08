# Phase 2: Error Handling

## Objectifs

1. **Centralized Error Handling** - Create middleware to handle all errors consistently
2. **Custom Error Classes** - Define specific error types for different scenarios
3. **Standardized Error Responses** - Ensure all errors return consistent JSON format
4. **Remove Try-Catch Blocks** - Use async handler wrapper to simplify controller code
5. **Proper HTTP Status Codes** - Use appropriate status codes for different error types

## Fichiers Modifiés

### New Files Created
- `src/utils/errors.js` - Custom error classes (AppError, ValidationError, NotFoundError, etc.)
- `src/middleware/errorHandler.js` - Centralized error handling middleware
- `PHASE-2-NOTES.md` - This documentation file
- `PHASE-2-SUMMARY.md` - Implementation summary

### Modified Files
- `src/app.js` - Added error handling middleware at the end
- `src/modules/alerts/alerts.controller.js` - Refactored to use asyncHandler, removed try-catch
- `src/modules/alerts/alerts.service.js` - Updated to throw custom errors

## Risques Techniques

### Risque Moyen ⚠️
- **Error Flow Changes** - Error handling now centralized, changes how errors propagate
- **Solution**: Comprehensive testing of all error scenarios

### Risque Faible ✅
- **Custom Error Classes** - Only changes error types, not business logic
- **asyncHandler Wrapper** - Simplifies code, no functional changes

## Architecture

### Error Classes Hierarchy

```
AppError (base class)
├── ValidationError (400)
├── BadRequestError (400)
├── UnauthorizedError (401)
├── ForbiddenError (403)
├── NotFoundError (404)
├── ConflictError (409)
├── InternalServerError (500)
└── ServiceUnavailableError (503)
```

### Error Handler Flow

1. **Controller** - Throws error or passes to next()
2. **asyncHandler** - Catches async errors, passes to error middleware
3. **errorHandler** - Formats error, logs appropriately, sends response

### Error Response Format

```json
{
  "success": false,
  "status": "fail" | "error",
  "message": "Error description",
  "details": [] // Optional, for validation errors
}
```

## Tests Nécessaires

1. **Error Handling Tests**
   ```bash
   npm run test:unit -- alerts
   ```

2. **API Integration Tests**
   ```bash
   npm run test:integration -- alerts
   ```

3. **Manual Testing**
   - Test 404 errors (invalid routes)
   - Test validation errors (invalid input)
   - Test not found errors (invalid IDs)
   - Test authentication errors (missing token)

## Changements Détaillés

### Before (Phase 1)
```javascript
export async function createAlertHandler(req, res) {
  try {
    const result = await service.createAlert(req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'error');
    return res.status(400).json({ success: false, error: String(err) });
  }
}
```

### After (Phase 2)
```javascript
export const createAlertHandler = asyncHandler(async (req, res) => {
  const result = await service.createAlert(req.body);
  res.status(201).json({ success: true, data: result });
});
```

### Service Layer Changes
```javascript
// Before
if (!alert) throw new Error('Alert not found');

// After
if (!alert) throw new NotFoundError('Alert');
```

## Points d'Attention

1. **Prisma Errors** - Automatically handled and converted to appropriate HTTP errors
2. **JWT Errors** - Automatically converted to 401 Unauthorized
3. **Zod Validation** - Automatically converted to 400 with details
4. **Logging** - Server errors (5xx) logged with full details, client errors (4xx) with summary
5. **Development Mode** - Stack traces included in development, hidden in production

## Compatibilité

- ✅ **No Breaking Changes** - Business logic unchanged
- ✅ **Response Format** - Maintains `{ success, message }` structure
- ✅ **Status Codes** - Uses proper HTTP status codes
- ✅ **Backwards Compatible** - Old error handling still works during migration

## Migration Path for Other Modules

1. Import custom errors: `import { NotFoundError, BadRequestError } from '../../utils/errors.js'`
2. Import asyncHandler: `import { asyncHandler } from '../../middleware/errorHandler.js'`
3. Wrap handlers: `export const handler = asyncHandler(async (req, res) => { ... })`
4. Replace `throw new Error()` with custom errors: `throw new NotFoundError('Resource')`
5. Remove try-catch blocks from controllers

## Validation

- [ ] All tests pass
- [ ] Error responses are consistent
- [ ] Proper status codes returned
- [ ] Logging works correctly
- [ ] No unhandled promise rejections

## Prochaine Phase

Après validation de Phase 2, passer à **Phase 3: Architecture Consistency** (branche `refactor/phase-3-architecture`)
