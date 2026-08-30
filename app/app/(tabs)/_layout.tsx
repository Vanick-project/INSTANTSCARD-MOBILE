// app/app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes, FontWeights } from '../../../src/utils/tokens';

// ── Icon components (SVG-free, pure View) ─────────────────────────────────────
const HomeIcon  = ({ active }: { active: boolean }) => (
  <View style={[ico.base, active && ico.active]}>
    <Text style={{ fontSize: 18 }}>⌂</Text>
  </View>
);
const CardIcon  = ({ active }: { active: boolean }) => (
  <View style={[ico.base, active && ico.active]}>
    <Text style={{ fontSize: 16 }}>▭</Text>
  </View>
);
const HistoryIcon = ({ active }: { active: boolean }) => (
  <View style={[ico.base, active && ico.active]}>
    <Text style={{ fontSize: 16 }}>≡</Text>
  </View>
);
const ProfileIcon = ({ active }: { active: boolean }) => (
  <View style={[ico.base, active && ico.active]}>
    <Text style={{ fontSize: 16 }}>◯</Text>
  </View>
);

const ico = StyleSheet.create({
  base:   { alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10 },
  active: { backgroundColor: `${Colors.brand}18` },
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bgCard,
          borderTopWidth: 0.5,
          borderTopColor: Colors.b1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor:   Colors.brand,
        tabBarInactiveTintColor: Colors.text3,
        tabBarLabelStyle: {
          fontSize: FontSizes.xs,
          fontWeight: FontWeights.medium,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused }) => <HomeIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: 'Cartes',
          tabBarIcon: ({ focused }) => <CardIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarIcon: ({ focused }) => <HistoryIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => <ProfileIcon active={focused} />,
        }}
      />
    </Tabs>
  );
}
