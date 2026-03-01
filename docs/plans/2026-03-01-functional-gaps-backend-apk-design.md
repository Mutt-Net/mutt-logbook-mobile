# Design: Functional Gaps, Backend Integration & APK Release Pipeline

**Date:** 2026-03-01
**Branch:** mobile
**Status:** Approved

---

## Scope

Three parallel workstreams:

1. **Functional gaps** — four outstanding UI/logic issues
2. **Backend integration** — wire live API data and file uploads
3. **APK release pipeline** — automated GitHub Release via EAS Build

---

## Section 1: APK Release Pipeline

### Trigger
Push a version tag (`v1.0.x`) to `origin/mobile`. Deliberate, tag-gated releases only.

### Workflow: `.github/workflows/release.yml`

```
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      1. actions/checkout
      2. actions/setup-node (Node 20)
      3. npm ci
      4. npm install -g eas-cli
      5. eas build --platform android --profile production --non-interactive
         (EXPO_TOKEN secret → EAS pulls managed keystore)
      6. Download built APK from EAS artifact URL
      7. gh release create $TAG --title "Release $TAG" downloaded.apk
```

### EAS Configuration

**`eas.json`** — `production` profile:
```json
{
  "build": {
    "production": {
      "android": { "buildType": "apk" }
    }
  }
}
```

**`app.json`** — requires `expo.android.package` (e.g. `com.muttnet.logbook`).

### Secrets
- `EXPO_TOKEN` — only secret required; EAS holds the keystore (managed credentials)

### Output
`mutt-logbook-v1.0.0.apk` attached to GitHub Release, directly downloadable for sideloading.

---

## Section 2: Functional Gaps

### 2.1 GuidesScreen CRUD
Inspect current implementation; add whichever of add/edit/delete is missing. Follows the same pattern as all other screens: `editingId` state, pre-populated form on edit, `Alert.alert` confirmation on delete. No schema changes — `guides` table exists.

### 2.2 DocumentsScreen File Picker
- Install `expo-document-picker`
- Add "Attach File" button to add/edit modal
- Picker result provides `uri`, `name`, `mimeType` — store `uri` in existing `filename` column
- List items show filename as tappable link; `Linking.openURL(uri)` opens in system viewer
- File upload to API handled by backend integration (Section 3)

### 2.3 OverviewScreen Vehicle Edit Button
- Currently a no-op `<TouchableOpacity>`
- Wire `onPress` to `navigation.navigate('Vehicle', { vehicleId: vehicle.id })`
- `VehicleScreen` already handles editing — one-liner fix

### 2.4 Mileage-Based Reminder Notifications
In `notifications.ts`, after the existing date-based pass, add a mileage pass:
- For each reminder with `next_due_mileage`, compare against `vehicle.mileage`
- `vehicle.mileage >= next_due_mileage` → immediate notification (5s delay, "Overdue" title)
- `next_due_mileage - vehicle.mileage <= 500` → "Due Soon" notification (immediate)
- No new permissions needed

---

## Section 3: Backend Integration

### 3.1 Analytics API
- `analyticsService.ts`: attempt `apiService.analytics.get(vehicleId)` first
- On failure (offline/API down): fall back to existing local SQLite computation
- Cache API response in AsyncStorage with 1-hour TTL (same pattern already in use)

### 3.2 Shared File Upload Utility
Single `uploadFile(uri, endpoint, fields)` function in `sync.ts`:
- Builds `FormData` with file appended
- Posts with `Content-Type: multipart/form-data`
- Returns `remote_id` from API response
- Used by photos, documents, and receipts push functions

### 3.3 Vehicle Photo Sync (fix)
- Current behaviour: pushes device URI string to API (broken)
- Fix: when pushing a photo with a local `filename` URI, call `uploadFile()` to POST multipart to `/api/vehicles/<id>/photos`
- Store returned `remote_id` locally

### 3.4 Document File Upload
- When a document record has a `filename` (local URI), call `uploadFile()` during push
- Falls back to JSON-only push if no file attached
- Target: `/api/documents`

### 3.5 Receipt File Upload
- Identical pattern to documents
- Receipts may optionally have an attached image (photo of paper receipt)
- Target: `/api/receipts`

---

## Implementation Order

1. APK pipeline (unblocks user testing of everything else)
2. OverviewScreen edit button (trivial, quick win)
3. GuidesScreen CRUD (inspect + fix)
4. Mileage-based notifications (extends existing notifications.ts)
5. DocumentsScreen file picker (requires expo-document-picker install)
6. Analytics API integration (analyticsService.ts update)
7. Shared uploadFile utility (foundation for 8-10)
8. Vehicle photo sync fix
9. Document file upload sync
10. Receipt file upload sync
