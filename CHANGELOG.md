# Changelog

All notable changes to the AfriSense Backend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Phase 1: Code Quality & Standards
- ESLint configuration with strict code quality rules (`.eslintrc.json`)
- Prettier configuration for consistent code formatting (`.prettierrc.json`, `.prettierignore`)
- Zod input validation for all alerts module endpoints (`src/validators/alerts.validators.js`)
- Validation middleware: `validateBody`, `validateQuery`, `validateParams`
- Enhanced JSDoc documentation in alerts controller
- NPM scripts: `lint`, `lint:fix`, `format`, `format:check`
- Phase 1 documentation: `PHASE-1-NOTES.md`, `PHASE-1-SUMMARY.md`

### Added - Phase 2: Error Handling
- Custom error classes in `src/utils/errors.js`:
  - `AppError` (base class)
  - `ValidationError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`
  - `NotFoundError`, `ConflictError`, `InternalServerError`, `ServiceUnavailableError`
- Centralized error handling middleware (`src/middleware/errorHandler.js`):
  - `errorHandler` - Main error handling with Prisma/JWT/Zod support
  - `notFoundHandler` - 404 route handler
  - `asyncHandler` - Async wrapper to eliminate try-catch boilerplate
- Standardized error response format across all endpoints
- Phase 2 documentation: `PHASE-2-NOTES.md`, `PHASE-2-SUMMARY.md`

### Added - Phase 3: Architecture Consistency
- Repository layer for positions module (`src/modules/positions/positions.repository.js`)
  - 6 database methods: `findTrackerById`, `findTrackerByImei`, `findPositionByExternalId`, etc.
- Repository layer for trackers module (`src/modules/trackers/trackers.repository.js`)
  - Audit logging method: `createConfigLog`
- Phase 3 documentation: `PHASE-3-NOTES.md`, `PHASE-3-SUMMARY.md`

### Added - Phase 4: Security & Authentication
- JWT authentication middleware (`authMiddleware`) for all alerts endpoints
- Role-based access control (`roleMiddleware`) for sensitive operations:
  - Admin-only: test endpoints, alert deletion
  - Admin/Fleet Manager: manual alert creation
- User-based data filtering (users only see their own alerts)
- Ownership verification for single alert access
- Permission checks for alert creation
- Phase 4 documentation: `PHASE-4-NOTES.md`, `PHASE-4-SUMMARY.md`

### Added - Phase 5: Testing & Documentation
- Comprehensive unit tests:
  - `alerts.repository.unit.test.js` - Repository layer tests (8 test suites)
  - `errorHandler.unit.test.js` - Error handling middleware tests (12 tests)
  - `positions.repository.unit.test.js` - Positions repository tests (6 test suites)
  - `trackers.repository.unit.test.js` - Trackers repository tests (1 test suite)
- Integration tests:
  - Updated alerts API integration tests with authentication
  - Added authorization tests for role-based access
- Complete API documentation in `ALERTS_MODULE_GUIDE.md`
- Implementation summaries for all phases
- This CHANGELOG.md file
- Phase 5 documentation: `PHASE-5-NOTES.md`, `PHASE-5-SUMMARY.md`

### Changed - Phase 2
- Refactored `alerts.controller.js`:
  - Removed all try-catch blocks (8 handlers)
  - Wrapped handlers with `asyncHandler`
  - Converted to arrow functions
  - 58% code reduction (179 → 75 lines)
- Updated `alerts.service.js` to use custom error classes
- Integrated error handling middleware in `src/app.js`

### Changed - Phase 3
- Refactored `positions.service.js`:
  - Removed all direct Prisma imports and calls (7 instances)
  - Now uses repository methods exclusively
  - Business logic preserved exactly
- Refactored `trackers.service.js`:
  - Removed direct Prisma calls for audit logging (3 instances)
  - Now uses `trackersRepository.createConfigLog()`

### Changed - Phase 4
- Updated `alerts.routes.js` with authentication and authorization middleware
- Modified `alerts.controller.js` to extract and pass user context
- Enhanced `alerts.service.js` with user-based filtering and permission checks
- Updated `alerts.repository.js` to support user tracker filtering

### Changed - Phase 5
- Updated all existing tests to work with new authentication requirements
- Enhanced test coverage for repository and middleware layers
- Improved documentation with security considerations and migration guides

### Breaking Changes - Phase 4
- **All alerts endpoints now require JWT authentication**
  - Error response: `401 Unauthorized` if token is missing/invalid
- **Non-admin users can only access their own data**
  - Data is automatically filtered by user's tracker ownership
- **Admin-only operations now return `403 Forbidden` for non-admin users**
  - POST `/api/alerts/test/email`
  - POST `/api/alerts/test/sms`
  - DELETE `/api/alerts/:id`

### Migration Guide
#### From No Auth to Phase 4 (Authentication Required)
```bash
# Before (Phase 1-3)
curl http://localhost:3000/api/alerts

# After (Phase 4+)
curl -H "Authorization: Bearer <YOUR_JWT_TOKEN>" http://localhost:3000/api/alerts
```

#### Testing with Authentication
```javascript
// Integration tests now require auth token
const token = generateTestToken({ userId: 'u1', role: 'admin' });
const res = await request(app)
  .get('/api/alerts')
  .set('Authorization', `Bearer ${token}`);
```

### Security
- Phase 4: Added comprehensive authentication and authorization
- Phase 4: Implemented user-based data filtering to prevent unauthorized access
- Phase 4: Added role-based access control for sensitive operations
- Phase 1: Added input validation to prevent injection attacks
- Phase 2: Sanitized error messages to prevent information leakage

### Performance
- Phase 3: Improved query performance with proper repository abstraction
- Phase 3: Reduced database coupling for easier optimization
- Phase 4: Efficient user-based filtering with proper indexing

## [1.0.0] - Previous Version
- Initial alerts module implementation
- Basic CRUD operations
- Email and SMS notifications via Resend and CallMeBot
- Duplicate alert prevention
- Alert settings management

---

## Summary of Changes by Phase

| Phase | Risk Level | Breaking Changes | Files Modified | Tests Added |
|-------|-----------|------------------|----------------|-------------|
| 1 - Code Quality | Low | No | 5 | 0 |
| 2 - Error Handling | Medium | No | 7 | 0 |
| 3 - Architecture | Medium | No | 6 | 0 |
| 4 - Security | High | **Yes** | 6 | 0 |
| 5 - Testing | Low | No | 20+ | 4 |

## Notes
- All phases maintain backward compatibility with business logic
- Phase 4 introduces authentication requirements (breaking change for API clients)
- Phase 5 adds comprehensive test coverage and documentation
- All changes follow established patterns from existing modules (trackers, geofences, positions)
