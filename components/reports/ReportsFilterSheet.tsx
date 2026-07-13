import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles as siteStyles } from '../sites/sites.styles';

export const ReportsFilterSheet = ({
    bottomSheetRef,
    sites = [],
    selectedSiteId,
    onSelectSite,
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
            <View style={siteStyles.sheetHeader}>
                <Text style={siteStyles.sheetTitle}>Select site or business</Text>
                <TouchableOpacity 
                    style={siteStyles.sheetClose} 
                    onPress={() => bottomSheetRef.current?.dismiss()}
                >
                    <Ionicons name="close" size={16} color="#94a3b8" />
                </TouchableOpacity>
            </View>
        ),
        [bottomSheetRef]
    );

    // Group sites by businessName
    const groupedSites = useMemo(() => {
        const groups: Record<string, any[]> = {};
        sites.forEach((site: any) => {
            const bizName = site.businessName || "Other Sites";
            if (!groups[bizName]) {
                groups[bizName] = [];
            }
            groups[bizName].push(site);
        });
        return Object.entries(groups);
    }, [sites]);

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            enableDynamicSizing
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={siteStyles.sheetBackground}
            handleComponent={renderHeader}
        >
            <BottomSheetScrollView
                style={siteStyles.sheetBody}
                contentContainerStyle={[siteStyles.sheetBodyContent, { paddingBottom: 40 }]}
            >
                {/* Option for All Businesses & Sites */}
                <TouchableOpacity
                    style={[
                        siteStyles.sheetFilterItem,
                        selectedSiteId === null && siteStyles.sheetFilterItemActive,
                    ]}
                    onPress={() => {
                        onSelectSite(null);
                        bottomSheetRef.current?.dismiss();
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            style={[
                                siteStyles.sheetFilterItemText,
                                selectedSiteId === null && siteStyles.sheetFilterItemTextActive,
                            ]}
                        >
                            All Businesses & Sites
                        </Text>
                        <Text style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: "500" }}>
                            Show aggregated estimate across all portfolio sites
                        </Text>
                    </View>
                    {selectedSiteId === null && (
                        <Ionicons name="checkmark" size={18} color="#181818" />
                    )}
                </TouchableOpacity>

                {/* Grouped sites by Business */}
                {groupedSites.map(([businessName, bizSites]: any) => (
                    <View key={businessName} style={styles.businessGroup}>
                        <Text style={styles.businessHeaderTitle}>{businessName}</Text>
                        {bizSites.map((site: any) => {
                            const isSelected = selectedSiteId === site.id;
                            const utilsCount = site.contracts?.length || 0;

                            return (
                                <TouchableOpacity
                                    key={site.id}
                                    style={[
                                        siteStyles.sheetFilterItem,
                                        isSelected && siteStyles.sheetFilterItemActive,
                                        { marginLeft: 8, marginTop: 4 }
                                    ]}
                                    onPress={() => {
                                        onSelectSite(site.id);
                                        bottomSheetRef.current?.dismiss();
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={[
                                                siteStyles.sheetFilterItemText,
                                                isSelected && siteStyles.sheetFilterItemTextActive,
                                                { fontSize: 14 }
                                            ]}
                                        >
                                            {site.name}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2, fontWeight: "500" }}>
                                            {site.address} · {utilsCount} {utilsCount === 1 ? "utility" : "utilities"}
                                        </Text>
                                    </View>
                                    {isSelected && (
                                        <Ionicons name="checkmark" size={16} color="#181818" />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </BottomSheetScrollView>
        </BottomSheetModal>
    );
};

const styles = StyleSheet.create({
    businessGroup: {
        marginTop: 16,
    },
    businessHeaderTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 8,
    },
});
