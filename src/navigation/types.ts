import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type DashboardStackParamList = {
  DashboardHome: undefined;
  Maintenance: { vehicleId?: number };
  Mods: { vehicleId?: number };
  Costs: { vehicleId?: number };
  Fuel: { vehicleId?: number };
  Notes: { vehicleId?: number };
  VCDS: { vehicleId?: number };
  Guides: { vehicleId?: number };
  Reminders: { vehicleId?: number };
  Vehicle: { vehicleId?: number };
  Analytics: { vehicleId: number };
  Receipts: { vehicleId?: number };
  Documents: { vehicleId?: number };
};

export type OverviewStackParamList = {
  OverviewHome: undefined;
  Maintenance: { vehicleId?: number };
  Mods: { vehicleId?: number };
  Costs: { vehicleId?: number };
  Fuel: { vehicleId?: number };
  Notes: { vehicleId?: number };
  VCDS: { vehicleId?: number };
  Guides: { vehicleId?: number };
  Reminders: { vehicleId?: number };
  Vehicle: { vehicleId?: number };
  Receipts: { vehicleId?: number };
  Documents: { vehicleId?: number };
};

export type AddStackParamList = {
  AddHome: undefined;
  Maintenance: { vehicleId?: number };
  Mods: { vehicleId?: number };
  Costs: { vehicleId?: number };
  Fuel: { vehicleId?: number };
  Notes: { vehicleId?: number };
  VCDS: { vehicleId?: number };
  Guides: { vehicleId?: number };
  Reminders: { vehicleId?: number };
  Vehicle: { vehicleId?: number };
  Receipts: { vehicleId?: number };
  Documents: { vehicleId?: number };
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
};

export type RootTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  OverviewTab: NavigatorScreenParams<OverviewStackParamList>;
  AddTab: NavigatorScreenParams<AddStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

export type DashboardStackScreenProps<T extends keyof DashboardStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<DashboardStackParamList, T>,
    BottomTabScreenProps<RootTabParamList>
  >;

export type OverviewStackScreenProps<T extends keyof OverviewStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<OverviewStackParamList, T>,
    BottomTabScreenProps<RootTabParamList>
  >;

export type AddStackScreenProps<T extends keyof AddStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<AddStackParamList, T>,
    BottomTabScreenProps<RootTabParamList>
  >;

export type SettingsStackScreenProps<T extends keyof SettingsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<SettingsStackParamList, T>,
    BottomTabScreenProps<RootTabParamList>
  >;
