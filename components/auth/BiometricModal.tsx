import React, { useCallback, forwardRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Faceid from '@/assets/icons/Faceid';
import Fingerprint from '@/assets/icons/Fingerprint';

interface BiometricModalProps {
  authType: 'FACIAL_RECOGNITION' | 'FINGERPRINT' | 'IRIS' | null;
  onUsePassword: () => void;
  onAuthenticate: () => void;
}

export const BiometricModal = forwardRef<BottomSheetModal, BiometricModalProps>(
  ({ authType, onUsePassword, onAuthenticate }, ref) => {
    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.3}
        />
      ),
      []
    );

    const isFaceId = authType === 'FACIAL_RECOGNITION';

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['40%']}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={true}
        onAnimate={(from, to) => {
          if (to === 0) {
            setTimeout(() => {
              onAuthenticate();
            }, 300);
          }
        }}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.indicator}
      >
        <BottomSheetView style={styles.contentContainer}>
          <Text style={styles.title}>
            Sign in with {isFaceId ? 'Face ID' : 'Touch ID'}
          </Text>

          <View style={styles.iconContainer}>
            {isFaceId ? (
              <Faceid width={64} height={64} color="#a855f7" />
            ) : (
              <Fingerprint width={64} height={64} color="#a855f7" />
            )}
          </View>

          <Text style={styles.instructionText}>
            {isFaceId ? 'Face your camera to continue' : 'Touch the fingerprint sensor to continue'}
          </Text>

          <View style={styles.spacer} />

          <Pressable
            style={({ pressed }) => [styles.passwordButton, pressed && styles.pressed]}
            onPress={onUsePassword}
          >
            <Text style={styles.passwordButtonText}>Use password instead</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

BiometricModal.displayName = 'BiometricModal';

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  indicator: {
    backgroundColor: '#E2E8F0',
    width: 48,
    height: 4,
    marginTop: 8,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 16,
  },
  spacer: {
    flex: 1,
  },
  passwordButton: {
    backgroundColor: '#181818',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
