# Test Framework Specification

## Overview

This document specifies the automated test framework for the Mutt Logbook Mobile application using **Jest** and **@testing-library/react-native**.

---

## Testing Stack

### Core Dependencies

| Package | Purpose |
|---------|---------|
| `jest` | Test runner and assertion library |
| `@testing-library/react-native` | React Native testing utilities |
| `@types/jest` | TypeScript types for Jest |
| `jest-expo` | Expo-specific Jest preset |
| `react-test-renderer` | React testing renderer |

### Installation Command

```bash
npm install --save-dev jest @testing-library/react-native @types/jest jest-expo react-test-renderer
```

---

## Configuration Files

### jest.config.js

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
};
```

### babel.config.js (Update)

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      test: {
        plugins: ['@babel/plugin-transform-runtime'],
      },
    },
  };
};
```

---

## Test Utilities

### tests/setup.ts

```typescript
import '@testing-library/react-native/extend-expect';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));
```

### tests/mocks/database.mock.ts

```typescript
import { mock } from 'jest-mock-extended';
import { SQLite } from 'expo-sqlite';

export const createMockDatabase = () => ({
  execAsync: jest.fn(),
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  closeAsync: jest.fn(),
});

export type MockDatabase = ReturnType<typeof createMockDatabase>;
```

### tests/mocks/api.mock.ts

```typescript
export const createMockApi = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
});

export type MockApi = ReturnType<typeof createMockApi>;
```

---

## Test File Structure

```
tests/
├── setup.ts                    # Global test setup
├── mocks/
│   ├── database.mock.ts        # Database mocks
│   ├── api.mock.ts             # API mocks
│   └── navigation.mock.ts      # Navigation mocks
└── __tests__/
    ├── services/
    │   ├── VehicleService.test.ts
    │   ├── MaintenanceService.test.ts
    │   ├── ModService.test.ts
    │   ├── CostService.test.ts
    │   ├── NoteService.test.ts
    │   ├── VCDSFaultService.test.ts
    │   ├── GuideService.test.ts
    │   ├── VehiclePhotoService.test.ts
    │   ├── FuelEntryService.test.ts
    │   ├── ReminderService.test.ts
    │   ├── ReceiptService.test.ts
    │   ├── DocumentService.test.ts
    │   ├── ApiService.test.ts
    │   ├── SyncService.test.ts
    │   └── ConfigService.test.ts
    ├── components/
    │   ├── Button.test.tsx
    │   ├── Card.test.tsx
    │   ├── Input.test.tsx
    │   ├── Loading.test.tsx
    │   └── EmptyState.test.tsx
    └── screens/
        ├── DashboardScreen.test.tsx
        ├── MaintenanceScreen.test.tsx
        └── ...
```

---

## Test Patterns

### Service Layer Tests

```typescript
// src/services/__tests__/VehicleService.test.ts
import { VehicleService } from '../database';
import * as SQLite from 'expo-sqlite';

jest.mock('expo-sqlite');

describe('VehicleService', () => {
  const mockDatabase = {
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDatabase);
  });

  describe('create', () => {
    it('should insert vehicle and return ID', async () => {
      const vehicle = {
        name: 'Test Vehicle',
        make: 'VW',
        model: 'Golf',
        reg: 'ABC123',
        vin: 'WVWZZZ1KZAW123456',
        year: 2010,
        engine: '2.0 TDI',
        transmission: 'Manual',
        mileage: 100000,
      };

      mockDatabase.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

      const id = await VehicleService.create(vehicle);

      expect(id).toBe(1);
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vehicles'),
        expect.any(Array)
      );
    });
  });

  describe('getAll', () => {
    it('should return all vehicles', async () => {
      const mockVehicles = [
        { id: 1, name: 'Vehicle 1', synced: 0 },
        { id: 2, name: 'Vehicle 2', synced: 1 },
      ];

      mockDatabase.getAllAsync.mockResolvedValue(mockVehicles);

      const vehicles = await VehicleService.getAll();

      expect(vehicles).toHaveLength(2);
      expect(vehicles[0].synced).toBe(false);
      expect(vehicles[1].synced).toBe(true);
    });
  });

  describe('update', () => {
    it('should update vehicle and mark as unsynced', async () => {
      mockDatabase.runAsync.mockResolvedValue({});

      await VehicleService.update(1, { name: 'Updated Name' });

      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE vehicles'),
        expect.arrayContaining([1])
      );
    });
  });

  describe('delete', () => {
    it('should delete vehicle by ID', async () => {
      mockDatabase.runAsync.mockResolvedValue({});

      await VehicleService.delete(1);

      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'DELETE FROM vehicles WHERE id = ?',
        [1]
      );
    });
  });
});
```

### Component Tests

```typescript
// src/components/common/__tests__/Button.test.tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with title', () => {
    render(<Button title="Click Me" onPress={() => {}} />);
    expect(screen.getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button title="Click Me" onPress={onPress} />);

    fireEvent.press(screen.getByText('Click Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies disabled style when disabled', () => {
    const { getByTestId } = render(
      <Button title="Click Me" onPress={() => {}} disabled testID="button" />
    );

    expect(getByTestId('button')).toHaveProp('disabled', true);
  });
});
```

### Screen Tests

```typescript
// src/screens/__tests__/DashboardScreen.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { DashboardScreen } from '../DashboardScreen';
import { VehicleService } from '../../services/database';

jest.mock('../../services/database');

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('loading')).toBeTruthy();
  });

  it('displays vehicles when loaded', async () => {
    (VehicleService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Vehicle 1', make: 'VW', model: 'Golf' },
    ]);

    render(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByText('Vehicle 1')).toBeTruthy();
    });
  });

  it('shows empty state when no vehicles', async () => {
    (VehicleService.getAll as jest.Mock).mockResolvedValue([]);

    render(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByText(/no vehicles/i)).toBeTruthy();
    });
  });
});
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

---

## Running Tests

### Run All Tests

```bash
npm test
```

### Run in Watch Mode

```bash
npm run test:watch
```

### Run with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test -- VehicleService.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- -t "VehicleService"
```

---

## Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Services | 90% |
| Components | 80% |
| Screens | 70% |
| Overall | 80% |

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:ci
```

---

## Implementation Checklist

- [ ] Install dependencies
- [ ] Create jest.config.js
- [ ] Update babel.config.js
- [ ] Create tests/setup.ts
- [ ] Create test mocks
- [ ] Write service tests (all 12 services)
- [ ] Write component tests (all common components)
- [ ] Write screen tests (critical screens)
- [ ] Add package.json scripts
- [ ] Verify tests pass
- [ ] Add coverage reporting

---

## Notes

- Tests should be **isolated** - no shared state between tests
- Use **mocks** for external dependencies (database, API, SecureStore)
- Follow **AAA pattern**: Arrange, Act, Assert
- Test **behavior**, not implementation
- Use **descriptive test names**: "should do X when Y"
- Keep tests **fast** - avoid real I/O where possible
