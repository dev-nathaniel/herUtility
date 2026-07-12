import type { Business as ApiBusiness, Utility as ApiUtility } from "@/hooks/api/use-business";
import { useBusinesses, useCreateBusiness, useCreateUtility, useSites, useCreateSite } from '@/hooks/api/use-business';
import { useAuth } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

import { SiteCard } from '@/components/sites/SiteCard';
import { BusinessFilterSheet } from '@/components/sites/BusinessFilterSheet';
import { AddUtilitySheet } from '@/components/sites/AddUtilitySheet';
import { ExpiringContractsSheet } from '@/components/sites/ExpiringContractsSheet';
import { ContractDetailsSheet } from '@/components/sites/ContractDetailsSheet';
import { styles } from '@/components/sites/sites.styles';
import { useTour } from '@/components/tour/TourContext';

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

const Sites = () => {
    const { user } = useAuth();
    const { openAddUtilityRequested, clearOpenAddUtilityRequest } = useTour();

    useEffect(() => {
        if (openAddUtilityRequested) {
            setPreselectedBusinessId(null);
            setTimeout(() => {
                addSheetRef.current?.present();
            }, 150);
            clearOpenAddUtilityRequest();
        }
    }, [openAddUtilityRequested]);

    const businessesQuery = useBusinesses();
    const sitesQuery = useSites();

    const expiringSheetRef = useRef<BottomSheetModal>(null);
    const filterSheetRef = useRef<BottomSheetModal>(null);

    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
    const [preselectedBusinessId, setPreselectedBusinessId] = useState<string | null>(null);
    const [preselectedSiteId, setPreselectedSiteId] = useState<string | null>(null);

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

    const sites = useMemo(() => {
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
                .filter((u): u is ApiUtility => typeof u !== "string")
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
                .filter((u): u is ApiUtility => typeof u !== "string" && !seenUtilityIds.has(u._id));

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

    const filteredSites = useMemo(() => {
        if (selectedBusinessId === null) return sites;
        return sites.filter(s => s.businessId === selectedBusinessId);
    }, [sites, selectedBusinessId]);

    const createBusinessMutation = useCreateBusiness();
    const createSiteMutation = useCreateSite();
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
                const bizResult = await createBusinessMutation.mutateAsync({
                    name: newBusiness.name,
                    address: newBusiness.address,
                    postcode: newBusiness.postcode,
                    members: [{ userId: user.id, role: "owner" as const }],
                });
                const businessId = bizResult?.data?.business?._id;

                if (businessId) {
                    // Create site for new business
                    const siteResult = await createSiteMutation.mutateAsync({
                        businessId,
                        name: newBusiness.siteName || "Primary Site",
                        address: newBusiness.address || newBusiness.postcode || "",
                    });
                    const siteId = siteResult?.data?.site?._id;

                    for (const contract of newContracts) {
                        await createUtilityMutation.mutateAsync({
                            businessId,
                            siteId,
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
            }

            // 2. Handle Existing Businesses
            if (existingContracts && existingContracts.length > 0) {
                let createdNewSiteId: string | null = null;
                // Run mutations sequentially to avoid MongoDB write conflicts
                for (const contract of existingContracts) {
                    let siteId = contract.siteId;

                    // If user chose to create a new site
                    if (siteId === "new" && contract.newSiteName) {
                        if (createdNewSiteId) {
                            siteId = createdNewSiteId;
                        } else {
                            const siteResult = await createSiteMutation.mutateAsync({
                                businessId: contract.businessId,
                                name: contract.newSiteName,
                                address: contract.newSiteAddress || "",
                            });
                            siteId = siteResult?.data?.site?._id;
                            if (siteId) {
                                createdNewSiteId = siteId;
                            }
                        }
                    }

                    await createUtilityMutation.mutateAsync({
                        businessId: contract.businessId,
                        siteId: siteId || undefined,
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
        [user, createBusinessMutation, createSiteMutation, createUtilityMutation, businessesQuery, sitesQuery, fuelToServerType],
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
                    <View style={styles.filterHeaderContainer}>
                        <TouchableOpacity
                            style={styles.filterSelector}
                            onPress={() => filterSheetRef.current?.present()}
                        >
                            <Text style={styles.filterLabel}>Viewing sites for:</Text>
                            <View style={styles.filterValueContainer}>
                                <Text style={styles.filterValueText} numberOfLines={1}>
                                    {selectedBusinessId === null
                                        ? `All businesses (${businesses.length})`
                                        : businesses.find((b) => b.id === selectedBusinessId)?.name || "Selected Business"}
                                </Text>
                                <Ionicons
                                    name="chevron-down"
                                    size={16}
                                    color="#94a3b8"
                                    style={styles.filterChevron}
                                />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.getQuoteButton}
                            onPress={() => {
                                setPreselectedBusinessId(selectedBusinessId);
                                setPreselectedSiteId(null);
                                addSheetRef.current?.present();
                            }}
                        >
                            <Text style={styles.getQuoteButtonText}>Get a quote</Text>
                        </TouchableOpacity>
                    </View>

                    {filteredSites.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="business-outline" size={48} color="#cbd5e1" />
                            <Text style={styles.emptyStateTitle}>No sites yet</Text>
                            <Text style={styles.emptyStateText}>
                                Tap "Get a Quote" to add your first site and start managing your utilities.
                            </Text>
                        </View>
                    ) : (
                        filteredSites.map((site) => (
                            <SiteCard
                                key={site.id}
                                site={site}
                                onAddMeter={(bizId: string, siteId: string) => {
                                    setPreselectedBusinessId(bizId);
                                    setPreselectedSiteId(siteId);
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
                sites={sites}
                onSubmit={handleAddUtilitySubmit}
                initialBusinessId={preselectedBusinessId}
                initialSiteId={preselectedSiteId}
                onDismiss={() => {
                    setPreselectedBusinessId(null);
                    setPreselectedSiteId(null);
                }}
            />

            <BusinessFilterSheet
                bottomSheetRef={filterSheetRef}
                businesses={businesses}
                sites={sites}
                selectedBusinessId={selectedBusinessId}
                onSelectBusiness={setSelectedBusinessId}
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
    );
}

export default Sites;