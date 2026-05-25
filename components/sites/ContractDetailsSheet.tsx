import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './sites.styles';

export const ContractDetailsSheet = ({ bottomSheetRef, contract, business }: any) => {
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

    const isExpiring = contract?.status === "Expiring";

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
                {contract && (
                    <>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Service Details</Text>
                            <TouchableOpacity
                                style={styles.sheetClose}
                                onPress={() => bottomSheetRef.current?.close()}
                            >
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
                                            isExpiring
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
                                                isExpiring
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
                                            if (!contract.end) return "N/A";
                                            const d = new Date(contract.end);
                                            return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
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
                    </>
                )}
            </BottomSheetView>
        </BottomSheetModal>
    );
};
