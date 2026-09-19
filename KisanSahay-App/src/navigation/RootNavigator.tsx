import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { SchemeDetailScreen } from '../screens/SchemeDetailScreen';
import { AddLoanScreen } from '../screens/AddLoanScreen';
import { VaultScreen } from '../screens/VaultScreen';
import { AIChatScreen } from '../screens/AIChatScreen';
import { SoilScreen } from '../screens/SoilScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LanguageScreen } from '../screens/LanguageScreen';
import { SwitchProfileScreen } from '../screens/SwitchProfileScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#0a0f1a' },
      }}
      initialRouteName="MainTabs"
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="SchemeDetail" component={SchemeDetailScreen} />
      <Stack.Screen name="AddLoan" component={AddLoanScreen} />
      <Stack.Screen name="Vault" component={VaultScreen} />
      <Stack.Screen name="AIChat" component={AIChatScreen} />
      <Stack.Screen name="SoilAnalysis" component={SoilScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="LanguageSelect" component={LanguageScreen} />
      <Stack.Screen name="SwitchProfile" component={SwitchProfileScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
};
