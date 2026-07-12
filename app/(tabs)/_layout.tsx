import HomeIcon from "@/assets/icons/HomeIcon";
import Plus from "@/assets/icons/Plus";
import ReportIcon from "@/assets/icons/ReportIcon";
import Scan from "@/assets/icons/Scan";
import SiteIcon from "@/assets/icons/SiteIcon";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Tabs, usePathname, useRouter } from "expo-router";
import { BarChart3, Building2, Home as LucideHome, Scan as LucideScan } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";

import { TourCompleteSheet } from "@/components/tour/TourCompleteSheet";
import { TourProvider, useTour } from "@/components/tour/TourContext";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { useEffect, useRef } from "react";
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function CustomTabBar({ state, descriptors, navigation }: any) {
  const pathname = usePathname();
  const router = useRouter();
  const { registerElement } = useTour();

  const sitesRef = useRef<View>(null);
  const scannerRef = useRef<View>(null);

  useEffect(() => {
    registerElement("sites_tab", async () => {
      return new Promise((resolve) => {
        if (!sitesRef.current) return resolve(null);
        sitesRef.current.measureInWindow((x, y, w, h) => {
          resolve({ x, y, w, h });
        });
      });
    });

    registerElement("scanner_tab", async () => {
      return new Promise((resolve) => {
        if (!scannerRef.current) return resolve(null);
        scannerRef.current.measureInWindow((x, y, w, h) => {
          resolve({ x, y, w, h });
        });
      });
    });
  }, []);

  const icons: any = {
    index: HomeIcon,
    scanner: Scan,
    sites: SiteIcon,
    reports: ReportIcon,
  };

  // Define which routes to show in the left pill
  const pillRoutes = ["index", "scanner", "sites", "reports"];

  const currentRouteName = state.routes[state.index]?.name;
  const isHome = currentRouteName === "index";

  return (
    <View style={styles.tabBarWrapper}>
      {/* Left Navigation Pill */}
      <View style={styles.navPill}>
        {state.routes
          .filter((route: any) => pillRoutes.includes(route.name))
          .map((route: any) => {
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

            const IconComponent = icons[route.name];
            const color = isFocused ? "#0f172a" : "#94a3b8";

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                {...(route.name === "sites" ? { ref: sitesRef } : route.name === "scanner" ? { ref: scannerRef } : {})}
                style={[styles.tabButton, isFocused && styles.tabButtonActive]}
              >
                <View pointerEvents="none">
                  <IconComponent size={22} color={color} strokeWidth={isFocused ? 2.5 : 2} />
                </View>
              </TouchableOpacity>
            );
          })}
      </View>

      {/* Right Quick Scan Action Button */}
      <AnimatedTouchable
        style={[styles.quickScanButton, !isHome && styles.quickScanButtonCircular, { overflow: 'hidden' }]}
        onPress={() => router.push({ pathname: "/(tabs)/scanner", params: { autoStart: "true" } })}
        layout={LinearTransition.duration(300).easing(Easing.inOut(Easing.ease))}
      >
        {isHome ? (
          <Animated.Text entering={FadeIn.duration(200)} exiting={FadeOut.duration(100)} style={styles.quickScanText} numberOfLines={1}>
            Quick scan
          </Animated.Text>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(100)}>
            <Plus width={24} height={24} color="#FFFFFF" />
          </Animated.View>
        )}
      </AnimatedTouchable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 32 : 24,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navPill: {
    backgroundColor: "#F8FAFC",
    borderRadius: 36,
    // height: 64,
    // padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    // width: 48,
    // height: 48,
    padding: 18,
    borderRadius: 24,
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
    // shadowColor: "#0f172a",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.08,
    // shadowRadius: 6,
    // elevation: 2,
  },
  quickScanButton: {
    backgroundColor: "#FB5D38",
    // height: 64,
    padding: 18,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    // shadowColor: "#FF5A26",
    // shadowOffset: { width: 0, height: 8 },
    // shadowOpacity: 0.25,
    // shadowRadius: 16,
    // elevation: 8,
  },
  quickScanButtonCircular: {
    width: 60,
    height: 60,
    padding: 0,
    borderRadius: 30,
  },
  quickScanText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
const TourTabBarButton = ({ name, children, ...props }: any) => {
  const { registerElement } = useTour();
  const ref = useRef<View>(null);

  useEffect(() => {
    registerElement(name, async () => {
      return new Promise((resolve) => {
        if (!ref.current) return resolve(null);
        ref.current.measureInWindow((x, y, w, h) => {
          resolve({ x, y, w, h });
        });
      });
    });
  }, [name, registerElement]);

  return (
    <TouchableOpacity ref={ref} {...props} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
};

export default function TabLayout() {
  const completeSheetRef = useRef<any>(null);

  return (
    <TourProvider>
      <BottomSheetModalProvider>
        <Tabs
          // tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#8b5cf6',
            tabBarInactiveTintColor: '#94a3b8',
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopColor: '#f1f5f9',
              borderTopWidth: 1,
              paddingTop: 8,
              // paddingBottom: Platform.OS === 'ios' ? 24 : 12,
              // height: Platform.OS === 'ios' ? 88 : 68,
            }
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              tabBarIcon: ({ color }) => <LucideHome color={color} size={22} />
            }}
          />
          <Tabs.Screen name="portfolio" options={{ href: null }} />
          <Tabs.Screen name="settings" options={{ href: null }} />
          <Tabs.Screen
            name="scanner"
            options={{
              title: "Scan",
              tabBarIcon: ({ color }) => <LucideScan color={color} size={22} />,
              tabBarButton: (props) => <TourTabBarButton name="scanner_tab" {...props} />
            }}
          />
          <Tabs.Screen
            name="sites"
            options={{
              title: "Sites",
              tabBarIcon: ({ color }) => <Building2 color={color} size={22} />,
              tabBarButton: (props) => <TourTabBarButton name="sites_tab" {...props} />
            }}
          />
          <Tabs.Screen
            name="reports"
            options={{
              title: "Reports",
              tabBarIcon: ({ color }) => <BarChart3 color={color} size={22} />
            }}
          />
          <Tabs.Screen name="profile" options={{ title: "Profile", href: null }} />
        </Tabs>
        <TourOverlay completeSheetRef={completeSheetRef} />
        <TourCompleteSheet ref={completeSheetRef} />
      </BottomSheetModalProvider>
    </TourProvider>
  );
}
