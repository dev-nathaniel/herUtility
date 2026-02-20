import type { Business as ApiBusiness, Utility as ApiUtility } from "@/hooks/api/use-business";
import { useBusinesses, useCreateBusiness, useCreateUtility, useSites } from "@/hooks/api/use-business";
import { useAuth } from "@/lib/auth/auth-context";
import { isValidUKPostcode } from "@/lib/validation";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Toast from "react-native-toast-message";

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
};

/** Determine if a contract is expiring (ends within 6 months) */
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

// --- Utility Components ---
const MeterIcon = ({ fuel }: { fuel: string }) => {
  const config: any = {
    Electricity: { icon: "flash", bg: "#fef3c7", text: "#d97706" },
    Gas: { icon: "flame", bg: "#dbeafe", text: "#2563eb" },
    Water: { icon: "water", bg: "#cffafe", text: "#0891b2" },
    Telecoms: { icon: "call", bg: "#f3e8ff", text: "#9333ea" },
  };
  const { icon, bg, text } = config[fuel] || config.Electricity;

  return (
    <View style={[styles.iconContainer, { backgroundColor: bg }]}>
      <Ionicons name={icon as any} size={18} color={text} />
    </View>
  );
};

const HeroActionCard = ({ contracts, onOpenDetails }: any) => {
  const expiringCount = contracts.length;
  if (expiringCount === 0) return null;

  return (
    <LinearGradient
      colors={["#8b5cf6", "#a855f7", "#d946ef"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.heroDecor1} />
      <View style={styles.heroDecor2} />

      <View style={styles.heroContent}>
        <View style={styles.priorityBadge}>
          <Ionicons name="time-outline" size={12} color="#fff" />
          <Text style={styles.priorityText}>PRIORITY</Text>
        </View>
        <Text style={styles.heroTitle}>Action Required</Text>
        <Text style={styles.heroDescription}>
          You have{" "}
          <Text style={styles.heroHighlight}>{expiringCount} contracts</Text>{" "}
          expiring soon. Keep your portfolio on track.
        </Text>

        <View style={styles.heroAvatars}>
          {[...Array(Math.min(3, expiringCount))].map((_, i) => (
            <View key={i} style={styles.avatarAlert}>
              <Text style={styles.avatarAlertText}>!</Text>
            </View>
          ))}
          {expiringCount > 3 && (
            <View style={styles.avatarCount}>
              <Text style={styles.avatarCountText}>+{expiringCount - 3}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.heroButton} onPress={onOpenDetails}>
          <Text style={styles.heroButtonText}>Review Now</Text>
          <Ionicons name="arrow-forward" size={18} color="#8b5cf6" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const ContractRow = ({ contract, onViewDetails }: any) => {
  const isExpiring = contract.status === "Expiring";
  
  const validEndDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const endObj = validEndDate(contract.end);
  const endDate = endObj
    ? endObj.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "";

  return (
    <TouchableOpacity
      style={styles.contractRow}
      onPress={() => onViewDetails(contract)}
    >
      <View style={styles.contractLeft}>
        <MeterIcon fuel={contract.fuel} />
        <View>
          <Text style={styles.contractFuel}>{contract.fuel}</Text>
          <Text style={styles.contractMeter}>{contract.meterId}</Text>
        </View>
      </View>

      <View style={styles.contractRight}>
        <View style={styles.contractEndDate}>
          <Text style={styles.contractEndLabel}>Ends</Text>
          <Text
            style={[
              styles.contractEndValue,
              isExpiring && styles.contractEndExpiring,
            ]}
          >
            {endDate}
          </Text>
        </View>
        <View style={styles.contractArrow}>
          <Ionicons name="arrow-forward" size={14} color="#9ca3af" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const BusinessCard = ({
  business,
  contracts,
  onAddMeter,
  onViewDetails,
}: any) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <View style={styles.businessCard}>
      <TouchableOpacity
        style={styles.businessHeader}
        onPress={() => setIsOpen(!isOpen)}
      >
        <View style={styles.businessLeft}>
          <View
            style={[styles.businessLogo, { backgroundColor: business.color }]}
          >
            <Text style={styles.businessLogoText}>{business.logo}</Text>
          </View>
          <View style={styles.businessInfo}>
            <Text
              style={styles.businessName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {business.name}
            </Text>
            <View style={styles.businessAddress}>
              <MaterialIcons name="business" size={10} color="#cbd5e1" />
              <Text style={styles.businessAddressText} numberOfLines={1}>
                {business.postcode || business.address}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.businessActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={(e) => {
              e.stopPropagation();
              onAddMeter(business.id, business.name);
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.chevronButton}>
            <Ionicons
              name={isOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color="#cbd5e1"
            />
          </View>
        </View>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.contractsContainer}>
          {contracts.length > 0 ? (
            contracts.map((contract: any) => (
              <ContractRow
                key={contract.id}
                contract={contract}
                onViewDetails={onViewDetails}
              />
            ))
          ) : (
            <View style={styles.emptyContracts}>
              <Text style={styles.emptyContractsText}>
                No services connected.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// --- Bottom Sheets ---
const ExpiringContractsSheet = ({
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

const ContractDetailsSheet = ({ bottomSheetRef, contract, business }: any) => {
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

  if (!contract) return null;
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
};

const AddUtilitySheet = ({ bottomSheetRef, businesses, onSubmit, initialBusinessId, onDismiss }: any) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: Business, 2: Postcode (Existing only), 3: Fuel/Supplier, 4: Contract, 5: Email
  const [formType, setFormType] = useState("newBusiness");
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [postcodes, setPostcodes] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Effect to handle initialBusinessId when sheet opens
  React.useEffect(() => {
    if (initialBusinessId && businesses.length > 0) {
      const biz = businesses.find((b:any) => b.id === initialBusinessId);
      if (biz) {
         setPostcodes(prev => ({
            ...prev,
            [initialBusinessId]: biz.postcode || biz.address || ""
         }));
      }
      setSelectedBusinessIds([initialBusinessId]);
      setFormType("existing");
      // If we pre-select, we might skip to step 2 or 3 depending on flow.
      // But user likely wants to confirm details. Let's go to step 2 (postcode)
      setStep(2);
    } 
  }, [initialBusinessId, businesses]);

  const [formData, setFormData] = useState({
    businessName: "",
    address: "",
    postcode: "",
    email: user?.email || "",
  });

  const [selectedFuels, setSelectedFuels] = useState<string[]>([]);
  const [fuelDetails, setFuelDetails] = useState<Record<string, { supplier: string; expiryWindow: string; meterId: string }>>({});

  // Update email if user changes (e.g. initial load)
  React.useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user?.email]);

  const suppliers = [
    "British Gas",
    "E.On",
    "nPower",
    "Scottish Power",
    "Opus Energy",
    "I don't know",
  ];

  const expiryOptions = [
    { label: "Don't know", value: "unknown" },
    { label: "Not in a contract", value: "no_contract" },
    { label: "Under 6 months", value: "under_6" },
    { label: "6 to 12 months", value: "6_to_12" },
    { label: "Over 12 months", value: "over_12" },
  ];

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

  const handleNext = () => {
    if (step === 1) {
      if (
        formType === "newBusiness" &&
        (!formData.businessName || (!formData.address && !formData.postcode))
      )
        return;
      if (formType === "existing" && selectedBusinessIds.length === 0) return;

      if (formType === "newBusiness") {
        setStep(3);
      } else {
        setPostcodes(prev => {
           const next = { ...prev };
           selectedBusinessIds.forEach(id => {
             if (next[id] === undefined) {
                const biz = businesses.find((b: any) => b.id === id);
                if (biz) {
                    next[id] = biz.postcode || biz.address || "";
                } else {
                    next[id] = "";
                }
             }
           });
           return next;
        });
        setStep(2);
      }
    } else if (step === 2) {
      if (!isStep2Valid) return;
      setStep(3);
    } else if (step === 3) {
      if (selectedFuels.length === 0) return;
      setStep(4);
    } else if (step >= 4 && step < 4 + selectedFuels.length) {
      const fuelIndex = step - 4;
      const fuel = selectedFuels[fuelIndex];
      const details = fuelDetails[fuel] || {};
      if (!details.supplier || !details.expiryWindow) return;
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const calculateEndDate = (window: string) => {
    const today = new Date();
    switch (window) {
      case "no_contract":
        return today.toISOString().split("T")[0]; // Urgent/Today
      case "under_6":
        return new Date(today.setMonth(today.getMonth() + 3))
          .toISOString()
          .split("T")[0];
      case "6_to_12":
        return new Date(today.setMonth(today.getMonth() + 9))
          .toISOString()
          .split("T")[0];
      case "over_12":
        return new Date(today.setMonth(today.getMonth() + 15))
          .toISOString()
          .split("T")[0];
      case "unknown":
      default:
        return new Date(today.setMonth(today.getMonth() + 1))
          .toISOString()
          .split("T")[0]; // Treat unknown as needing attention soon
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (formType === "newBusiness") {
        const newBusinessId = `B${Date.now()}`;
        const newBusiness = {
          id: newBusinessId,
          name: formData.businessName,
          address: formData.address || "",
          postcode: formData.postcode,
          logo: formData.businessName.slice(0, 2).toUpperCase(),
          color: "#6366f1",
        };

        const newContracts = selectedFuels.map(fuel => {
           const fd = fuelDetails[fuel] || {};
           return {
             meterId: fd.meterId || "",
             businessId: newBusinessId,
             fuel: fuel,
             end: fd.expiryWindow || "",
             status: "pending",
             rate: "TBD",
             usage: "TBD",
             cost: 0,
             supplier: fd.supplier || "",
             email: formData.email,
             postcode: formData.postcode,
           };
        });

        await onSubmit({ newBusiness, newContracts });
      } else {
        // Existing businesses - create contracts for each selected business x each selected fuel
        const existingContracts: any[] = [];
        selectedBusinessIds.forEach(bizId => {
           selectedFuels.forEach(fuel => {
              const fd = fuelDetails[fuel] || {};
              existingContracts.push({
                 meterId: fd.meterId || "",
                 businessId: bizId,
                 fuel: fuel,
                 end: fd.expiryWindow || "",
                 status: "pending",
                 rate: "TBD",
                 usage: "TBD",
                 cost: 0,
                 supplier: fd.supplier || "",
                 email: formData.email,
                 postcode: postcodes[bizId],
              });
           });
        });

        await onSubmit({ existingContracts });
      }
      
      handleClose();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Submission Failed",
        text2: error?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    bottomSheetRef.current?.close();
    // Reset form after closing
    setTimeout(() => {
      setStep(1);
      setFormType("newBusiness");
      setSelectedBusinessIds([]);
      setPostcodes({});
      setIsDropdownOpen(false);
      setFormData({
        businessName: "",
        address: "",
        postcode: "",
        email: user?.email || "",
      });
      setSelectedFuels([]);
      setFuelDetails({});
    }, 300);
  };

  const handleBack = () => {
    if (step === 3 && formType === "newBusiness") {
      setStep(1); // Skip postcode step for new business
    } else if (step > 1) {
      if (initialBusinessId && step === 2) return;
      setStep(step - 1);
    }
  };

  const getSelectedBusinessLabel = () => {
    if (selectedBusinessIds.length === 0) return "Select Business";
    if (selectedBusinessIds.length === 1) {
      const b = businesses.find((b: any) => b.id === selectedBusinessIds[0]);
      return b?.name || "Select Business";
    }
    return `${selectedBusinessIds.length} Businesses Selected`;
  };

  const isStep1Valid =
    formType === "newBusiness"
      ? formData.businessName && isValidUKPostcode(formData.postcode)
      : selectedBusinessIds.length > 0;

  const isStep2Valid =
    step === 2 &&
    selectedBusinessIds.every(
      (id) => postcodes[id] && isValidUKPostcode(postcodes[id]),
    );

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const getStepTitle = () => {
    if (step === 1) return "Business Details";
    if (step === 2) return "Supply Address";
    if (step === 3) return "Select Utilities";
    if (step >= 4 && step < 4 + selectedFuels.length) {
       const fuel = selectedFuels[step - 4];
       return `${fuel} Details`;
    }
    if (step === 4 + selectedFuels.length) return "Confirm Email";
    return "Add Utility";
  };

  const getButtonText = () => {
    if (step === 4 + selectedFuels.length) return "Get Quote";
    return "Next";
  };

  const isCurrentStepValid = () => {
    if (step === 1) return isStep1Valid;
    if (step === 2) return isStep2Valid;
    if (step === 3) return selectedFuels.length > 0;
    if (step >= 4 && step < 4 + selectedFuels.length) {
       const fuel = selectedFuels[step - 4];
       const details = fuelDetails[fuel] || {};
       return !!details.supplier && !!details.expiryWindow;
    }
    if (step === 4 + selectedFuels.length) {
       return formData.email && emailRegex.test(formData.email);
    }
    return false;
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetIndicator}
      maxDynamicContentSize={700}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onDismiss={onDismiss}
    >
      <BottomSheetView>
        <View style={styles.sheetHeader}>
          {step > 1 && !(initialBusinessId && step === 2) && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
          <Text style={styles.sheetTitle}>{getStepTitle()}</Text>
          <TouchableOpacity style={styles.sheetClose} onPress={handleClose}>
            <Ionicons name="close" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Step Indicator */}
        {/* <View style={styles.stepIndicator}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                s === step && styles.stepDotActive,
                s < step && styles.stepDotCompleted,
              ]}
            />
          ))}
        </View> */}

        <ScrollView
          style={styles.sheetBody}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.sheetBodyContent}
        >
          {/* STEP 1: BUSINESS INFO */}
          {step === 1 && (
            <View>
              <View style={styles.formToggle}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    formType === "newBusiness" && styles.toggleButtonActive,
                  ]}
                  onPress={() => {
                    setFormType("newBusiness");
                    setSelectedBusinessIds([]);
                  }}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      formType === "newBusiness" && styles.toggleTextActive,
                    ]}
                  >
                    New Business
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    formType === "existing" && styles.toggleButtonActive,
                  ]}
                  onPress={() => setFormType("existing")}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      formType === "existing" && styles.toggleTextActive,
                    ]}
                  >
                    Existing
                  </Text>
                </TouchableOpacity>
              </View>

              {formType === "newBusiness" ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>BUSINESS NAME</Text>
                    <BottomSheetTextInput
                      style={styles.input}
                      placeholder="e.g. Acme Corp"
                      placeholderTextColor="#94a3b8"
                      value={formData.businessName}
                      onChangeText={(text: string) =>
                        setFormData({ ...formData, businessName: text })
                      }
                    />
                  </View>
                  <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>POSTCODE</Text>
                      <BottomSheetTextInput
                        style={[
                          styles.input,
                          formData.postcode && !isValidUKPostcode(formData.postcode) && { borderColor: "#ef4444", borderWidth: 1 }
                        ]}
                        placeholder="e.g. SW1A 1AA"
                        placeholderTextColor="#94a3b8"
                        value={formData.postcode}
                        onChangeText={(text: string) =>
                          setFormData({ ...formData, postcode: text.toUpperCase() })
                        }
                        autoCapitalize="characters"
                      />
                      {formData.postcode && !isValidUKPostcode(formData.postcode) && (
                        <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                          Please enter a valid UK postcode
                        </Text>
                      )}
                    </View>
                </>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>SELECT BUSINESS</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        selectedBusinessIds.length === 0 && styles.dropdownPlaceholder,
                      ]}
                    >
                      {getSelectedBusinessLabel()}
                    </Text>
                    <Ionicons
                      name={isDropdownOpen ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                  {isDropdownOpen && (
                    <View style={styles.dropdownList}>
                      {businesses.map((b: any) => {
                         const isSelected = selectedBusinessIds.includes(b.id);
                         return (
                        <TouchableOpacity
                          key={b.id}
                          style={[
                            styles.dropdownItem,
                            isSelected &&
                              styles.dropdownItemActive,
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedBusinessIds(ids => ids.filter(id => id !== b.id));
                            } else {
                              setSelectedBusinessIds(ids => [...ids, b.id]);
                            }
                          }}
                        >
                          <View
                            style={[
                              styles.dropdownItemLogo,
                              { backgroundColor: b.color },
                            ]}
                          >
                            <Text style={styles.dropdownItemLogoText}>
                              {b.logo}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.dropdownItemText,
                              isSelected &&
                                styles.dropdownItemTextActive,
                            ]}
                          >
                            {b.name}
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark"
                              size={18}
                              color="#4f46e5"
                            />
                          )}
                        </TouchableOpacity>
                      )})}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
          
          {/* STEP 2: POSTCODE (Existing Business Only) */}
          {step === 2 && (
             <View>
               <Text style={[styles.inputLabel, { marginBottom: 16 }]}>
                 {selectedBusinessIds.length > 1 
                   ? "ARE THESE THE SUPPLY ADDRESSES?" 
                   : "IS THIS THE SUPPLY ADDRESS?"}
               </Text>
               
               {selectedBusinessIds.map(bizId => {
                 const biz = businesses.find((b: any) => b.id === bizId);
                 return (
                   <View key={bizId} style={[styles.inputGroup, { marginBottom: 12 }]}>
                     <Text style={[styles.inputLabel, { fontSize: 10, marginBottom: 4 }]}>{biz?.name?.toUpperCase()}</Text>
                     <BottomSheetTextInput
                       style={styles.input}
                       placeholder="Enter Postcode"
                       placeholderTextColor="#94a3b8"
                       value={postcodes[bizId] || ""}
                       onChangeText={(text) => {
                         setPostcodes(prev => ({ ...prev, [bizId]: text.toUpperCase() }));
                       }}
                       autoCapitalize="characters"
                     />
                   </View>
                 )
               })}
             </View>
          )}

          {/* STEP 3: FUEL SELECTION */}
          {step === 3 && (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SELECT UTILITIES</Text>
                <View style={styles.fuelTypeGrid}>
                  {["Electricity", "Gas", "Water", "Telecoms"].map((f) => {
                    const isSelected = selectedFuels.includes(f);
                    return (
                    <TouchableOpacity
                      key={f}
                      style={[
                        styles.fuelButton,
                        isSelected && styles.fuelButtonActive,
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedFuels(selectedFuels.filter(fuel => fuel !== f));
                        } else {
                          setSelectedFuels([...selectedFuels, f]);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.fuelText,
                          isSelected && styles.fuelTextActive,
                        ]}
                      >
                        {f}
                      </Text>
                    </TouchableOpacity>
                  )})}
                </View>
              </View>
            </View>
          )}

          {/* DYNAMIC STEPS: FOR EACH SELECTED FUEL */}
          {step >= 4 && step < 4 + selectedFuels.length && (() => {
             const fuel = selectedFuels[step - 4];
             const details = fuelDetails[fuel] || { supplier: "", expiryWindow: "", meterId: "" };
             
             const updateDetails = (key: string, value: string) => {
                setFuelDetails(prev => ({
                   ...prev,
                   [fuel]: {
                      ...(prev[fuel] || { supplier: "", expiryWindow: "", meterId: "" }),
                      [key]: value
                   }
                }));
             };

             return (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CURRENT {fuel.toUpperCase()} SUPPLIER</Text>
                <View style={styles.optionsGrid}>
                  {suppliers.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.optionButton,
                        details.supplier === s && styles.optionButtonActive,
                      ]}
                      onPress={() => updateDetails("supplier", s)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          details.supplier === s && styles.optionTextActive,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONTRACT EXPIRY</Text>
                <View style={styles.expiryList}>
                  {expiryOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.expiryOption,
                        details.expiryWindow === opt.value &&
                          styles.expiryOptionActive,
                      ]}
                      onPress={() => updateDetails("expiryWindow", opt.value)}
                    >
                      <Text
                        style={[
                          styles.expiryOptionText,
                          details.expiryWindow === opt.value &&
                            styles.expiryOptionTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {details.expiryWindow === opt.value && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#4f46e5"
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>METER ID (OPTIONAL)</Text>
                <BottomSheetTextInput
                  style={styles.input}
                  placeholder="e.g. S1234567"
                  placeholderTextColor="#94a3b8"
                  value={details.meterId}
                  onChangeText={(text: string) => updateDetails("meterId", text)}
                />
              </View>
            </View>
          );})()}

          {/* FINAL STEP: EMAIL CONFIRMATION */}
          {step === 4 + selectedFuels.length && (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONFIRM EMAIL ADDRESS</Text>
                <BottomSheetTextInput
                  style={styles.input}
                  placeholder="e.g. your@email.com"
                  placeholderTextColor="#94a3b8"
                  value={formData.email}
                  onChangeText={(text: string) =>
                    setFormData({ ...formData, email: text })
                  }
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                />
                <Text style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>
                  We'll send your quotes to this email address.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isCurrentStepValid() || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={!isCurrentStepValid() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{getButtonText()}</Text>
              )}
              {step < 4 + selectedFuels.length && !isSubmitting && (
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#fff"
                  style={{ marginLeft: 8 }}
                />
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

// --- Main App ---
export default function TabOneScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Fetch real data from API
  const businessesQuery = useBusinesses();
  const sitesQuery = useSites();
  const createBusinessMutation = useCreateBusiness();
  const createUtilityMutation = useCreateUtility();

  const [selectedContractData, setSelectedContractData] = useState<any>(null);

  const addSheetRef = useRef<BottomSheetModal>(null);
  const expiringSheetRef = useRef<BottomSheetModal>(null);
  const detailsSheetRef = useRef<BottomSheetModal>(null);

  const [preselectedBusinessId, setPreselectedBusinessId] = useState<string | null>(null);

  // Map API businesses to UI shape
  const businesses = useMemo(() => {
    const apiBusinesses = businessesQuery.data?.data?.businesses ?? [];
    return apiBusinesses.map((b, i) => mapBusiness(b, i));
  }, [businessesQuery.data]);

  console.log(businesses);

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
    // console.log(result);
    return result;
  }, [sitesQuery.data, businessesQuery.data]);

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
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>WELCOME BACK</Text>
          <Text style={styles.headerTitle}>My Portfolio</Text>
        </View>
        <TouchableOpacity 
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
      </View>

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
          <HeroActionCard
            contracts={expiringContracts}
            onOpenDetails={() => expiringSheetRef.current?.present()}
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Businesses</Text>
            <TouchableOpacity
              style={styles.addQuoteButton}
              onPress={() => {
                setPreselectedBusinessId(null);
                addSheetRef.current?.present();
              }}
            >
              <Ionicons name="add-circle" size={16} color="#fff" />
              <Text style={styles.addQuoteText}>Get a Quote</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    backgroundColor: "#f8fafc",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#1e293b" },
  profileImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#fff",
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 32,
    padding: 24,
    marginBottom: 32,
    overflow: "hidden",
  },
  heroDecor1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 80,
  },
  heroDecor2: {
    position: "absolute",
    bottom: 0,
    right: 80,
    width: 96,
    height: 96,
    backgroundColor: "rgba(236,72,153,0.2)",
    borderRadius: 48,
  },
  heroContent: { zIndex: 10 },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  priorityText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    marginBottom: 16,
    lineHeight: 24,
  },
  heroHighlight: {
    fontWeight: "700",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  heroAvatars: { flexDirection: "row", marginBottom: 24 },
  avatarAlert: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "#a855f7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: -8,
  },
  avatarAlertText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  avatarCount: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#a855f7",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarCountText: { color: "#8b5cf6", fontWeight: "700", fontSize: 10 },
  heroButton: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroButtonText: {
    color: "#8b5cf6",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  addQuoteButton: {
    backgroundColor: "#6366f1",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addQuoteText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  businessCard: {
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  businessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  businessLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  businessLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  businessLogoText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  businessInfo: {
    flex: 1,
    minWidth: 0,
  },
  businessName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  businessAddress: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  businessAddressText: {
    fontSize: 12,
    color: "#cbd5e1",
    fontWeight: "500",
    marginLeft: 4,
    flexShrink: 1,
  },
  businessActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  chevronButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  contractsContainer: {
    marginHorizontal: 8,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  contractRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 4,
  },
  contractLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  contractFuel: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  contractMeter: {
    fontSize: 12,
    color: "#cbd5e1",
    fontWeight: "500",
    marginTop: 2,
  },
  contractRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  contractEndDate: { alignItems: "flex-end" },
  contractEndLabel: { fontSize: 10, color: "#cbd5e1", fontWeight: "500" },
  contractEndValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginTop: 2,
  },
  contractEndExpiring: { color: "#f43f5e" },
  contractArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContracts: { padding: 24, alignItems: "center" },
  emptyContractsText: { fontSize: 14, color: "#cbd5e1" },
  sheetBackground: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  sheetIndicator: {
    backgroundColor: "#cbd5e1",
    width: 40,
    height: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    textAlign: "center",
  },
  backButton: {
    width: 32,
    height: 32,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  sheetClose: {
    width: 32,
    height: 32,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetBody: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
    maxHeight: 600,
  },
  modalDescription: {
    color: "#64748b",
    marginBottom: 16,
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 8,
  },
  expiringItem: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  expiringLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  expiringIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  expiringBusiness: { fontWeight: "700", color: "#1e293b", fontSize: 14 },
  expiringDetails: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginTop: 2,
  },
  expiringArrow: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailsBusinessCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  detailsLogo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  detailsLogoText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  detailsBusinessName: { fontWeight: "700", color: "#1e293b", fontSize: 16 },
  detailsBusinessAddress: {
    fontSize: 12,
    color: "#cbd5e1",
    fontWeight: "500",
    marginTop: 2,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  detailsItem: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    width: "47%",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  detailsLabel: {
    fontSize: 10,
    color: "#cbd5e1",
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailsValue: { fontWeight: "700", color: "#475569" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusExpiring: { backgroundColor: "#fee2e2" },
  statusExpired: { backgroundColor: "#fecaca" },
  statusActive: { backgroundColor: "#d1fae5" },
  statusPending: { backgroundColor: "#ffedd5" },
  statusText: { fontSize: 12, fontWeight: "700" },
  statusTextExpiring: { color: "#f43f5e" },
  statusTextExpired: { color: "#ef4444" },
  statusTextActive: { color: "#059669" },
  statusTextPending: { color: "#ea580c" },
  detailsButton: {
    paddingVertical: 16,
    borderRadius: 16,
    fontWeight: "700",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: "center",
  },
  detailsButtonExpiring: { backgroundColor: "#f43f5e" },
  detailsButtonExpired: { backgroundColor: "#ef4444" },
  detailsButtonActive: { backgroundColor: "#1e293b" },
  detailsButtonPending: { backgroundColor: "#fb923c" },
  detailsButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  formToggle: {
    backgroundColor: "#f1f5f9",
    padding: 4,
    borderRadius: 16,
    flexDirection: "row",
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: { fontSize: 14, fontWeight: "700", color: "#cbd5e1" },
  toggleTextActive: { color: "#6366f1" },
  input: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
    marginBottom: 16,
  },
  inputPlaceholder: { color: "#94a3b8" },
  fuelTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  fuelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    width: "47%",
    alignItems: "center",
  },
  fuelButtonActive: { borderColor: "#6366f1", backgroundColor: "#eef2ff" },
  fuelText: { fontSize: 12, fontWeight: "700", color: "#cbd5e1" },
  fuelTextActive: { color: "#6366f1" },
  submitButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    alignItems: "center",
    marginTop: 0,
    flexDirection: "row",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#cbd5e1",
    shadowColor: "#cbd5e1",
  },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  
  // New styles for multi-step Add Utility modal
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  businessList: {
    gap: 8,
  },
  businessOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  businessOptionActive: {
    borderColor: "#6366f1",
    backgroundColor: "#eef2ff",
  },
  businessOptionLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  businessOptionLogoText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  businessOptionName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  businessOptionNameActive: {
    color: "#1e293b",
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  optionButtonActive: {
    borderColor: "#6366f1",
    backgroundColor: "#eef2ff",
  },
  optionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  optionTextActive: {
    color: "#6366f1",
  },
  expiryList: {
    gap: 8,
  },
  expiryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  expiryOptionActive: {
    borderColor: "#6366f1",
    backgroundColor: "#eef2ff",
  },
  expiryOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  expiryOptionTextActive: {
    color: "#1e293b",
    fontWeight: "600",
  },
  
  // Step indicator styles
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
  },
  stepDotActive: {
    width: 24,
    backgroundColor: "#6366f1",
  },
  stepDotCompleted: {
    backgroundColor: "#6366f1",
  },
  
  // Sheet body content styles
  sheetBodyContent: {
    paddingBottom: 24,
  },
  
  // Dropdown styles
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  dropdownPlaceholder: {
    color: "#94a3b8",
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dropdownItemActive: {
    backgroundColor: "#eef2ff",
  },
  dropdownItemLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dropdownItemLogoText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  dropdownItemTextActive: {
    color: "#1e293b",
    fontWeight: "600",
  },
  
  // Button container
  buttonContainer: {
    marginTop: 0,
    paddingBottom: 8,
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "500",
    color: "#94a3b8",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
