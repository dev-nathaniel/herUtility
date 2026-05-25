import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Info, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
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

  useEffect(() => {
    if (params.autoStart === "true") {
      openCamera();
      router.setParams({ autoStart: "" });
    }
  }, [params.autoStart]);

  const handleUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      processImage(result.assets[0].uri);
    }
  };

  const openCamera = async () => {
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
    Toast.show({
      type: "success",
      text1: "Bill Extracted",
      text2: "Successfully pulled details from your bill.",
    });
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
    <View style={[styles.container, { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 100 }]}>

      {/* Scanner Frame Area */}
      <View style={styles.idleFrameContainer}>
        {renderBrackets("#181818")}
        <View style={styles.idleFrameContent}>
          <Image
            source={require("@/assets/images/quote_illustration.png")}
            style={styles.docIllustration}
          // contentFit="contain"
          />
          <Text style={styles.scanText}>Scan your bill to find{'\n'}savings.</Text>
        </View>
      </View>

      {/* Info Text Area */}
      <View style={styles.infoContainer}>
        <Info size={20} color="#181818" style={styles.infoIcon} />
        <Text style={styles.infoText}>
          Our AI extracts your usage data so our experts can find you a better rate. No manual typing required
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.cameraBtn} onPress={openCamera}>
          <Text style={styles.cameraBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
          <Text style={styles.uploadBtnText}>Upload</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
  }
});
