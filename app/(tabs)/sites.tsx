import type { Business as ApiBusiness, Utility as ApiUtility } from "@/hooks/api/use-business";
import { useBusinesses, useCreateBusiness, useCreateUtility, useSites } from '@/hooks/api/use-business';
import { useAuth } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

import { BusinessCard } from '@/components/sites/BusinessCard';
import { AddUtilitySheet } from '@/components/sites/AddUtilitySheet';
import { ExpiringContractsSheet } from '@/components/sites/ExpiringContractsSheet';
import { ContractDetailsSheet } from '@/components/sites/ContractDetailsSheet';
import { styles } from '@/components/sites/sites.styles';

/** Map a server utility type to the UI fuel label */
const fuelTypeMap: Record<string, string> = {
    electricity: "Electricity",
    gas: "Gas",
    water: "Water",
};

// --- Color palette for business cards ---
const businessColors = [
    "#8b5cf6", "#ec4899", "#f97316", "#6366f1", "#14b8a6",
    "#f43f5e", "#0ea5e9", "#84cc16", "#a855f7", "#eab308",
];

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

function getContractStatus(contractEnd?: string): "Expiring" | "Active" | "Expired" {
    if (!contractEnd) return "Active";
    const end = new Date(contractEnd);
    const now = new Date();

    if (end < now) return "Expired";

    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    return end <= sixMonths ? "Expiring" : "Active";
}

/** Map server Utility (inside a site) to the flat contract shape the UI expects */
function mapUtility(util: ApiUtility, businessId: string) {
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
        fuel: fuelTypeMap[util.type] || util.type,
        end: endDate,
        status,
        rate: "—",
        usage: "—",
        supplier: util.supplier || util.previousSupplier || "",
    };
}

const Sites = () => {
    const { user } = useAuth();

    const businessesQuery = useBusinesses();
    const sitesQuery = useSites();

    const expiringSheetRef = useRef<BottomSheetModal>(null);

    // Flatten sites → utilities AND business-level utilities into flat contracts array the UI expects
    const contracts = useMemo(() => {
        const result: ReturnType<typeof mapUtility>[] = [];
        const seenIds = new Set<string>();

        // 1. Utilities from sites
        const apiSites = sitesQuery.data?.data?.sites ?? [];
        for (const site of apiSites) {
            const businessId = typeof site.business === "string" ? site.business : (site.business as any)?._id;
            if (!site.utilities) continue;
            for (const util of site.utilities) {
                if (typeof util === "string") continue; // un-populated ref
                const u = util as ApiUtility;
                if (!seenIds.has(u._id)) {
                    seenIds.add(u._id);
                    result.push(mapUtility(u, businessId));
                }
            }
        }

        // 2. Utilities directly on businesses (no site)
        const apiBusinesses = businessesQuery.data?.data?.businesses ?? [];
        for (const biz of apiBusinesses) {
            if (!biz.utilities) continue;
            for (const util of biz.utilities) {
                if (typeof util === "string") continue;
                const u = util as unknown as ApiUtility;
                if (u._id && !seenIds.has(u._id)) {
                    seenIds.add(u._id);
                    result.push(mapUtility(u, biz._id));
                }
            }
        }
        return result;
    }, [sitesQuery.data, businessesQuery.data]);

    const businesses = useMemo(() => {
        const apiBusinesses = businessesQuery.data?.data?.businesses ?? [];
        return apiBusinesses.map((b, i) => mapBusiness(b, i));
    }, [businessesQuery.data]);

    const createBusinessMutation = useCreateBusiness();
    const createUtilityMutation = useCreateUtility();

    const [selectedContractData, setSelectedContractData] = useState<any>(null);

    const addSheetRef = useRef<BottomSheetModal>(null);

    const detailsSheetRef = useRef<BottomSheetModal>(null);

    const expiringContracts = useMemo(
        () =>
            contracts
                .filter((c) => c.status === "Expiring")
                .sort((a, b) => new Date(a.end).getTime() - new Date(b.end).getTime()),
        [contracts],
    );

    const [preselectedBusinessId, setPreselectedBusinessId] = useState<string | null>(null);

    const handleViewDetails = (contract: any) => {
        const business = businesses.find((b) => b.id === contract.businessId);
        setSelectedContractData({ contract, business });
        detailsSheetRef.current?.present();
    };

    // Map form fuel label back to server enum value
    const fuelToServerType: Record<string, string> = {
        Electricity: "electricity",
        Gas: "gas",
        Water: "water",
        Telecoms: "telecoms",
    };

    // Handle new business/utility submission from AddUtilitySheet
    const handleAddUtilitySubmit = useCallback(
        async ({ newBusiness, newContracts, existingContracts }: any) => {
            // 1. Handle New Business Creation
            if (newBusiness && user && newContracts && newContracts.length > 0) {
                const result = await createBusinessMutation.mutateAsync({
                    name: newBusiness.name,
                    address: newBusiness.address,
                    postcode: newBusiness.postcode,
                    members: [{ userId: user.id, role: "owner" as const }],
                });
                const businessId = result?.data?.business?._id;

                if (businessId) {
                    for (const contract of newContracts) {
                        await createUtilityMutation.mutateAsync({
                            businessId,
                            type: fuelToServerType[contract.fuel],
                            // The form captures *previous* contract details, not the new one yet
                            previousSupplier: contract.supplier,
                            previousMeterId: contract.meterId !== "Pending" && contract.meterId !== "" ? contract.meterId : undefined,
                            previousContractExpiry: contract.end || undefined,
                            status: "pending",
                            email: contract.email,
                            postcode: contract.postcode,
                        });
                    }
                }
            }

            // 2. Handle Existing Businesses (Multiple)
            if (existingContracts && existingContracts.length > 0) {
                // Run mutations sequentially to avoid MongoDB write conflicts
                for (const contract of existingContracts) {
                    await createUtilityMutation.mutateAsync({
                        businessId: contract.businessId,
                        type: fuelToServerType[contract.fuel],
                        previousSupplier: contract.supplier,
                        previousMeterId: contract.meterId !== "Pending" && contract.meterId !== "" ? contract.meterId : undefined,
                        previousContractExpiry: contract.end || undefined,
                        status: "pending",
                        email: contract.email,
                        postcode: contract.postcode,
                    });
                }
            }

            // Refetch to pick up any server-side changes
            businessesQuery.refetch();
            sitesQuery.refetch();
        },
        [user, createBusinessMutation, createUtilityMutation, businessesQuery, sitesQuery, fuelToServerType],
    );
    const isLoading = businessesQuery.isLoading || sitesQuery.isLoading;
    return (
        <View style={styles.container}>
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <Text style={styles.loadingText}>Loading your portfolio...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Your businesses</Text>
                        <TouchableOpacity
                            style={styles.getQuoteButton}
                            onPress={() => {
                                setPreselectedBusinessId(null);
                                addSheetRef.current?.present();
                            }}
                        >
                            <Text style={styles.getQuoteButtonText}>Get a quote</Text>
                        </TouchableOpacity>
                    </View>

                    {businesses.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="business-outline" size={48} color="#cbd5e1" />
                            <Text style={styles.emptyStateTitle}>No businesses yet</Text>
                            <Text style={styles.emptyStateText}>
                                Tap "Get a Quote" to add your first business and start managing your utilities.
                            </Text>
                        </View>
                    ) : (
                        businesses.map((business) => (
                            <BusinessCard
                                key={business.id}
                                business={business}
                                contracts={contracts.filter((c) => c.businessId === business.id)}
                                onAddMeter={() => {
                                    setPreselectedBusinessId(business.id);
                                    addSheetRef.current?.present();
                                }}
                                onViewDetails={handleViewDetails}
                            />
                        ))
                    )}
                </ScrollView>
            )}

            <AddUtilitySheet
                bottomSheetRef={addSheetRef}
                businesses={businesses}
                onSubmit={handleAddUtilitySubmit}
                initialBusinessId={preselectedBusinessId}
                onDismiss={() => setPreselectedBusinessId(null)}
            />

            <ExpiringContractsSheet
                bottomSheetRef={expiringSheetRef}
                contracts={expiringContracts}
                businesses={businesses}
                onViewDetails={handleViewDetails}
            />

            <ContractDetailsSheet
                bottomSheetRef={detailsSheetRef}
                contract={selectedContractData?.contract}
                business={selectedContractData?.business}
            />

        </View>
    )
}

export default Sites;