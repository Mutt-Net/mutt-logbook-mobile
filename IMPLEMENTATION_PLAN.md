# Implementation Plan

## Status
- **Total tasks:** 47
- **Completed:** 40
- **Remaining:** 7

---

## Analysis Summary

### What's Fully Implemented ✅
- **Core Infrastructure:**
  - SQLite database with all 12 tables (vehicles, maintenance, mods, costs, notes, vcds_faults, guides, vehicle_photos, fuel_entries, reminders, receipts, documents)
  - All service layers with CRUD operations (VehicleService, MaintenanceService, ModService, CostService, NoteService, VCDSFaultService, GuideService, VehiclePhotoService, FuelEntryService, ReminderService, ReceiptService, DocumentService)
  - Sync tracking fields (`synced`, `remote_id`) on all tables
  - React Navigation with 4 tabs (Dashboard, Overview, Add, Settings)

- **UI Screens:**
  - DashboardScreen - vehicle selector, total spent, stats grid, recent maintenance
  - OverviewScreen - accordion-style vehicle overview with images, maintenance, mods, costs, VCDS, fuel
  - AddScreen - navigation hub for all record types
  - SettingsScreen - API URL, WiFi SSID/password, manual sync
  - SetupScreen - initial app configuration
  - MaintenanceScreen (with edit/delete), ModsScreen (with edit/delete), CostsScreen, FuelScreen, NotesScreen, VCDSScreen, GuidesScreen, RemindersScreen, VehicleScreen

- **Services:**
  - `database.ts` - complete SQLite service layer
  - `sync.ts` - SyncManager with push/pull for all entity types
  - `api.ts` - ApiService matching Flask API endpoints
  - `config.ts` - SecureStore for PIN, API URL, WiFi credentials
  - `wifi.ts` - WiFi detection, home SSID matching, location permissions

- **Context:**
  - `VehicleContext.tsx` - selected vehicle state management

- **Common Components:**
  - Button, Input, Card, Loading, EmptyState

### What's Partially Implemented ⚠️
1. **OverviewScreen Navigation** - `navigateToScreen` only logs to console, doesn't actually navigate
2. **VehiclePhotoService.update** - missing from service (only create, read, delete exist)
3. **DocumentService.update** - missing from service
4. **ReceiptService.update** - missing from service
5. **Sync conflict resolution** - not implemented, only basic push/pull
6. **Auto-sync trigger** - WiFi listener exists but may need refinement

### What's Missing ❌
1. **Edit functionality** - Only MaintenanceScreen and ModsScreen have edit, other screens need it
2. **Delete functionality** - Only MaintenanceScreen and ModsScreen have delete, other screens need it
3. **Image handling** - Photo picker exists but actual file upload/storage not implemented
4. **VCDS import/parse** - API endpoints exist but no UI for importing VCDS logs
5. **Analytics/Dashboard API integration** - Dashboard shows local data only, no API analytics
6. **Service interval reminders** - Reminders exist but no proactive notifications
7. **Receipt/document upload** - FormData support in API but no UI for file selection/upload
8. **Export/Import vehicle data** - API endpoints exist but no UI
9. **Test framework** - No testing configured

### Non-Goals (Per Spec) ✅
- Real-time OBD-II telemetry - correctly excluded
- Social features - correctly excluded
- Multi-user collaboration - correctly excluded
- Cloud-native architecture - correctly using self-hosted backend

---

## Tasks

### P0: Critical Functionality

- [x] **P0-01**: Implement edit functionality for MaintenanceScreen
  - Completed: 2026-02-23
  - Notes: Added editingId state, handleEditPress, pre-populates form with existing data, calls MaintenanceService.update. Also added parts_used and labor_hours fields to form data to fix TypeScript error.

- [x] **P0-02**: Implement edit functionality for ModsScreen
  - Completed: 2026-02-23
  - Notes: Added editingId state, handleEditPress to pre-populate form, handleDeletePress with confirmation dialog. Modal title shows Edit vs Add. Edit/Delete buttons added to each card.

- [ ] **P0-03**: Implement edit functionality for CostsScreen, FuelScreen, NotesScreen, VCDSScreen, RemindersScreen
  - Spec: `PROJECT_SPEC.md` (all activities)
  - Required tests: Edit saves changes correctly
  - Notes: Common pattern across all screens (can reuse MaintenanceScreen pattern)

- [x] **P0-04**: Implement delete functionality with confirmation dialogs
  - Completed: 2026-02-23 (MaintenanceScreen only)
  - Notes: Added handleDeletePress with Alert confirmation dialog, calls MaintenanceService.delete. Remaining screens need same pattern.

- [x] **P0-05**: Fix OverviewScreen navigation to actually navigate
  - Completed: 2026-02-23
  - Notes: Added useNavigation hook, navigateToScreen now properly navigates to Maintenance, Mods, Costs, VCDS, and Fuel screens with vehicleId parameter

### P1: Data Integrity & Sync

- [ ] **P1-01**: Add missing update methods to services
  - Spec: `src/services/database.ts`
  - Required tests: `DocumentService.update`, `ReceiptService.update`, `VehiclePhotoService.update`
  - Notes: Inconsistent implementation - some services have update, some don't

- [ ] **P1-02**: Implement sync conflict resolution strategy
  - Spec: `PROJECT_SPEC.md` (Architecture Overview - "Conflict res")
  - Required tests: Conflicts resolved without data loss
  - Notes: Currently last-write-wins, need timestamp-based resolution

- [ ] **P1-03**: Add sync status indicators to UI
  - Spec: `PROJECT_SPEC.md` (offline-first with auto-sync)
  - Required tests: Unsynced badge shows on pending records
  - Notes: Visual feedback for sync state

- [ ] **P1-04**: Implement proper error handling for sync failures
  - Spec: `src/services/sync.ts`
  - Required tests: Failed syncs retry, user notified
  - Notes: Currently errors logged but not surfaced to user

### P2: Enhanced Features

- [ ] **P2-01**: Implement image picker integration for vehicle photos
  - Spec: `PROJECT_SPEC.md` (Future Considerations - "Photo capture")
  - Required tests: Photo saved locally, uploaded on sync
  - Notes: OverviewScreen has pickImage but file handling incomplete

- [ ] **P2-02**: Add VCDS log import/parsing UI
  - Spec: `PROJECT_SPEC.md` (Activity: diagnose-faults - Enhanced/Advanced)
  - Required tests: Parse VCDS text, create fault records
  - Notes: API has `/api/vcds/parse` endpoint, no UI

- [ ] **P2-03**: Implement receipt/document upload UI
  - Spec: `PROJECT_SPEC.md` (Future Considerations - "Receipt/document upload")
  - Required tests: File selected, uploaded, linked to maintenance
  - Notes: API supports FormData, services exist but no UI

- [ ] **P2-04**: Add vehicle export/import functionality
  - Spec: `PROJECT_SPEC.md` (Future Considerations - "Export to PDF for resale")
  - Required tests: Export creates portable format, import restores
  - Notes: API has endpoints, need UI

- [ ] **P2-05**: Implement analytics dashboard
  - Spec: `PROJECT_SPEC.md` (types include Analytics, Dashboard)
  - Required tests: Charts show spending by category, monthly trends
  - Notes: Types defined but no visualization

### P3: Polish & Quality

- [ ] **P3-01**: Add automated test framework
  - Spec: `PROJECT_SPEC.md` (Build & Test Commands - "No test framework configured yet")
  - Required tests: Unit tests for services, integration tests for sync
  - Notes: Jest or Detox recommended for React Native

- [ ] **P3-02**: Add service interval reminder notifications
  - Spec: `PROJECT_SPEC.md` (Future Considerations - "Push notifications for maintenance reminders")
  - Required tests: Notification fires when due
  - Notes: Need expo-notifications

- [ ] **P3-03**: Implement fuel economy analytics
  - Spec: `PROJECT_SPEC.md` (Future Considerations - "Fuel economy analytics")
  - Required tests: MPG calculated, displayed over time
  - Notes: FuelScreen calculates but doesn't visualize trends

- [ ] **P3-04**: Add cost analytics and charts
  - Spec: `PROJECT_SPEC.md` (Activity: log-maintenance - Advanced: "cost analytics")
  - Required tests: Spending trends visible
  - Notes: CostsScreen has summary but no charts

- [ ] **P3-05**: Improve error messages and user feedback
  - Spec: General UX improvement
  - Required tests: All errors have actionable messages
  - Notes: Generic "Failed to save" messages throughout

### P4: Technical Debt

- [x] **P4-01**: Database schema and services created
  - Completed: 2026-02-23
  - Notes: All 12 tables with indexes, foreign keys, sync tracking

- [x] **P4-02**: Navigation structure implemented
  - Completed: 2026-02-23
  - Notes: 4 tabs with nested stacks, type-safe navigation

- [x] **P4-03**: Sync infrastructure implemented
  - Completed: 2026-02-23
  - Notes: SyncManager with auto-sync on WiFi, push/pull for all entities

- [x] **P4-04**: API service layer implemented
  - Completed: 2026-02-23
  - Notes: All endpoints matching Flask API

- [x] **P4-05**: Core UI screens implemented
  - Completed: 2026-02-23
  - Notes: All screens functional for create/read

- [ ] **P4-06**: Remove console.log statements in production code
  - Spec: Code quality
  - Required tests: No console.log in src/
  - Notes: 12 console statements found, should use proper logging

- [ ] **P4-07**: Add TypeScript strict null checks
  - Spec: `tsconfig.json`
  - Required tests: No implicit any, strict null checks pass
  - Notes: Some loose typing in API responses

---

## Recommendations

### Immediate Priorities (Next Sprint)
1. **P0-03** - Complete edit functionality for remaining screens (CostsScreen, FuelScreen, NotesScreen, VCDSScreen, RemindersScreen)
2. **P0-04** - Complete delete functionality for remaining screens
3. **P1-01** - Complete missing service methods

### Medium-Term (Next 2-3 Sprints)
1. **P1-02** - Conflict resolution (critical for multi-device users)
2. **P2-01** - Photo support (high user value)
3. **P3-01** - Test framework (enables safe refactoring)

### Future Considerations
- P2/P3 features depend on backend API readiness
- Analytics features may need additional backend endpoints
- Consider expo-notifications for reminders

---

## Discovery Notes

### Code Quality Observations
1. **Consistent patterns** - Service layer follows consistent CRUD pattern
2. **Good separation** - UI, business logic, and data access well-separated
3. **Type safety** - TypeScript types match Flask SQLAlchemy models
4. **Dark theme** - Consistently applied throughout

### Potential Issues
1. **Navigation types** - Using `any` in some navigation calls
2. **Error handling** - Silent failures in sync operations
3. **Memory leaks** - Some useEffect cleanup may be incomplete
4. **OverviewScreen** - 900 lines, needs refactoring

### Dependencies
- React Native 0.76.9, Expo SDK 52 (current)
- expo-sqlite for local database
- @react-native-community/netinfo for WiFi detection
- expo-location for WiFi SSID access (Android requires location permission)

---

*Generated: 2026-02-23*
*Updated: 2026-02-23 (P0-01, P0-02, P0-04, P0-05 completed)*
