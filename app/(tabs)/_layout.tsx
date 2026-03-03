import { Colors } from "@/constants/theme"; // 2
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
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
      <Text
        style={[styles.tabLabel, focused && styles.tabLabelActive]}
      >
        {name}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView
            intensity={95}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Browse",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Browse" focused={focused} iconName={focused ? "compass" : "compass-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-events"
        options={{
          title: "My Events",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="My Events" focused={focused} iconName={focused ? "calendar" : "calendar-outline"} />
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
            <TabIcon name="Settings" focused={focused} iconName={focused ? "person" : "person-outline"} />
          ),
        }}
      />
    </Tabs>
  );
}


const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(25, 25, 43, 0.98)',
    elevation: 0,
    height: Platform.OS === 'ios' ? 88 : 72,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minWidth: 60,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
  },
  tabLabel: {
    fontFamily: "BarlowCondensed_600SemiBold",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 2,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontFamily: "BarlowCondensed_700Bold",
  },
});
