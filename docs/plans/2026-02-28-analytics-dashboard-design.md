# Analytics Dashboard Design

**Date:** 2026-02-28
**Status:** Approved
**Approach:** Separate AnalyticsScreen with Dashboard entry point (Approach B)

---

## Summary

Add an `AnalyticsScreen` that surfaces backend-computed analytics data: service interval status, monthly spending trend, and category spending breakdown. Entry point is a tappable card on `DashboardScreen`. Data is fetched from the Flask API and cached in `AsyncStorage` per vehicle for offline viewing.

**Chart library:** `react-native-gifted-charts` + `react-native-svg` (Expo-managed)

---

## Architecture

```
DashboardScreen
  └─ "Analytics" card → navigate('Analytics', { vehicleId })
       └─ AnalyticsScreen
            └─ analyticsService.getAnalytics(vehicleId)
                  ├─ online:  apiService.analytics.get() → AsyncStorage → display
                  └─ offline: AsyncStorage.getItem()     → display with "Cached" badge
```

### Files changed / created

| File | Change |
|------|--------|
| `src/services/analyticsService.ts` | New — fetch + AsyncStorage cache wrapper |
| `src/screens/AnalyticsScreen.tsx` | New — three-section analytics screen |
| `src/navigation/types.ts` | Add `Analytics: { vehicleId: number }` to `DashboardStackParamList` |
| `src/navigation/AppNavigator.tsx` | Register `AnalyticsScreen` in `DashboardStackNavigator` |
| `src/screens/DashboardScreen.tsx` | Add Analytics entry card at bottom |

---

## Section 1 — Navigation

### `types.ts`
Add to `DashboardStackParamList`:
```ts
Analytics: { vehicleId: number };
```

### `AppNavigator.tsx`
Register in `DashboardStackNavigator` (same pattern as existing screens):
```tsx
<DashboardStack.Screen
  name="Analytics"
  component={AnalyticsScreen}
  options={{ title: 'Analytics' }}
/>
```

### `DashboardScreen.tsx`
Add a tappable `Card` at the bottom of the ScrollView:
- Title: "Analytics"
- Chevron: "→"
- Preview text: derived from cached service interval data — e.g. "2 overdue · 1 due soon" — or "View Analytics →" if no cache exists yet
- `onPress`: `navigation.navigate('Analytics', { vehicleId: selectedVehicleId })`

---

## Section 2 — `analyticsService.ts`

```ts
interface CachedAnalytics {
  data: Analytics;
  cachedAt: string; // ISO timestamp
}

// Returns analytics, preferring fresh API data. Falls back to cache if offline.
// isCache: true means the data came from AsyncStorage, not a live API call.
getAnalytics(vehicleId: number): Promise<{ data: Analytics; cachedAt: string; isCache: boolean }>

// Force-refreshes from API, updates cache. Used by the refresh button.
refreshAnalytics(vehicleId: number): Promise<{ data: Analytics; cachedAt: string; isCache: false }>

// Clears cached entry. Called on vehicle change or explicit cache invalidation.
invalidateCache(vehicleId: number): Promise<void>
```

**AsyncStorage key:** `analytics_${vehicleId}`

**Logic:**
1. Try `apiService.analytics.get(vehicleId)`
2. On success → serialize to AsyncStorage → return `{ data, cachedAt: new Date().toISOString(), isCache: false }`
3. On network failure → read AsyncStorage → return `{ data, cachedAt, isCache: true }`
4. If both fail → throw (caller shows error state)

---

## Section 3 — `AnalyticsScreen.tsx`

### Common elements
- `ScrollView` with `RefreshControl` (calls `refreshAnalytics`)
- When `isCache: true`: show a yellow banner at top — "Cached data · Last updated [cachedAt]"
- Error state: `EmptyState` component with retry button
- Loading state: `Loading` component (existing)

### Section A — Service Interval Status

**Source:** `data.service_intervals`, `data.last_service`, `data.current_mileage`

**Per service type, compute:**
- `milesSinceService = current_mileage − last_service[type].mileage`
- `monthsSinceService` = months between today and `last_service[type].date`
- **Overdue**: `milesSinceService > interval_miles` OR `monthsSinceService > interval_months`
- **Due Soon**: within 500 mi OR within 1 month of the interval limit
- **OK**: everything else

**Rendered as:** list of rows
```
[Service Name]     Last: [date / mileage]     [STATUS PILL]
```
Status pill colors: Overdue = `#FF453A` (red), Due Soon = `#FFD60A` (yellow), OK = `#30D158` (green)

### Section B — Monthly Spending Trend

**Source:** `data.monthly_spending` — `Record<"YYYY-MM", number>`

**Logic:** Sort keys chronologically, take last 6 entries.

**Rendered as:** `BarChart` from `react-native-gifted-charts`
- Bar color: `#007AFF`
- Value labels above each bar (formatted as `$X`)
- X-axis labels: short month name (e.g. "Aug", "Sep")
- No y-axis gridlines (keep it clean on dark theme)

### Section C — Category Breakdown

**Source:** `data.category_spending` — `Record<string, number>`

**Rendered as:** `PieChart` (donut style) from `react-native-gifted-charts`
- Each slice a distinct color from a fixed palette
- Legend list below: `[color dot]  [Category]  $X  (Y%)`
- Total spending shown in donut center

---

## Dependencies to install

```bash
npx expo install react-native-svg
npm install react-native-gifted-charts
```

---

## Non-goals

- No spending trend charts on the Dashboard itself (kept to entry card only)
- No yearly breakdown (monthly is sufficient)
- No analytics for all vehicles combined (always vehicle-scoped)
- No auto-refresh timer (user-initiated refresh only)
