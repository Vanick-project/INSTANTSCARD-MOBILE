// app/app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes, FontWeights } from '../../../src/utils/tokens';

function tabIconColor(active: boolean) {
  return active ? Colors.brand : Colors.text2;
}

// ── Icon components (SVG-free, pure View) ─────────────────────────────────────
const HomeIcon  = ({ active }: { active: boolean }) => (
  <View style={[ico.base, active && ico.active]}>
    <Text style={[ico.glyph, { fontSize: 20, color: tabIconColor(active) }]}>⌂</Text>
  </View>
);
const CardIcon  = ({ active }: { active: boolean }) => (
  <View style={[ico.base, active && ico.active]}>
    <Text style={[ico.glyph, { fontSize: 18, color: tabIconColor(active) }]}>▭</Text>
  </View>
);
const HistoryIcon = ({ active }: { active: boolean }) => (
  <View style={[ico.base, active && ico.active]}>
    <Text style={[ico.glyph, { fontSize: 18, color: tabIconColor(active) }]}>≡</Text>
  </View>
);
const ProfileIcon = ({ active }: { active: boolean }) => (
  <View style={[ico.base, active && ico.active]}>
    <Text style={[ico.glyph, { fontSize: 18, color: tabIconColor(active) }]}>◯</Text>
  </View>
);

const ico = StyleSheet.create({
  base:   { alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10 },
  active: { backgroundColor: `${Colors.brand}28` },
  glyph:  { fontWeight: FontWeights.semibold, includeFontPadding: false },
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
        tabBarInactiveTintColor: Colors.text2,
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
