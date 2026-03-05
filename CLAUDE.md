# Mutt Logbook Mobile

Expo + React Native mobile app. Offline-first with local SQLite storage, syncs to the Mutt Motor Tracking backend (port 5000).

## Commands

```bash
npm start              # Start Expo CLI
npm run android        # Build for Android
npm run ios            # Build for iOS
npm run web            # Build for web
npm run prebuild       # Generate native project files
npm run build:android  # EAS build for Android
npm test               # Run Jest tests
npm run test:watch     # Watch mode
```

## Architecture

```
src/
├── screens/       # 17 screens (Dashboard, Maintenance, Costs, Fuel, Mods, Notes,
│                  #   Reminders, Analytics, Guides, VCDS, Documents, Receipts,
│                  #   Settings, Setup, Vehicle, Overview, Add)
├── components/
│   ├── common/    # Shared UI components
│   └── overview/  # Overview-specific components
├── services/
│   ├── database.ts       # SQLite local storage (expo-sqlite)
│   ├── sync.ts           # Sync logic to/from motor tracking backend
│   ├── api.ts            # HTTP client (axios)
│   ├── analyticsService.ts
│   ├── notifications.ts  # expo-notifications
│   ├── wifi.ts           # Network-aware sync (@react-native-community/netinfo)
│   └── config.ts         # App config (backend URL, etc.)
├── context/
│   └── VehicleContext.tsx # Global vehicle state (React Context)
├── navigation/
│   ├── AppNavigator.tsx  # Bottom tab navigator
│   ├── index.ts
│   └── types.ts          # Navigation type definitions
├── lib/           # Utilities
└── types/         # Shared TypeScript types
```

## Conventions

- TypeScript throughout; strict mode
- Navigation uses `@react-navigation/native-stack` + `@react-navigation/bottom-tabs`
- All local data goes through `services/database.ts` (never query SQLite directly in screens)
- Sync is triggered via `services/sync.ts`; check network via `services/wifi.ts` before syncing
- Sensitive data (auth tokens) stored in `expo-secure-store`
- Screen naming: `<Feature>Screen.tsx` (e.g., `MaintenanceScreen.tsx`)
