import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function TabLayout() {
  const colors = useColors();
  const { role, isReady, user } = useAuth();

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Solo redirigir con rol confirmado (evitar bucle cuando role aún es null).
  if (role === 'driver') {
    return <Redirect href="/driver" />;
  }
  if (role === 'admin') {
    return <Redirect href="/admin" />;
  }
  if (!user) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { display: 'none' },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="trips" />
      <Tabs.Screen name="book" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
