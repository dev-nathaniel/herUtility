import { useAuth } from '@/lib/auth';
import { isValidUKPostcode } from "@/lib/validation";
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetFooter, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { NativeViewGestureHandler } from 'react-native-gesture-handler';
import Toast from "react-native-toast-message";
import { styles } from './sites.styles';

export const AddUtilitySheet = ({ bottomSheetRef, businesses, onSubmit, initialBusinessId, onDismiss }: any) => {
    const { user } = useAuth();
    const [step, setStep] = useState(1); // 1: Business, 2: Postcode (Existing only), 3: Fuel/Supplier, 4: Contract, 5: Email
    const [formType, setFormType] = useState("newBusiness");
    const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [postcodes, setPostcodes] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isWaterDropdownOpen, setIsWaterDropdownOpen] = useState(false);

    // Effect to handle initialBusinessId when sheet opens
    React.useEffect(() => {
        if (initialBusinessId && businesses.length > 0) {
            const biz = businesses.find((b: any) => b.id === initialBusinessId);
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
            });
            setSelectedFuels([]);
            setFuelDetails({});
        }, 300);
    }, [bottomSheetRef, user?.email]);

    const handleBack = useCallback(() => {
        if (step === 3 && formType === "newBusiness") {
            setStep(1); // Skip postcode step for new business
        } else if (step > 1) {
            if (initialBusinessId && step === 2) return;
            setStep((s) => s - 1);
        }
    }, [step, formType, initialBusinessId]);

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
        if (step === 1) return "Business details";
        if (step === 2) return "Supply address";
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

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            enableDynamicSizing
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.sheetBackground}
            handleComponent={renderHeader}
            footerComponent={renderFooter}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
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
                                                )
                                            })}
                                        </ScrollView>
                                    </NativeViewGestureHandler>
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
                                ? "Are these the supply addresses?"
                                : "Is this the supply address?"}
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
                                        value={postcodes[bizId]?.toUpperCase() || ""}
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
