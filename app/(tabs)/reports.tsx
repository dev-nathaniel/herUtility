import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import React, { useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Electricity from '@/assets/icons/Electricity';
import Fire from '@/assets/icons/Fire';
import LiquidDrop from '@/assets/icons/LiquidDrop';
import { ReportsFilterSheet } from '@/components/reports/ReportsFilterSheet';
import { useBusinesses, useSites } from '@/hooks/api/use-business';

const fuelTypeMap: Record<string, string> = {
    electricity: "Electricity",
    gas: "Gas",
    water: "Water",
    telecoms: "Telecoms"
};

function getContractStatus(contractEnd?: string): "Expiring" | "Active" | "Expired" | "Pending" {
    if (!contractEnd) return "Active";
    const end = new Date(contractEnd);
    const now = new Date();

    if (end < now) return "Expired";

    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    return end <= sixMonths ? "Expiring" : "Active";
}

function getUtilityCost(util: any) {
    return util.estimatedAnnualCost || 0;
}

function mapUtility(util: any, businessId: string) {
    const endDate = util.contractEnd || util.previousContractExpiry || "";

    let status: "Active" | "Expired" | "Pending" | "Expiring" = "Active";
    if (util.status === "pending") {
        status = "Pending";
    } else if (util.status === "expired") {
        status = "Expired";
    } else {
        status = getContractStatus(endDate);
    }

    const cost = getUtilityCost(util);

    return {
        id: util._id,
        meterId: util.identifier || util.previousMeterId || "Pending",
        businessId,
        fuel: fuelTypeMap[util.type] || util.type,
        type: util.type,
        start: util.contractStart || "",
        end: endDate,
        status,
        rate: util.tariffRate !== undefined ? `${util.tariffRate}` : "—",
        usage: util.annualUsage !== undefined ? `${util.annualUsage}` : "—",
        supplier: util.supplier || util.previousSupplier || "",
        tariffRate: util.tariffRate,
        standingCharge: util.standingCharge,
        annualUsage: util.annualUsage,
        estimatedAnnualCost: cost,
        meterSerial: util.meterSerial,
        identifier: util.identifier || "",
    };
}

const UtilityIcon = ({ fuel }: { fuel: string }) => {
    switch (fuel) {
        case "Electricity":
            return <Electricity width={16} height={16} />;
        case "Gas":
            return <Fire width={16} height={16} />;
        case "Water":
            return <LiquidDrop width={16} height={16} />;
        case "Telecoms":
            return <Ionicons name="call" size={16} color="#a855f7" />;
        default:
            return <Electricity width={16} height={16} />;
    }
};

const getFuelColor = (fuel: string) => {
    const colors: Record<string, string> = {
        Electricity: "#eab308", // Yellow
        Gas: "#ea580c",         // Orange
        Water: "#3b82f6",       // Blue
        Telecoms: "#a855f7",    // Purple
    };
    return colors[fuel] || "#3b82f6";
};

export default function ReportsScreen() {
    const businessesQuery = useBusinesses();
    const sitesQuery = useSites();

    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
    const filterSheetRef = useRef<BottomSheetModal>(null);

    const isLoading = businessesQuery.isLoading || sitesQuery.isLoading;

    // Build the portfolio sites list
    const portfolioSites = useMemo(() => {
        const apiSites = sitesQuery.data?.data?.sites ?? [];
        const apiBusinesses = businessesQuery.data?.data?.businesses ?? [];

        // 1. Map real sites
        const mappedSites = apiSites.map((site) => {
            const biz = typeof site.business === "string"
                ? apiBusinesses.find(b => b._id === site.business)
                : site.business;
            const bizName = (biz as any)?.name || "Unknown Business";
            const bizId = (biz as any)?._id || (typeof site.business === "string" ? site.business : "");

            const siteUtilities = (site.utilities ?? [])
                .filter((u: any): u is any => typeof u !== "string")
                .map(u => mapUtility(u, bizId));

            return {
                id: site._id,
                name: site.name,
                address: site.address,
                businessId: bizId,
                businessName: bizName,
                isVirtual: false,
                contracts: siteUtilities,
            };
        });

        // 2. Find any business-level utilities that are NOT associated with any site
        // and create a virtual "Primary Site" for each business that has them.
        const seenUtilityIds = new Set<string>();
        mappedSites.forEach(s => s.contracts.forEach(c => seenUtilityIds.add(c.id)));

        apiBusinesses.forEach((biz) => {
            const bizUtils = (biz.utilities ?? [])
                .filter((u: any): u is any => typeof u !== "string" && !seenUtilityIds.has(u._id));

            if (bizUtils.length > 0) {
                const virtualSiteUtilities = bizUtils.map(u => mapUtility(u, biz._id));
                mappedSites.push({
                    id: `virtual-${biz._id}`,
                    name: "Primary Site",
                    address: biz.postcode || biz.address || "",
                    businessId: biz._id,
                    businessName: biz.name,
                    isVirtual: true,
                    contracts: virtualSiteUtilities,
                });
            }
        });

        return mappedSites;
    }, [sitesQuery.data, businessesQuery.data]);

    // Active selector text
    const filterLabelText = useMemo(() => {
        if (selectedSiteId === null) {
            return `All Businesses & Sites`;
        }
        const site = portfolioSites.find(s => s.id === selectedSiteId);
        return site ? `${site.name} (${site.businessName})` : "Selected Site";
    }, [selectedSiteId, portfolioSites]);

    // Filtered data for analytics
    const selectedSites = useMemo(() => {
        if (selectedSiteId === null) return portfolioSites;
        return portfolioSites.filter(s => s.id === selectedSiteId);
    }, [portfolioSites, selectedSiteId]);

    // All active contracts in the selection scope
    const allContracts = useMemo(() => {
        const list: any[] = [];
        selectedSites.forEach(site => {
            site.contracts.forEach(contract => {
                list.push({
                    ...contract,
                    siteName: site.name,
                    businessName: site.businessName,
                });
            });
        });
        return list;
    }, [selectedSites]);

    // Calculated metrics
    const totalAnnualCost = useMemo(() => {
        return allContracts.reduce((acc, curr) => acc + (curr.estimatedAnnualCost || 0), 0);
    }, [allContracts]);

    // Utility breakdown metrics
    const utilityBreakdown = useMemo(() => {
        const breakdown: Record<string, { cost: number; count: number }> = {
            Electricity: { cost: 0, count: 0 },
            Gas: { cost: 0, count: 0 },
            Water: { cost: 0, count: 0 },
            Telecoms: { cost: 0, count: 0 },
        };

        allContracts.forEach(contract => {
            if (breakdown[contract.fuel]) {
                breakdown[contract.fuel].cost += contract.estimatedAnnualCost || 0;
                breakdown[contract.fuel].count += 1;
            }
        });

        return Object.entries(breakdown)
            .map(([fuel, data]) => {
                const percentage = totalAnnualCost > 0 ? (data.cost / totalAnnualCost) * 100 : 0;
                return {
                    fuel,
                    cost: data.cost,
                    count: data.count,
                    percentage,
                };
            })
            .sort((a, b) => b.cost - a.cost);
    }, [allContracts, totalAnnualCost]);

    // Site breakdown metrics (only relevant for aggregated view)
    const siteBreakdown = useMemo(() => {
        return selectedSites.map(site => {
            const cost = site.contracts.reduce((acc, curr) => acc + (curr.estimatedAnnualCost || 0), 0);
            return {
                id: site.id,
                name: site.name,
                businessName: site.businessName,
                cost,
                utilsCount: site.contracts.length,
                fuels: Array.from(new Set(site.contracts.map(c => c.fuel))),
            };
        }).sort((a, b) => b.cost - a.cost);
    }, [selectedSites]);

    // Leaderboard sorted by cost from highest to lowest
    const sortedContractsLeaderboard = useMemo(() => {
        return [...allContracts].sort((a, b) => b.estimatedAnnualCost - a.estimatedAnnualCost);
    }, [allContracts]);

    const formatCurrency = (val: number) => {
        return `£${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safeContainer}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <Text style={styles.loadingText}>Loading reports data...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeContainer} edges={[]}>
            {/* Header selector */}
            <View style={styles.headerBar}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Analytics & Reports</Text>
                    <TouchableOpacity
                        style={styles.filterSelector}
                        onPress={() => filterSheetRef.current?.present()}
                    >
                        <Text style={styles.filterValueText} numberOfLines={1}>
                            {filterLabelText}
                        </Text>
                        <Ionicons
                            name="chevron-down"
                            size={14}
                            color="#64748b"
                            style={styles.filterChevron}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Overview summary card */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>TOTAL ESTIMATED ANNUAL COST</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(totalAnnualCost)}</Text>
                    <View style={styles.divider} />
                    <View style={styles.summaryFooter}>
                        <Ionicons name="bar-chart-outline" size={16} color="#8b5cf6" style={{ marginRight: 6 }} />
                        <Text style={styles.summaryFooterText}>
                            Analyzing {allContracts.length} active utility contracts
                        </Text>
                    </View>
                </View>

                {/* Section 1: Reports by Utility */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionCardTitle}>Reports by Utility</Text>
                    <Text style={styles.sectionCardDesc}>Estimated cost distribution across fuels</Text>

                    <View style={{ marginTop: 8 }}>
                        {utilityBreakdown.map((item) => (
                            <View key={item.fuel} style={styles.utilityRow}>
                                <View style={styles.utilityHeader}>
                                    <View style={styles.utilityInfoLeft}>
                                        <View style={[styles.miniIconBg, { backgroundColor: getFuelColor(item.fuel) + '15' }]}>
                                            <UtilityIcon fuel={item.fuel} />
                                        </View>
                                        <Text style={styles.utilityName}>{item.fuel}</Text>
                                        <Text style={styles.utilityCount}>({item.count})</Text>
                                    </View>
                                    <Text style={styles.utilityValue}>{formatCurrency(item.cost)}</Text>
                                </View>
                                <View style={styles.progressBarBg}>
                                    <View style={[
                                        styles.progressBarFill,
                                        { width: `${item.percentage}%`, backgroundColor: getFuelColor(item.fuel) }
                                    ]} />
                                </View>
                                <Text style={styles.percentageLabel}>{item.percentage.toFixed(1)}% of total</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Section 2: Reports by Site (only shown if viewing all sites) */}
                {selectedSiteId === null && (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionCardTitle}>Reports by Site</Text>
                        <Text style={styles.sectionCardDesc}>Annual estimates breakdown per physical site</Text>

                        <View style={{ marginTop: 12 }}>
                            {siteBreakdown.map(site => (
                                <View key={site.id} style={styles.siteRow}>
                                    <View style={{ flex: 1, marginRight: 16 }}>
                                        <Text style={styles.siteRowName}>{site.name}</Text>
                                        <Text style={styles.siteRowBusiness}>{site.businessName}</Text>
                                        <View style={styles.badgeRow}>
                                            {site.fuels.map((fuel: any) => (
                                                <View key={fuel} style={styles.miniBadge}>
                                                    <Text style={styles.miniBadgeText}>{fuel}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.siteRowCost}>{formatCurrency(site.cost)}</Text>
                                        <Text style={styles.siteRowUtilsCount}>
                                            {site.utilsCount} {site.utilsCount === 1 ? 'utility' : 'utilities'}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Section 3: Sorted Contracts Leaderboard */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionCardTitle}>Highest to Lowest Cost</Text>
                    <Text style={styles.sectionCardDesc}>Utilities ranked by their estimated annual contribution</Text>

                    <View style={{ marginTop: 12 }}>
                        {sortedContractsLeaderboard.length === 0 ? (
                            <View style={styles.emptyLeaderboard}>
                                <Text style={styles.emptyLeaderboardText}>No contracts available</Text>
                            </View>
                        ) : (
                            sortedContractsLeaderboard.map((contract, index) => (
                                <View key={contract.id} style={styles.leaderboardRow}>
                                    <View style={styles.rankBadge}>
                                        <Text style={styles.rankBadgeText}>{index + 1}</Text>
                                    </View>

                                    <View style={styles.leaderboardContent}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <View style={styles.leaderboardTitleRow}>
                                                <Text style={styles.leaderboardFuel}>{contract.fuel}</Text>
                                                <Text style={styles.leaderboardSupplier}>· {contract.supplier}</Text>
                                            </View>
                                            <Text style={styles.leaderboardSite} numberOfLines={1}>
                                                {contract.siteName} ({contract.businessName})
                                            </Text>
                                            <Text style={styles.leaderboardMeter} numberOfLines={1}>
                                                Serial: {contract.meterSerial || 'Pending'}
                                            </Text>
                                        </View>
                                        <Text style={styles.leaderboardCost}>{formatCurrency(contract.estimatedAnnualCost)}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>

            <ReportsFilterSheet
                bottomSheetRef={filterSheetRef}
                sites={portfolioSites}
                selectedSiteId={selectedSiteId}
                onSelectSite={setSelectedSiteId}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 120, // offset for tab bar wrapper
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '500',
        color: '#64748b',
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        backgroundColor: '#ffffff',
    },
    headerTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    filterSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    filterValueText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#181818',
    },
    filterChevron: {
        marginLeft: 6,
        marginTop: 2,
    },
    summaryCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 1,
    },
    summaryValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1e293b',
        marginTop: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 16,
    },
    summaryFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryFooterText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    sectionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    sectionCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
    },
    sectionCardDesc: {
        fontSize: 12,
        fontWeight: '500',
        color: '#94a3b8',
        marginTop: 2,
    },
    utilityRow: {
        marginTop: 16,
    },
    utilityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    utilityInfoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniIconBg: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    utilityName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
    },
    utilityCount: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94a3b8',
        marginLeft: 4,
    },
    utilityValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#f1f5f9',
        borderRadius: 3,
        marginTop: 8,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    percentageLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94a3b8',
        marginTop: 4,
        textAlign: 'right',
    },
    siteRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    siteRowName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
    },
    siteRowBusiness: {
        fontSize: 12,
        fontWeight: '500',
        color: '#94a3b8',
        marginTop: 2,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 6,
    },
    miniBadge: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#64748b',
    },
    siteRowCost: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
    },
    siteRowUtilsCount: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 2,
    },
    emptyLeaderboard: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyLeaderboardText: {
        fontSize: 13,
        color: '#94a3b8',
    },
    leaderboardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    rankBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rankBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
    },
    leaderboardContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leaderboardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    leaderboardFuel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
    },
    leaderboardSupplier: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748b',
        marginLeft: 4,
    },
    leaderboardSite: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94a3b8',
        marginTop: 2,
    },
    leaderboardMeter: {
        fontSize: 10,
        color: '#cbd5e1',
        fontWeight: '500',
        marginTop: 1,
    },
    leaderboardCost: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
    },
});
