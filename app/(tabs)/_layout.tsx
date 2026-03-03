import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useSegments } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";

function TabIcon({
  name,
  focused,
  iconName
}: {
  name: string;
  focused: boolean;
  iconName: keyof typeof Ionicons.glyphMap
}) {
  return (
    <View style={styles.tabIconContainer}>
      <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
        <Ionicons
          name={iconName}
          size={focused ? 24 : 22}
          color={focused ? Colors.primary : Colors.textMuted}
        />
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{name}</Text>
    </View>
  );
}

export default function TabLayout() {
  const segments = useSegments();

  // Guard against rendering tabs before the navigation state is fully settled
  if (!segments) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Events",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Events" focused={focused} iconName={focused ? "calendar" : "calendar-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: "Live Track",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Live" focused={focused} iconName={focused ? "map" : "map-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Settings" focused={focused} iconName={focused ? "settings" : "settings-outline"} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 20,
    right: 20,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 8,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    paddingBottom: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: '100%',
  },
  iconWrapper: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
  },
  tabLabel: {
    fontFamily: "BarlowCondensed_600SemiBold",
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontFamily: "BarlowCondensed_700Bold",
  },
});
