const fs = require('fs');

let content = fs.readFileSync('app/(tabs)/index.tsx', 'utf8');

// 1. Replace State
const oldStateBlock = `  const [formData, setFormData] = useState({
    businessName: "",
    address: "",
    postcode: "",
    meterId: "",
    fuelType: "Electricity",
    supplier: "",
    expiryWindow: "", // 'unknown', 'no_contract', 'under_6', '6_to_12', 'over_12'
    email: user?.email || "",
  });`;

const newStateBlock = `  const [formData, setFormData] = useState({
    businessName: "",
    address: "",
    postcode: "",
    email: user?.email || "",
  });

  const [selectedFuels, setSelectedFuels] = useState<string[]>([]);
  const [fuelDetails, setFuelDetails] = useState<Record<string, { supplier: string; expiryWindow: string; meterId: string }>>({});`;
content = content.replace(oldStateBlock, newStateBlock);

// 2. Replace handleNext
const oldHandleNext = `  const handleNext = () => {
    if (step === 1) {
      if (
        formType === "newBusiness" &&
        (!formData.businessName || (!formData.address && !formData.postcode))
      )
        return;
      if (formType === "existing" && selectedBusinessIds.length === 0) return;

      // New business -> Skip Postcode step (Step 2) -> Step 3
      if (formType === "newBusiness") {
        setStep(3);
      } else {
        // Only initialize postcodes if not already set (preserve edits)
        setPostcodes(prev => {
           const next = { ...prev };
           selectedBusinessIds.forEach(id => {
             if (next[id] === undefined) {
                // Try to find postcode in address
                const biz = businesses.find((b: any) => b.id === id);
                if (biz) {
                    // Start with explicit postcode field, fallback to address if not present
                    next[id] = biz.postcode || biz.address || "";
                } else {
                    next[id] = "";
                }
             }
           });
           return next;
        });
        setStep(2); // Go to Postcode step
      }
    } else if (step === 2) {
      if (!isStep2Valid) return; // Enforce validation
      setStep(3);
    } else if (step === 3) {
      if (!formData.supplier) return;
      setStep(4);
    } else if (step === 4) {
      if (!formData.expiryWindow) return;
      setStep(5);
    } else {
      handleSubmit();
    }
  };`;

const newHandleNext = `  const handleNext = () => {
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
  };`;
content = content.replace(oldHandleNext, newHandleNext);

// 3. Replace handleSubmit
const oldHandleSubmit = `  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (formType === "newBusiness") {
        const newBusinessId = \`B\${Date.now()}\`;
        const newBusiness = {
          id: newBusinessId,
          name: formData.businessName,
          address: formData.address || "",
          postcode: formData.postcode,
          logo: formData.businessName.slice(0, 2).toUpperCase(),
          color: "#6366f1",
        };

        const newContract = {
          meterId: formData.meterId,
          businessId: newBusinessId,
          fuel: formData.fuelType,
          end: formData.expiryWindow,
          status: "pending",
          rate: "TBD",
          usage: "TBD",
          cost: 0,
          supplier: formData.supplier,
          email: formData.email,
          postcode: formData.postcode,
        };

        await onSubmit({ newBusiness, newContract });
      } else {
        // Existing businesses - create a contract for each selected business
        const existingContracts = selectedBusinessIds.map((bizId) => ({
          meterId: formData.meterId,
          businessId: bizId,
          fuel: formData.fuelType,
          end: formData.expiryWindow,
          status: "pending",
          rate: "TBD",
          usage: "TBD",
          cost: 0,
          supplier: formData.supplier,
          email: formData.email,
          postcode: postcodes[bizId],
        }));

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
  };`;

const newHandleSubmit = `  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (formType === "newBusiness") {
        const newBusinessId = \`B\${Date.now()}\`;
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
  };`;
content = content.replace(oldHandleSubmit, newHandleSubmit);

// 4. Replace handleClose
const oldHandleClose = `      setFormData({
        businessName: "",
        address: "",
        postcode: "",
        meterId: "",
        fuelType: "Electricity",
        supplier: "",
        expiryWindow: "",
        email: user?.email || "",
      });`;

const newHandleClose = `      setFormData({
        businessName: "",
        address: "",
        postcode: "",
        email: user?.email || "",
      });
      setSelectedFuels([]);
      setFuelDetails({});`;
content = content.replace(oldHandleClose, newHandleClose);

// 5. Replace Validations and UI logic
const oldValidationLogic = `  const isStep3Valid = formData.supplier;

  const isStep4Valid = formData.expiryWindow;

  const emailRegex = /^[^\s@]+@[^\s@]+\\.[^\s@]+$/;
  const isStep5Valid = formData.email && emailRegex.test(formData.email);

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Business Details";
      case 2:
        return "Supply Address";
      case 3:
        return "Service Details";
      case 4:
        return "Contract Information";
      case 5:
        return "Confirm Email";
      default:
        return "Add Utility";
    }
  };

  const getButtonText = () => {
    if (step === 5) return "Get Quote";
    return "Next";
  };

  const isCurrentStepValid = () => {
    switch (step) {
      case 1:
        return isStep1Valid;
      case 2:
        return isStep2Valid;
      case 3:
        return isStep3Valid;
      case 4:
        return isStep4Valid;
      case 5:
        return isStep5Valid;
      default:
        return false;
    }
  };`;

const newValidationLogic = `  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

  const getStepTitle = () => {
    if (step === 1) return "Business Details";
    if (step === 2) return "Supply Address";
    if (step === 3) return "Select Utilities";
    if (step >= 4 && step < 4 + selectedFuels.length) {
       const fuel = selectedFuels[step - 4];
       return \`\${fuel} Details\`;
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
  };`;
content = content.replace(oldValidationLogic, newValidationLogic);

// 6. Replace Render blocks
const oldStep3To5 = `          {/* STEP 3: FUEL TYPE & SUPPLIER */}
          {step === 3 && (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FUEL TYPE</Text>
                <View style={styles.fuelTypeGrid}>
                  {["Electricity", "Gas", "Both"].map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[
                        styles.fuelButton,
                        formData.fuelType === f && styles.fuelButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, fuelType: f })}
                    >
                      <Text
                        style={[
                          styles.fuelText,
                          formData.fuelType === f && styles.fuelTextActive,
                        ]}
                      >
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CURRENT SUPPLIER</Text>
                <View style={styles.optionsGrid}>
                  {suppliers.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.optionButton,
                        formData.supplier === s && styles.optionButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, supplier: s })}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          formData.supplier === s && styles.optionTextActive,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* STEP 4: CONTRACT EXPIRY & METER ID */}
          {step === 4 && (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONTRACT EXPIRY</Text>
                <View style={styles.expiryList}>
                  {expiryOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.expiryOption,
                        formData.expiryWindow === opt.value &&
                          styles.expiryOptionActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, expiryWindow: opt.value })
                      }
                    >
                      <Text
                        style={[
                          styles.expiryOptionText,
                          formData.expiryWindow === opt.value &&
                            styles.expiryOptionTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {formData.expiryWindow === opt.value && (
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
                  value={formData.meterId}
                  onChangeText={(text: string) =>
                    setFormData({ ...formData, meterId: text })
                  }
                />
              </View>
            </View>
          )}

          {/* STEP 5: EMAIL CONFIRMATION */}
          {step === 5 && (`;

const newStep3To5 = `          {/* STEP 3: FUEL SELECTION */}
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
          {step === 4 + selectedFuels.length && (`;
content = content.replace(oldStep3To5, newStep3To5);

// 7. Change handleAddUtilitySubmit in TabOneScreen to expect newContracts
const oldHandleAddUtilitySubmit = `  const handleAddUtilitySubmit = useCallback(
    async ({ newBusiness, newContract, existingContracts }: any) => {
      // 1. Handle New Business Creation
      if (newBusiness && user && newContract) {
          const result = await createBusinessMutation.mutateAsync({
            name: newBusiness.name,
            address: newBusiness.address,
            postcode: newBusiness.postcode,
            members: [{ userId: user.id, role: "owner" as const }],
          });
          const businessId = result?.data?.business?._id;

          if (businessId) {
            const fuels = newContract.fuel === "Both" ? ["electricity", "gas"] : [fuelToServerType[newContract.fuel]];
            
            await Promise.all(fuels.map(fuel => 
               createUtilityMutation.mutateAsync({
                businessId,
                type: fuel,
                // The form captures *previous* contract details, not the new one yet
                previousSupplier: newContract.supplier,
                previousMeterId: newContract.meterId !== "Pending" ? newContract.meterId : undefined,
                previousContractExpiry: newContract.end || undefined,
                status: "pending",
                email: newContract.email,
                postcode: newContract.postcode,
              })
            ));
          }
      }

      // 2. Handle Existing Businesses (Multiple)
      if (existingContracts && existingContracts.length > 0) {
        // Run mutations in parallel
        await Promise.all(existingContracts.map(async (contract: any) => {
            const fuels = contract.fuel === "Both" ? ["electricity", "gas"] : [fuelToServerType[contract.fuel]];
            
            await Promise.all(fuels.map(fuel => 
              createUtilityMutation.mutateAsync({
                businessId: contract.businessId,
                type: fuel,
                previousSupplier: contract.supplier,
                previousMeterId: contract.meterId !== "Pending" ? contract.meterId : undefined,
                previousContractExpiry: contract.end || undefined,
                status: "pending",
                email: contract.email,
                postcode: contract.postcode,
              })
            ));
        }));
      }`;

const newHandleAddUtilitySubmit = `  const handleAddUtilitySubmit = useCallback(
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
            await Promise.all(newContracts.map((contract: any) => 
               createUtilityMutation.mutateAsync({
                businessId,
                type: fuelToServerType[contract.fuel],
                // The form captures *previous* contract details, not the new one yet
                previousSupplier: contract.supplier,
                previousMeterId: contract.meterId !== "Pending" && contract.meterId !== "" ? contract.meterId : undefined,
                previousContractExpiry: contract.end || undefined,
                status: "pending",
                email: contract.email,
                postcode: contract.postcode,
              })
            ));
          }
      }

      // 2. Handle Existing Businesses (Multiple)
      if (existingContracts && existingContracts.length > 0) {
        // Run mutations in parallel
        await Promise.all(existingContracts.map(async (contract: any) => {
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
        }));
      }`;
content = content.replace(oldHandleAddUtilitySubmit, newHandleAddUtilitySubmit);

// 8. One small thing: replace the step limit in getButtonText / arrow icon
const oldButtonContainer = `              {step < 5 && !isSubmitting && (
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#fff"
                  style={{ marginLeft: 8 }}
                />
              )}`;

const newButtonContainer = `              {step < 4 + selectedFuels.length && !isSubmitting && (
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#fff"
                  style={{ marginLeft: 8 }}
                />
              )}`;
content = content.replace(oldButtonContainer, newButtonContainer);

fs.writeFileSync('app/(tabs)/index.tsx', content);
