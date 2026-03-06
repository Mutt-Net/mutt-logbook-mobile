# Mutt Logbook Mobile — Sprint Planning

Generated: 2026-03-06. Scope: post-v1 feature completion, file upload integration, release pipeline, test coverage.

**Baseline:** All 52 tasks in `IMPLEMENTATION_PLAN.md` complete as of 2026-03-01. Planning begins from that state.

**Legend**
- **Class**: `bug` | `feature` | `enhancement` | `chore` | `test`
- **Priority**: `P1` blocking/critical | `P2` high value | `P3` improvement | `P4` future

---

## Epic E1 — Functional Completeness

**Theme:** Close remaining UI and logic gaps identified post-v1. Three screens have incomplete interactions; mileage-based notifications are unimplemented.

---

### Group A — OverviewScreen Vehicle Edit

**Class:** bug | **Priority:** P1

`OverviewScreen.tsx:186` renders an Edit button with no `onPress`. Navigation hook and vehicle state are already in scope. One-line fix; high visibility — it's the primary vehicle management entry point.

| ID | Story | Task | Subtask | File | Notes |
|----|-------|------|---------|------|-------|
| E1-A-1 | Vehicle edit navigation | Wire Edit button | Add `onPress` → `navigation.navigate('Vehicle', { vehicleId })` | `src/screens/OverviewScreen.tsx:186` | `navigation` and `vehicle` already in scope |

---

### Group B — GuidesScreen Full CRUD

**Class:** feature | **Priority:** P1

`GuidesScreen` only supports create. `GuideService.update()` and `GuideService.delete()` both exist in `database.ts` but are never called. Standard edit/delete pattern already established across all other screens.

| ID | Story | Task | Subtask | File | Notes |
|----|-------|------|---------|------|-------|
| E1-B-1 | Guide edit/delete | Add `editingId` state | `useState<number \| null>(null)` | `src/screens/GuidesScreen.tsx` | After `saving` state |
| E1-B-2 | — | Implement `handleEditPress` | Pre-populate form, open modal | `src/screens/GuidesScreen.tsx` | Match pattern from `MaintenanceScreen` |
| E1-B-3 | — | Implement `handleDeletePress` | `Alert.alert` confirmation → `GuideService.delete` | `src/screens/GuidesScreen.tsx` | Destructive style |
| E1-B-4 | — | Update `handleSave` | Branch on `editingId`: update vs create | `src/screens/GuidesScreen.tsx` | Reset `editingId` on close |
| E1-B-5 | — | Update modal title | `editingId ? 'Edit Guide' : 'Add Guide'` | `src/screens/GuidesScreen.tsx` | — |
| E1-B-6 | — | Add Edit/Delete buttons to list items | `itemActions` row, dark theme colours | `src/screens/GuidesScreen.tsx` | `#007AFF` edit / `#FF453A` delete |

---

### Group C — Mileage-Based Reminder Notifications

**Class:** feature | **Priority:** P2

Current `notifications.ts` only schedules by `next_due_date`. Mileage intervals (`next_due_mileage`) are stored in the `reminders` table but never trigger alerts. Requires a pure utility function (testable) and integration into the notification scheduler.

| ID | Story | Task | Subtask | File | Notes |
|----|-------|------|---------|------|-------|
| E1-C-1 | Mileage reminders | Write failing tests (TDD) | 6 cases: null mileage, overdue, due_soon, outside threshold, custom threshold, mixed | `src/__tests__/notificationUtils.test.ts` | Run `npm test` — expect FAIL first |
| E1-C-2 | — | Implement `getMileageDueReminders()` | Pure function; `DEFAULT_THRESHOLD_MILES = 500`; returns `MileageDueResult[]` | `src/lib/notificationUtils.ts` | No side effects — testable in isolation |
| E1-C-3 | — | Integrate into `scheduleReminderNotifications` | Add vehicle mileage loop after date-based loop | `src/services/notifications.ts` | `ReminderService.getByVehicle(vehicle.id)` per vehicle |
| E1-C-4 | — | Verify all tests pass | `npm test -- --no-coverage` | — | Target: 23 passing (17 fuelUtils + 6 notificationUtils) |

---

## Epic E2 — File Upload Integration

**Theme:** Wire actual file bytes to the backend. Current sync sends URI strings as JSON; backend expects multipart/form-data. Three entity types affected: photos, documents, receipts.

---

### Group A — Shared Upload Utility

**Class:** feature | **Priority:** P1

All three file-upload sync paths need the same FormData + axios multipart pattern. Extract once as a module-level helper before wiring the individual entity syncs.

| ID | Story | Task | Subtask | File | Notes |
|----|-------|------|---------|------|-------|
| E2-A-1 | Multipart helper | Add `uploadFile()` to `sync.ts` | `FormData.append({ uri, name, type })` → `axios.post` with `multipart/form-data` | `src/services/sync.ts` (top of file, before class) | `timeout: 30000`; returns parsed JSON |

---

### Group B — Vehicle Photo Sync Fix

**Class:** bug | **Priority:** P1

`syncPhotos` currently calls `apiService.photos.create({ uri, name, type })` — sends the URI string as JSON, not file bytes. Backend receives an empty/invalid payload.

| ID | Story | Task | Subtask | File | Notes |
|----|-------|------|---------|------|-------|
| E2-B-1 | Photo file bytes | Replace `syncPhotos` push block | Call `uploadFile(photo.filename, fileName, 'image/jpeg', '/api/vehicle-photos', { vehicle_id })` | `src/services/sync.ts:~780` | Depends on E2-A-1 |
| E2-B-2 | — | Verify `markSynced` still called | `await VehiclePhotoService.markSynced(photo.id, created.id)` | `src/services/sync.ts` | No change to sync tracking logic |

---

### Group C — DocumentsScreen File Picker

**Class:** feature | **Priority:** P2

`DocumentsScreen` stores metadata only. Users need to attach actual files (PDFs, images) to document records. `expo-document-picker` provides the native picker; sync push needs to upload the bytes.

| ID | Story | Task | Subtask | File | Notes |
|----|-------|------|---------|------|-------|
| E2-C-1 | Attach documents | Install `expo-document-picker` | `npx expo install expo-document-picker` | `package.json` | Add to `app.json` plugins array |
| E2-C-2 | — | Add `pickedFile` state + `pickDocument` handler | `DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })` | `src/screens/DocumentsScreen.tsx` | Store `{ uri, name, mimeType }` |
| E2-C-3 | — | Add `filename` to form data | Extend interface + `initialFormData` | `src/screens/DocumentsScreen.tsx` | Populated from `pickedFile.uri` |
| E2-C-4 | — | Add "Attach File" button to modal | Show picked filename when set; reset `pickedFile` on close | `src/screens/DocumentsScreen.tsx` | Below document_type chips |
| E2-C-5 | — | Show filename in list items | Tappable `Linking.openURL(item.filename)` | `src/screens/DocumentsScreen.tsx` | Only render if `item.filename` set |
| E2-C-6 | — | Update `syncDocuments` push | `if (doc.filename)` → `uploadFile()`; else → `apiService.documents.create()` | `src/services/sync.ts:~1046` | Depends on E2-A-1 |

---

### Group D — ReceiptsScreen File Picker

**Class:** feature | **Priority:** P2

Same pattern as documents but for receipts. `expo-image-picker` is already installed — use it for receipt photos rather than adding another dependency.

| ID | Story | Task | Subtask | File | Notes |
|----|-------|------|---------|------|-------|
| E2-D-1 | Attach receipt images | Add `pickedImage` state + `pickReceipt` handler | `ImagePicker.launchImageLibraryAsync({ mediaTypes: Images })` | `src/screens/ReceiptsScreen.tsx` | `expo-image-picker` already installed |
| E2-D-2 | — | Add "Attach Image" button to modal | Show thumbnail preview when set | `src/screens/ReceiptsScreen.tsx` | Reset on modal close |
| E2-D-3 | — | Update `syncReceipts` push | `if (receipt.filename)` → `uploadFile()`; else → `apiService.receipts.create()` | `src/services/sync.ts:~977` | Depends on E2-A-1 |

---

## Epic E3 — Release Pipeline

**Theme:** Automated signed APK builds on every version tag push. No EAS dependency — self-contained Gradle build on `ubuntu-latest`.

---

### Group A — GitHub Actions Gradle Workflow

**Class:** chore | **Priority:** P1

Replace EAS-based workflow with `expo prebuild` + Gradle. Produces both debug and release-signed APKs attached to a GitHub Release. Keystore stored as GitHub Secrets — never committed.

| ID | Story | Task | Subtask | File | Notes |
|----|-------|------|---------|------|-------|
| E3-A-1 | APK CI/CD | Generate release keystore (one-time, local) | `keytool -genkey`, base64-encode | Local only — do NOT commit | 4 secrets: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` |
| E3-A-2 | — | Add secrets to GitHub repo | Settings → Secrets → Actions | GitHub repo settings | Prerequisite for E3-A-3 |
| E3-A-3 | — | Write `.github/workflows/release.yml` | `expo prebuild --clean` → `assembleDebug` → signing setup → `assembleRelease` → `softprops/action-gh-release@v2` | `.github/workflows/release.yml` | Trigger: `push: tags: v*` |
| E3-A-4 | — | Validate YAML | `python3 -c "import yaml; yaml.safe_load(...)"` | — | Before committing |
| E3-A-5 | — | Trigger first release | `git tag v1.0.0 && git push origin v1.0.0` | — | Verify two APKs attached to GitHub Release |

---

## Epic E4 — Analytics Resilience

**Theme:** Analytics must not fail when offline and cache is cold. Add a local SQLite computation path as the final fallback in the `API → cache → local` chain.

---

### Group A — Local Analytics Fallback

**Class:** enhancement | **Priority:** P2

`analyticsService.getAnalytics()` currently throws when both API and cache fail (cold start, offline). Add `computeLocalAnalytics()` as a last resort — aggregates costs and maintenance from SQLite to produce basic monthly/category spending data.

| ID | Story | Task | Subtask | File | Notes |
|----|-------|------|---------|------|-------|
| E4-A-1 | Offline analytics | Add `computeLocalAnalytics(vehicleId)` | `Promise.all([VehicleService, CostService, MaintenanceService, FuelEntryService])` → build `monthly_spending` + `category_spending` | `src/services/analyticsService.ts` | Returns `Analytics` shape; `service_intervals: {}`; `last_service: {}` |
| E4-A-2 | — | Update `getAnalytics` catch block | After cache miss → call `computeLocalAnalytics()`; return with `isCache: true` | `src/services/analyticsService.ts` | `logger.warn` before local fallback; never throw |

---

## Epic E5 — Test Coverage

**Theme:** Expand unit test suite to cover all pure utility functions. Current baseline: 17 tests in `fuelUtils.test.ts`.

---

### Group A — Utility Unit Tests

**Class:** test | **Priority:** P2

Three utility modules have zero test coverage: `notificationUtils` (ships with E1-C), `formatUtils`, and the `analyticsService` local computation path.

| ID | Story | Task | Subtask | File | Target count |
|----|-------|------|---------|------|--------------|
| E5-A-1 | notificationUtils tests | 6 test cases | `getMileageDueReminders`: null, overdue, due_soon, threshold, custom threshold, mixed | `src/__tests__/notificationUtils.test.ts` | Ships with E1-C-1 |
| E5-A-2 | formatUtils tests | `formatCurrency`, `formatDate`, `getStatusColor`, `getStatusLabel` | Null input, edge values, all status strings | `src/__tests__/formatUtils.test.ts` | ~12 cases |
| E5-A-3 | analyticsService local tests | `computeLocalAnalytics` | Empty arrays, single vehicle, mixed cost/maintenance dates | `src/__tests__/analyticsService.test.ts` | Mock all four services; ~8 cases |

---

## Sprint Allocation

| Sprint | Window | IDs | Goal |
|--------|--------|-----|------|
| Sprint 1 | 2026-03-06 – 2026-03-13 | E1-A, E1-B, E2-A, E2-B, E3-A | UI gaps closed; photo sync fixed; APK pipeline live |
| Sprint 2 | 2026-03-14 – 2026-03-20 | E1-C, E2-C, E2-D, E4-A | Mileage notifications; file pickers; analytics fallback |
| Sprint 3 | 2026-03-21 – 2026-03-27 | E5-A | Test coverage expanded; all utility functions covered |

---

## Summary

| Priority | Count | Sprint |
|----------|-------|--------|
| P1 | 10 | Sprint 1 |
| P2 | 15 | Sprint 2 |
| P3 | 3 | Sprint 3 |

**Sprint 1 targets (E1-A, E1-B, E2-A, E2-B, E3-A):** OverviewScreen edit button, GuidesScreen full CRUD, `uploadFile()` helper, photo sync multipart fix, Gradle APK release pipeline.
**Sprint 2 targets (E1-C, E2-C, E2-D, E4-A):** Mileage-based notifications (TDD), DocumentsScreen file picker + sync, ReceiptsScreen file picker + sync, analytics local SQLite fallback.
**Sprint 3 targets (E5-A):** `notificationUtils`, `formatUtils`, `analyticsService` unit tests.
