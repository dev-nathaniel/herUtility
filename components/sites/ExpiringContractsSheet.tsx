import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './sites.styles';

export const ExpiringContractsSheet = ({
    bottomSheetRef,
    contracts,
    businesses,
    onViewDetails,
}: any) => {
    const [selectedContract, setSelectedContract] = useState<any>(null);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.15}
            />
        ),
        [],
    );

    const handleContractSelect = (contract: any) => {
        const business = businesses.find((b: any) => b.id === contract.businessId);
        setSelectedContract({ contract, business });
    };

    const handleBack = () => {
        setSelectedContract(null);
    };

    const handleClose = () => {
        bottomSheetRef.current?.close();
        // Reset state when modal closes
        setTimeout(() => setSelectedContract(null), 300);
    };

    // If a contract is selected, show details view
    if (selectedContract) {
        const { contract, business } = selectedContract;
        const isExpiring = contract.status === "Expiring";

        return (
            <BottomSheetModal
                ref={bottomSheetRef}
                enableDynamicSizing
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                backgroundStyle={styles.sheetBackground}
                handleIndicatorStyle={styles.sheetIndicator}
                maxDynamicContentSize={600}
            >
                <BottomSheetView>
                    <View style={styles.sheetHeader}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <Ionicons name="arrow-back" size={20} color="#64748b" />
                        </TouchableOpacity>
                        <Text style={styles.sheetTitle}>Service Details</Text>
                        <TouchableOpacity style={styles.sheetClose} onPress={handleClose}>
                            <Ionicons name="close" size={16} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.sheetBody} nestedScrollEnabled>
                        <View style={styles.detailsBusinessCard}>
                            <View
                                style={[
                                    styles.detailsLogo,
                                    { backgroundColor: business?.color || "#64748b" },
                                ]}
                            >
                                <Text style={styles.detailsLogoText}>{business?.logo}</Text>
                            </View>
                            <View>
                                <Text style={styles.detailsBusinessName}>{business?.name}</Text>
                                <Text style={styles.detailsBusinessAddress}>
                                    {business?.address}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.detailsGrid}>
                            <View style={styles.detailsItem}>
                                <Text style={styles.detailsLabel}>STATUS</Text>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        contract.status === "Expiring"
                                            ? styles.statusExpiring
                                            : contract.status === "Expired"
                                                ? styles.statusExpired
                                                : contract.status === "Pending"
                                                    ? styles.statusPending
                                                    : styles.statusActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.statusText,
                                            contract.status === "Expiring"
                                                ? styles.statusTextExpiring
                                                : contract.status === "Expired"
                                                    ? styles.statusTextExpired
                                                    : contract.status === "Pending"
                                                        ? styles.statusTextPending
                                                        : styles.statusTextActive,
                                        ]}
                                    >
                                        {contract.status}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.detailsItem}>
                                <Text style={styles.detailsLabel}>ENDS</Text>
                                <Text style={styles.detailsValue}>
                                    {(() => {
                                        if (!contract.end) return "";
                                        const d = new Date(contract.end);
                                        return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
                                    })()}
                                </Text>
                            </View>
                            <View style={styles.detailsItem}>
                                <Text style={styles.detailsLabel}>RATE</Text>
                                <Text style={styles.detailsValue}>{contract.rate}</Text>
                            </View>
                            <View style={styles.detailsItem}>
                                <Text style={styles.detailsLabel}>METER ID</Text>
                                <Text style={styles.detailsValue}>{contract.meterId}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.detailsButton,
                                isExpiring
                                    ? styles.detailsButtonExpiring
                                    : contract.status === "Expired"
                                        ? styles.detailsButtonExpired
                                        : contract.status === "Pending"
                                            ? styles.detailsButtonPending
                                            : styles.detailsButtonActive,
                            ]}
                            disabled={contract.status === "Pending"}
                        >
                            <Text style={styles.detailsButtonText}>
                                {isExpiring || contract.status === "Expired"
                                    ? "Renew Contract"
                                    : contract.status === "Pending"
                                        ? "Processing..."
                                        : "Download PDF"}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </BottomSheetView>
            </BottomSheetModal>
        );
    }

    // Default view showing list of expiring contracts
    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            enableDynamicSizing
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetIndicator}
            maxDynamicContentSize={700}
        >
            <BottomSheetView>
                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Priority Actions</Text>
                    <TouchableOpacity style={styles.sheetClose} onPress={handleClose}>
                        <Ionicons name="close" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.sheetBody} nestedScrollEnabled>
                    <Text style={styles.modalDescription}>
                        The following services require your immediate attention.
                    </Text>
                    {contracts.map((contract: any) => {
                        const business = businesses.find(
                            (b: any) => b.id === contract.businessId,
                        );
                        return (
                            <TouchableOpacity
                                key={contract.id}
                                style={styles.expiringItem}
                                onPress={() => handleContractSelect(contract)}
                            >
                                <View style={styles.expiringLeft}>
                                    <View style={styles.expiringIcon}>
                                        <Ionicons name="alert-circle" size={20} color="#f43f5e" />
                                    </View>
                                    <View>
                                        <Text style={styles.expiringBusiness}>
                                            {business?.name || "Unknown"}
                                        </Text>
                                        <Text style={styles.expiringDetails}>
                                            {contract.fuel}
                                            {(() => {
                                                if (!contract.end) return "";
                                                const d = new Date(contract.end);
                                                return isNaN(d.getTime())
                                                    ? ""
                                                    : ` • Ends ${d.toLocaleDateString()}`;
                                            })()}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.expiringArrow}>
                                    <Ionicons name="arrow-forward" size={16} color="#cbd5e1" />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </BottomSheetView>
        </BottomSheetModal>
    );
};
