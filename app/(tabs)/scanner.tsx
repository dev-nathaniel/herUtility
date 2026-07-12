import { CameraView, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { extractText } from "expo-pdf-text-extract";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FileText, Info, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView
} from "react-native";
import DocumentScanner from "react-native-document-scanner-plugin";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const { width, height } = Dimensions.get("window");

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const params = useLocalSearchParams();
  const router = useRouter();

  interface ScannedFile {
    uri: string;
    type: "pdf" | "image";
    name?: string;
    extractedText?: string;
  }

  const [scannedFile, setScannedFile] = useState<ScannedFile | null>(null);

  useEffect(() => {
    if (params.autoStart === "true") {
      openCamera();
      router.setParams({ autoStart: "" });
    }
  }, [params.autoStart]);

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
          Toast.show({
            type: "info",
            text1: "Processing PDF",
            text2: "Extracting text from your document...",
          });

          const text = await extractText(uri);
          console.log("[Scanner] Extracted text from PDF successfully:\n", text);

          setScannedFile({
            uri,
            type: "pdf",
            name,
            extractedText: text,
          });

          Toast.show({
            type: "success",
            text1: "PDF Extracted",
            text2: "Preview the extracted text below before proceeding.",
          });
        } else {
          // Standard image file - process normally
          console.log("[Scanner] Image file detected. Processing...");
          processImage(uri);
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
        // letUserAdjustCrop: true,
        maxNumDocuments: 1,
      });

      if (scannedImages && scannedImages.length > 0) {
        console.log("[Scanner] Document scanned successfully:", scannedImages[0]);
        processImage(scannedImages[0]);
        return;
      }
      console.log("[Scanner] Document scanning was cancelled or returned no images.");
    } catch (e) {
      console.warn("[Scanner] Native document scanner failed or not supported in this environment:", e);
      // Fallback to custom camera view
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
      setIsCameraActive(true);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo) {
          setIsCameraActive(false);
          processImage(photo.uri);
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

  const processImage = (uri: string) => {
    setScannedFile({
      uri,
      type: "image",
    });
    Toast.show({
      type: "success",
      text1: "Bill Extracted",
      text2: "Preview the image below before proceeding.",
    });
  };

  const handleConfirm = () => {
    Toast.show({
      type: "success",
      text1: "Bill Processed",
      text2: "Your bill has been submitted successfully!",
    });
    setScannedFile(null);
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
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back">
          <View style={styles.cameraOverlay}>
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
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scanner Frame / Preview Area */}
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
                  <Text style={styles.pdfStatusText}>Ready to Process</Text>
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
            <Text style={[styles.scanText, { fontSize: 16, lineHeight: 22, marginTop: -10 }]}>Scan your bill to find savings</Text>
          </View>
        )}
      </View>

      {/* Info / How it Works Area */}
      {!scannedFile ? (
        <View style={styles.howItWorksContainer}>
          <Text style={styles.howItWorksTitle}>How it works</Text>

          <View style={styles.stepRow}>
            <Info size={16} color="#181818" style={styles.stepIcon} />
            <Text style={styles.stepText}>
              Scan a clear photo of every page of your latest gas or electric bill (up to 4)
            </Text>
          </View>

          <View style={styles.stepRow}>
            <Info size={16} color="#181818" style={styles.stepIcon} />
            <Text style={styles.stepText}>
              We auto-fill the supplier, rates, dates and meter details - no typing needed
            </Text>
          </View>

          <View style={styles.stepRow}>
            <Info size={16} color="#181818" style={styles.stepIcon} />
            <Text style={styles.stepText}>
              We match it to one of your sites or set up a new one for you
            </Text>
          </View>

          <View style={styles.stepRow}>
            <Info size={16} color="#181818" style={styles.stepIcon} />
            <Text style={styles.stepText}>
              Just check the details look right and tap confirm
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.infoContainer}>
          <Info size={20} color="#181818" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Our AI extracts your usage data so our experts can find you a better rate. No manual typing required
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }} />

      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        {scannedFile ? (
          <>
            <TouchableOpacity style={styles.cameraBtn} onPress={() => setScannedFile(null)}>
              <Text style={styles.cameraBtnText}>Scan Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadBtn} onPress={handleConfirm}>
              <Text style={styles.uploadBtnText}>Proceed</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.cameraBtn} onPress={openCamera}>
              <Text style={styles.cameraBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
              <Text style={styles.uploadBtnText}>Upload</Text>
            </TouchableOpacity>
          </>
        )}
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
    // marginBottom: 24,
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
  infoContainer: {
    flexDirection: 'row',
    marginTop: 24,
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#181818',
    lineHeight: 18,
    fontWeight: '500',
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
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pdfStatusText: {
    fontSize: 12,
    color: '#137333',
    fontWeight: '600',
  }
});
