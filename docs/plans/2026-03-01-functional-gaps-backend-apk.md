# Functional Gaps, Backend Integration & APK Release Pipeline

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close four UI/logic gaps, wire file uploads and Analytics API, and publish signed APKs to GitHub Releases automatically on version tags.

**Architecture:** EAS Build produces signed APKs triggered by git tags; a shared `uploadFile()` utility in `sync.ts` handles all multipart file pushes; `analyticsService.ts` gains a local SQLite fallback as last resort behind API → cache → local chain.

**Tech Stack:** Expo SDK 52, EAS Build, GitHub Actions, expo-notifications, expo-document-picker, axios FormData, React Native, expo-sqlite

---

### Task 1: Configure EAS and app.json for production build

**Files:**
- Create: `eas.json`
- Verify: `app.json` (android.package already set to `com.muttnet.muttlogbook`)

**Step 1: Install EAS CLI globally (dev machine only — CI installs it too)**

```bash
npm install -g eas-cli
```

**Step 2: Create `eas.json`**

```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

**Step 3: Verify `app.json` has required fields**

Confirm these keys exist under `expo`:
- `expo.slug` = `"mutt-logbook-mobile"`
- `expo.android.package` = `"com.muttnet.muttlogbook"`
- `expo.version` = current version string

**Step 4: Log in to EAS and link project (one-time)**

```bash
eas login
eas build:configure
```

Follow prompts — EAS creates the project and generates managed credentials (keystore stored by Expo).

**Step 5: Commit**

```bash
git add eas.json
git commit -m "feat: add eas.json with production APK build profile"
```

---

### Task 2: Create GitHub Actions release workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Step 1: Create directory**

```bash
mkdir -p .github/workflows
```

**Step 2: Write `.github/workflows/release.yml`**

```yaml
name: Release APK

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    name: Build and release APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install EAS CLI
        run: npm install -g eas-cli

      - name: Build APK via EAS
        id: eas_build
        run: |
          BUILD_URL=$(eas build \
            --platform android \
            --profile production \
            --non-interactive \
            --json \
            --no-wait | jq -r '.[0].id')
          echo "build_id=$BUILD_URL" >> $GITHUB_OUTPUT
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      - name: Wait for build and get APK URL
        id: get_apk
        run: |
          BUILD_ID=${{ steps.eas_build.outputs.build_id }}
          # Poll until complete (EAS CLI eas build:view waits)
          eas build:view $BUILD_ID --json > build_result.json
          APK_URL=$(cat build_result.json | jq -r '.artifacts.buildUrl')
          echo "apk_url=$APK_URL" >> $GITHUB_OUTPUT
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      - name: Download APK
        run: |
          curl -L "${{ steps.get_apk.outputs.apk_url }}" \
            -o "mutt-logbook-${{ github.ref_name }}.apk"

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          name: "Mutt Logbook ${{ github.ref_name }}"
          body: |
            ## Mutt Logbook ${{ github.ref_name }}

            Install by downloading the APK and sideloading on Android.
            Enable "Install from unknown sources" in device settings first.
          files: "mutt-logbook-${{ github.ref_name }}.apk"
          draft: false
          prerelease: false
```

**Step 3: Add EXPO_TOKEN secret to GitHub**

1. Go to https://expo.dev/accounts/[username]/settings/access-tokens
2. Create a new token
3. In GitHub repo → Settings → Secrets → Actions → New secret
4. Name: `EXPO_TOKEN`, Value: the token

**Step 4: Test trigger**

```bash
git tag v1.2.1
git push origin v1.2.1
```

Watch Actions tab — build queues on EAS, APK attaches to Release.

**Step 5: Commit workflow**

```bash
git add .github/workflows/release.yml
git commit -m "feat: add GitHub Actions release workflow via EAS Build"
```

---

### Task 3: Fix OverviewScreen vehicle edit button

**Files:**
- Modify: `src/screens/OverviewScreen.tsx:186`

**Context:** The Edit button renders at line 186 with no `onPress`. The `navigation` hook and `vehicle` state are already in scope.

**Step 1: Add onPress to the Edit button**

In `src/screens/OverviewScreen.tsx`, find:

```tsx
<TouchableOpacity style={styles.editButton}>
  <Text style={styles.editButtonText}>Edit</Text>
</TouchableOpacity>
```

Replace with:

```tsx
<TouchableOpacity
  style={styles.editButton}
  onPress={() => navigation.navigate('Vehicle' as any, { vehicleId: vehicle.id })}
>
  <Text style={styles.editButtonText}>Edit</Text>
</TouchableOpacity>
```

**Step 2: Verify manually**

Run `npm start`, open OverviewScreen, tap Edit — should navigate to VehicleScreen with current vehicle pre-populated.

**Step 3: Commit**

```bash
git add src/screens/OverviewScreen.tsx
git commit -m "fix: wire OverviewScreen vehicle edit button to VehicleScreen"
```

---

### Task 4: Add edit and delete to GuidesScreen

**Files:**
- Modify: `src/screens/GuidesScreen.tsx`

**Context:** `GuideService.update(id, partial)` and `GuideService.delete(id)` both exist. The screen has `handleSave` with only `GuideService.create`. `editingId` state is missing entirely.

**Step 1: Add editingId state**

After the existing `const [saving, setSaving] = useState(false);` line, add:

```tsx
const [editingId, setEditingId] = useState<number | null>(null);
```

**Step 2: Add handleEditPress**

After the `onRefresh` function, add:

```tsx
const handleEditPress = (guide: Guide) => {
  setEditingId(guide.id);
  setFormData({
    title: guide.title || '',
    category: guide.category || '',
    content: guide.content || '',
    interval_miles: guide.interval_miles?.toString() || '',
    interval_months: guide.interval_months?.toString() || '',
    is_template: guide.is_template,
  });
  setModalVisible(true);
};
```

**Step 3: Add handleDeletePress**

```tsx
const handleDeletePress = (guide: Guide) => {
  Alert.alert(
    'Delete Guide',
    `Are you sure you want to delete "${guide.title}"?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await GuideService.delete(guide.id);
          await loadData();
        },
      },
    ]
  );
};
```

**Step 4: Update handleSave to handle both create and update**

Find the existing `handleSave` and update the save logic:

```tsx
if (editingId) {
  await GuideService.update(editingId, {
    title: formData.title,
    category: formData.category || null,
    content: formData.content || null,
    interval_miles: formData.interval_miles ? parseInt(formData.interval_miles) : null,
    interval_months: formData.interval_months ? parseInt(formData.interval_months) : null,
    is_template: formData.is_template,
  });
} else {
  await GuideService.create({
    vehicle_id: vehicleId || null,
    title: formData.title,
    category: formData.category || null,
    content: formData.content || null,
    interval_miles: formData.interval_miles ? parseInt(formData.interval_miles) : null,
    interval_months: formData.interval_months ? parseInt(formData.interval_months) : null,
    is_template: formData.is_template,
  });
}
```

Also reset `editingId` on close and after save:

```tsx
const closeModal = () => {
  setModalVisible(false);
  setEditingId(null);
  setFormData(initialFormData);
};
```

**Step 5: Update modal title**

```tsx
<Text style={styles.modalTitle}>{editingId ? 'Edit Guide' : 'Add Guide'}</Text>
```

**Step 6: Add Edit/Delete buttons to each list item**

Find the guide render item and add action buttons below the content, following the pattern from MaintenanceScreen:

```tsx
<View style={styles.itemActions}>
  <TouchableOpacity onPress={() => handleEditPress(item)} style={styles.editAction}>
    <Text style={styles.editActionText}>Edit</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => handleDeletePress(item)} style={styles.deleteAction}>
    <Text style={styles.deleteActionText}>Delete</Text>
  </TouchableOpacity>
</View>
```

Add corresponding styles matching the dark theme (#007AFF for edit, #FF453A for delete).

**Step 7: Commit**

```bash
git add src/screens/GuidesScreen.tsx
git commit -m "feat: add edit and delete to GuidesScreen"
```

---

### Task 5: Add mileage-based reminder notifications (TDD)

**Files:**
- Create: `src/lib/notificationUtils.ts`
- Create: `src/__tests__/notificationUtils.test.ts`
- Modify: `src/services/notifications.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/notificationUtils.test.ts`:

```typescript
import { getMileageDueReminders } from '../lib/notificationUtils';
import { Reminder } from '../types';

const makeReminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: 1,
  vehicle_id: 1,
  type: 'oil_change',
  interval_miles: 5000,
  interval_months: null,
  last_service_date: null,
  last_service_mileage: null,
  next_due_date: null,
  next_due_mileage: 15000,
  notes: null,
  created_at: '2026-01-01',
  ...overrides,
});

describe('getMileageDueReminders', () => {
  it('returns empty when no reminders have next_due_mileage', () => {
    const reminders = [makeReminder({ next_due_mileage: null })];
    expect(getMileageDueReminders(reminders, 10000)).toEqual([]);
  });

  it('flags overdue when vehicle mileage >= next_due_mileage', () => {
    const reminders = [makeReminder({ next_due_mileage: 15000 })];
    const result = getMileageDueReminders(reminders, 15000);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('overdue');
    expect(result[0].reminder.type).toBe('oil_change');
  });

  it('flags due_soon when within default 500 mile threshold', () => {
    const reminders = [makeReminder({ next_due_mileage: 15000 })];
    const result = getMileageDueReminders(reminders, 14600);
    expect(result[0].status).toBe('due_soon');
    expect(result[0].milesRemaining).toBe(400);
  });

  it('ignores reminders not yet due and outside threshold', () => {
    const reminders = [makeReminder({ next_due_mileage: 15000 })];
    expect(getMileageDueReminders(reminders, 14000)).toEqual([]);
  });

  it('respects custom threshold', () => {
    const reminders = [makeReminder({ next_due_mileage: 15000 })];
    const result = getMileageDueReminders(reminders, 14200, 1000);
    expect(result[0].status).toBe('due_soon');
  });

  it('handles multiple reminders mixed statuses', () => {
    const reminders = [
      makeReminder({ id: 1, type: 'oil_change', next_due_mileage: 15000 }),
      makeReminder({ id: 2, type: 'tires', next_due_mileage: 20000 }),
      makeReminder({ id: 3, type: 'brakes', next_due_mileage: 16000 }),
    ];
    const result = getMileageDueReminders(reminders, 15500);
    expect(result).toHaveLength(2); // oil_change overdue, brakes due_soon
    expect(result.find(r => r.reminder.type === 'oil_change')?.status).toBe('overdue');
    expect(result.find(r => r.reminder.type === 'brakes')?.status).toBe('due_soon');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- --no-coverage
```

Expected: FAIL — `getMileageDueReminders` not found.

**Step 3: Implement `src/lib/notificationUtils.ts`**

```typescript
import { Reminder } from '../types';

export interface MileageDueResult {
  reminder: Reminder;
  status: 'overdue' | 'due_soon';
  milesRemaining: number;
}

const DEFAULT_THRESHOLD_MILES = 500;

/**
 * Returns reminders that are overdue or due within threshold miles
 * given the vehicle's current mileage. Pure function — no side effects.
 */
export function getMileageDueReminders(
  reminders: Reminder[],
  currentMileage: number,
  thresholdMiles = DEFAULT_THRESHOLD_MILES
): MileageDueResult[] {
  const results: MileageDueResult[] = [];

  for (const reminder of reminders) {
    if (reminder.next_due_mileage == null) continue;

    const milesRemaining = reminder.next_due_mileage - currentMileage;

    if (milesRemaining <= 0) {
      results.push({ reminder, status: 'overdue', milesRemaining });
    } else if (milesRemaining <= thresholdMiles) {
      results.push({ reminder, status: 'due_soon', milesRemaining });
    }
  }

  return results;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- --no-coverage
```

Expected: 6 tests pass.

**Step 5: Integrate into notifications.ts**

In `src/services/notifications.ts`, import the new utility and add a mileage pass after the date-based loop:

```typescript
import { getMileageDueReminders } from '../lib/notificationUtils';

// Inside scheduleReminderNotifications(), after the date-based loop:
for (const vehicle of vehicles) {
  if (!vehicle.mileage) continue;
  const reminders = await ReminderService.getByVehicle(vehicle.id);
  const dueByMileage = getMileageDueReminders(reminders, vehicle.mileage);

  for (const { reminder, status, milesRemaining } of dueByMileage) {
    const title = status === 'overdue'
      ? `Overdue: ${reminder.type}`
      : `Service Due Soon: ${reminder.type}`;
    const body = status === 'overdue'
      ? `${vehicle.name} is overdue for ${reminder.type}`
      : `${vehicle.name} needs ${reminder.type} in ${milesRemaining} miles`;

    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + 5000),
      },
    });
  }
}
```

**Step 6: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all 23 tests pass (17 fuelUtils + 6 notificationUtils).

**Step 7: Commit**

```bash
git add src/lib/notificationUtils.ts src/__tests__/notificationUtils.test.ts src/services/notifications.ts
git commit -m "feat: add mileage-based reminder notifications with unit tests"
```

---

### Task 6: Add file picker to DocumentsScreen

**Files:**
- Modify: `src/screens/DocumentsScreen.tsx`

**Step 1: Install expo-document-picker**

```bash
npx expo install expo-document-picker
```

**Step 2: Add import and state**

At the top of `DocumentsScreen.tsx`, add:

```typescript
import * as DocumentPicker from 'expo-document-picker';
```

Add state for the picked file inside the component:

```typescript
const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
```

Add `filename` to the form data interface and initialFormData:

```typescript
// In the form data interface, add:
filename: string;
// In initialFormData, add:
filename: '',
```

**Step 3: Add pickDocument handler**

```typescript
const pickDocument = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (!result.canceled && result.assets[0]) {
    const asset = result.assets[0];
    setPickedFile({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType || 'application/octet-stream',
    });
    setFormData(prev => ({ ...prev, filename: asset.uri }));
  }
};
```

**Step 4: Add "Attach File" button to modal**

In the add/edit modal, after the document_type chips and before the save button, add:

```tsx
<TouchableOpacity style={styles.attachButton} onPress={pickDocument}>
  <Text style={styles.attachButtonText}>
    {pickedFile ? `📎 ${pickedFile.name}` : '📎 Attach File'}
  </Text>
</TouchableOpacity>
```

**Step 5: Reset pickedFile on modal close**

In the modal close handler, add `setPickedFile(null)`.

**Step 6: Show filename in list items**

In the FlatList renderItem, if `item.filename`, add a tappable row:

```tsx
{item.filename && (
  <TouchableOpacity onPress={() => Linking.openURL(item.filename!)}>
    <Text style={styles.filenameText}>📎 {item.filename.split('/').pop()}</Text>
  </TouchableOpacity>
)}
```

Import `Linking` from `react-native`.

**Step 7: Update app.json plugins**

Add `expo-document-picker` to the plugins array in `app.json`:

```json
"plugins": [
  "expo-sqlite",
  "expo-document-picker"
]
```

**Step 8: Commit**

```bash
git add src/screens/DocumentsScreen.tsx app.json package.json package-lock.json
git commit -m "feat: add file picker to DocumentsScreen via expo-document-picker"
```

---

### Task 7: Add local SQLite fallback to analyticsService

**Files:**
- Modify: `src/services/analyticsService.ts`

**Context:** Current chain is API → cache → throw. When both fail (offline + no cached data), the app shows an error. Add a third fallback that computes basic analytics from local SQLite.

**Step 1: Add imports to analyticsService.ts**

```typescript
import { CostService, MaintenanceService, FuelEntryService, VehicleService } from './database';
```

**Step 2: Add the local computation function**

```typescript
async function computeLocalAnalytics(vehicleId: number): Promise<Analytics> {
  const [vehicle, costs, maintenance, fuel] = await Promise.all([
    VehicleService.getById(vehicleId),
    CostService.getByVehicle(vehicleId),
    MaintenanceService.getByVehicle(vehicleId),
    FuelEntryService.getByVehicle(vehicleId),
  ]);

  const monthly_spending: Record<string, number> = {};
  const allCosts = [
    ...costs.map(c => ({ date: c.date, amount: c.amount || 0 })),
    ...maintenance.map(m => ({ date: m.date, amount: m.cost || 0 })),
  ];
  for (const entry of allCosts) {
    if (!entry.date) continue;
    const month = entry.date.slice(0, 7); // YYYY-MM
    monthly_spending[month] = (monthly_spending[month] || 0) + entry.amount;
  }

  const category_spending: Record<string, number> = {};
  for (const cost of costs) {
    const cat = cost.category || 'other';
    category_spending[cat] = (category_spending[cat] || 0) + (cost.amount || 0);
  }

  return {
    vehicle_id: vehicleId,
    monthly_spending,
    category_spending,
    total_spent: allCosts.reduce((s, c) => s + c.amount, 0),
    service_intervals: {},
    last_service: {},
    current_mileage: vehicle?.mileage || 0,
  } as Analytics;
}
```

**Step 3: Update getAnalytics to use the fallback**

In `getAnalytics`, change the final catch to:

```typescript
const cached = await readCache(vehicleId);
if (cached) {
  return { data: cached.data, cachedAt: cached.cachedAt, isCache: true };
}
// Last resort: compute from local SQLite
logger.warn('No cache available, computing analytics locally');
const local = await computeLocalAnalytics(vehicleId);
return { data: local, cachedAt: new Date().toISOString(), isCache: true };
```

**Step 4: Commit**

```bash
git add src/services/analyticsService.ts
git commit -m "feat: add local SQLite fallback to analyticsService"
```

---

### Task 8: Add uploadFile utility to sync.ts

**Files:**
- Modify: `src/services/sync.ts`

**Context:** React Native's FormData accepts `{ uri, name, type }` objects appended as file parts. Axios sends them as multipart/form-data when the body is a FormData instance.

**Step 1: Add the uploadFile helper near the top of sync.ts** (after imports, before the class)

```typescript
/**
 * Upload a local file URI to an API endpoint as multipart/form-data.
 * Additional string fields (e.g. vehicle_id, notes) are passed in extraFields.
 * Returns the parsed JSON response.
 */
async function uploadFile(
  fileUri: string,
  fileName: string,
  mimeType: string,
  endpoint: string,
  extraFields: Record<string, string>
): Promise<any> {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  for (const [key, value] of Object.entries(extraFields)) {
    formData.append(key, value);
  }

  const apiBase = await configService.getApiUrl();
  const response = await axios.post(`${apiBase}${endpoint}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return response.data;
}
```

Ensure `axios` is already imported (it is — check the top of sync.ts) and `configService` is imported.

**Step 2: Commit**

```bash
git add src/services/sync.ts
git commit -m "feat: add uploadFile multipart utility to sync.ts"
```

---

### Task 9: Fix vehicle photo sync to upload file bytes

**Files:**
- Modify: `src/services/sync.ts` (syncPhotos method, lines ~775-790)

**Context:** Current code sends `{ uri, name, type }` as a JSON object to `apiService.photos.create`. This sends the URI string, not file bytes.

**Step 1: Replace the photo push block**

Find in `syncPhotos`:

```typescript
const created = await apiService.photos.create({
  uri: photo.filename,
  name: photo.filename.split('/').pop() || 'photo.jpg',
  type: 'image/jpeg',
} as any);
await VehiclePhotoService.markSynced(photo.id, created.id);
```

Replace with:

```typescript
const fileName = photo.filename.split('/').pop() || 'photo.jpg';
const created = await uploadFile(
  photo.filename,
  fileName,
  'image/jpeg',
  '/api/vehicle-photos',
  { vehicle_id: String(photo.vehicle_id) }
);
await VehiclePhotoService.markSynced(photo.id, created.id);
```

**Step 2: Commit**

```bash
git add src/services/sync.ts
git commit -m "fix: upload photo file bytes as multipart in syncPhotos"
```

---

### Task 10: Add document file upload to sync push

**Files:**
- Modify: `src/services/sync.ts` (syncDocuments method, ~line 1046)

**Context:** Current push sends metadata only. If `filename` is set (local file URI), use `uploadFile`; otherwise fall back to JSON push.

**Step 1: Update the document push block**

Find in `syncDocuments`:

```typescript
const created = await apiService.documents.create({
  vehicle_id: doc.vehicle_id,
  // ... other fields
});
```

Replace with:

```typescript
let created: any;
if (doc.filename) {
  const fileName = doc.filename.split('/').pop() || 'document';
  created = await uploadFile(
    doc.filename,
    fileName,
    'application/octet-stream',
    '/api/documents',
    {
      vehicle_id: String(doc.vehicle_id),
      title: doc.title || '',
      document_type: doc.document_type || '',
      description: doc.description || '',
    }
  );
} else {
  created = await apiService.documents.create({
    vehicle_id: doc.vehicle_id,
    title: doc.title,
    document_type: doc.document_type,
    description: doc.description,
    filename: doc.filename,
  });
}
```

**Step 2: Commit**

```bash
git add src/services/sync.ts
git commit -m "feat: upload document files as multipart during sync"
```

---

### Task 11: Add receipt file upload to sync push

**Files:**
- Modify: `src/services/sync.ts` (syncReceipts method, ~line 977)

**Context:** Receipts may have a photo of the paper receipt stored as `filename`. Same conditional pattern as documents.

**Step 1: Update the receipt push block**

Find in `syncReceipts` the `await apiService.receipts.create({...})` call.

Replace with:

```typescript
let created: any;
if (receipt.filename) {
  const fileName = receipt.filename.split('/').pop() || 'receipt';
  created = await uploadFile(
    receipt.filename,
    fileName,
    'image/jpeg',
    '/api/receipts',
    {
      vehicle_id: String(receipt.vehicle_id),
      date: receipt.date || '',
      vendor: receipt.vendor || '',
      amount: String(receipt.amount || 0),
      category: receipt.category || '',
      notes: receipt.notes || '',
    }
  );
} else {
  created = await apiService.receipts.create({
    vehicle_id: receipt.vehicle_id,
    maintenance_id: receipt.maintenance_id || undefined,
    date: receipt.date || undefined,
    vendor: receipt.vendor || undefined,
    amount: receipt.amount || undefined,
    category: receipt.category || undefined,
    notes: receipt.notes || undefined,
  });
}
await ReceiptService.markSynced(receipt.id, created.id);
```

**Step 2: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: 23 tests pass.

**Step 3: Commit**

```bash
git add src/services/sync.ts
git commit -m "feat: upload receipt files as multipart during sync"
```

**Step 4: Push everything**

```bash
git push origin mobile
```

**Step 5: Cut a release**

```bash
git tag v1.3.0
git push origin v1.3.0
```

Watch GitHub Actions → a Release with the signed APK appears automatically.
