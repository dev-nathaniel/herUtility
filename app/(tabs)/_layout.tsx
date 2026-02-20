import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Home, PieChart, Settings, User } from "lucide-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

function CustomTabBar({ state, descriptors, navigation }: any) {
  const pathname = usePathname();
  const router = useRouter();

  const icons: any = {
    index: Home,
    portfolio: PieChart,
    settings: Settings,
    profile: User,
  };

  // Define which routes to hide
  const hiddenRoutes = ["portfolio", "settings"];

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {state.routes
          .filter((route: any) => !hiddenRoutes.includes(route.name))
          .map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === state.routes.indexOf(route);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const IconComponent = icons[route.name] || Home;
          const color = isFocused ? "#ffffff" : "#666666";

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tabButton, isFocused && styles.tabButtonActive]}
            >
              <View pointerEvents="none">
                <IconComponent size={24} color={color} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarContainer: {
    position: "absolute",
    bottom: 25,
    alignSelf: "center",
    // zIndex: 100,
    // elevation: 10,
  },
  tabBar: {
    backgroundColor: "#000000",
    borderRadius: 30,
    height: 60,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 30,
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});

export default function TabLayout() {
  return (
    // <GestureHandlerRootView style={styles.container}>
    <BottomSheetModalProvider>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
          }}
        />
        <Tabs.Screen
          name="portfolio"
          options={{
            title: "Portfolio",
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
          }}
        />
      </Tabs>
    </BottomSheetModalProvider>
    // </GestureHandlerRootView>
  );
}
