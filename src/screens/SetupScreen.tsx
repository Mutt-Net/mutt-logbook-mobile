import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Input } from '../components/common';
import { Button } from '../components/common';

const API_URL_KEY = 'mutt_api_url';
const PIN_KEY = 'mutt_pin';
const SETUP_COMPLETE_KEY = 'mutt_setup_complete';

interface SetupScreenProps {
  onSetupComplete: () => void;
}

export default function SetupScreen({ onSetupComplete }: SetupScreenProps) {
  const [apiUrl, setApiUrl] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ apiUrl?: string; pin?: string; confirmPin?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { apiUrl?: string; pin?: string; confirmPin?: string } = {};

    if (!apiUrl.trim()) {
      newErrors.apiUrl = 'API URL is required';
    } else if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      newErrors.apiUrl = 'URL must start with http:// or https://';
    }

    if (!pin.trim()) {
      newErrors.pin = 'PIN is required';
    } else if (pin.length !== 4) {
      newErrors.pin = 'PIN must be exactly 4 digits';
    } else if (!/^\d{4}$/.test(pin)) {
      newErrors.pin = 'PIN must contain only numbers';
    }

    if (pin !== confirmPin) {
      newErrors.confirmPin = 'PINs do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSetup = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await SecureStore.setItemAsync(API_URL_KEY, apiUrl.trim());
      await SecureStore.setItemAsync(PIN_KEY, pin);
      await SecureStore.setItemAsync(SETUP_COMPLETE_KEY, 'true');
      onSetupComplete();
    } catch (error) {
      Alert.alert('Setup Failed', 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>M</Text>
          <Text style={styles.title}>Mutt Logbook</Text>
          <Text style={styles.subtitle}>Setup Required</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>SERVER CONNECTION</Text>
          
          <Input
            label="API Server URL"
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://192.168.1.100:5000"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.apiUrl}
          />
          <Text style={styles.hint}>
            Enter the IP address or hostname of your Mutt Logbook server
          </Text>

          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>SECURITY</Text>

          <Input
            label="4-Digit PIN"
            value={pin}
            onChangeText={setPin}
            placeholder="Enter 4 digits"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            error={errors.pin}
          />

          <Input
            label="Confirm PIN"
            value={confirmPin}
            onChangeText={setConfirmPin}
            placeholder="Re-enter 4 digits"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            error={errors.confirmPin}
          />
          <Text style={styles.hint}>
            This PIN protects access to your settings
          </Text>

          <Button
            title={loading ? 'Setting up...' : 'Complete Setup'}
            onPress={handleSetup}
            disabled={loading}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  form: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  hint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: -8,
    marginBottom: 16,
  },
  button: {
    marginTop: 32,
  },
});

export { API_URL_KEY, PIN_KEY, SETUP_COMPLETE_KEY };
