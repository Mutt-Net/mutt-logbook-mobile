import * as SecureStore from 'expo-secure-store';

const API_URL_KEY = 'mutt_api_url';
const PIN_KEY = 'mutt_pin';
const SETUP_COMPLETE_KEY = 'mutt_setup_complete';

export const configService = {
  isSetupComplete: async (): Promise<boolean> => {
    const value = await SecureStore.getItemAsync(SETUP_COMPLETE_KEY);
    return value === 'true';
  },

  getApiUrl: async (): Promise<string | null> => {
    return SecureStore.getItemAsync(API_URL_KEY);
  },

  setApiUrl: async (url: string): Promise<void> => {
    await SecureStore.setItemAsync(API_URL_KEY, url);
  },

  getPin: async (): Promise<string | null> => {
    return SecureStore.getItemAsync(PIN_KEY);
  },

  verifyPin: async (inputPin: string): Promise<boolean> => {
    const storedPin = await SecureStore.getItemAsync(PIN_KEY);
    return storedPin === inputPin;
  },

  clearAll: async (): Promise<void> => {
    await SecureStore.deleteItemAsync(API_URL_KEY);
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(SETUP_COMPLETE_KEY);
  },
};

export { API_URL_KEY, PIN_KEY, SETUP_COMPLETE_KEY };
