import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import Electricity from '@/assets/icons/Electricity';
import Fire from '@/assets/icons/Fire';
import LiquidDrop from '@/assets/icons/LiquidDrop';
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
        estimatedAnnualCost: util.estimatedAnnualCost,
        meterSerial: util.meterSerial,
        identifier: util.identifier || "",
    };
}

const UtilityIcon = ({ fuel }: { fuel: string }) => {
    switch (fuel) {
        case "Electricity":
            return <Electricity width={20} height={20} />;
        case "Gas":
            return <Fire width={20} height={20} />;
        case "Water":
            return <LiquidDrop width={20} height={20} />;
        case "Telecoms":
            return <Ionicons name="call" size={20} color="#a855f7" />;
        default:
            return <Electricity width={20} height={20} />;
    }
};

const getMeterBgText = (fuel: string) => {
    const config: any = {
        Electricity: { bg: "#fef08a", text: "#ca8a04" },
        Gas: { bg: "#fed7aa", text: "#ea580c" },
        Water: { bg: "#bfdbfe", text: "#2563eb" },
        Telecoms: { bg: "#e9d5ff", text: "#9333ea" },
    };
    return config[fuel] || config.Electricity;
};

export default function SiteDetailsScreen() {
    const { siteId } = useLocalSearchParams<{ siteId: string }>();
    const router = useRouter();

    const businessesQuery = useBusinesses();
    const sitesQuery = useSites();

    const isLoading = businessesQuery.isLoading || sitesQuery.isLoading;

    const site = useMemo(() => {
        if (!siteId) return null;

        const apiSites = sitesQuery.data?.data?.sites ?? [];
        const apiBusinesses = businessesQuery.data?.data?.businesses ?? [];

        // 1. Map real sites
        const mappedSites = apiSites.map((site) => {
            const biz = typeof site.business === "string"
                ? apiBusinesses.find(b => b._id === site.business)
                : site.business;
            const bizName = (biz as any)?.name || "Unknown Business";
            const bizId = (biz as any)?._id || (typeof site.business === "string" ? site.business : "");

            // Map the site's utilities
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

        return mappedSites.find(s => s.id === siteId);
    }, [sitesQuery.data, businessesQuery.data, siteId]);

    const handleGetQuote = (utility: any) => {
        Toast.show({
            type: 'success',
            text1: 'Quote Request Sent',
            text2: `We've received your request to get a quote for ${utility.fuel}.`,
        });
    };

    const handleRequestChange = (utility: any) => {
        Toast.show({
            type: 'info',
            text1: 'Change Request Logged',
            text2: `A request to change details for ${utility.fuel} has been submitted.`,
        });
    };

    const formatCurrency = (val?: number) => {
        if (val === undefined || isNaN(val)) return '—';
        return `£${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatUsage = (val?: number, type?: string) => {
        if (val === undefined || isNaN(val)) return '—';
        if (type === 'electricity' || type === 'gas') return `${val.toLocaleString()} kWh`;
        if (type === 'water') return `${val.toLocaleString()} m³`;
        if (type === 'telecoms') return `${val} months`;
        return `${val.toLocaleString()}`;
    };

    const formatTariff = (val?: number, type?: string) => {
        if (val === undefined || isNaN(val)) return '—';
        if (type === 'electricity' || type === 'gas') return `${val} p/kWh`;
        if (type === 'water') return `${val} p/m³`;
        if (type === 'telecoms') return `£${val} / month`;
        return `${val}`;
    };

    const formatStandingCharge = (val?: number, type?: string) => {
        if (val === undefined || isNaN(val)) return '—';
        if (type === 'telecoms') return '—';
        return `${val} p/day`;
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safeContainer}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <Text style={styles.loadingText}>Loading site details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!site) {
        return (
            <SafeAreaView style={styles.safeContainer}>
                <View style={styles.headerBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={20} color="#1e293b" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Site Details</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text style={styles.errorText}>Site not found</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.errorButton}>
                        <Text style={styles.errorButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeContainer} edges={['bottom']}>
            <View style={styles.headerBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={20} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Site Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Site Summary Card */}
                <View style={styles.siteInfoCard}>
                    <Text style={styles.siteName}>{site.name}</Text>
                    <Text style={styles.siteBusinessName}>{site.businessName}</Text>
                    <View style={styles.divider} />
                    <View style={styles.addressRow}>
                        <Ionicons name="location-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
                        <Text style={styles.siteAddress}>{site.address}</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Connected Utilities</Text>

                {site.contracts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="flash-off-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.emptyStateTitle}>No Utilities Connected</Text>
                        <Text style={styles.emptyStateText}>This site does not have any utility meters or contracts registered.</Text>
                    </View>
                ) : (
                    site.contracts.map((utility: any) => {
                        const { bg, text } = getMeterBgText(utility.fuel);
                        const isExpiring = utility.status === "Expiring";
                        const isExpired = utility.status === "Expired";
                        const isPending = utility.status === "Pending";

                        const statusStyle = isExpiring
                            ? styles.statusExpiring
                            : isExpired
                                ? styles.statusExpired
                                : isPending
                                    ? styles.statusPending
                                    : styles.statusActive;

                        const statusTextStyle = isExpiring
                            ? styles.statusTextExpiring
                            : isExpired
                                ? styles.statusTextExpired
                                : isPending
                                    ? styles.statusTextPending
                                    : styles.statusTextActive;

                        const identifierLabel = utility.type === 'electricity'
                            ? 'MPAN'
                            : utility.type === 'gas'
                                ? 'MPRN'
                                : 'Meter ID';

                        return (
                            <View key={utility.id} style={styles.utilityCard}>
                                {/* Utility Header */}
                                <View style={styles.utilityHeader}>
                                    <View style={styles.utilityHeaderLeft}>
                                        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
                                            <UtilityIcon fuel={utility.fuel} />
                                        </View>
                                        <View>
                                            <Text style={styles.utilityFuel}>{utility.fuel}</Text>
                                            <Text style={styles.utilitySupplier} numberOfLines={1}>
                                                {utility.supplier || "No provider specified"}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={[styles.statusBadge, statusStyle]}>
                                        <Text style={[styles.statusText, statusTextStyle]}>
                                            {utility.status}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.utilityDivider} />

                                {/* Utility Details Grid */}
                                <View style={styles.detailsGrid}>
                                    <View style={styles.detailsItem}>
                                        <Text style={styles.detailsLabel}>{identifierLabel}</Text>
                                        <Text style={styles.detailsValue}>{utility.identifier || utility.meterId || 'Pending'}</Text>
                                    </View>

                                    <View style={styles.detailsItem}>
                                        <Text style={styles.detailsLabel}>METER SERIAL</Text>
                                        <Text style={styles.detailsValue}>{utility.meterSerial || '—'}</Text>
                                    </View>

                                    <View style={styles.detailsItem}>
                                        <Text style={styles.detailsLabel}>START DATE</Text>
                                        <Text style={styles.detailsValue}>{formatDate(utility.start)}</Text>
                                    </View>

                                    <View style={styles.detailsItem}>
                                        <Text style={styles.detailsLabel}>END DATE</Text>
                                        <Text style={styles.detailsValue}>{formatDate(utility.end)}</Text>
                                    </View>

                                    <View style={styles.detailsItem}>
                                        <Text style={styles.detailsLabel}>TARIFF (DAY RATE)</Text>
                                        <Text style={styles.detailsValue}>{formatTariff(utility.tariffRate, utility.type)}</Text>
                                    </View>

                                    <View style={styles.detailsItem}>
                                        <Text style={styles.detailsLabel}>STANDING CHARGE</Text>
                                        <Text style={styles.detailsValue}>{formatStandingCharge(utility.standingCharge, utility.type)}</Text>
                                    </View>

                                    <View style={styles.detailsItem}>
                                        <Text style={styles.detailsLabel}>ANNUAL USAGE</Text>
                                        <Text style={styles.detailsValue}>{formatUsage(utility.annualUsage, utility.type)}</Text>
                                    </View>

                                    <View style={styles.detailsItem}>
                                        <Text style={styles.detailsLabel}>EST. ANNUAL COST</Text>
                                        <Text style={[styles.detailsValue, styles.costValue]}>
                                            {formatCurrency(utility.estimatedAnnualCost)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.actionRow}>
                                    <TouchableOpacity
                                        style={styles.quoteButton}
                                        onPress={() => handleGetQuote(utility)}
                                    >
                                        <Text style={styles.quoteButtonText}>Get Quote</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.changeButton}
                                        onPress={() => handleRequestChange(utility)}
                                    >
                                        <Text style={styles.changeButtonText}>Request Change</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>
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
        paddingBottom: 40,
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        backgroundColor: '#ffffff',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
    },
    siteInfoCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
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
    siteName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
    },
    siteBusinessName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8b5cf6',
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 16,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    siteAddress: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748b',
        flex: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
        marginTop: 24,
        marginBottom: 16,
    },
    emptyState: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    emptyStateTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
        marginTop: 12,
    },
    emptyStateText: {
        fontSize: 13,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 18,
    },
    utilityCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    utilityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    utilityHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    utilityFuel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
    },
    utilitySupplier: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748b',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statusActive: {
        backgroundColor: '#d1fae5',
    },
    statusExpiring: {
        backgroundColor: '#fee2e2',
    },
    statusExpired: {
        backgroundColor: '#fecaca',
    },
    statusPending: {
        backgroundColor: '#ffedd5',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    statusTextActive: {
        color: '#059669',
    },
    statusTextExpiring: {
        color: '#f43f5e',
    },
    statusTextExpired: {
        color: '#ef4444',
    },
    statusTextPending: {
        color: '#ea580c',
    },
    utilityDivider: {
        height: 1,
        backgroundColor: '#f8fafc',
        marginVertical: 16,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
    },
    detailsItem: {
        width: '50%',
        paddingHorizontal: 8,
        marginBottom: 16,
    },
    detailsLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 0.5,
    },
    detailsValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
        marginTop: 4,
    },
    costValue: {
        color: '#8b5cf6',
        fontWeight: '700',
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 12,
    },
    quoteButton: {
        flex: 1,
        backgroundColor: '#181818',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quoteButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
    },
    changeButton: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    changeButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    errorText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 12,
        marginBottom: 20,
    },
    errorButton: {
        backgroundColor: '#8b5cf6',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    errorButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ffffff',
    },
});
