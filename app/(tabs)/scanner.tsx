import { useBusinesses, useCreateBusiness, useCreateSite, useCreateUtility, useSites } from "@/hooks/api/use-business";
import { api } from "@/lib/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import { extractText } from "expo-pdf-text-extract";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FileText, Info, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import DocumentScanner from "react-native-document-scanner-plugin";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const { width, height } = Dimensions.get("window");

interface ScannedFile {
  uri: string;
  type: "pdf" | "image";
  name?: string;
  extractedText?: string;
}

interface OcrResult {
  businessName: string;
  siteName: string;
  address: string;
  postcode: string;
  utilityType: "electricity" | "gas" | "water" | "telecoms";
  supplier: string;
  contractEnd: string;
  meterId: string;
}

const suppliersList: Record<string, string[]> = {
  electricity: ["British Gas", "E.On", "nPower", "Scottish Power", "Opus Energy", "EDF", "SSE", "Octopus Energy"],
  gas: ["British Gas", "E.On", "nPower", "Scottish Power", "Opus Energy", "EDF", "SSE", "Octopus Energy"],
  water: ["Water Plus", "Wave Utilities", "Castle Water", "Everflow", "Business Stream"],
  telecoms: ["BT", "Virgin Media", "Sky", "TalkTalk"],
};

function isValidUKPostcode(postcode: string) {
  const regex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
  return regex.test(postcode.trim());
}

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const params = useLocalSearchParams();
  const router = useRouter();

  const [scannedFile, setScannedFile] = useState<ScannedFile | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrData, setOcrData] = useState<OcrResult | null>(null);

  // Form Fields
  const [businessType, setBusinessType] = useState<"new" | "existing">("new");
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [utilityType, setUtilityType] = useState<"electricity" | "gas" | "water" | "telecoms">("electricity");
  const [supplier, setSupplier] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [meterId, setMeterId] = useState("");

  const [isBusinessDropdownOpen, setIsBusinessDropdownOpen] = useState(false);
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);

  // Address Autocomplete Suggestions
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);

  // Fetch Businesses/Sites for Selection
  const businessesQuery = useBusinesses();
  const sitesQuery = useSites();

  const businesses = businessesQuery.data?.data?.businesses ?? [];
  const sites = sitesQuery.data?.data?.sites ?? [];

  const filteredSites = useMemo(() => {
    if (!selectedBusinessId) return [];
    return sites.filter((s: any) => {
      const bId = typeof s.business === "string" ? s.business : s.business?._id;
      return bId === selectedBusinessId;
    });
  }, [selectedBusinessId, sites]);

  // Mutations
  const createBusinessMutation = useCreateBusiness();
  const createSiteMutation = useCreateSite();
  const createUtilityMutation = useCreateUtility();

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (params.autoStart === "true") {
      openCamera();
      router.setParams({ autoStart: "" });
    }
  }, [params.autoStart]);

  // Populate form states once OCR results return
  useEffect(() => {
    if (ocrData) {
      setBusinessName(ocrData.businessName || "");
      setSiteName(ocrData.siteName || "Primary Site");
      setAddress(ocrData.address || "");
      setPostcode(ocrData.postcode || "");
      setUtilityType(ocrData.utilityType || "electricity");
      setSupplier(ocrData.supplier || "");
      setContractEnd(ocrData.contractEnd || "");
      setMeterId(ocrData.meterId || "");
    }
  }, [ocrData]);

  const runOcrAnalysis = async (type: "pdf" | "image", payload: string) => {
    setIsExtracting(true);
    setOcrData(null);
    try {
      const response = await api.post<any>("/api/ocr/analyze", {
        type,
        payload,
      });

      if (response && response.data) {
        setOcrData(response.data);
      } else {
        throw new Error("No data returned from OCR service");
      }
    } catch (error: any) {
      console.error("[Scanner] OCR analysis failed:", error);
      Toast.show({
        type: "error",
        text1: "Extraction Failed",
        text2: error?.message || "Failed to analyze document",
      });
      setScannedFile(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUpload = async () => {
    try {
      console.log("[Scanner] Launching document picker...");
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedFile = result.assets[0];
        const { uri, mimeType, name } = pickedFile;
        console.log("[Scanner] Picked file success:", pickedFile);

        const isPdf = mimeType === "application/pdf" || name.toLowerCase().endsWith(".pdf");

        if (isPdf) {
          console.log("[Scanner] PDF file detected. Extracting text content...");
          setScannedFile({
            uri,
            type: "pdf",
            name,
          });

          const text = await extractText(uri);
          console.log("[Scanner] Extracted text from PDF successfully:\n", text);
          await runOcrAnalysis("pdf", text);
        } else {
          console.log("[Scanner] Image file detected. Processing...");
          setScannedFile({
            uri,
            type: "image",
          });
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: "base64",
          });
          await runOcrAnalysis("image", base64);
        }
      } else {
        console.log("[Scanner] Document picker cancelled.");
      }
    } catch (error) {
      console.error("[Scanner] Error picking/extracting document:", error);
      Toast.show({
        type: "error",
        text1: "Upload Failed",
        text2: "An error occurred while uploading or processing the file.",
      });
    }
  };

  const openCamera = async () => {
    try {
      console.log("[Scanner] Attempting to open native document scanner...");
      const { scannedImages } = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
      });

      if (scannedImages && scannedImages.length > 0) {
        const uri = scannedImages[0];
        console.log("[Scanner] Document scanned successfully:", uri);
        setScannedFile({
          uri,
          type: "image",
        });
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: "base64",
        });
        await runOcrAnalysis("image", base64);
        return;
      }
      console.log("[Scanner] Document scanning was cancelled or returned no images.");
    } catch (e) {
      console.warn("[Scanner] Native document scanner failed or not supported in this environment:", e);
      console.log("[Scanner] Falling back to custom CameraView...");
      if (!permission) {
        await requestPermission();
        return;
      }
      if (!permission.granted) {
        const { status } = await requestPermission();
        if (status !== 'granted') {
          Alert.alert(
            "Permission Required",
            "Camera permission is required to scan bills."
          );
          return;
        }
      }
      // setIsCameraActive(true);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo) {
          setIsCameraActive(false);
          setScannedFile({
            uri: photo.uri,
            type: "image",
          });
          const base64 = await FileSystem.readAsStringAsync(photo.uri, {
            encoding: "base64",
          });
          await runOcrAnalysis("image", base64);
        }
      } catch (e) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to take picture.",
        });
      }
    }
  };

  const handleAddressSearch = async (text: string) => {
    setAddress(text);
    if (text.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${apiKey}&components=country:gb&types=address`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.predictions) {
        setAddressSuggestions(
          data.predictions.map((p: any) => ({
            placeId: p.place_id,
            description: p.description,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching places autocomplete:", error);
    }
  };

  const handleSelectSuggestion = async (suggestion: any) => {
    setAddressSuggestions([]);
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.placeId}&fields=address_components,formatted_address&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.result) {
        const components = data.result.address_components || [];
        const postalCodeComponent = components.find((c: any) => c.types.includes("postal_code"));
        const postcodeVal = postalCodeComponent ? postalCodeComponent.long_name : "";

        const streetNumber = components.find((c: any) => c.types.includes("street_number"))?.long_name || "";
        const route = components.find((c: any) => c.types.includes("route"))?.long_name || "";
        const town = components.find((c: any) => c.types.includes("postal_town") || c.types.includes("locality"))?.long_name || "";

        const addressLine = `${streetNumber} ${route}`.trim() + (town ? `, ${town}` : "");
        const finalAddress = addressLine || data.result.formatted_address;

        setAddress(finalAddress);
        if (postcodeVal) {
          setPostcode(postcodeVal.toUpperCase());
        }
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
    }
  };

  const handleSubmit = async () => {
    if (!utilityType) {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Please select a utility type" });
      return;
    }
    if (businessType === "new" && !businessName.trim()) {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Please enter a business name" });
      return;
    }
    if (businessType === "existing" && !selectedBusinessId) {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Please select an existing business" });
      return;
    }
    if (!siteName.trim()) {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Please enter a site name" });
      return;
    }
    if (!address.trim()) {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Please enter a site address" });
      return;
    }
    if (!isValidUKPostcode(postcode)) {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Please enter a valid UK postcode" });
      return;
    }

    setIsSubmitting(true);
    try {
      let finalBusinessId = selectedBusinessId;
      let finalSiteId = selectedSiteId;

      // 1. Create business if new
      if (businessType === "new") {
        const bizRes = await createBusinessMutation.mutateAsync({
          name: businessName,
          address: address,
          postcode: postcode,
          members: [],
        });

        const newBiz = bizRes.data?.business;
        if (!newBiz) throw new Error("Failed to create business");
        finalBusinessId = newBiz._id;

        const newSite = bizRes.data?.site;
        if (newSite) {
          finalSiteId = newSite._id;
        }
      }

      // 2. Create site if siteId is empty or "new"
      if (!finalSiteId || finalSiteId === "new") {
        const siteRes = await createSiteMutation.mutateAsync({
          businessId: finalBusinessId,
          name: siteName,
          address: address,
        });
        const createdSite = siteRes.data?.site;
        if (!createdSite) throw new Error("Failed to create site");
        finalSiteId = createdSite._id;
      }

      // 3. Create utility associated with this site
      await createUtilityMutation.mutateAsync({
        businessId: finalBusinessId,
        siteId: finalSiteId,
        type: utilityType,
        supplier: supplier,
        identifier: meterId,
        contractEnd: contractEnd,
        status: "pending",
        postcode: postcode,
      });

      Toast.show({
        type: "success",
        text1: "Quote Requested",
        text2: "Your utility bill details have been submitted for quote!",
      });

      // Clear state and redirect to home tab (root index)
      setScannedFile(null);
      setOcrData(null);
      router.push("/");
    } catch (error: any) {
      console.error("[Scanner] Failed to submit quote request:", error);
      Toast.show({
        type: "error",
        text1: "Submission Failed",
        text2: error?.message || "Failed to create quote records.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBrackets = (color = "#181818") => (
    <>
      <View style={[styles.bracket, styles.topLeft, { borderColor: color }]} />
      <View style={[styles.bracket, styles.topRight, { borderColor: color }]} />
      <View style={[styles.bracket, styles.bottomLeft, { borderColor: color }]} />
      <View style={[styles.bracket, styles.bottomRight, { borderColor: color }]} />
    </>
  );

  if (isCameraActive) {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />
        <View style={[StyleSheet.absoluteFillObject, styles.cameraOverlay]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsCameraActive(false)}
          >
            <X size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.cameraFrameContainer}>
            {renderBrackets("#181818")}
            <Text style={styles.cameraCenterText}>Center item here</Text>
          </View>

          <View style={[styles.cameraControls, { paddingBottom: Platform.OS === 'ios' ? 120 : 100 }]}>
            <TouchableOpacity style={styles.captureButtonOuter} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // --- 1. Loading / Extracting state ---
  if (isExtracting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingTitle}>Analyzing Document</Text>
        <Text style={styles.loadingSubtitle}>
          OpenAI is extracting utility details, address, postcode, and meter information. Please wait...
        </Text>
      </View>
    );
  }

  // --- 2. Edit / Verify form once OCR results return ---
  if (ocrData) {
    const commonSuppliers = suppliersList[utilityType] || [];

    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.formScrollContent, { paddingTop: insets.top || 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Verify Bill Details</Text>
            <Text style={styles.formSubtitle}>
              Please review the extracted information below and edit any errors before proceeding.
            </Text>
          </View>

          {/* UTILITY TYPE SELECTION */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Utility Type</Text>
            <View style={styles.utilityGrid}>
              {(["electricity", "gas", "water", "telecoms"] as const).map((type) => {
                const isActive = utilityType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.utilityGridButton,
                      isActive && styles.utilityGridButtonActive,
                    ]}
                    onPress={() => setUtilityType(type)}
                  >
                    <Text
                      style={[
                        styles.utilityGridText,
                        isActive && styles.utilityGridTextActive,
                        { textTransform: "capitalize" },
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* BUSINESS INFO SELECTION */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business Assignment</Text>
            <View style={styles.toggleButtons}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  businessType === "new" && styles.toggleBtnActive,
                ]}
                onPress={() => {
                  setBusinessType("new");
                  setSelectedBusinessId("");
                  setSelectedSiteId("");
                }}
              >
                <Text style={[styles.toggleBtnText, businessType === "new" && styles.toggleBtnTextActive]}>
                  New Business
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  businessType === "existing" && styles.toggleBtnActive,
                ]}
                onPress={() => setBusinessType("existing")}
              >
                <Text style={[styles.toggleBtnText, businessType === "existing" && styles.toggleBtnTextActive]}>
                  Existing Business
                </Text>
              </TouchableOpacity>
            </View>

            {businessType === "new" ? (
              <TextInput
                style={styles.textInput}
                placeholder="Business Name"
                placeholderTextColor="#94a3b8"
                value={businessName}
                onChangeText={setBusinessName}
              />
            ) : (
              <View style={{ position: "relative", zIndex: 50 }}>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setIsBusinessDropdownOpen(!isBusinessDropdownOpen)}
                >
                  <Text style={[styles.dropdownBtnText, !selectedBusinessId && { color: "#94a3b8" }]}>
                    {selectedBusinessId
                      ? businesses.find((b: any) => b._id === selectedBusinessId)?.name || "Select Business"
                      : "Select a Business"}
                  </Text>
                  <Ionicons
                    name={isBusinessDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>

                {isBusinessDropdownOpen && (
                  <View style={styles.dropdownListContainer}>
                    <ScrollView style={{ maxHeight: 150 }}>
                      {businesses.map((b: any) => (
                        <TouchableOpacity
                          key={b._id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedBusinessId(b._id);
                            setIsBusinessDropdownOpen(false);
                            setSelectedSiteId(""); // Reset site selection
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{b.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* SITE ASSIGNMENT */}
          {businessType === "existing" && selectedBusinessId ? (
            <View style={[styles.inputGroup, { zIndex: 40 }]}>
              <Text style={styles.inputLabel}>Site Assignment</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setIsSiteDropdownOpen(!isSiteDropdownOpen)}
              >
                <Text style={[styles.dropdownBtnText, !selectedSiteId && { color: "#94a3b8" }]}>
                  {selectedSiteId
                    ? selectedSiteId === "new"
                      ? "Create a new site..."
                      : filteredSites.find((s: any) => s._id === selectedSiteId)?.name || "Select Site"
                    : "Select a Site"}
                </Text>
                <Ionicons
                  name={isSiteDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#94a3b8"
                />
              </TouchableOpacity>

              {isSiteDropdownOpen && (
                <View style={styles.dropdownListContainer}>
                  <ScrollView style={{ maxHeight: 150 }}>
                    {filteredSites.map((s: any) => (
                      <TouchableOpacity
                        key={s._id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedSiteId(s._id);
                          setSiteName(s.name);
                          setAddress(s.address);
                          setPostcode(s.postcode || "");
                          setIsSiteDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{s.name}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedSiteId("new");
                        setSiteName("Primary Site");
                        setAddress("");
                        setPostcode("");
                        setIsSiteDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: "#8b5cf6", fontWeight: "700" }]}>
                        + Add a new site...
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}
            </View>
          ) : null}

          {/* SITE DETAILS (VISIBLE FOR NEW BUSINESS OR NEW SITES) */}
          {(businessType === "new" || selectedSiteId === "new" || !selectedSiteId) && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Site Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. London Office, Head Office"
                  placeholderTextColor="#94a3b8"
                  value={siteName}
                  onChangeText={setSiteName}
                />
              </View>

              <View style={[styles.inputGroup, { position: "relative", zIndex: 30 }]}>
                <Text style={styles.inputLabel}>Site Address</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 100 Victoria Street"
                  placeholderTextColor="#94a3b8"
                  value={address}
                  onChangeText={handleAddressSearch}
                />
                {addressSuggestions.length > 0 && (
                  <View style={styles.dropdownListContainer}>
                    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 150 }}>
                      {addressSuggestions.map((item) => (
                        <TouchableOpacity
                          key={item.placeId}
                          style={styles.dropdownItem}
                          onPress={() => handleSelectSuggestion(item)}
                        >
                          <Text style={styles.dropdownItemText}>{item.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Site Postcode</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    postcode && !isValidUKPostcode(postcode) && { borderColor: "#ef4444", borderWidth: 1 }
                  ]}
                  placeholder="e.g. SW1E 5JL"
                  placeholderTextColor="#94a3b8"
                  value={postcode}
                  onChangeText={(text) => setPostcode(text.toUpperCase())}
                  autoCapitalize="characters"
                />
                {postcode && !isValidUKPostcode(postcode) && (
                  <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                    Please enter a valid UK postcode
                  </Text>
                )}
              </View>
            </>
          )}

          {/* SUPPLIER DETAILS */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Supplier</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. British Gas, E.ON"
              placeholderTextColor="#94a3b8"
              value={supplier}
              onChangeText={setSupplier}
            />
            {commonSuppliers.length > 0 && (
              <View style={styles.chipsContainer}>
                {commonSuppliers.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.chip,
                      supplier === s && styles.chipActive,
                    ]}
                    onPress={() => setSupplier(s)}
                  >
                    <Text style={[styles.chipText, supplier === s && styles.chipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* CONTRACT DETAILS */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contract Expiry Date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              value={contractEnd}
              onChangeText={setContractEnd}
            />
          </View>

          {/* METER ID DETAILS */}
          {utilityType !== "water" && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {utilityType === "electricity" ? "MPAN (Meter ID)" : "MPRN (Meter ID)"}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 1234567890123"
                placeholderTextColor="#94a3b8"
                value={meterId}
                onChangeText={setMeterId}
              />
            </View>
          )}

          {/* ACTION BUTTONS */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setScannedFile(null);
                setOcrData(null);
              }}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Proceed & Get Quote</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- 3. Default Idle Upload/Scan Selection state ---
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.idleFrameContainer, !scannedFile && { height: 360, marginTop: 10 }]}>
          {renderBrackets("#181818")}
          {scannedFile ? (
            scannedFile.type === "image" ? (
              <Image
                source={{ uri: scannedFile.uri }}
                style={styles.previewImage}
                contentFit="contain"
              />
            ) : (
              <View style={styles.pdfPreviewContainer}>
                <View style={styles.pdfCard}>
                  <FileText size={48} color="#181818" style={styles.pdfIcon} />
                  <Text style={styles.pdfName} numberOfLines={2}>
                    {scannedFile.name || "document.pdf"}
                  </Text>
                  <Text style={styles.pdfMeta}>PDF Document</Text>
                  <View style={styles.pdfStatusBadge}>
                    <Text style={styles.pdfStatusText}>Processing...</Text>
                  </View>
                </View>
              </View>
            )
          ) : (
            <View style={styles.idleFrameContent}>
              <Image
                source={require("@/assets/images/quote_illustration.png")}
                style={[styles.docIllustration, { width: 270, height: 270 }]}
              />
              <Text style={[styles.scanText, { fontSize: 16, lineHeight: 22, marginTop: -10 }]}>
                Scan your bill to find savings
              </Text>
            </View>
          )}
        </View>

        <View style={styles.howItWorksContainer}>
          <Text style={styles.howItWorksTitle}>How it works</Text>

          <View style={styles.stepRow}>
            <Info size={16} color="#181818" style={styles.stepIcon} />
            <Text style={styles.stepText}>
              Scan or upload a clear photo of your latest gas, electric, or water bill.
            </Text>
          </View>

          <View style={styles.stepRow}>
            <Info size={16} color="#181818" style={styles.stepIcon} />
            <Text style={styles.stepText}>
              OpenAI automatically extracts supplier details, rates, dates, and meter information.
            </Text>
          </View>

          <View style={styles.stepRow}>
            <Info size={16} color="#181818" style={styles.stepIcon} />
            <Text style={styles.stepText}>
              Review the extracted details, make any corrections, and submit to request quotes.
            </Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.cameraBtn} onPress={openCamera}>
            <Text style={styles.cameraBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
            <Text style={styles.uploadBtnText}>Upload Bill</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 24,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "500",
  },
  idleFrameContainer: {
    height: 380,
    width: '100%',
    alignSelf: 'center',
    position: 'relative',
    marginTop: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idleFrameContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIllustration: {
    width: 280,
    height: 280,
    transform: [{ rotate: '16deg' }]
  },
  scanText: {
    fontSize: 18,
    color: '#8c8c8c',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
  bracket: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#181818',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 16,
  },
  howItWorksContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
    fontFamily: "System",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  stepIcon: {
    marginRight: 12,
    marginTop: 1,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
    fontWeight: "500",
    fontFamily: "System",
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 24,
    marginBottom: 20,
  },
  cameraBtn: {
    flex: 0.35,
    backgroundColor: '#F8F9FA',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#181818',
  },
  uploadBtn: {
    flex: 0.65,
    backgroundColor: '#181818',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Camera View Styles
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  closeButton: {
    alignSelf: 'flex-start',
    margin: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFrameContainer: {
    width: width - 48,
    height: height * 0.6,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCenterText: {
    color: '#181818',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cameraControls: {
    width: '100%',
    alignItems: 'center',
  },
  captureButtonOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  previewImage: {
    width: '90%',
    height: '90%',
    borderRadius: 12,
  },
  pdfPreviewContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pdfCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pdfIcon: {
    marginBottom: 16,
  },
  pdfName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#181818',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 22,
  },
  pdfMeta: {
    fontSize: 13,
    color: '#8C8C8C',
    fontWeight: '500',
    marginBottom: 20,
  },
  pdfStatusBadge: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pdfStatusText: {
    fontSize: 12,
    color: '#1A73E8',
    fontWeight: '600',
  },

  // Form Screen Styles
  formScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  formHeader: {
    marginBottom: 28,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  textInput: {
    height: 52,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "500",
  },
  utilityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  utilityGridButton: {
    flex: 1,
    minWidth: "45%",
    height: 50,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  utilityGridButtonActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#8b5cf6",
  },
  utilityGridText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  utilityGridTextActive: {
    color: "#8b5cf6",
    fontWeight: "700",
  },
  toggleButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  toggleBtn: {
    flex: 1,
    height: 40,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#F1F5F9",
    borderColor: "#94A3B8",
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  toggleBtnTextActive: {
    color: "#334155",
    fontWeight: "700",
  },
  dropdownBtn: {
    height: 52,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownBtnText: {
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "500",
  },
  dropdownListContainer: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#8b5cf6",
  },
  chipText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#8b5cf6",
    fontWeight: "700",
  },
  cancelBtn: {
    flex: 0.35,
    height: 54,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748b",
  },
  submitBtn: {
    flex: 0.65,
    height: 54,
    backgroundColor: "#8b5cf6",
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
