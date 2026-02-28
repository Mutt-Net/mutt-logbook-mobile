# Analytics Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an `AnalyticsScreen` reachable from `DashboardScreen` that displays API-sourced service interval status, monthly spending trend (bar chart), and category spending breakdown (donut chart), with `AsyncStorage` caching for offline use.

**Architecture:** A new `analyticsService.ts` wraps the existing `apiService.analytics.get()` call and persists results to `AsyncStorage` keyed by vehicle ID. `AnalyticsScreen` reads from that service and renders three sections. `DashboardScreen` gains a tappable `Card` at the bottom that navigates to it.

**Tech Stack:** React Native / Expo SDK 52, TypeScript strict, `@react-native-async-storage/async-storage` (already installed), `react-native-gifted-charts` + `react-native-svg` (to install), existing `apiService`, `Card`/`Loading`/`EmptyState` components, `createLogger` utility.

---

## Task 1: Install chart dependencies

**Files:**
- Modify: `package.json` (via install commands)

**Step 1: Install `react-native-svg` via Expo (ensures correct native version)**

```bash
npx expo install react-native-svg
```

Expected: installs a version compatible with Expo SDK 52, adds to `package.json`.

**Step 2: Install `react-native-gifted-charts`**

```bash
npm install react-native-gifted-charts
```

Expected: adds `react-native-gifted-charts` to `package.json` dependencies.

**Step 3: Verify TypeScript is still happy**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install react-native-gifted-charts and react-native-svg"
```

---

## Task 2: Create `analyticsService.ts`

**Files:**
- Create: `src/services/analyticsService.ts`

**Context:** `apiService.analytics.get(vehicleId)` already exists and returns the `Analytics` type (defined in `src/types/index.ts`). `AsyncStorage` is imported from `@react-native-async-storage/async-storage`. Use `createLogger` from `src/lib/logger.ts`.

**Step 1: Create the file**

```typescript
// src/services/analyticsService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Analytics } from '../types';
import apiService from './api';
import { createLogger } from '../lib/logger';

const logger = createLogger('AnalyticsService');

interface CachedAnalytics {
  data: Analytics;
  cachedAt: string;
}

export interface AnalyticsResult {
  data: Analytics;
  cachedAt: string;
  isCache: boolean;
}

function cacheKey(vehicleId: number): string {
  return `analytics_${vehicleId}`;
}

async function readCache(vehicleId: number): Promise<CachedAnalytics | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(vehicleId));
    return raw ? (JSON.parse(raw) as CachedAnalytics) : null;
  } catch (err) {
    logger.warn('Failed to read analytics cache', err);
    return null;
  }
}

async function writeCache(vehicleId: number, data: Analytics): Promise<string> {
  const cachedAt = new Date().toISOString();
  const entry: CachedAnalytics = { data, cachedAt };
  await AsyncStorage.setItem(cacheKey(vehicleId), JSON.stringify(entry));
  return cachedAt;
}

export const analyticsService = {
  async getAnalytics(vehicleId: number): Promise<AnalyticsResult> {
    try {
      logger.info(`Fetching analytics for vehicle ${vehicleId}`);
      const data = await apiService.analytics.get(vehicleId);
      const cachedAt = await writeCache(vehicleId, data);
      return { data, cachedAt, isCache: false };
    } catch (err) {
      logger.warn('Analytics API fetch failed, trying cache', err);
      const cached = await readCache(vehicleId);
      if (cached) {
        return { data: cached.data, cachedAt: cached.cachedAt, isCache: true };
      }
      throw new Error('No analytics data available. Connect to your home network to load analytics.');
    }
  },

  async refreshAnalytics(vehicleId: number): Promise<AnalyticsResult> {
    logger.info(`Force-refreshing analytics for vehicle ${vehicleId}`);
    const data = await apiService.analytics.get(vehicleId);
    const cachedAt = await writeCache(vehicleId, data);
    return { data, cachedAt, isCache: false };
  },

  async invalidateCache(vehicleId: number): Promise<void> {
    await AsyncStorage.removeItem(cacheKey(vehicleId));
    logger.info(`Analytics cache invalidated for vehicle ${vehicleId}`);
  },
};
```

**Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see "Cannot find module" for `async-storage`, confirm the install from Task 1 completed.

**Step 3: Commit**

```bash
git add src/services/analyticsService.ts
git commit -m "feat: add analyticsService with AsyncStorage cache"
```

---

## Task 3: Add Analytics to navigation types and register screen

**Files:**
- Modify: `src/navigation/types.ts:5-16`
- Modify: `src/navigation/AppNavigator.tsx:34-93`
- Create: `src/screens/AnalyticsScreen.tsx` (skeleton only — fleshed out in Tasks 4-6)

**Context:** `DashboardStackParamList` already lists all the other stack screens. `DashboardStackNavigator` in `AppNavigator.tsx` registers them. Follow the exact same pattern.

**Step 1: Add `Analytics` to `DashboardStackParamList` in `types.ts`**

In `src/navigation/types.ts`, inside `DashboardStackParamList`, add after the `Vehicle` entry:

```typescript
  Analytics: { vehicleId: number };
```

So the type becomes:
```typescript
export type DashboardStackParamList = {
  DashboardHome: undefined;
  Maintenance: { vehicleId?: number };
  Mods: { vehicleId?: number };
  Costs: { vehicleId?: number };
  Fuel: { vehicleId?: number };
  Notes: { vehicleId?: number };
  VCDS: { vehicleId?: number };
  Guides: { vehicleId?: number };
  Reminders: { vehicleId?: number };
  Vehicle: { vehicleId?: number };
  Analytics: { vehicleId: number };   // <-- add this
};
```

**Step 2: Create a skeleton `AnalyticsScreen.tsx`**

```typescript
// src/screens/AnalyticsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Loading } from '../components/common';
import type { DashboardStackScreenProps } from '../navigation/types';

type Props = DashboardStackScreenProps<'Analytics'>;

export default function AnalyticsScreen({ route }: Props) {
  const { vehicleId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Analytics coming soon (vehicle {vehicleId})</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: '#8E8E93', fontSize: 16 },
});
```

**Step 3: Register in `AppNavigator.tsx`**

At the top of `AppNavigator.tsx`, add the import after the `VehicleScreen` import:
```typescript
import AnalyticsScreen from '../screens/AnalyticsScreen';
```

Inside `DashboardStackNavigator`, after the `Vehicle` screen registration, add:
```tsx
<DashboardStack.Screen
  name="Analytics"
  component={AnalyticsScreen}
  options={{ title: 'Analytics' }}
/>
```

**Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 5: Smoke test — confirm screen is reachable**

Start the app (`npm start`) and manually trigger navigation via the React DevTools or a temporary button. Confirm the skeleton screen renders with the placeholder text.

**Step 6: Commit**

```bash
git add src/navigation/types.ts src/navigation/AppNavigator.tsx src/screens/AnalyticsScreen.tsx
git commit -m "feat: register AnalyticsScreen in navigation"
```

---

## Task 4: Implement AnalyticsScreen — service wiring + service interval section

**Files:**
- Modify: `src/screens/AnalyticsScreen.tsx` (full replacement of skeleton)

**Context:** The `Analytics` type has `service_intervals: Record<string, { miles: number; months: number }>`, `last_service: Record<string, { date: string | null; mileage: number | null }>`, and `current_mileage: number`. Status thresholds: Overdue if either dimension exceeds interval, Due Soon if within 500 mi or 1 month of limit, OK otherwise. Colors from existing codebase: red `#FF453A`, yellow `#FFD60A`, green `#30D158`.

**Step 1: Write the full AnalyticsScreen with data loading and service interval section**

```typescript
// src/screens/AnalyticsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Card, Loading, EmptyState } from '../components/common';
import { analyticsService, AnalyticsResult } from '../services/analyticsService';
import { createLogger } from '../lib/logger';
import type { DashboardStackScreenProps } from '../navigation/types';

const logger = createLogger('AnalyticsScreen');

type ServiceStatus = 'overdue' | 'due_soon' | 'ok';

interface ServiceRow {
  name: string;
  lastDate: string | null;
  lastMileage: number | null;
  status: ServiceStatus;
  detail: string;
}

function monthsBetween(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const last = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - last.getFullYear()) * 12 + (now.getMonth() - last.getMonth());
}

function computeServiceRows(
  intervals: Record<string, { miles: number; months: number }>,
  lastService: Record<string, { date: string | null; mileage: number | null }>,
  currentMileage: number
): ServiceRow[] {
  return Object.entries(intervals).map(([name, interval]) => {
    const last = lastService[name] ?? { date: null, mileage: null };
    const milesSince = last.mileage != null ? currentMileage - last.mileage : Infinity;
    const monthsSince = monthsBetween(last.date);

    let status: ServiceStatus = 'ok';
    if (milesSince > interval.miles || monthsSince > interval.months) {
      status = 'overdue';
    } else if (milesSince > interval.miles - 500 || monthsSince > interval.months - 1) {
      status = 'due_soon';
    }

    const lastDate = last.date ? new Date(last.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never';
    const detail = last.mileage != null ? `${lastDate} · ${last.mileage.toLocaleString()} mi` : lastDate;

    return { name, lastDate: last.date, lastMileage: last.mileage, status, detail };
  });
}

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; bg: string }> = {
  overdue:  { label: 'Overdue',  color: '#FF453A', bg: 'rgba(255,69,58,0.15)' },
  due_soon: { label: 'Due Soon', color: '#FFD60A', bg: 'rgba(255,214,10,0.15)' },
  ok:       { label: 'OK',       color: '#30D158', bg: 'rgba(48,209,88,0.15)' },
};

type Props = DashboardStackScreenProps<'Analytics'>;

export default function AnalyticsScreen({ route }: Props) {
  const { vehicleId } = route.params;
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await analyticsService.getAnalytics(vehicleId);
      setResult(res);
    } catch (err: any) {
      logger.error('Failed to load analytics', err);
      setError(err.message ?? 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await analyticsService.refreshAnalytics(vehicleId);
      setResult(res);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <Loading />;

  if (error && !result) {
    return (
      <View style={styles.container}>
        <EmptyState message="No Analytics Data" submessage={error} />
      </View>
    );
  }

  const data = result!.data;
  const serviceRows = computeServiceRows(
    data.service_intervals ?? {},
    data.last_service ?? {},
    data.current_mileage ?? 0
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
    >
      {result!.isCache && (
        <View style={styles.cacheBanner}>
          <Text style={styles.cacheBannerText}>
            Cached data · Last updated {new Date(result!.cachedAt).toLocaleString()}
          </Text>
        </View>
      )}

      {/* SERVICE INTERVALS */}
      <Card>
        <Text style={styles.sectionTitle}>Service Intervals</Text>
        {serviceRows.length === 0 ? (
          <Text style={styles.emptyText}>No service interval data</Text>
        ) : (
          serviceRows.map((row) => {
            const cfg = STATUS_CONFIG[row.status];
            return (
              <View key={row.name} style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{row.name}</Text>
                  <Text style={styles.serviceDetail}>{row.detail}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            );
          })
        )}
      </Card>

      {/* MONTHLY SPENDING — Task 5 */}
      {/* CATEGORY BREAKDOWN — Task 6 */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { padding: 16, paddingBottom: 32 },
  cacheBanner: {
    backgroundColor: 'rgba(255,214,10,0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.3)',
  },
  cacheBannerText: { color: '#FFD60A', fontSize: 13, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  emptyText: { color: '#8E8E93', fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  serviceInfo: { flex: 1, marginRight: 12 },
  serviceName: { fontSize: 15, fontWeight: '500', color: '#FFFFFF', marginBottom: 2 },
  serviceDetail: { fontSize: 13, color: '#8E8E93' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 13, fontWeight: '600' },
});
```

**Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Manual verification**

Navigate to AnalyticsScreen from the app (temporarily add a button on Dashboard if the entry card isn't built yet). Confirm:
- Loading spinner appears while fetching
- Service interval rows render with correct status pills
- Cache banner appears when offline

**Step 4: Commit**

```bash
git add src/screens/AnalyticsScreen.tsx
git commit -m "feat: AnalyticsScreen with service interval status section"
```

---

## Task 5: Add monthly spending bar chart

**Files:**
- Modify: `src/screens/AnalyticsScreen.tsx`

**Context:** `data.monthly_spending` is `Record<string, number>` keyed by `"YYYY-MM"`. Gifted Charts `BarChart` accepts `data: Array<{ value: number; label: string; frontColor?: string }>`. Take the last 6 months sorted chronologically. Month labels should be short (e.g. "Aug"). Import `BarChart` from `react-native-gifted-charts`.

**Step 1: Add the monthly spending section after the service intervals card**

Add this import at the top of `AnalyticsScreen.tsx`:
```typescript
import { BarChart } from 'react-native-gifted-charts';
```

Add this helper function before the component:
```typescript
function buildBarData(monthly: Record<string, number>) {
  const sorted = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);

  return sorted.map(([key, value]) => {
    const [, month] = key.split('-');
    const label = new Date(`${key}-01`).toLocaleString('en-US', { month: 'short' });
    return { value, label, frontColor: '#007AFF' };
  });
}
```

Replace the `{/* MONTHLY SPENDING — Task 5 */}` comment in the JSX with:
```tsx
<Card style={styles.chartCard}>
  <Text style={styles.sectionTitle}>Monthly Spending</Text>
  {Object.keys(data.monthly_spending ?? {}).length === 0 ? (
    <Text style={styles.emptyText}>No spending data</Text>
  ) : (
    <BarChart
      data={buildBarData(data.monthly_spending ?? {})}
      barWidth={32}
      spacing={16}
      noOfSections={4}
      barBorderRadius={4}
      yAxisTextStyle={{ color: '#8E8E93', fontSize: 11 }}
      xAxisLabelTextStyle={{ color: '#8E8E93', fontSize: 11 }}
      hideRules
      isAnimated
    />
  )}
</Card>
```

Add to `StyleSheet`:
```typescript
chartCard: { overflow: 'hidden' },
```

**Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. If `react-native-gifted-charts` has no type declarations, you may need: `npm install --save-dev @types/react-native-gifted-charts` or add `declare module 'react-native-gifted-charts'` to a `.d.ts` file.

**Step 3: Manual verification**

Navigate to AnalyticsScreen. Confirm:
- Bar chart renders for the last 6 months of spending
- Bars are blue (`#007AFF`)
- Month labels visible on x-axis

**Step 4: Commit**

```bash
git add src/screens/AnalyticsScreen.tsx
git commit -m "feat: add monthly spending bar chart to AnalyticsScreen"
```

---

## Task 6: Add category spending donut chart

**Files:**
- Modify: `src/screens/AnalyticsScreen.tsx`

**Context:** `data.category_spending` is `Record<string, number>`. Gifted Charts `PieChart` accepts `data: Array<{ value: number; color: string; text?: string }>`. Render as a donut with a legend list below. Use a fixed color palette — app uses `#007AFF`, `#30D158`, `#FF453A`, `#FFD60A`, `#AF52DE`, `#FF9F0A` — these are the iOS system colors already present in the codebase.

**Step 1: Add `PieChart` import**

Add to the existing `react-native-gifted-charts` import line:
```typescript
import { BarChart, PieChart } from 'react-native-gifted-charts';
```

**Step 2: Add helpers before the component**

```typescript
const CATEGORY_COLORS = ['#007AFF', '#30D158', '#FF453A', '#FFD60A', '#AF52DE', '#FF9F0A'];

function buildPieData(categorySpending: Record<string, number>) {
  const total = Object.values(categorySpending).reduce((s, v) => s + v, 0);
  return Object.entries(categorySpending).map(([name, value], i) => ({
    name,
    value,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    percentage: total > 0 ? Math.round((value / total) * 100) : 0,
  }));
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
```

**Step 3: Replace the `{/* CATEGORY BREAKDOWN — Task 6 */}` comment with:**

```tsx
<Card>
  <Text style={styles.sectionTitle}>Spending by Category</Text>
  {Object.keys(data.category_spending ?? {}).length === 0 ? (
    <Text style={styles.emptyText}>No category data</Text>
  ) : (() => {
    const pieData = buildPieData(data.category_spending ?? {});
    return (
      <>
        <View style={styles.pieContainer}>
          <PieChart
            data={pieData}
            donut
            radius={90}
            innerRadius={55}
            centerLabelComponent={() => (
              <Text style={styles.pieCenter}>
                {formatCurrency(pieData.reduce((s, d) => s + d.value, 0))}
              </Text>
            )}
          />
        </View>
        {pieData.map((item) => (
          <View key={item.name} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendName}>{item.name}</Text>
            <Text style={styles.legendAmount}>{formatCurrency(item.value)}</Text>
            <Text style={styles.legendPct}>{item.percentage}%</Text>
          </View>
        ))}
      </>
    );
  })()}
</Card>
```

**Step 4: Add new styles**

```typescript
pieContainer: { alignItems: 'center', marginBottom: 16 },
pieCenter: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
legendName: { flex: 1, fontSize: 14, color: '#FFFFFF' },
legendAmount: { fontSize: 14, color: '#FFFFFF', fontWeight: '500', marginRight: 8 },
legendPct: { fontSize: 13, color: '#8E8E93', width: 36, textAlign: 'right' },
```

**Step 5: Type-check**

```bash
npx tsc --noEmit
```

**Step 6: Manual verification**

Navigate to AnalyticsScreen. Confirm:
- Donut chart renders with multiple colored slices
- Center label shows total spend
- Legend rows show category name, amount, and percentage

**Step 7: Commit**

```bash
git add src/screens/AnalyticsScreen.tsx
git commit -m "feat: add category spending donut chart to AnalyticsScreen"
```

---

## Task 7: Add Analytics entry card to DashboardScreen

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`

**Context:** `DashboardScreen` uses `DashboardStackScreenProps<'DashboardHome'>` (check existing imports). Add `useNavigation` or use the `navigation` prop to call `navigation.navigate('Analytics', { vehicleId: selectedVehicleId })`. The `Card` component already supports `onPress`. Show a brief preview if analytics cache exists.

**Step 1: Add navigation prop to component signature**

The component signature currently is `export default function DashboardScreen()`. Update it to:
```typescript
import type { DashboardStackScreenProps } from '../navigation/types';

type Props = DashboardStackScreenProps<'DashboardHome'>;

export default function DashboardScreen({ navigation }: Props) {
```

**Step 2: Add cache-preview state**

Add a new state variable after the existing state declarations:
```typescript
const [analyticsPreview, setAnalyticsPreview] = useState<string | null>(null);
```

Add a function to load the preview from cache (reads AsyncStorage directly — no API call):
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const loadAnalyticsPreview = useCallback(async () => {
  if (!selectedVehicleId) return;
  try {
    const raw = await AsyncStorage.getItem(`analytics_${selectedVehicleId}`);
    if (!raw) return;
    const cached = JSON.parse(raw);
    const intervals = cached.data?.service_intervals ?? {};
    const lastService = cached.data?.last_service ?? {};
    const currentMileage = cached.data?.current_mileage ?? 0;
    let overdue = 0;
    let dueSoon = 0;
    for (const [name, interval] of Object.entries(intervals) as [string, { miles: number; months: number }][]) {
      const last = (lastService as any)[name] ?? { date: null, mileage: null };
      const milesSince = last.mileage != null ? currentMileage - last.mileage : Infinity;
      const monthsSince = last.date
        ? (new Date().getFullYear() - new Date(last.date).getFullYear()) * 12 +
          (new Date().getMonth() - new Date(last.date).getMonth())
        : Infinity;
      if (milesSince > interval.miles || monthsSince > interval.months) overdue++;
      else if (milesSince > interval.miles - 500 || monthsSince > interval.months - 1) dueSoon++;
    }
    const parts = [];
    if (overdue > 0) parts.push(`${overdue} overdue`);
    if (dueSoon > 0) parts.push(`${dueSoon} due soon`);
    setAnalyticsPreview(parts.length > 0 ? parts.join(' · ') : 'All services OK');
  } catch {
    // silently ignore
  }
}, [selectedVehicleId]);
```

Call it in the `loadData` function after `loadDashboardData()`:
```typescript
await loadAnalyticsPreview();
```

**Step 3: Add the entry card to the JSX**

Add this card at the bottom of the `ScrollView`, after the "Recent Maintenance" card:
```tsx
{selectedVehicleId && (
  <Card
    onPress={() => navigation.navigate('Analytics', { vehicleId: selectedVehicleId })}
    style={styles.analyticsCard}
  >
    <View style={styles.analyticsCardContent}>
      <View>
        <Text style={styles.analyticsCardTitle}>Analytics</Text>
        <Text style={styles.analyticsCardSub}>
          {analyticsPreview ?? 'Service intervals · Spending trends'}
        </Text>
      </View>
      <Text style={styles.analyticsCardChevron}>›</Text>
    </View>
  </Card>
)}
```

**Step 4: Add styles**

```typescript
analyticsCard: { marginTop: 4 },
analyticsCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
analyticsCardTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
analyticsCardSub: { fontSize: 13, color: '#8E8E93' },
analyticsCardChevron: { fontSize: 24, color: '#8E8E93' },
```

**Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 6: End-to-end manual verification**

1. Open the app on Dashboard
2. Confirm Analytics card appears at the bottom with preview text (or placeholder if no cache)
3. Tap it — confirm navigation to AnalyticsScreen with the correct vehicle ID
4. Pull to refresh on AnalyticsScreen — confirm it fetches from API and updates the cache
5. Enable airplane mode, restart app, navigate back — confirm cached data still shows with the yellow banner

**Step 7: Commit**

```bash
git add src/screens/DashboardScreen.tsx
git commit -m "feat: add Analytics entry card to DashboardScreen"
```

---

## Done

All tasks complete. The feature is fully implemented when:
- [ ] `analyticsService.ts` caches and retrieves analytics correctly
- [ ] `AnalyticsScreen` shows all three sections (service intervals, monthly trend, category breakdown)
- [ ] Dashboard entry card navigates correctly and shows cache preview
- [ ] Offline mode shows cached data with yellow banner
- [ ] `npx tsc --noEmit` passes with no errors
