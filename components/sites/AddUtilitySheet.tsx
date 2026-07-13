import { useAuth } from '@/lib/auth';
import { isValidUKPostcode } from "@/lib/validation";
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetFooter, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import React, { useCallback, useState, useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, Platform, Keyboard } from 'react-native';
import { NativeViewGestureHandler } from 'react-native-gesture-handler';
import Toast from "react-native-toast-message";
import { styles } from './sites.styles';

interface AddressSuggestion {
  placeId: string;
  description: string;
}

export const AddUtilitySheet = ({ bottomSheetRef, businesses, sites, onSubmit, initialBusinessId, initialSiteId, onDismiss }: any) => {
    const { user } = useAuth();
    const [step, setStep] = useState(1); // 1: Business, 2: Site Selection, 3: Fuel/Supplier, 4: Contract, 5: Email
    const [formType, setFormType] = useState("newBusiness");
    const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [postcodes, setPostcodes] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isWaterDropdownOpen, setIsWaterDropdownOpen] = useState(false);

    // Site selection states
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
    const [newSiteName, setNewSiteName] = useState("");
    const [newSiteAddress, setNewSiteAddress] = useState("");
    const [newSitePostcode, setNewSitePostcode] = useState("");
    const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);

    const [step1Suggestions, setStep1Suggestions] = useState<AddressSuggestion[]>([]);
    const [step2Suggestions, setStep2Suggestions] = useState<AddressSuggestion[]>([]);

    const handleAddressSearch = async (text: string, isStep1: boolean) => {
        if (isStep1) {
            setFormData(prev => ({ ...prev, address: text }));
        } else {
            setNewSiteAddress(text);
        }

        if (!text || text.length < 3) {
            if (isStep1) setStep1Suggestions([]);
            else setStep2Suggestions([]);
            return;
        }

        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return;
        }

        try {
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${apiKey}&components=country:gb&types=address`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.predictions) {
                const results = data.predictions.map((p: any) => ({
                    placeId: p.place_id,
                    description: p.description,
                }));
                if (isStep1) setStep1Suggestions(results);
                else setStep2Suggestions(results);
            }
        } catch (error) {
            console.error("Error fetching places autocomplete:", error);
        }
    };

    const handleSelectSuggestion = async (suggestion: AddressSuggestion, isStep1: boolean) => {
        if (isStep1) {
            setStep1Suggestions([]);
        } else {
            setStep2Suggestions([]);
        }

        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) return;

        try {
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.placeId}&fields=address_components,formatted_address&key=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.result) {
                const components = data.result.address_components || [];
                const postalCodeComponent = components.find((c: any) => c.types.includes("postal_code"));
                const postcode = postalCodeComponent ? postalCodeComponent.long_name : "";

                const streetNumber = components.find((c: any) => c.types.includes("street_number"))?.long_name || "";
                const route = components.find((c: any) => c.types.includes("route"))?.long_name || "";
                const town = components.find((c: any) => c.types.includes("postal_town") || c.types.includes("locality"))?.long_name || "";

                const addressLine = `${streetNumber} ${route}`.trim() + (town ? `, ${town}` : "");
                const finalAddress = addressLine || data.result.formatted_address;

                if (isStep1) {
                    setFormData(prev => ({
                        ...prev,
                        address: finalAddress,
                        postcode: postcode.toUpperCase(),
                    }));
                } else {
                    setNewSiteAddress(finalAddress);
                    setNewSitePostcode(postcode.toUpperCase());
                }
            }
        } catch (error) {
            console.error("Error fetching place details:", error);
        }
    };

    // Effect to handle initialBusinessId & initialSiteId when sheet opens
    React.useEffect(() => {
        if (initialBusinessId && businesses.length > 0) {
            setSelectedBusinessIds([initialBusinessId]);
            setFormType("existing");
            if (initialSiteId) {
                setSelectedSiteId(initialSiteId);
                setStep(3); // Skip straight to fuel selection if site is preselected
            } else {
                setSelectedSiteId(null);
                setStep(2);
            }
        }
    }, [initialBusinessId, initialSiteId, businesses]);

    const [formData, setFormData] = useState({
        businessName: "",
        address: "",
        postcode: "",
        email: user?.email || "",
        siteName: "Primary Site",
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

    const waterSuppliers = [
        "Advanced Demand Side Management (ADSM)",
        "Blue Business Water",
        "Brightwater",
        "Cambrian Utilities",
        "Castle Water",
        "Clear Business Water",
        "ConservAqua",
        "Commercial Water Solutions",
        "Everflow",
        "First Business Water",
        "Intelligent Business Water (Scotland)",
        "Olympos Water",
        "Pennon Water Services",
        "Pinnacle Business Water",
        "Pure (CGV) Limited",
        "Scottish Water Business Stream",
        "SES Business Water",
        "Source4Business",
        "Smarta Water",
        "The Water Retail Company Limited",
        "Veolia Water Retail (UK)",
        "Water Plus",
        "Water 2 Business",
        "Waterscan",
        "Wave Utilities",
        "Yu Water",
        "Other/Not Sure",
    ];

    const telecomSuppliers = [
        "BT", "Virgin Media", "Sky", "TalkTalk", "Other/Not Sure"
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

    const businessSites = useMemo(() => {
        const activeBizId = selectedBusinessIds[0];
        if (!activeBizId || !sites) return [];
        return sites.filter((s: any) => s.businessId === activeBizId);
    }, [selectedBusinessIds, sites]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (formType === "newBusiness") {
                const newBusinessId = `B${Date.now()}`;
                const newBusiness = {
                    id: newBusinessId,
                    name: formData.businessName,
                    address: formData.address || formData.postcode,
                    postcode: formData.postcode,
                    siteName: formData.siteName || "Primary Site",
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
                // Existing businesses - create contracts for the selected site/business x each selected fuel
                const existingContracts: any[] = [];
                const bizId = selectedBusinessIds[0];

                selectedFuels.forEach(fuel => {
                    const fd = fuelDetails[fuel] || {};
                    existingContracts.push({
                        meterId: fd.meterId || "",
                        businessId: bizId,
                        siteId: selectedSiteId === "new" ? "new" : selectedSiteId,
                        newSiteName: selectedSiteId === "new" ? newSiteName : undefined,
                        newSiteAddress: selectedSiteId === "new" ? newSiteAddress : undefined,
                        fuel: fuel,
                        end: fd.expiryWindow || "",
                        status: "pending",
                        rate: "TBD",
                        usage: "TBD",
                        cost: 0,
                        supplier: fd.supplier || "",
                        email: formData.email,
                        postcode: selectedSiteId === "new" ? newSitePostcode : (businessSites.find((s: any) => s.id === selectedSiteId)?.address || ""),
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

    const handleClose = useCallback(() => {
        bottomSheetRef.current?.dismiss();
        // Reset form after closing
        setTimeout(() => {
            setStep(1);
            setFormType("newBusiness");
            setSelectedBusinessIds([]);
            setPostcodes({});
            setIsDropdownOpen(false);
            setIsWaterDropdownOpen(false);
            setFormData({
                businessName: "",
                address: "",
                postcode: "",
                email: user?.email || "",
                siteName: "Primary Site",
            });
            setSelectedFuels([]);
            setFuelDetails({});

            // Reset site states
            setSelectedSiteId(null);
            setNewSiteName("");
            setNewSiteAddress("");
            setNewSitePostcode("");
            setIsSiteDropdownOpen(false);
        }, 300);
        if (onDismiss) onDismiss();
    }, [bottomSheetRef, user?.email, onDismiss]);

    const handleBack = useCallback(() => {
        if (step === 3 && initialSiteId) {
            setStep(1);
        } else if (step === 3 && formType === "newBusiness") {
            setStep(1); // Skip postcode step for new business
        } else if (step > 1) {
            if (initialBusinessId && step === 2) return;
            setStep((s) => s - 1);
        }
    }, [step, formType, initialBusinessId, initialSiteId]);

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
            ? formData.businessName && formData.address.trim() !== "" && formData.siteName.trim() !== "" && isValidUKPostcode(formData.postcode)
            : selectedBusinessIds.length > 0;

    const isStep2Valid =
        step === 2 &&
        selectedSiteId !== null &&
        (selectedSiteId !== "new" ||
            (newSiteName.trim() !== "" &&
                newSiteAddress.trim() !== "" &&
                newSitePostcode.trim() !== "" &&
                isValidUKPostcode(newSitePostcode)));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const getStepTitle = () => {
        if (step === 1) return "Business details";
        if (step === 2) return "Select Site";
        if (step === 3) return "Select utilities";
        if (step >= 4 && step < 4 + selectedFuels.length) {
            const fuel = selectedFuels[step - 4];
            return `${fuel} details`;
        }
        if (step === 4 + selectedFuels.length) return "";
        return "Add utility";
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

    const renderHeader = useCallback(
        () => (
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
        ),
        [step, initialBusinessId, handleBack, handleClose, getStepTitle]
    );

    const renderFooter = useCallback(
        (props: any) => (
            <BottomSheetFooter {...props} bottomInset={0}>
                <View style={[styles.buttonContainer, { paddingHorizontal: 24, paddingBottom: 24, backgroundColor: '#fff' }]}>
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
                    </TouchableOpacity>
                </View>
            </BottomSheetFooter>
        ),
        [step, selectedFuels.length, isSubmitting, isCurrentStepValid, handleNext, getButtonText]
    );

    const snapPoints = useMemo(() => ['85%'], []);

    React.useEffect(() => {
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const subscription = Keyboard.addListener(hideEvent, () => {
            bottomSheetRef.current?.snapToIndex(0);
        });
        return () => subscription.remove();
    }, [bottomSheetRef]);

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            snapPoints={snapPoints}
            enableDynamicSizing={false}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.sheetBackground}
            handleComponent={renderHeader}
            footerComponent={renderFooter}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            onDismiss={onDismiss}
        >
            <BottomSheetScrollView
                style={styles.sheetBody}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[styles.sheetBodyContent, { paddingBottom: 100 }]}
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
                                    <Text style={styles.inputLabel}>Business name</Text>
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
                                    <Text style={styles.inputLabel}>Site Name</Text>
                                    <BottomSheetTextInput
                                        style={styles.input}
                                        placeholder="e.g. Primary Site, Head Office"
                                        placeholderTextColor="#94a3b8"
                                        value={formData.siteName}
                                        onChangeText={(text: string) =>
                                            setFormData({ ...formData, siteName: text })
                                        }
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Site Address</Text>
                                    <BottomSheetTextInput
                                        style={styles.input}
                                        placeholder="e.g. 100 Victoria Street"
                                        placeholderTextColor="#94a3b8"
                                        value={formData.address}
                                        onChangeText={(text: string) => handleAddressSearch(text, true)}
                                    />
                                    {step1Suggestions.length > 0 && (
                                        <ScrollView style={styles.dropdownList} keyboardShouldPersistTaps="handled">
                                            {step1Suggestions.map((item) => (
                                                <TouchableOpacity
                                                    key={item.placeId}
                                                    style={styles.dropdownItem}
                                                    onPress={() => handleSelectSuggestion(item, true)}
                                                >
                                                    <Ionicons name="location-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                                                    <Text style={styles.dropdownItemText}>{item.description}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Postcode</Text>
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
                                <Text style={styles.inputLabel}>Select business</Text>
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
                                    <NativeViewGestureHandler disallowInterruption={true}>
                                        <ScrollView style={styles.dropdownList}>
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
                                                            setSelectedBusinessIds([b.id]);
                                                            setIsDropdownOpen(false);
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
                                                )
                                            })}
                                        </ScrollView>
                                    </NativeViewGestureHandler>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* STEP 2: SITE SELECTION (Existing Business Only) */}
                {step === 2 && (
                    <View>
                        <Text style={[styles.inputLabel, { marginBottom: 16 }]}>
                            Which site is this utility for?
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Select Site</Text>
                            <TouchableOpacity
                                style={styles.dropdown}
                                onPress={() => setIsSiteDropdownOpen(!isSiteDropdownOpen)}
                            >
                                <Text
                                    style={[
                                        styles.dropdownText,
                                        selectedSiteId === null && styles.dropdownPlaceholder,
                                    ]}
                                >
                                    {selectedSiteId === null
                                        ? "Select a Site"
                                        : selectedSiteId === "new"
                                        ? "Add a new site..."
                                        : businessSites.find((s: any) => s.id === selectedSiteId)?.name || "Select a Site"}
                                </Text>
                                <Ionicons
                                    name={isSiteDropdownOpen ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color="#94a3b8"
                                />
                            </TouchableOpacity>

                            {isSiteDropdownOpen && (
                                <NativeViewGestureHandler disallowInterruption={true}>
                                    <ScrollView style={styles.dropdownList}>
                                        {/* Option to select existing sites */}
                                        {businessSites.map((s: any) => {
                                            const isSelected = selectedSiteId === s.id;
                                            return (
                                                <TouchableOpacity
                                                    key={s.id}
                                                    style={[
                                                        styles.dropdownItem,
                                                        isSelected ? styles.dropdownItemActive : null,
                                                    ]}
                                                    onPress={() => {
                                                        setSelectedSiteId(s.id);
                                                        setIsSiteDropdownOpen(false);
                                                    }}
                                                >
                                                    <View style={{ flex: 1 }}>
                                                        <Text
                                                            style={[
                                                                styles.dropdownItemText,
                                                                isSelected ? styles.dropdownItemTextActive : null,
                                                            ]}
                                                        >
                                                            {s.name}
                                                        </Text>
                                                        <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: "600" }}>
                                                            {s.address}
                                                        </Text>
                                                    </View>
                                                    {isSelected && (
                                                        <Ionicons
                                                            name="checkmark"
                                                            size={18}
                                                            color="#181818"
                                                        />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}

                                        {/* Option to create a new site */}
                                        <TouchableOpacity
                                            style={[
                                                styles.dropdownItem,
                                                selectedSiteId === "new" ? styles.dropdownItemActive : null,
                                            ]}
                                            onPress={() => {
                                                setSelectedSiteId("new");
                                                setIsSiteDropdownOpen(false);
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={[
                                                        styles.dropdownItemText,
                                                        selectedSiteId === "new" ? styles.dropdownItemTextActive : null,
                                                        { color: "#181818" }
                                                    ]}
                                                >
                                                    + Add a new site...
                                                </Text>
                                            </View>
                                            {selectedSiteId === "new" && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={18}
                                                    color="#181818"
                                                />
                                            )}
                                        </TouchableOpacity>
                                    </ScrollView>
                                </NativeViewGestureHandler>
                            )}
                        </View>

                        {/* If adding a new site, show Site Name and Address fields */}
                        {selectedSiteId === "new" && (
                            <View style={{ marginTop: 8 }}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Site Name</Text>
                                    <BottomSheetTextInput
                                        style={styles.input}
                                        placeholder="e.g. London Office, Warehouse B"
                                        placeholderTextColor="#94a3b8"
                                        value={newSiteName}
                                        onChangeText={setNewSiteName}
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Site Address</Text>
                                    <BottomSheetTextInput
                                        style={styles.input}
                                        placeholder="e.g. 100 Victoria Street"
                                        placeholderTextColor="#94a3b8"
                                        value={newSiteAddress}
                                        onChangeText={(text) => handleAddressSearch(text, false)}
                                    />
                                    {step2Suggestions.length > 0 && (
                                        <ScrollView style={styles.dropdownList} keyboardShouldPersistTaps="handled">
                                            {step2Suggestions.map((item) => (
                                                <TouchableOpacity
                                                    key={item.placeId}
                                                    style={styles.dropdownItem}
                                                    onPress={() => handleSelectSuggestion(item, false)}
                                                >
                                                    <Ionicons name="location-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                                                    <Text style={styles.dropdownItemText}>{item.description}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Site Postcode</Text>
                                    <BottomSheetTextInput
                                        style={[
                                            styles.input,
                                            newSitePostcode && !isValidUKPostcode(newSitePostcode) && { borderColor: "#ef4444", borderWidth: 1 }
                                        ]}
                                        placeholder="e.g. SW1E 5JL"
                                        placeholderTextColor="#94a3b8"
                                        value={newSitePostcode}
                                        onChangeText={(text) => setNewSitePostcode(text.toUpperCase())}
                                        autoCapitalize="characters"
                                    />
                                    {newSitePostcode && !isValidUKPostcode(newSitePostcode) && (
                                        <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                                            Please enter a valid UK postcode
                                        </Text>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* STEP 3: FUEL SELECTION */}
                {step === 3 && (
                    <View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Select utilities</Text>
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
                                    )
                                })}
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

                    const isWater = fuel === "Water";
                    const isTelecom = fuel === "Telecoms";

                    return (
                        <View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Current supplier</Text>
                                {isWater ? (
                                    <>
                                        <TouchableOpacity
                                            style={styles.dropdown}
                                            onPress={() =>
                                                setIsWaterDropdownOpen(!isWaterDropdownOpen)
                                            }
                                        >
                                            <Text
                                                style={[
                                                    styles.dropdownText,
                                                    !details.supplier && styles.dropdownPlaceholder,
                                                ]}
                                            >
                                                {details.supplier || "Select Supplier"}
                                            </Text>
                                            <Ionicons
                                                name={isWaterDropdownOpen ? "chevron-up" : "chevron-down"}
                                                size={20}
                                                color="#94a3b8"
                                            />
                                        </TouchableOpacity>
                                        {isWaterDropdownOpen && (
                                            <NativeViewGestureHandler disallowInterruption={true}>
                                                <ScrollView style={styles.dropdownList}>
                                                    {waterSuppliers.map((s) => {
                                                        const isSelected = details.supplier === s;
                                                        return (
                                                            <TouchableOpacity
                                                                key={s}
                                                                style={[
                                                                    styles.dropdownItem,
                                                                    isSelected && styles.dropdownItemActive,
                                                                ]}
                                                                onPress={() => {
                                                                    updateDetails("supplier", s);
                                                                    setIsWaterDropdownOpen(false);
                                                                }}
                                                            >
                                                                <Text
                                                                    style={[
                                                                        styles.dropdownItemText,
                                                                        isSelected && styles.dropdownItemTextActive,
                                                                    ]}
                                                                >
                                                                    {s}
                                                                </Text>
                                                                {isSelected && (
                                                                    <Ionicons
                                                                        name="checkmark"
                                                                        size={18}
                                                                        color="#4f46e5"
                                                                    />
                                                                )}
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </ScrollView>
                                            </NativeViewGestureHandler>
                                        )}
                                    </>
                                ) :
                                    isTelecom ?
                                        (
                                            <View style={styles.optionsGrid}>
                                                {telecomSuppliers.map((s) => (
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
                                        )
                                        :
                                        (
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
                                        )}
                            </View>
                            {/* {!isWater && ( */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Contract expiry</Text>
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
                                                    color="#181818"
                                                />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* )} */}
                            {!isWater && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Meter ID</Text>
                                    <BottomSheetTextInput
                                        style={styles.input}
                                        placeholder="e.g. S1234567"
                                        placeholderTextColor="#94a3b8"
                                        value={details.meterId}
                                        onChangeText={(text: string) => updateDetails("meterId", text)}
                                    />
                                </View>
                            )}
                        </View>
                    );
                })()}

                {/* FINAL STEP: EMAIL CONFIRMATION */}
                {step === 4 + selectedFuels.length && (
                    <View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>We'll send your quotes to this email address</Text>
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
                            {/* <Text style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>
                                We'll send your quotes to this email address.
                            </Text> */}
                        </View>
                    </View>
                )}
            </BottomSheetScrollView>
        </BottomSheetModal>
    );
};
