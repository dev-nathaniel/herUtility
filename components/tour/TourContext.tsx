import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const STORAGE_KEY = "@herutility_tour_completed";

export interface ElementLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TourStep {
  targetKey: string;
  title: string;
  description: string;
}

interface TourContextType {
  isTourActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: () => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  registerElement: (key: string, measureFn: () => Promise<ElementLayout | null>) => void;
  getElementLayout: (key: string) => Promise<ElementLayout | null>;
  scrollToQuoteRequested: boolean;
  clearScrollToQuoteRequest: () => void;
  scrollToTopRequested: boolean;
  clearScrollToTopRequest: () => void;
  openAddUtilityRequested: boolean;
  requestOpenAddUtility: () => void;
  clearOpenAddUtilityRequest: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export const TOUR_STEPS: TourStep[] = [
  {
    targetKey: "sites_tab",
    title: "All your sites & contracts",
    description: "Tap sites any time to see your whole portfolio. Got more than one business? Switch between them - or pick \"All businesses\" to see everything in one list."
  },
  {
    targetKey: "scanner_tab",
    title: "Scan any bill",
    description: "Tap scan bill to upload a bill or scan a bill - we'll auto-extract rates, supplier and renewal data, then our validation engine will confirm the details."
  },
  {
    targetKey: "quote_card",
    title: "Hands-free renewal",
    description: "when you're ready, tap this card to start a quote. Sit back while our platform handles the negotiations and notify you when your bespoke offer is ready."
  },
  {
    targetKey: "profile_avatar",
    title: "Access your profile",
    description: "Tap your avatar at the top of the home screen at any time to view profile settings, update details, or log out of your account."
  }
];

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [scrollToQuoteRequested, setScrollToQuoteRequested] = useState(false);
  const [scrollToTopRequested, setScrollToTopRequested] = useState(false);
  const [openAddUtilityRequested, setOpenAddUtilityRequested] = useState(false);

  const measureFns = useRef<Record<string, () => Promise<ElementLayout | null>>>({});

  // Check if tour should auto-trigger on first launch
  useEffect(() => {
    async function checkFirstLaunch() {
      try {
        const completed = await AsyncStorage.getItem(STORAGE_KEY);
        if (completed !== "true") {
          // Add a short delay to let layout mount and stabilize before auto-starting
          setTimeout(() => {
            startTour();
          }, 1500);
        }
      } catch (e) {
        console.error("Failed to check tour completion in storage:", e);
      }
    }
    checkFirstLaunch();
  }, []);

  const registerElement = (key: string, measureFn: () => Promise<ElementLayout | null>) => {
    measureFns.current[key] = measureFn;
  };

  const getElementLayout = async (key: string): Promise<ElementLayout | null> => {
    const fn = measureFns.current[key];
    if (fn) {
      return await fn();
    }
    return null;
  };

  const startTour = () => {
    setCurrentStep(0);
    setIsTourActive(true);
    // Switch to Home screen where the highlighted elements reside
    router.push("/(tabs)");
  };

  const stopTour = async () => {
    setIsTourActive(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, "true");
    } catch (e) {
      console.error("Failed to save tour completion:", e);
    }
  };

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      if (nextIdx === 2) {
        setScrollToQuoteRequested(true);
      } else if (nextIdx === 3) {
        setScrollToTopRequested(true);
      }
    } else {
      stopTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      setCurrentStep(prevIdx);
      if (prevIdx === 2) {
        setScrollToQuoteRequested(true);
      } else {
        setScrollToTopRequested(true);
      }
    }
  };

  const clearScrollToQuoteRequest = () => {
    setScrollToQuoteRequested(false);
  };

  const clearScrollToTopRequest = () => {
    setScrollToTopRequested(false);
  };

  const requestOpenAddUtility = () => {
    setOpenAddUtilityRequested(true);
  };

  const clearOpenAddUtilityRequest = () => {
    setOpenAddUtilityRequested(false);
  };

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        currentStep,
        steps: TOUR_STEPS,
        startTour,
        stopTour,
        nextStep,
        prevStep,
        registerElement,
        getElementLayout,
        scrollToQuoteRequested,
        clearScrollToQuoteRequest,
        scrollToTopRequested,
        clearScrollToTopRequest,
        openAddUtilityRequested,
        requestOpenAddUtility,
        clearOpenAddUtilityRequest
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
