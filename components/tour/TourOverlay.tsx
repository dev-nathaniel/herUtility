import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTour } from "./TourContext";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export function TourOverlay({ completeSheetRef }: { completeSheetRef: React.RefObject<any> }) {
  const {
    isTourActive,
    currentStep,
    steps,
    nextStep,
    prevStep,
    stopTour,
    getElementLayout
  } = useTour();

  const [displayedStepIndex, setDisplayedStepIndex] = useState(currentStep);
  const [layoutReady, setLayoutReady] = useState(false);
  const [cardHeight, setCardHeight] = useState(155);
  const [activeCoords, setActiveCoords] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const targetX = useSharedValue(0);
  const targetY = useSharedValue(0);
  const targetW = useSharedValue(0);
  const targetH = useSharedValue(0);
  const tooltipY = useSharedValue(screenHeight / 2 - 100);

  const step = steps[currentStep];
  const displayedStep = steps[displayedStepIndex];

  // 1. Measure target coordinates when step or active state changes
  useEffect(() => {
    if (!isTourActive) {
      setLayoutReady(false);
      setActiveCoords(null);
      return;
    }

    const isScrollStep = step.targetKey === "quote_card" || step.targetKey === "profile_avatar";
    if (isScrollStep) {
      setLayoutReady(false);
    }

    let isMounted = true;
    
    async function updateLayout() {
      // If we are navigating to steps requiring scrolling, wait longer for the scroll animation to complete
      const delay = isScrollStep ? 600 : 150;
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (!isMounted) return;
      
      const coords = await getElementLayout(step.targetKey);
      if (isMounted && coords) {
        setActiveCoords(coords);
      }
    }

    updateLayout();

    const timer = setTimeout(updateLayout, isScrollStep ? 1000 : 600);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [currentStep, isTourActive, step.targetKey]);

  // 2. Animate transitions when active coordinates are updated
  useEffect(() => {
    if (!activeCoords) return;

    const isFirstRender = !layoutReady;
    
    const isTargetInBottomHalf = activeCoords.y > screenHeight / 2;
    const targetTooltipY = isTargetInBottomHalf 
      ? activeCoords.y - cardHeight - 12
      : activeCoords.y + activeCoords.h + 12;

    if (isFirstRender) {
      targetX.value = activeCoords.x;
      targetY.value = activeCoords.y;
      targetW.value = activeCoords.w;
      targetH.value = activeCoords.h;
      tooltipY.value = targetTooltipY;
      setDisplayedStepIndex(currentStep);
      setLayoutReady(true);
    } else {
      const timingConfig = {
        duration: 320,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      };
      targetX.value = withTiming(activeCoords.x, timingConfig);
      targetY.value = withTiming(activeCoords.y, timingConfig);
      targetW.value = withTiming(activeCoords.w, timingConfig);
      targetH.value = withTiming(activeCoords.h, timingConfig);
      tooltipY.value = withTiming(targetTooltipY, timingConfig);

      // Instantly update the text so there is no delay or disappear/appear flicker
      setDisplayedStepIndex(currentStep);
    }
  }, [activeCoords]);

  // 3. Smoothly adjust tooltip position when card height shifts
  useEffect(() => {
    if (!activeCoords || !layoutReady) return;

    const isTargetInBottomHalf = activeCoords.y > screenHeight / 2;
    const targetTooltipY = isTargetInBottomHalf 
      ? activeCoords.y - cardHeight - 12
      : activeCoords.y + activeCoords.h + 12;

    tooltipY.value = withTiming(targetTooltipY, {
      duration: 150,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });
  }, [cardHeight]);

  // Reanimated style mappings
  const topSegmentStyle = useAnimatedStyle(() => ({
    top: 0,
    left: 0,
    right: 0,
    height: targetY.value
  }));

  const bottomSegmentStyle = useAnimatedStyle(() => ({
    top: targetY.value + targetH.value,
    left: 0,
    right: 0,
    bottom: 0
  }));

  const leftSegmentStyle = useAnimatedStyle(() => ({
    top: targetY.value,
    left: 0,
    width: targetX.value,
    height: targetH.value
  }));

  const rightSegmentStyle = useAnimatedStyle(() => ({
    top: targetY.value,
    left: targetX.value + targetW.value,
    right: 0,
    height: targetH.value
  }));

  const highlightBorderStyle = useAnimatedStyle(() => ({
    left: targetX.value - 4,
    top: targetY.value - 4,
    width: targetW.value + 8,
    height: targetH.value + 8
  }));

  const tooltipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tooltipY.value }]
  }));

  if (!isTourActive) return null;

  const isLastStep = currentStep === steps.length - 1;

  const handleFinish = () => {
    stopTour();
    setTimeout(() => {
      completeSheetRef.current?.present();
    }, 200);
  };

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      nextStep();
    }
  };

  const handleCardLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && Math.abs(cardHeight - height) > 2) {
      setCardHeight(height);
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={isTourActive}
      onRequestClose={handleFinish}
    >
      <View style={styles.overlayContainer} pointerEvents="box-none">
        {layoutReady ? (
          <>
            {/* Backdrop segments (animated cutout) */}
            <Animated.View style={[styles.backdropSegment, topSegmentStyle]} />
            <Animated.View style={[styles.backdropSegment, bottomSegmentStyle]} />
            <Animated.View style={[styles.backdropSegment, leftSegmentStyle]} />
            <Animated.View style={[styles.backdropSegment, rightSegmentStyle]} />

            {/* Glowing highlight border */}
            <Animated.View style={[styles.highlightBorder, highlightBorderStyle]} />
          </>
        ) : (
          <View style={[styles.backdropSegment, { left: 0, right: 0, top: 0, bottom: 0 }]} />
        )}

        {/* Floating Tooltip Card */}
        {layoutReady && (
          <Animated.View 
            style={[styles.tooltipCard, tooltipAnimatedStyle]}
            onLayout={handleCardLayout}
          >
            <Text style={styles.title}>{displayedStep.title}</Text>
            <Text style={styles.description}>{displayedStep.description}</Text>

            <View style={styles.footer}>
              {/* Step Dots */}
              <View style={styles.dotsContainer}>
                {steps.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      idx === currentStep ? styles.activeDot : null
                    ]}
                  />
                ))}
              </View>

              {/* Controls */}
              <View style={styles.buttonsContainer}>
                <TouchableOpacity style={styles.skipButton} onPress={handleFinish}>
                  <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
                
                {currentStep > 0 && (
                  <TouchableOpacity style={styles.backButton} onPress={prevStep}>
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                  <Text style={styles.nextText}>{isLastStep ? "Finish" : "Next"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    position: "relative"
  },
  backdropSegment: {
    position: "absolute",
    backgroundColor: "rgba(15, 23, 42, 0.72)" // Dark premium overlay
  },
  highlightBorder: {
    position: "absolute",
    borderWidth: 2.5,
    borderColor: "#FB5D38", // Brand orange color
    borderRadius: 14,
    backgroundColor: "transparent",
    shadowColor: "#FB5D38",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5
  },
  tooltipCard: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
    fontFamily: "System"
  },
  description: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: "System"
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 6
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#cbd5e1"
  },
  activeDot: {
    backgroundColor: "#FB5D38",
    width: 14
  },
  buttonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  skipText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600"
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  backText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600"
  },
  nextButton: {
    backgroundColor: "#181818",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  }
});
