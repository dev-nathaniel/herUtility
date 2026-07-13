import React, { useCallback, forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTour } from "./TourContext";

// Import matching application icons
import Scan from "@/assets/icons/Scan";
import QuoteIcon from "@/assets/icons/QuoteIcon";
import SiteIcon from "@/assets/icons/SiteIcon";

export const TourCompleteSheet = forwardRef((props: any, ref) => {
  const innerRef = useRef<BottomSheetModal>(null);
  const router = useRouter();
  const { requestOpenAddUtility } = useTour();

  useImperativeHandle(ref, () => ({
    present: () => innerRef.current?.present(),
    close: () => innerRef.current?.close()
  }));

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.3}
      />
    ),
    []
  );

  const handleScanBill = () => {
    innerRef.current?.close();
    router.push("/(tabs)/scanner");
  };

  const handleGetQuote = () => {
    innerRef.current?.close();
    requestOpenAddUtility();
    router.push("/(tabs)/sites");
  };

  const handleAddManually = () => {
    innerRef.current?.close();
    requestOpenAddUtility();
    router.push("/(tabs)/sites");
  };

  const handleMaybeLater = () => {
    innerRef.current?.close();
  };

  return (
    <BottomSheetModal
      ref={innerRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetIndicator}
      maxDynamicContentSize={600}
    >
      <BottomSheetView style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Tour complete</Text>
          <Text style={styles.subtitle}>Ready to add your first contract?</Text>
        </View>

        <View style={styles.optionsList}>
          {/* Option 1: Scan a bill */}
          <TouchableOpacity style={styles.optionItem} onPress={handleScanBill}>
            <Scan width={28} height={28} />
            <View style={styles.optionTexts}>
              <Text style={styles.optionTitle}>Scan a bill</Text>
              <Text style={styles.optionDescription}>
                Take a picture of your document or upload a PDF - we'll handle the rest
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Option 2: Get a quote */}
          <TouchableOpacity style={styles.optionItem} onPress={handleGetQuote}>
            <QuoteIcon width={28} height={28} color="#181818" />
            <View style={styles.optionTexts}>
              <Text style={styles.optionTitle}>Get a quote</Text>
              <Text style={styles.optionDescription}>
                Market check for a new acquisition or potential switch
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Option 3: Add site manually */}
          <TouchableOpacity style={styles.optionItem} onPress={handleAddManually}>
            <SiteIcon width={28} height={28} />
            <View style={styles.optionTexts}>
              <Text style={styles.optionTitle}>Add site manually</Text>
              <Text style={styles.optionDescription}>
                No bill? Tell us the address and we'll set it up for you
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.maybeLaterButton} onPress={handleMaybeLater}>
          <Text style={styles.maybeLaterText}>Maybe later</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28
  },
  sheetIndicator: {
    backgroundColor: "#e2e8f0",
    width: 48,
    height: 4
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32
  },
  header: {
    alignItems: "flex-start",
    marginBottom: 24
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    fontFamily: "System",
    textAlign: "left"
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    fontFamily: "System",
    textAlign: "left",
    marginTop: 6
  },
  optionsList: {
    gap: 12
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9"
  },

  optionTexts: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    fontFamily: "System"
  },
  optionDescription: {
    fontSize: 13,
    color: "#64748b",
    fontFamily: "System",
    marginTop: 2,
    lineHeight: 18
  },
  maybeLaterButton: {
    paddingVertical: 16,
    marginTop: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  maybeLaterText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "System"
  }
});
