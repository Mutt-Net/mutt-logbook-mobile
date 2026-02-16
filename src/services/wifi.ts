import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HOME_WIFI_SSID_KEY = 'home_wifi_ssid';
const DEFAULT_HOME_WIFI_SSID = 'Mushroom Kingdom';

let unsubscribeWifi: (() => void) | null = null;

export const getHomeWifiSSID = async (): Promise<string> => {
  try {
    const ssid = await AsyncStorage.getItem(HOME_WIFI_SSID_KEY);
    return ssid || DEFAULT_HOME_WIFI_SSID;
  } catch {
    return DEFAULT_HOME_WIFI_SSID;
  }
};

export const setHomeWifiSSID = async (ssid: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(HOME_WIFI_SSID_KEY, ssid);
  } catch (error) {
    console.warn('Failed to save WiFi SSID:', error);
  }
};

export const isConnectedToHomeWifi = async (): Promise<boolean> => {
  const homeWifiSSID = await getHomeWifiSSID();
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
