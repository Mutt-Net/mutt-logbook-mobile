import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configService } from './config';

const HOME_WIFI_SSID_KEY = 'home_wifi_ssid';
const DEFAULT_HOME_WIFI_SSID = '';

let unsubscribeWifi: (() => void) | null = null;

export const getHomeWifiSSID = async (): Promise<string> => {
  try {
    const ssid = await configService.getHomeWifiSSID();
    return ssid || '';
  } catch {
    return '';
  }
};

export const setHomeWifiSSID = async (ssid: string): Promise<void> => {
  try {
    await configService.setHomeWifiSSID(ssid);
    await AsyncStorage.setItem(HOME_WIFI_SSID_KEY, ssid);
  } catch (error) {
    console.warn('Failed to save WiFi SSID:', error);
  }
};

export const getHomeWifiPassword = async (): Promise<string> => {
  try {
    const password = await configService.getHomeWifiPassword();
    return password || '';
  } catch {
    return '';
  }
};

export const setHomeWifiPassword = async (password: string): Promise<void> => {
  try {
    await configService.setHomeWifiPassword(password);
  } catch (error) {
    console.warn('Failed to save WiFi password:', error);
  }
};

export const isConnectedToHomeWifi = async (): Promise<boolean> => {
  const homeWifiSSID = await getHomeWifiSSID();
  if (!homeWifiSSID) {
    return false;
  }
  const netInfo = await NetInfo.fetch();
  return (
    netInfo.type === 'wifi' &&
    netInfo.details?.ssid === homeWifiSSID
  );
};

export const getNetworkType = async (): Promise<string> => {
  const netInfo = await NetInfo.fetch();
  return netInfo.type;
};

export const addWifiListener = (callback: (isHomeWifi: boolean) => void): (() => void) => {
  if (unsubscribeWifi) {
    unsubscribeWifi();
  }

  unsubscribeWifi = NetInfo.addEventListener(async (state: NetInfoState) => {
    const homeWifiSSID = await getHomeWifiSSID();
    const isHomeWifi =
      state.type === 'wifi' &&
      state.details?.ssid === homeWifiSSID;
    callback(isHomeWifi);
  });

  return unsubscribeWifi;
};

export const removeWifiListener = (): void => {
  if (unsubscribeWifi) {
    unsubscribeWifi();
    unsubscribeWifi = null;
  }
};
