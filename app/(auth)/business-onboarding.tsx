import { AuthInput } from "@/components/auth";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Building2, Check, MapPin } from "lucide-react-native";

interface AddressSuggestion {
  placeId: string;
  description: string;
}

export default function BusinessOnboardingScreen() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [businessType, setBusinessType] = useState<string>("Limited company");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddressSearch = async (text: string) => {
    setAddress(text);
    if (!text || text.length < 3) {
      setSuggestions([]);
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
        setSuggestions(data.predictions.map((p: any) => ({
          placeId: p.place_id,
          description: p.description,
        })));
      }
    } catch (error) {
      console.error("Error fetching places autocomplete:", error);
    }
  };

  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    setSuggestions([]);
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
        setAddress(addressLine || data.result.formatted_address);
        setPostcode(postcodeVal.toUpperCase());
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
    }
  };

  const businessTypes = [
    "Limited company",
    "Sole trader",
    "Partnership",
    "Charity",
    "Other",
  ];

  const handleContinue = async () => {
    setIsLoading(true);
    // Artificially show loading indicator for polished transition
    setTimeout(() => {
      setIsLoading(false);
      router.replace("/(tabs)");
    }, 800);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.iconContainer}>
              <Building2 size={32} color="#8b5cf6" />
            </View>
            <Text style={styles.title}>Tell us about{'\n'}your business</Text>
            <Text style={styles.subtitle}>
              we'll tailor your dashboard based on this
            </Text>
          </View>

          {/* Form Content */}
          <View style={styles.cardContainer}>
            {/* Business Details */}
            <AuthInput
              label="Business Name"
              placeholder="e.g. Acme Corporation"
              value={businessName}
              onChangeText={setBusinessName}
              autoCapitalize="words"
            />

            <AuthInput
              label="Business Address"
              placeholder="e.g. 100 Victoria Street"
              value={address}
              onChangeText={handleAddressSearch}
            />
            {suggestions.length > 0 && (
              <ScrollView style={styles.suggestionsContainer} keyboardShouldPersistTaps="handled">
                {suggestions.map((item) => (
                  <Pressable
                    key={item.placeId}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(item)}
                  >
                    <MapPin size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                    <Text style={styles.suggestionText}>{item.description}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <AuthInput
              label="Postcode"
              placeholder="e.g. SW1A 1AA"
              value={postcode}
              onChangeText={setPostcode}
              autoCapitalize="characters"
            />

            {/* Business Type Selector */}
            <Text style={styles.sectionLabel}>Business type</Text>
            <View style={styles.optionsList}>
              {businessTypes.map((type) => {
                const isSelected = businessType === type;
                return (
                  <Pressable
                    key={type}
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                    ]}
                    onPress={() => setBusinessType(type)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                      ]}
                    >
                      {isSelected && <Check size={12} color="#FFFFFF" />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Continue Button */}
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continueButtonPressed,
              isLoading && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#f5f3ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#64748b",
    marginTop: 8,
    lineHeight: 22,
  },
  cardContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 32,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  optionsList: {
    gap: 8,
  },
  optionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  optionCardSelected: {
    borderColor: "#8b5cf6",
    backgroundColor: "#fbfaff",
  },
  optionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
  },
  optionTextSelected: {
    color: "#8b5cf6",
    fontWeight: "700",
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
  },
  radioCircleSelected: {
    borderColor: "#8b5cf6",
    backgroundColor: "#8b5cf6",
  },
  continueButton: {
    backgroundColor: "#181818",
    paddingVertical: 18,
    borderRadius: 30,
    marginHorizontal: 24,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "#000000",
  },
  continueButtonDisabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  suggestionsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    maxHeight: 200,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    marginTop: -12,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
});
