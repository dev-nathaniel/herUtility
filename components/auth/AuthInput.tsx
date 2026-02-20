import { Eye, EyeOff, LucideIcon } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';

interface AuthInputProps {
  icon: LucideIcon;
  type?: 'text' | 'email' | 'password';
  placeholder: string;
  value?: string;
  onChangeText?: (text: string) => void;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
}

export const AuthInput = ({
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  onChangeText,
  autoComplete,
  textContentType,
}: AuthInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isPassword = type === 'password';

  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  return (
    <Pressable 
      style={[styles.container, isFocused && styles.containerFocused]}
      onPress={handleContainerPress}
    >
      <View style={styles.iconContainer} pointerEvents="none">
        <Icon size={20} color="#94a3b8" />
      </View>
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={isPassword && !showPassword}
        keyboardType={type === 'email' ? 'email-address' : 'default'}
        autoCapitalize={type === 'email' ? 'none' : 'sentences'}
        autoCorrect={false}
        autoComplete={autoComplete}
        textContentType={textContentType}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {isPassword && (
        <Pressable
          onPress={() => setShowPassword(!showPassword)}
          style={styles.toggleButton}
          hitSlop={8}
        >
          {showPassword ? (
            <EyeOff size={20} color="#94a3b8" />
          ) : (
            <Eye size={20} color="#94a3b8" />
          )}
        </Pressable>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  containerFocused: {
    borderColor: '#4f46e5',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    paddingVertical: 0,
  },
  toggleButton: {
    padding: 4,
  },
});
