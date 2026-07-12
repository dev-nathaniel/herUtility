import MeterIcon from "@/assets/icons/MeterIcon";
import QuoteIcon from "@/assets/icons/QuoteIcon";
import SeeAll from "@/assets/icons/SeeAll";
import Electricity from "@/assets/icons/Electricity";
import Fire from "@/assets/icons/Fire";
import LiquidDrop from "@/assets/icons/LiquidDrop";
import type { Business as ApiBusiness, Utility as ApiUtility } from "@/hooks/api/use-business";
import { useBusinesses, useSites, useUtilities } from "@/hooks/api/use-business";
import { useAuth } from "@/lib/auth/auth-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useEffect } from "react";
import { useTour } from "@/components/tour/TourContext";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

// --- Color palette for business cards ---
const businessColors = [
  "#8b5cf6", "#ec4899", "#f97316", "#6366f1", "#14b8a6",
  "#f43f5e", "#0ea5e9", "#84cc16", "#a855f7", "#eab308",
];

/** Map a server utility type to the UI fuel label */
const fuelTypeMap: Record<string, string> = {
  electricity: "Electricity",
  gas: "Gas",
  water: "Water",
  broadband: "Broadband",
};

/** Determine if a contract is expiring (ends within 6 months) or expired */
function getContractStatus(contractEnd?: string): "Expiring" | "Active" | "Expired" {
  if (!contractEnd) return "Active";
  const end = new Date(contractEnd);
  const now = new Date();

  if (end < now) return "Expired";

  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  return end <= sixMonths ? "Expiring" : "Active";
}

/** Map server Business to the shape UI components expect */
function mapBusiness(apiBiz: ApiBusiness, index: number) {
  return {
    id: apiBiz._id,
    name: apiBiz.name,
    address: apiBiz.address,
    postcode: apiBiz.postcode,
    logo: apiBiz.name.slice(0, 2).toUpperCase(),
    color: businessColors[index % businessColors.length],
  };
}

/** Map server Utility (inside a site) to the flat contract shape the UI expects */
function mapUtility(util: ApiUtility, businessId: string, businessName: string = "Herutility Office") {
  const endDate = util.contractEnd || util.previousContractExpiry || "";

  let status = "Active";
  if (util.status === "pending") {
    status = "Pending";
  } else if (util.status === "expired") {
    status = "Expired";
  } else {
    status = getContractStatus(endDate);
  }

  return {
    id: util._id,
    meterId: util.identifier || util.previousMeterId || "Pending",
    businessId,
    businessName,
    fuel: fuelTypeMap[util.type] || util.type,
    end: endDate,
    status,
    rate: "—",
    usage: "—",
    supplier: util.supplier || util.previousSupplier || "Opus Energy",
  };
}

// --- Main App ---
export default function TabOneScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const { 
    registerElement, 
    scrollToQuoteRequested, 
    clearScrollToQuoteRequest,
    scrollToTopRequested,
    clearScrollToTopRequest
  } = useTour();
  const scrollViewRef = useRef<ScrollView>(null);
  const quoteCardRef = useRef<any>(null);
  const profileAvatarRef = useRef<any>(null);

  useEffect(() => {
    registerElement("quote_card", async () => {
      return new Promise((resolve) => {
        if (!quoteCardRef.current) return resolve(null);
        quoteCardRef.current.measureInWindow((x: number, y: number, w: number, h: number) => {
          resolve({ x, y, w, h });
        });
      });
    });

    registerElement("profile_avatar", async () => {
      return new Promise((resolve) => {
        if (!profileAvatarRef.current) return resolve(null);
        profileAvatarRef.current.measureInWindow((x: number, y: number, w: number, h: number) => {
          resolve({ x, y, w, h });
        });
      });
    });
  }, []);

  useEffect(() => {
    if (scrollToQuoteRequested) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
      clearScrollToQuoteRequest();
    }
  }, [scrollToQuoteRequested]);

  useEffect(() => {
    if (scrollToTopRequested) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      clearScrollToTopRequest();
    }
  }, [scrollToTopRequested]);

  // Fetch real data from API
  const businessesQuery = useBusinesses();
  const sitesQuery = useSites();

  const expiringSheetRef = useRef<BottomSheetModal>(null);

  // Map API businesses to UI shape
  const businesses = useMemo(() => {
    const apiBusinesses = businessesQuery.data?.data?.businesses ?? [];
    return apiBusinesses.map((b, i) => mapBusiness(b, i));
  }, [businessesQuery.data]);

  // Flatten sites → utilities AND business-level utilities into flat contracts array the UI expects
  const contracts = useMemo(() => {
    const result: ReturnType<typeof mapUtility>[] = [];
    const seenIds = new Set<string>();

    const bizMap: Record<string, string> = {};
    const apiBusinesses = businessesQuery.data?.data?.businesses ?? [];
    for (const biz of apiBusinesses) {
      bizMap[biz._id] = biz.name;
    }

    // 1. Utilities from sites
    const apiSites = sitesQuery.data?.data?.sites ?? [];
    for (const site of apiSites) {
      const businessId = typeof site.business === "string" ? site.business : (site.business as any)?._id;
      const bizName = bizMap[businessId] || site.name || "Herutility Office";
      if (!site.utilities) continue;
      for (const util of site.utilities) {
        if (typeof util === "string") continue; // un-populated ref
        const u = util as ApiUtility;
        if (!seenIds.has(u._id)) {
          seenIds.add(u._id);
          result.push(mapUtility(u, businessId, bizName));
        }
      }
    }

    // 2. Utilities directly on businesses (no site)
    for (const biz of apiBusinesses) {
      if (!biz.utilities) continue;
      for (const util of biz.utilities) {
        if (typeof util === "string") continue;
        const u = util as unknown as ApiUtility;
        if (u._id && !seenIds.has(u._id)) {
          seenIds.add(u._id);
          result.push(mapUtility(u, biz._id, biz.name));
        }
      }
    }

    return result;
  }, [sitesQuery.data, businessesQuery.data]);

  const sortedUtilitiesQuery = useUtilities({ sortBy: 'expiry' });

  const sortedUtilities = useMemo(() => {
    const utils = sortedUtilitiesQuery.data?.data?.utilities ?? [];
    return utils.map((util) => {
      let computedStatus = "Active";
      if (util.contractEnd) {
        const end = new Date(util.contractEnd);
        const now = new Date();
        const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          computedStatus = "Expired";
        } else if (diffDays <= 30) {
          computedStatus = "Expiring";
        }
      }
      return {
        id: util._id,
        supplier: util.supplier,
        fuel: fuelTypeMap[util.type] || util.type,
        end: util.contractEnd || "",
        status: computedStatus,
        businessId: typeof util.business === "string" ? util.business : (util.business as any)?._id,
        businessName: (util.business as any)?.name || "Unknown Business"
      };
    });
  }, [sortedUtilitiesQuery.data]);

  const expiringCount = sortedUtilities.filter(c => c.status === 'Expired' || c.status === 'Expiring').length;

  const hasExpiring = expiringCount > 0;
  const apiBusinesses = businessesQuery.data?.data?.businesses ?? [];
  const hasNoData = apiBusinesses.length === 0;

  // Calculate days remaining or format date nicely
  const getDaysRemainingText = (endDateStr: string) => {
    if (!endDateStr) return "No expiry date";
    const end = new Date(endDateStr);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    return `${diffDays} days remaining`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    const day = d.getDate();
    const month = d.toLocaleString('en-GB', { month: 'short' });
    const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    return `${day}${suffix} ${month}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity
            ref={profileAvatarRef}
            style={styles.profileImageContainer}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.8}
          >
            <ExpoImage
              source={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.fullname ?? 'User'}`}
              style={styles.profileImage}
              contentFit="cover"
            />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Hi, {user?.firstName ?? 'Adebayo'}</Text>
            <Text style={styles.headerSubtitle}>Welcome back</Text>
          </View>
        </View>

        {/* Hero Expiring Card */}
        <View style={styles.heroCardContainer}>
          <LinearGradient
            colors={hasNoData ? ["#F8FAFC", "#F1F5F9"] : hasExpiring ? ["#FFF5F5", "#FFF1F2"] : ["#F0FDF4", "#DCFCE7"]}
            style={styles.heroCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroHeader}>
              <View style={[styles.circleBadge, hasNoData ? { borderColor: "#94A3B8" } : !hasExpiring && { borderColor: "#10B981" }]}>
                {hasNoData ? (
                  <Ionicons name="business" size={24} color="#64748B" />
                ) : hasExpiring ? (
                  <Text style={styles.circleBadgeText}>{expiringCount}</Text>
                ) : (
                  <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                )}
              </View>
              <View style={styles.heroSubTextContainer}>
                <Text style={[styles.heroDaysRemaining, hasNoData ? { color: "#64748B" } : !hasExpiring && { color: "#059669" }]}>
                  {hasNoData ? "Welcome" : hasExpiring ? "~15 days remaining" : "Fully secured"}
                </Text>
                <Text style={styles.heroOfficeName}>
                  {hasNoData ? "Setup your workspace" : hasExpiring ? "Herutility Office" : "All sites up to date"}
                </Text>
              </View>
            </View>

            <Text style={styles.heroMainTitle}>
              {hasNoData ? "Let's get you started" : hasExpiring ? "Contracts are expiring soon" : "You're completely covered"}
            </Text>

            {hasNoData ? (
              <Text style={{ fontSize: 15, color: "#475569", marginBottom: 24, fontWeight: "500", lineHeight: 22 }}>
                You haven't added any businesses or utilities yet. Tap below to get started and set up your portfolio.
              </Text>
            ) : hasExpiring ? (
              <View style={styles.pillsContainer}>
                <View style={styles.fuelPill}>
                  <Text style={styles.fuelPillText}>Electricity</Text>
                </View>
                <View style={styles.fuelPill}>
                  <Text style={styles.fuelPillText}>Gas</Text>
                </View>
                <View style={styles.fuelPill}>
                  <Text style={styles.fuelPillText}>Broadband</Text>
                </View>
              </View>
            ) : (
              <Text style={{ fontSize: 15, color: "#475569", marginBottom: 24, fontWeight: "500", lineHeight: 22 }}>
                You have no utility contracts expiring anytime soon. Everything is running smoothly!
              </Text>
            )}

            <TouchableOpacity
              style={styles.viewSitesButton}
              onPress={() => router.push("/(tabs)/sites")}
            >
              <Text style={styles.viewSitesText}>{hasNoData ? "Get a Quote" : "View Sites"}</Text>
              <Ionicons name="chevron-forward" size={16} color="#000" />
            </TouchableOpacity>
          </LinearGradient>
          {/* Decorative shadow layers under card */}
          <View style={styles.cardShadowLayer1} />
          <View style={styles.cardShadowLayer2} />
        </View>

        {/* Action Cards Row */}
        <View style={styles.actionCardsRow}>
          {/* Get a Quote Card */}
          <TouchableOpacity
            ref={quoteCardRef}
            style={styles.actionCard}
            activeOpacity={0.9}
            onPress={() => router.push("/(tabs)/sites")}
          >
            <View style={styles.actionCardTop}>
              <View style={styles.actionIconWrapper}>
                <QuoteIcon width={32} height={32} color="#181818" />
              </View>

            </View>
            <Text style={styles.actionCardTitle}>Get a Quote</Text>
            <Image
              source={require("@/assets/images/quote_illustration.png")}
              style={styles.actionIllustrationQuote}
              // resizeMode="contain"
              width={240}
              height={240}
            />
          </TouchableOpacity>

          {/* Meter Installation Card */}
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.9}
          // Navigate or handle meter installation
          >
            <View style={styles.actionCardTop}>
              <View style={styles.actionIconWrapper}>
                <MeterIcon width={32} height={32} color="#181818" />
              </View>
              <Image
                source={require("@/assets/images/building_illustration.png")}
                style={styles.actionIllustrationBuilding}
                // resizeMode="contain"
                width={150}
                height={150}
              />
            </View>
            <Text style={styles.actionCardTitle}>Meter installation</Text>
          </TouchableOpacity>
        </View>

        {/* Need Help Banner */}
        <TouchableOpacity
          style={styles.helpBannerContainer}
          activeOpacity={0.9}
        >
          <View style={styles.helpBanner}>
            <View style={styles.helpTextContent}>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpSubtitle}>Our team is here to help you clear it up</Text>
            </View>
            <Image
              source={require("@/assets/images/phone_illustration.png")}
              style={styles.helpIllustration}
              // resizeMode="contain"
              width={170}
              height={170}
            />
          </View>
        </TouchableOpacity>

        {/* Your Utilities Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your utilities</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/sites")} style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.seeAllText}>See all </Text>
            <SeeAll />
          </TouchableOpacity>
        </View>

        {/* Utilities List */}
        <View style={styles.utilitiesList}>
          {sortedUtilities.length === 0 && (
             <Text style={{ textAlign: "center", color: "#64748b", marginTop: 24, marginBottom: 24 }}>No utilities found.</Text>
          )}

          {sortedUtilities.slice(0, 5).map((item, index) => {
            let iconBg = "#E0E7FF"; // default telecoms/other
            let icon = <Ionicons name="call" size={20} color="#9333EA" />;
            
            if (item.fuel === "Electricity") {
              iconBg = "#FEF3C7";
              icon = <Electricity width={20} height={20} />;
            } else if (item.fuel === "Gas") {
              iconBg = "#FFEDD5";
              icon = <Fire width={20} height={20} />;
            } else if (item.fuel === "Water") {
              iconBg = "#DBEAFE";
              icon = <LiquidDrop width={20} height={20} />;
            }

            return (
              <View key={item.id || index} style={styles.utilityItem}>
                <View style={styles.utilityItemLeft}>
                  <View style={[styles.utilityItemIcon, { backgroundColor: iconBg }]}>
                    {icon}
                  </View>
                  <View style={styles.utilityItemInfo}>
                    <Text style={styles.utilityItemName}>{item.businessName || "Unknown Business"}</Text>
                    <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 2, fontWeight: '500' }}>{item.fuel}</Text>
                    <Text style={item.status === 'Expiring' || item.status === 'Expired' ? styles.utilityDaysRed : styles.utilityDaysGreen}>
                      {getDaysRemainingText(item.end)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.utilityItemDate}>{formatDate(item.end)}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 140,
    paddingTop: 16,
  },
  /* Header Styles */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  profileImageContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#f1f5f9",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    marginRight: 16,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  headerTextContainer: {
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#18181880",
    marginTop: 2,
    fontWeight: "500",
  },
  /* Hero Card Styles */
  heroCardContainer: {
    marginHorizontal: 16,
    marginBottom: 40,
    alignItems: "center",
  },
  heroCard: {
    width: "100%",
    borderRadius: 32,
    padding: 28,
    zIndex: 3,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  circleBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginRight: 16,
  },
  circleBadgeText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  heroSubTextContainer: {
    justifyContent: "center",
  },
  heroDaysRemaining: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  heroOfficeName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 2,
  },
  heroMainTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  fuelPill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fuelPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  viewSitesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  viewSitesText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginRight: 4,
  },
  cardShadowLayer1: {
    position: "absolute",
    bottom: -8,
    width: "90%",
    height: 30,
    backgroundColor: "#FFF1F2",
    borderRadius: 24,
    zIndex: 2,
    opacity: 0.8,
  },
  cardShadowLayer2: {
    position: "absolute",
    bottom: -16,
    width: "80%",
    height: 30,
    backgroundColor: "#FFF5F5",
    borderRadius: 24,
    zIndex: 1,
    opacity: 0.5,
  },
  /* Action Cards Row */
  actionCardsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 32,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    overflow: "hidden",
    // minHeight: 160,
    // justifyContent: "space-between",
  },
  actionCardTop: {
    // flexDirection: "row",
    // justifyContent: "space-between",
    // alignItems: "flex-start",
  },
  actionIconWrapper: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  actionIllustrationQuote: {
    // width: 240,
    // height: 240,
    // backgroundColor: 'red',
    position: "absolute",
    // right: -10,
    top: -150,
    right: -40
  },
  actionIllustrationBuilding: {
    // width: 85,
    // height: 85,
    position: "absolute",
    right: -40,
    top: -130,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginTop: 6,
  },
  /* Need Help Banner */
  helpBannerContainer: {
    marginHorizontal: 16,
    marginBottom: 36,
    borderRadius: 24,
    overflow: "hidden",
  },
  helpBanner: {
    backgroundColor: "#E4DDFB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 16,
  },
  helpTextContent: {
    flex: 1,
    paddingRight: 16,
    zIndex: 2,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#373046",
    marginBottom: 4,
  },
  helpSubtitle: {
    fontSize: 14,
    color: "#4A425A",
    fontWeight: "500",
    lineHeight: 18,
  },
  helpIllustration: {
    // width: 140,
    // height: 140,
    position: "absolute",
    right: -50,
    top: -20,
    zIndex: 1,
  },
  /* Your Utilities Section */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  utilitiesList: {
    paddingHorizontal: 16,
    gap: 20,
  },
  utilityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  utilityItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  utilityItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  utilityItemInfo: {
    justifyContent: "center",
  },
  utilityItemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  utilityDaysRed: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },
  utilityDaysGreen: {
    fontSize: 13,
    fontWeight: "600",
    color: "#10B981",
  },
  utilityItemDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
});
