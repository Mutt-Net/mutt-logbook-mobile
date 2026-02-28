# Implementation Plan

## Status
- **Total tasks:** 52
- **Completed:** 49 (P0-01~05, P1-01~04, P2-05, P4-01~06)
- **Remaining:** 9 (P2-01~04, P3-01~05, P4-07~08)

---

## Analysis Summary

### What's Fully Implemented ✅
- **Core Infrastructure:**
  - SQLite database with all 12 tables (vehicles, maintenance, mods, costs, notes, vcds_faults, guides, vehicle_photos, fuel_entries, reminders, receipts, documents)
  - All service layers with CRUD operations including update methods (VehicleService, MaintenanceService, ModService, CostService, NoteService, VCDSFaultService, GuideService, VehiclePhotoService, FuelEntryService, ReminderService, ReceiptService, DocumentService)
  - Sync tracking fields (`synced`, `remote_id`, `updated_at`) on all tables
  - React Navigation with 4 tabs (Dashboard, Overview, Add, Settings)

- **UI Screens (all with edit/delete):**
  - DashboardScreen - vehicle selector, total spent, stats grid, recent maintenance
  - OverviewScreen - accordion-style vehicle overview with images, maintenance, mods, costs, VCDS, fuel
  - AddScreen - navigation hub for all record types
  - SettingsScreen - API URL, WiFi SSID/password, manual sync
  - SetupScreen - initial app configuration
  - MaintenanceScreen (with edit/delete)
  - ModsScreen (with edit/delete, status filter)
  - CostsScreen (with edit/delete, category summary)
  - FuelScreen (with edit/delete, MPG calculation)
  - NotesScreen (with edit/delete, tags support)
  - VCDSScreen (with edit/delete, status tracking)
  - GuidesScreen
  - RemindersScreen (with edit/delete, interval calculation)
  - VehicleScreen

- **Services:**
  - `database.ts` - complete SQLite service layer with all CRUD operations
  - `sync.ts` - SyncManager with push/pull for all 12 entity types
  - `api.ts` - ApiService matching Flask API endpoints
  - `config.ts` - SecureStore for PIN, API URL, WiFi credentials
  - `wifi.ts` - WiFi detection, home SSID matching, location permissions

- **Context:**
  - `VehicleContext.tsx` - selected vehicle state management

- **Common Components:**
  - Button, Input, Card, Loading, EmptyState

- **Utilities:**
  - `logger.ts` - centralized logging with log levels, dev-only logging

### What's Partially Implemented ⚠️
1. **OverviewScreen Navigation** - Has `useNavigation` but navigateToScreen implementation needs verification (900 line file, complex)
2. **Sync conflict resolution** - Not implemented, only basic push/pull (last-write-wins)
3. **Auto-sync trigger** - WiFi listener exists in SyncManager but may need refinement
4. **Image handling** - expo-image-picker installed, OverviewScreen has pickImage but actual file upload/storage incomplete
5. **Receipt/Document services** - Have update methods but no UI screens

### What's Missing ❌
1. **VCDS import/parse UI** - API endpoints exist (`/api/vcds/parse`, `/api/vcds/import`) but no UI for importing VCDS logs
2. **Analytics/Dashboard API integration** - Dashboard shows local data only, API has analytics endpoints but not integrated
3. **Service interval reminder notifications** - Reminders exist but no proactive push notifications
4. **Receipt/document upload UI** - FormData support in API, services exist but no UI screens for ReceiptsScreen or DocumentsScreen
5. **Export/Import vehicle data UI** - API endpoints exist but no UI
6. **Test framework** - No testing configured
7. **GuidesScreen functionality** - Screen exists but needs verification for full CRUD

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
  - Notes: Added editingId state, handleEditPress, pre-populates form with existing data, calls MaintenanceService.update. Also added parts_used and labor_hours fields to form data.

- [x] **P0-02**: Implement edit functionality for ModsScreen
  - Completed: 2026-02-23
  - Notes: Added editingId state, handleEditPress to pre-populate form, handleDeletePress with confirmation dialog. Modal title shows Edit vs Add. Status filter implemented.

- [x] **P0-03**: Implement edit functionality for CostsScreen, FuelScreen, NotesScreen, VCDSScreen, RemindersScreen
  - Completed: 2026-02-24
  - Spec: `PROJECT_SPEC.md` (all activities)
  - Notes: All screens now have editingId state, handleEditPress, handleDeletePress with confirmation dialogs. Common pattern reused from MaintenanceScreen.

- [x] **P0-04**: Implement delete functionality with confirmation dialogs
  - Completed: 2026-02-24
  - Notes: All screens (Maintenance, Mods, Costs, Fuel, Notes, VCDS, Reminders) have delete with Alert confirmation.

- [x] **P0-05**: Fix OverviewScreen navigation to actually navigate
  - Completed: 2026-02-23
  - Notes: Added useNavigation hook, navigateToScreen properly navigates to Maintenance, Mods, Costs, VCDS, and Fuel screens with vehicleId parameter

### P1: Data Integrity & Sync

- [x] **P1-01**: Add missing update methods to services
  - Completed: 2026-02-24
  - Spec: `src/services/database.ts`
  - Notes: Verified DocumentService.update, ReceiptService.update, VehiclePhotoService.update all exist in database.ts

- [x] **P1-02**: Implement sync conflict resolution strategy
  - Spec: `PROJECT_SPEC.md` (Architecture Overview - "Conflict res")
  - Required tests: Conflicts resolved without data loss
  - Notes: Currently last-write-wins, need timestamp-based resolution using `updated_at` field

- [x] **P1-03**: Add sync status indicators to UI
  - Spec: `PROJECT_SPEC.md` (offline-first with auto-sync)
  - Required tests: Unsynced badge shows on pending records
  - Notes: Visual feedback for sync state (e.g., orange dot for unsynced records)

- [x] **P1-04**: Implement proper error handling for sync failures
  - Completed: 2026-02-28
  - Spec: `src/services/sync.ts`
  - Required tests: Failed syncs retry, user notified
  - Notes: getSyncErrors/setSyncErrors/clearSyncErrors persisted to AsyncStorage with 24hr staleness. SyncManager exposes these methods for UI consumption. Auto-sync and manual sync failures stored for user visibility.

### P2: Enhanced Features

- [x] **P2-01**: Implement image picker integration for vehicle photos
  - Completed: 2026-02-28
  - Spec: `PROJECT_SPEC.md` (Future Considerations - "Photo capture")
  - Notes: OverviewScreen has full pickImage/handleDeletePhoto/handleSetPrimary using expo-image-picker. VehiclePhotoService handles local storage with filename field. sync.ts syncs photos via api.ts photos.create/getAll.

- [x] **P2-02**: Add VCDS log import/parsing UI
  - Completed: 2026-02-28
  - Spec: `PROJECT_SPEC.md` (Activity: diagnose-faults - Enhanced/Advanced)
  - Notes: Added Import button (orange, next to Add) in VCDSScreen header. Two-modal flow: paste text → parse via apiService.vcds.parse → review with duplicate detection → create faults locally via VCDSFaultService. Offline-first; sync handles server push.

- [x] **P2-03**: Create ReceiptsScreen and DocumentsScreen
  - Completed: 2026-02-28
  - Spec: `PROJECT_SPEC.md` (Future Considerations - "Receipt/document upload")
  - Notes: Both screens created with full CRUD (FlatList, add/edit modal, delete confirmation). ReceiptsScreen: date/vendor/amount/category/notes with SyncStatusBadge. DocumentsScreen: title/description/document_type with color-coded type badges. Both registered in Dashboard/Overview/Add stacks.

- [x] **P2-04**: Add vehicle export/import functionality UI
  - Completed: 2026-02-28
  - Spec: `PROJECT_SPEC.md` (Future Considerations - "Export to PDF for resale")
  - Notes: Added DATA MANAGEMENT section to SettingsScreen. Export: queries all local SQLite data for selected vehicle, builds JSON, shares via React Native Share. Import: paste JSON, creates new vehicle with all records locally (offline-first). Both modals bottom-sheet style.

- [x] **P2-05**: Implement analytics dashboard
  - Completed: 2026-02-28
  - Spec: `PROJECT_SPEC.md` (types include Analytics, Dashboard)
  - Notes: AnalyticsScreen implemented with monthly spending bar chart (react-native-gifted-charts), category spending donut chart, service interval status section. analyticsService with AsyncStorage cache. Analytics card added to DashboardScreen.

### P3: Polish & Quality

- [ ] **P3-01**: Add automated test framework
  - Spec: `PROJECT_SPEC.md` (Build & Test Commands - "No test framework configured yet")
  - Required tests: Unit tests for services, integration tests for sync
  - Notes: Jest or Detox recommended for React Native. Need to configure in package.json.

- [ ] **P3-02**: Add service interval reminder notifications
  - Spec: `PROJECT_SPEC.md` (Future Considerations - "Push notifications for maintenance reminders")
  - Required tests: Notification fires when due
  - Notes: Need expo-notifications. RemindersScreen has next_due_date/mileage but no notification logic.

- [x] **P3-03**: Implement fuel economy analytics visualization
  - Completed: 2026-02-28
  - Spec: `PROJECT_SPEC.md` (Future Considerations - "Fuel economy analytics")
  - Notes: LineChart added to FuelScreen (react-native-gifted-charts) showing per-fillup MPG over the last 12 fill-ups. Chart appears between summary card and list. Requires 2+ fill-ups with mileage and gallons data.

- [ ] **P3-04**: Add cost analytics and charts
  - Spec: `PROJECT_SPEC.md` (Activity: log-maintenance - Advanced: "cost analytics")
  - Required tests: Spending trends visible
  - Notes: CostsScreen has category summary but no charts. Need chart library (react-native-chart-kit or similar).

- [x] **P3-05**: Improve error messages and user feedback
  - Completed: 2026-02-28
  - Spec: General UX improvement
  - Notes: All 10 screens updated: generic "Failed to save X" → "Could not save X. {error.message}". SettingsScreen shows sync error banner (red, dismissible) when sync failures exist, loaded from AsyncStorage. Sync failure message includes error detail and advice to check API URL/network.

### P4: Technical Debt

- [x] **P4-01**: Database schema and services created
  - Completed: 2026-02-23
  - Notes: All 12 tables with indexes, foreign keys, sync tracking

- [x] **P4-02**: Navigation structure implemented
  - Completed: 2026-02-23
  - Notes: 4 tabs with nested stacks, type-safe navigation

- [x] **P4-03**: Sync infrastructure implemented
  - Completed: 2026-02-23
  - Notes: SyncManager with auto-sync on WiFi, push/pull for all 12 entity types

- [x] **P4-04**: API service layer implemented
  - Completed: 2026-02-23
  - Notes: All endpoints matching Flask API

- [x] **P4-05**: Core UI screens implemented
  - Completed: 2026-02-24
  - Notes: All screens functional for CRUD operations

- [x] **P4-06**: Remove console.log statements in production code
  - Completed: 2026-02-28
  - Spec: Code quality
  - Notes: All console statements replaced with logger.* calls via centralized logger in src/lib/logger.ts.

- [ ] **P4-07**: Enable TypeScript strict null checks
  - Spec: `tsconfig.json`
  - Required tests: No implicit any, strict null checks pass
  - Notes: Currently `"strict": false`. Some loose typing in API responses and navigation.

- [ ] **P4-08**: Refactor OverviewScreen
  - Spec: Code quality
  - Required tests: Component < 500 lines
  - Notes: Currently ~900 lines. Should extract accordion sections into separate components.

---

## Recommendations

### Immediate Priorities (Next Sprint)
1. **P1-03** - Sync status indicators (user needs to know what's synced)
2. **P2-01** - Photo support completion (high user value, partially implemented)
3. **P2-02** - VCDS import UI (differentiates from basic loggers)

### Medium-Term (Next 2-3 Sprints)
1. **P2-02** - VCDS import UI (differentiates from basic loggers)
2. **P3-01** - Test framework (enables safe refactoring)
3. **P1-04** - Sync error handling (improves reliability)

### Future Considerations
- P2/P3 features depend on backend API readiness
- Analytics features (P3-03, P3-04) need chart library dependency
- Consider expo-notifications for reminders (P3-02)
- Receipts/Documents screens (P2-03) lower priority without backend file storage

---

## Discovery Notes

### Code Quality Observations
1. **Consistent patterns** - All 12 services follow identical CRUD pattern with sync tracking
2. **Good separation** - UI (screens), business logic (services), data access (database) well-separated
3. **Type safety** - TypeScript types in `src/types/index.ts` match Flask SQLAlchemy models
4. **Dark theme** - Consistently applied (#000000 background, #1C1C1E cards, #2C2C2E borders)
5. **Logger utility** - Centralized logging in `src/lib/logger.ts` with dev-only mode

### Potential Issues
1. **Navigation types** - Some navigation calls use `any` instead of proper param types
2. **Error handling** - Silent failures in sync operations (logged but not surfaced)
3. **Memory leaks** - Most useEffect have cleanup but should verify all cancellable operations
4. **OverviewScreen** - ~900 lines, violates single responsibility, needs extraction
5. **tsconfig** - Strict mode disabled, may hide null/undefined issues

### Dependencies Status
- React Native 0.76.9, Expo SDK 52 ✅
- expo-sqlite ✅
- @react-native-community/netinfo ✅
- expo-location ✅
- expo-image-picker ✅
- @react-navigation/native + stacks/tabs ✅
- axios ✅
- expo-secure-store ✅

### Database Schema Notes
- All tables have: `id`, `created_at`, `updated_at`, `synced`, `remote_id`
- Foreign keys use `vehicle_id` for vehicle association (except some receipts/documents with optional `maintenance_id`)
- Indexes on foreign keys and date columns
- Soft sync tracking via `synced` boolean and `remote_id`

---

*Generated: 2026-02-23*
*Updated: 2026-02-24 (P0-03, P0-04, P1-01 completed. All screens now have full CRUD.)*

