import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import DashboardScreen from '../screens/DashboardScreen';
import OverviewScreen from '../screens/OverviewScreen';
import AddScreen from '../screens/AddScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MaintenanceScreen from '../screens/MaintenanceScreen';
import ModsScreen from '../screens/ModsScreen';
import CostsScreen from '../screens/CostsScreen';
import FuelScreen from '../screens/FuelScreen';
import NotesScreen from '../screens/NotesScreen';
import VCDSScreen from '../screens/VCDSScreen';
import GuidesScreen from '../screens/GuidesScreen';
import RemindersScreen from '../screens/RemindersScreen';
import VehicleScreen from '../screens/VehicleScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';

import type {
  RootTabParamList,
  DashboardStackParamList,
  OverviewStackParamList,
  AddStackParamList,
  SettingsStackParamList,
} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const OverviewStack = createNativeStackNavigator<OverviewStackParamList>();
const AddStack = createNativeStackNavigator<AddStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

function DashboardStackNavigator() {
  return (
    <DashboardStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1C1C1E' },
        headerTintColor: '#fff',
      }}
    >
      <DashboardStack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <DashboardStack.Screen
        name="Maintenance"
        component={MaintenanceScreen}
        options={{ title: 'Maintenance' }}
      />
      <DashboardStack.Screen
        name="Mods"
        component={ModsScreen}
        options={{ title: 'Mods' }}
      />
      <DashboardStack.Screen
        name="Costs"
        component={CostsScreen}
        options={{ title: 'Costs' }}
      />
      <DashboardStack.Screen
        name="Fuel"
        component={FuelScreen}
        options={{ title: 'Fuel' }}
      />
      <DashboardStack.Screen
        name="Notes"
        component={NotesScreen}
        options={{ title: 'Notes' }}
      />
      <DashboardStack.Screen
        name="VCDS"
        component={VCDSScreen}
        options={{ title: 'VCDS Faults' }}
      />
      <DashboardStack.Screen
        name="Guides"
        component={GuidesScreen}
        options={{ title: 'Guides' }}
      />
      <DashboardStack.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{ title: 'Reminders' }}
      />
      <DashboardStack.Screen
        name="Vehicle"
        component={VehicleScreen}
        options={{ title: 'Vehicle' }}
      />
      <DashboardStack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
    </DashboardStack.Navigator>
  );
}

function OverviewStackNavigator() {
  return (
    <OverviewStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1C1C1E' },
        headerTintColor: '#fff',
      }}
    >
      <OverviewStack.Screen
        name="OverviewHome"
        component={OverviewScreen}
        options={{ title: 'Overview' }}
      />
      <OverviewStack.Screen
        name="Maintenance"
        component={MaintenanceScreen}
        options={{ title: 'Maintenance' }}
      />
      <OverviewStack.Screen
        name="Mods"
        component={ModsScreen}
        options={{ title: 'Mods' }}
      />
      <OverviewStack.Screen
        name="Costs"
        component={CostsScreen}
        options={{ title: 'Costs' }}
      />
      <OverviewStack.Screen
        name="Fuel"
        component={FuelScreen}
        options={{ title: 'Fuel' }}
      />
      <OverviewStack.Screen
        name="Notes"
        component={NotesScreen}
        options={{ title: 'Notes' }}
      />
      <OverviewStack.Screen
        name="VCDS"
        component={VCDSScreen}
        options={{ title: 'VCDS Faults' }}
      />
      <OverviewStack.Screen
        name="Guides"
        component={GuidesScreen}
        options={{ title: 'Guides' }}
      />
      <OverviewStack.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{ title: 'Reminders' }}
      />
      <OverviewStack.Screen
        name="Vehicle"
        component={VehicleScreen}
        options={{ title: 'Vehicle' }}
      />
    </OverviewStack.Navigator>
  );
}

function AddStackNavigator() {
  return (
    <AddStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1C1C1E' },
        headerTintColor: '#fff',
      }}
    >
      <AddStack.Screen
        name="AddHome"
        component={AddScreen}
        options={{ title: 'Add Record' }}
      />
      <AddStack.Screen
        name="Maintenance"
        component={MaintenanceScreen}
        options={{ title: 'Add Maintenance' }}
      />
      <AddStack.Screen
        name="Mods"
        component={ModsScreen}
        options={{ title: 'Add Mod' }}
      />
      <AddStack.Screen
        name="Costs"
        component={CostsScreen}
        options={{ title: 'Add Cost' }}
      />
      <AddStack.Screen
        name="Fuel"
        component={FuelScreen}
        options={{ title: 'Add Fuel' }}
      />
      <AddStack.Screen
        name="Notes"
        component={NotesScreen}
        options={{ title: 'Add Note' }}
      />
      <AddStack.Screen
        name="VCDS"
        component={VCDSScreen}
        options={{ title: 'Add VCDS Fault' }}
      />
      <AddStack.Screen
        name="Guides"
        component={GuidesScreen}
        options={{ title: 'Add Guide' }}
      />
      <AddStack.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{ title: 'Add Reminder' }}
      />
      <AddStack.Screen
        name="Vehicle"
        component={VehicleScreen}
        options={{ title: 'Add Vehicle' }}
      />
    </AddStack.Navigator>
  );
}

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1C1C1E' },
        headerTintColor: '#fff',
      }}
    >
      <SettingsStack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </SettingsStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color }) => {
            let icon = '';
            if (route.name === 'DashboardTab') {
              icon = '🏠';
            } else if (route.name === 'OverviewTab') {
              icon = '📊';
            } else if (route.name === 'AddTab') {
              icon = '➕';
            } else if (route.name === 'SettingsTab') {
              icon = '⚙️';
            }
            return <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
          tabBarStyle: { backgroundColor: '#1C1C1E', borderTopColor: '#3A3A3C' },
        })}
      >
        <Tab.Screen
          name="DashboardTab"
          component={DashboardStackNavigator}
          options={{ tabBarLabel: 'Dashboard' }}
        />
        <Tab.Screen
          name="OverviewTab"
          component={OverviewStackNavigator}
          options={{ tabBarLabel: 'Overview' }}
        />
        <Tab.Screen
          name="AddTab"
          component={AddStackNavigator}
          options={{ tabBarLabel: 'Add' }}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsStackNavigator}
          options={{ tabBarLabel: 'Settings' }}
        />
    </Tab.Navigator>
  );
}
