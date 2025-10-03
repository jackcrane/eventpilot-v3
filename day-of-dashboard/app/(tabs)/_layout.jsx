import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { HapticTab } from "../../components/haptic-tab";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { useDayOfSessionContext } from "../../contexts/DayOfSessionContext";
import { DAY_OF_PERMISSION_TABS } from "../../constants/dayOfPermissions";
import { Colors, DayOfColors } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";

export default function TabLayout() {
  const { hydrated, token, permissions, requireName } =
    useDayOfSessionContext();
  const colorScheme = useColorScheme();
  const activePermissions = permissions ?? [];
  const tabs = DAY_OF_PERMISSION_TABS.map((tab) => ({
    ...tab,
    hasPermission: activePermissions.includes(tab.permission),
  }));
  const visibleTabs = tabs.filter((tab) => tab.hasPermission);
  const hiddenTabs = tabs.filter((tab) => !tab.hasPermission);

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
        </View>
      </SafeAreaView>
    );
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  if (requireName) {
    return <Redirect href="/login/name" />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ href: null }} />
        {hiddenTabs.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ href: null }} />
        ))}
        {visibleTabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarButton: HapticTab,
              tabBarIcon: ({ color }) => (
                <IconSymbol size={28} name={tab.icon} color={color} />
              ),
              tabBarAccessibilityLabel: tab.title,
            }}
          />
        ))}
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarButton: HapticTab,
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="gearshape.fill" color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DayOfColors.light.bodyBg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
