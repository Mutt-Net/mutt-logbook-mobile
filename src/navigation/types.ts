import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type DashboardStackParamList = {
  DashboardHome: undefined;
  DashboardDetail: undefined;
};

export type OverviewStackParamList = {
  OverviewHome: undefined;
  OverviewDetail: undefined;
};

export type AddStackParamList = {
  AddHome: undefined;
  AddForm: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  SettingsDetail: undefined;
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
