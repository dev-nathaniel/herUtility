import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Centralize your\nutilities.',
    subtitle: 'View every business contract,\ntariff, and meter detail in one\nsecure hub.',
    image: require('@/assets/images/business_owner.jpg'),
    icon: require('@/assets/images/doc_illustration.png'),
  },
  {
    id: '2',
    title: 'Smart renewal\nalerts',
    subtitle: 'Receive automated notifications 90,\n60, and 30 days before your\ncontracts end.',
    image: require('@/assets/images/phone_user.jpg'),
    icon: require('@/assets/images/bell_illustration.png'),
  },
  {
    id: '3',
    title: 'Switch and\nsave',
    subtitle: 'Compare real-time market prices\nand sign new agreements with a\nsingle tap',
    image: require('@/assets/images/phone_user.jpg'),
    icon: require('@/assets/images/doc_illustration.png'),
  },
];

const Paginator = ({ data, scrollX }: { data: any[]; scrollX: SharedValue<number> }) => {
  return (
    <View style={styles.paginatorContainer}>
      {data.map((_, i) => {
        const animatedStyle = useAnimatedStyle(() => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = interpolate(scrollX.value, inputRange, [8, 32, 8], 'clamp');
          const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], 'clamp');
          return {
            width: dotWidth,
            opacity,
          };
        });
        return <Animated.View style={[styles.dot, animatedStyle]} key={i.toString()} />;
      })}
    </View>
  );
};
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const slidesRef = useRef<Animated.FlatList<any>>(null);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleComplete = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/(auth)/login');
  };

  const scrollToNext = () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleComplete();
    }
  };

  const imageScrollStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: -scrollX.value }],
    };
  });

  const CARD_HEIGHT = height * 0.45;
  const IMAGE_HEIGHT = height * 0.6; // 60% + 45% = 105% (5% overlap = ~42px, safely covers 32px radius)

  return (
    <View style={styles.container}>
      {/* Layer 1: Sliding Images */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]}>
        <View style={{ height: IMAGE_HEIGHT, overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
          <Animated.View style={[{ flexDirection: 'row', width: width * slides.length, height: '100%' }, imageScrollStyle]}>
            {slides.map((slide) => (
              <Image key={slide.id} source={slide.image} style={{ width, height: '100%', resizeMode: 'cover' }} />
            ))}
          </Animated.View>
        </View>
      </View>

      {/* Layer 2: Static White Card Background */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 2, pointerEvents: 'none' }]}>
        <View style={[styles.staticCardBackground, { height: CARD_HEIGHT }]} />
      </View>

      {/* Layer 3: Sliding Texts & Icons */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 3 }]}>
        <Animated.FlatList
          ref={slidesRef}
          data={slides}
          renderItem={({ item }) => {
            return (
              <View style={[styles.slide, { width }]}>
                {/* Spacer to push content down to the card area */}
                <View style={{ flex: 1 }} />

                {/* Card Content */}
                <View style={[styles.cardContent, { height: CARD_HEIGHT, paddingBottom: 20, pointerEvents: 'none' }]}>
                  {/* Invisible spacer for Paginator to maintain alignment */}
                  <View style={styles.paginatorContainer} />

                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.subtitle}>{item.subtitle}</Text>

                  {/* Decorative Icon */}
                  {/* <Image source={item.icon} style={styles.icon} /> */}
                </View>
              </View>
            );
          }}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
        />
      </View>

      {/* Layer 4: Static Indicator & Buttons */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 4, pointerEvents: 'box-none' }]}>
        <View style={{ flex: 1, pointerEvents: 'none' }} />
        <View style={[styles.cardContent, { height: CARD_HEIGHT, paddingBottom: 20, pointerEvents: 'box-none' }]}>
          <Paginator data={slides} scrollX={scrollX} />

          <View style={{ flex: 1, pointerEvents: 'none' }} />

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <AnimatedPressable
              onPress={handleComplete}
              style={[
                styles.skipButton,
                useAnimatedStyle(() => ({
                  width: interpolate(scrollX.value, [width, width * 2], [100, 0], 'clamp'),
                  opacity: interpolate(scrollX.value, [width, width * 1.5], [1, 0], 'clamp'),
                  paddingHorizontal: interpolate(scrollX.value, [width, width * 2], [32, 0], 'clamp'),
                })),
              ]}
            >
              <Text style={styles.skipButtonText} numberOfLines={1}>Skip</Text>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => {
                if (currentIndex === slides.length - 1) {
                  handleComplete();
                } else {
                  scrollToNext();
                }
              }}
              style={[
                styles.nextButton,
                useAnimatedStyle(() => ({
                  marginLeft: interpolate(scrollX.value, [width, width * 2], [16, 0], 'clamp'),
                })),
              ]}
            >
              <Animated.Text
                style={[
                  styles.nextButtonText,
                  { position: 'absolute', pointerEvents: 'none' },
                  useAnimatedStyle(() => ({
                    opacity: interpolate(scrollX.value, [width * 1.2, width * 1.8], [1, 0], 'clamp'),
                    transform: [{ translateY: interpolate(scrollX.value, [width * 1.2, width * 1.8], [0, -20], 'clamp') }],
                  })),
                ]}
              >
                Next
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.getStartedButtonText,
                  { position: 'absolute', pointerEvents: 'none' },
                  useAnimatedStyle(() => ({
                    opacity: interpolate(scrollX.value, [width * 1.2, width * 1.8], [0, 1], 'clamp'),
                    transform: [{ translateY: interpolate(scrollX.value, [width * 1.2, width * 1.8], [20, 0], 'clamp') }],
                  })),
                ]}
              >
                Get started
              </Animated.Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slide: {
    flex: 1,
  },
  staticCardBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  cardContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 32,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  paginatorContainer: {
    flexDirection: 'row',
    height: 8,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8b5cf6',
    marginHorizontal: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  icon: {
    position: 'absolute',
    bottom: 20,
    right: -20,
    width: 140,
    height: 140,
    resizeMode: 'contain',
    zIndex: -1,
    opacity: 0.8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 'auto',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  skipButton: {
    backgroundColor: '#F8F5FF',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  skipButtonText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '700',
  },
  nextButton: {
    backgroundColor: '#181818',
    paddingVertical: 24,
    flex: 1,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
