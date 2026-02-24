import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Platform, PermissionsAndroid } from 'react-native';
import { configService } from './config';
import { logger } from '../lib/logger';

const HOME_WIFI_SSID_KEY = 'home_wifi_ssid';
const DEFAULT_HOME_WIFI_SSID = '';

let unsubscribeWifi: (() => void) | null = null;

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Mutt Logbook needs location access to detect home WiFi for auto-sync.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      logger.warn('Location permission error', { error: err });
      return false;
    }
  } else {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }
};

export const ensureLocationPermission = async (): Promise<boolean> => {
  const hasPermission = await requestLocationPermission();
  return hasPermission;
};

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
    logger.warn('Failed to save WiFi SSID', { error });
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
    logger.warn('Failed to save WiFi password', { error });
  }
};

export const isApiReachable = async (): Promise<boolean> => {
  try {
    const apiUrl = await configService.getApiUrl();
    if (!apiUrl) {
      logger.info('API not reachable: No API URL configured');
      return false;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${apiUrl}/api/vehicles`, { 
      method: 'GET',
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    logger.info('API reachable', { status: response.status });
    return response.ok;
  } catch (error: any) {
    logger.info('API not reachable', { message: error?.message || error });
    return false;
  }
};

const checkWifiConnection = async (): Promise<boolean> => {
  const netInfo = await NetInfo.fetch();
  return netInfo.type === 'wifi';
};

export const isConnectedToHomeWifi = async (): Promise<boolean> => {
  const homeWifiSSID = await getHomeWifiSSID();
  if (!homeWifiSSID) {
    return false;
  }
  
  await ensureLocationPermission();
  
  const netInfo = await NetInfo.fetch();
  
  if (netInfo.type !== 'wifi') {
    return false;
  }

  const currentSSID = netInfo.details?.ssid;
  
  if (currentSSID && currentSSID === homeWifiSSID) {
    return true;
  }

  if (!currentSSID || currentSSID === null) {
    const reachable = await isApiReachable();
    if (reachable) {
      return true;
    }
  }
  
  return false;
};

export const getNetworkType = async (): Promise<string> => {
  const netInfo = await NetInfo.fetch();
  return netInfo.type;
};

export const addWifiListener = (callback: (isHomeWifi: boolean) => void): (() => void) => {
  if (unsubscribeWifi) {
    unsubscribeWifi();
  }

  ensureLocationPermission();

  unsubscribeWifi = NetInfo.addEventListener(async (state: NetInfoState) => {
    const homeWifiSSID = await getHomeWifiSSID();
    
    if (state.type !== 'wifi') {
      callback(false);
      return;
    }

    const currentSSID = state.details?.ssid;
    
    if (currentSSID && currentSSID === homeWifiSSID) {
      callback(true);
      return;
    }

    if (!currentSSID || currentSSID === null) {
      const reachable = await isApiReachable();
      callback(reachable);
      return;
    }
    
    callback(false);
  });

  return unsubscribeWifi;
};

export const removeWifiListener = (): void => {
  if (unsubscribeWifi) {
    unsubscribeWifi();
    unsubscribeWifi = null;
  }
};
