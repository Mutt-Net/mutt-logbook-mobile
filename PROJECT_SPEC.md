# Project Specification

## Overview

**Project Name:** Mutt Logbook Mobile

**Description:** A React Native mobile application for tracking vehicle maintenance, modifications, fuel consumption, costs, and diagnostic fault codes (VCDS). Provides offline-first data storage with automatic synchronization to a Flask API backend when on home WiFi.

**Repository:** Local project (private)

---

## Audience & Jobs to Be Done

### Primary Audience

**Who:** Vehicle enthusiasts and owners who want to maintain detailed records of their cars' maintenance history, modifications, and operating costs.

**Context:** Users need to quickly log maintenance work, track expenses, record modifications, and diagnose issues while working on their vehicles. They need offline access in garages and automatic backup when home.

### Jobs to Be Done

| JTBD ID | Statement | Desired Outcome |
|---------|-----------|-----------------|
| JTBD-001 | When performing vehicle maintenance, I want to quickly log service records with parts and costs, so I can maintain accurate history and resale documentation | Complete service log with timestamps, mileage, and costs |
| JTBD-002 | When modifying my vehicle, I want to track planned and completed mods with associated costs, so I can monitor project progress and total investment | Organized mod tracking with status and cost totals |
| JTBD-003 | When diagnosing issues, I want to record VCDS fault codes and their resolution, so I can track recurring problems and share with mechanics | searchable fault history with status tracking |

---

## Topics of Concern (Activities)

### Activity: log-maintenance

**Related to:** JTBD-001

**Description:** Record vehicle maintenance events with date, mileage, category, parts used, labor, and costs

**Capability Depths:**
- **Basic:** Create maintenance entries with date, description, cost
- **Enhanced:** Track parts used, labor hours, shop name, attach receipts
- **Advanced:** Service interval reminders, cost analytics by category

**Acceptance Criteria:**
- [ ] Maintenance entry saved to local SQLite database
- [ ] Entry marked for sync when network available
- [ ] Entries displayed in reverse chronological order
- [ ] Filter by vehicle and category

### Activity: track-mods

**Related to:** JTBD-002

**Description:** Plan and track vehicle modifications through completion

**Capability Depths:**
- **Basic:** Create mod entries with description and status
- **Enhanced:** Track parts, costs, installation date/mileage
- **Advanced:** Photo documentation, linked maintenance records

**Acceptance Criteria:**
- [ ] Mod status transitions: planned → in_progress → completed
- [ ] Cost aggregation across related mods
- [ ] Sync to backend when available

### Activity: diagnose-faults

**Related to:** JTBD-003

**Description:** Record and track VCDS diagnostic fault codes

**Capability Depths:**
- **Basic:** Manually enter fault codes with descriptions
- **Enhanced:** Track fault status (active/cleared), detection and clear dates
- **Advanced:** Parse VCDS log text, import faults automatically

**Acceptance Criteria:**
- [ ] Fault codes stored with address, component, description
- [ ] Status tracking for active vs cleared faults
- [ ] Notes field for troubleshooting observations

---

## Technical Constraints

| Constraint | Description |
|------------|-------------|
| **Language** | TypeScript, React Native |
| **Runtime** | React Native 0.76.9, Expo SDK 52 |
| **Database** | SQLite (expo-sqlite) for local storage |
| **External Services** | Flask API backend (sync target) |
| **Deployment** | Expo EAS Build for iOS/Android |

---

## Architecture Overview

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Mobile App        │     │   Sync Manager   │     │   Flask API     │
│   (React Native)    │────▶│   (WiFi trigger) │────▶│   (Backend)     │
│   - Expo SDK 52     │     │   - Auto sync    │     │   - REST API    │
│   - SQLite local DB │     │   - Push/Pull    │     │   - PostgreSQL  │
│   - Dark theme UI   │     │   - Conflict res │     │   - Auth (PIN)  │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
```

### Key Components

| Component | Responsibility | Location |
|-----------|----------------|----------|
| AppNavigator | Tab-based navigation (Dashboard, Overview, Add, Settings) | `src/navigation/` |
| Database | SQLite operations, CRUD services for all entities | `src/services/database.ts` |
| SyncManager | Auto-sync on home WiFi, push/pull changes | `src/services/sync.ts` |
| ApiService | HTTP client for Flask API communication | `src/services/api.ts` |
| VehicleContext | React context for selected vehicle state | `src/context/VehicleContext.tsx` |
| ConfigService | Secure storage for API URL, PIN, WiFi credentials | `src/services/config.ts` |
| Screens | UI screens for each feature (Maintenance, Mods, Costs, etc.) | `src/screens/` |

---

## Build & Test Commands

| Command | Purpose |
|---------|---------|
| `npm start` or `expo start` | Start Expo development server |
| `npm run android` | Run on Android device/emulator |
| `npm run ios` | Run on iOS simulator |
| `npm run web` | Run in web browser |
| `npm run build:android` | Build Android app locally |
| `npm run prebuild` | Generate native projects |
| `npx tsc --noEmit` | TypeScript type check |

**Note:** No test framework configured yet. TypeScript type-checking via `tsc`.

### Production APK Builds (GitHub Actions)

Production APKs are built via EAS Build and published as GitHub Releases automatically on version tags.

**To release a new build:**

```bash
# 1. Bump version in app.json
# 2. Commit and push
git add app.json
git commit -m "chore: bump version to x.y.z"
git push origin mobile

# 3. Tag and push — triggers the Release APK workflow
git tag vx.y.z
git push origin vx.y.z
```

The signed APK is attached to the GitHub Release once EAS Build completes (~10–15 min).

**Prerequisites:**
- `EXPO_TOKEN` secret configured in GitHub repo → Settings → Secrets → Actions
- EAS project linked (one-time: `eas login && eas build:configure`)

### HTTPS / Network Security

The production APK enforces HTTPS. The backend API must be served over HTTPS.

| File | Purpose |
|------|---------|
| `logbook-api.crt` | Self-signed server cert (public — no key committed) |
| `plugins/withNetworkSecurity.js` | Config plugin — injects cert trust anchor into Android build |

The plugin trusts `logbook-api.crt` for `192.168.0.166` at prebuild time. If the server IP changes, update the domain in `plugins/withNetworkSecurity.js`, regenerate the cert on the backend (`mutt-motor-tracking/backend/server.crt`), replace `logbook-api.crt`, and cut a new release.

---

## Existing Conventions

### Code Style

- TypeScript strict mode enabled
- React Native functional components with hooks
- Async/await for all async operations
- Service pattern for database operations (e.g., `VehicleService.create()`)

### Project Structure

```
mutt-logbook-mobile/
├── src/
│   ├── components/
│   │   └── common/          # Reusable UI components (Button, Card, Input, etc.)
│   ├── context/             # React Context providers (VehicleContext)
│   ├── navigation/          # React Navigation configuration
│   ├── screens/             # Screen components (Dashboard, Maintenance, etc.)
│   ├── services/            # Business logic (database, api, sync, config)
│   └── types/               # TypeScript type definitions
├── assets/                  # App icons, splash screen images
├── backups/logs/            # Local backup storage
├── App.tsx                  # App entry point
├── app.json                 # Expo configuration
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript configuration
```

### Naming Conventions

- Files: PascalCase.tsx (components/screens), camelCase.ts (services/types)
- Functions: camelCase
- Classes/Components: PascalCase
- Constants: UPPER_SNAKE_CASE
- Services: *Service suffix (VehicleService, MaintenanceService)

### Database Patterns

- All tables have: `id`, `created_at`, `synced`, `remote_id`
- Foreign keys use `vehicle_id` for vehicle association
- Soft sync tracking via `synced` boolean and `remote_id`
- Indexes on foreign keys and date columns

---

## Non-Goals

What this project explicitly does NOT do:

- Real-time vehicle telemetry or OBD-II live data streaming
- Social features or data sharing between users
- Multi-user collaboration on same vehicle
- Cloud-native architecture (designed for self-hosted backend)

---

## Future Considerations

Nice-to-haves for later (not in current scope):

- Push notifications for maintenance reminders
- Photo capture and attachment to records
- Receipt/document upload and OCR
- Export to PDF for resale documentation
- Fuel economy analytics and charts
- Service interval predictions based on driving patterns

---

## Notes

- App uses dark theme exclusively (`userInterfaceStyle: "dark"`)
- PIN-based authentication for app access
- Home WiFi auto-sync triggered by SSID detection
- Backend API expected at configurable URL (set in SetupScreen)
- All monetary values stored as numbers (no currency formatting in DB)
- VCDS = VAG-COM Diagnostic System (Volkswagen/Audi group vehicles)
