import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './sites.styles';

export const BusinessFilterSheet = ({
    bottomSheetRef,
    businesses,
    sites = [],
    selectedBusinessId,
    onSelectBusiness,
}: any) => {
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

    const renderHeader = useCallback(
        () => (
            <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select business</Text>
                <TouchableOpacity 
                    style={styles.sheetClose} 
                    onPress={() => bottomSheetRef.current?.dismiss()}
                >
                    <Ionicons name="close" size={16} color="#94a3b8" />
                </TouchableOpacity>
            </View>
        ),
        [bottomSheetRef]
    );

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            enableDynamicSizing
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.sheetBackground}
            handleComponent={renderHeader}
        >
            <BottomSheetScrollView
                style={styles.sheetBody}
                contentContainerStyle={[styles.sheetBodyContent, { paddingBottom: 40 }]}
            >
                {/* Option for All Businesses */}
                <TouchableOpacity
                    style={[
                        styles.sheetFilterItem,
                        selectedBusinessId === null && styles.sheetFilterItemActive,
                    ]}
                    onPress={() => {
                        onSelectBusiness(null);
                        bottomSheetRef.current?.dismiss();
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            style={[
                                styles.sheetFilterItemText,
                                selectedBusinessId === null && styles.sheetFilterItemTextActive,
                            ]}
                        >
                            All businesses ({businesses.length})
                        </Text>
                        <Text style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: "500" }}>
                            See sites across every business
                        </Text>
                    </View>
                    {selectedBusinessId === null && (
                        <Ionicons name="checkmark" size={18} color="#181818" />
                    )}
                </TouchableOpacity>

                {/* Option for each business */}
                {businesses.map((b: any) => {
                    const isSelected = selectedBusinessId === b.id;
                    const businessSites = sites.filter((s: any) => s.businessId === b.id);
                    const sitesCount = businessSites.length;
                    const contractsCount = businessSites.reduce((acc: number, s: any) => acc + (s.contracts?.length || 0), 0);

                    return (
                        <TouchableOpacity
                            key={b.id}
                            style={[
                                styles.sheetFilterItem,
                                isSelected && styles.sheetFilterItemActive,
                            ]}
                            onPress={() => {
                                onSelectBusiness(b.id);
                                bottomSheetRef.current?.dismiss();
                            }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={[
                                        styles.sheetFilterItemText,
                                        isSelected && styles.sheetFilterItemTextActive,
                                    ]}
                                >
                                    {b.name}
                                </Text>
                                <Text style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: "500" }}>
                                    {sitesCount} {sitesCount === 1 ? "site" : "sites"} · {contractsCount} {contractsCount === 1 ? "contract" : "contracts"}
                                </Text>
                            </View>
                            {isSelected && (
                                <Ionicons name="checkmark" size={18} color="#181818" />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </BottomSheetScrollView>
        </BottomSheetModal>
    );
};
