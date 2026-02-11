import { Zap } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const BrandHeader = () => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Zap size={22} color="#fff" fill="#fff" />
      </View>
      <Text style={styles.brandText}>
        Her Utility<Text style={styles.brandAccent}></Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ rotate: '-3deg' }],
  },
  brandText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: '#4f46e5',
  },
});
