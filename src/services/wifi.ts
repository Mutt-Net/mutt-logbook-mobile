import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

const HOME_WIFI_SSID = 'Mushroom Kingdom';

let wifiListener: ((state: NetInfoState) => void) | null = null;

export const isConnectedToHomeWifi = async (): Promise<boolean> => {
  const netInfo = await NetInfo.fetch();
  return (
    netInfo.type === 'wifi' &&
    netInfo.details?.ssid === HOME_WIFI_SSID
  );
};

export const getNetworkType = async (): Promise<string> => {
  const netInfo = await NetInfo.fetch();
  return netInfo.type;
};

export const addWifiListener = (callback: (isHomeWifi: boolean) => void): void => {
  if (wifiListener) {
    NetInfo.removeEventListener(wifiListener);
  }

  wifiListener = (state: NetInfoState) => {
    const isHomeWifi =
      state.type === 'wifi' &&
      state.details?.ssid === HOME_WIFI_SSID;
    callback(isHomeWifi);
  };

  NetInfo.addEventListener(wifiListener);
};

export const removeWifiListener = (): void => {
  if (wifiListener) {
    NetInfo.removeEventListener(wifiListener);
    wifiListener = null;
  }
};
