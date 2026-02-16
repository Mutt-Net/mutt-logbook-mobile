import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation';
import { initDatabase } from './src/services/database';
import syncManager from './src/services/sync';
import { VehicleProvider } from './src/context/VehicleContext';
import { configService } from './src/services/config';
import SetupScreen from './src/screens/SetupScreen';

const Loading = () => (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

const ErrorView = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>Failed to initialize app</Text>
    <Text style={styles.errorMessage}>{message}</Text>
    <Text style={styles.retryButton} onPress={onRetry}>Tap to retry</Text>
  </View>
);

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkSetup = async () => {
    try {
      const setup = await configService.isSetupComplete();
      setIsSetup(setup);
    } catch (err) {
      setError('Failed to load configuration');
    }
  };

  const initialize = async () => {
    try {
      setError(null);
      await initDatabase();
      syncManager.startAutoSync();
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  useEffect(() => {
    checkSetup();
  }, []);

  useEffect(() => {
    if (isSetup === true) {
      initialize();
    }
  }, [isSetup]);

  const handleSetupComplete = async () => {
    setIsSetup(true);
    await initialize();
  };

  if (isSetup === null) {
    return <Loading />;
  }

  if (!isSetup) {
    return <SetupScreen onSetupComplete={handleSetupComplete} />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={initialize} />;
  }

  if (!isReady) {
    return <Loading />;
  }

  return (
    <VehicleProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </VehicleProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    color: '#007AFF',
    fontSize: 16,
  },
});
