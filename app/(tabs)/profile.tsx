import React, { useCallback, useRef, useState, useEffect } from "react";
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, Switch, Linking, Alert, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Bell, Lock, Handshake, Shield, Headphones, HelpCircle, LogOut, ChevronRight, Play, Mail } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from "react-native-toast-message";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

import { useUpdateUser, useDeleteAccount } from "@/hooks/api/use-user";
import { apiClient, api } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import { getBiometricCredentials, clearBiometricCredentials, saveBiometricCredentials } from '@/lib/auth/biometric-storage';
import { useTour } from "@/components/tour/TourContext";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  
  const { startTour } = useTour();
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.pushNotificationsEnabled ?? true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(user?.emailAlertsEnabled ?? true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const updateUserMutation = useUpdateUser(user?.id ?? '');
  const deleteAccountMutation = useDeleteAccount(user?.id ?? '');

  const editProfileSheetRef = useRef<BottomSheetModal>(null);
  const logoutSheetRef = useRef<BottomSheetModal>(null);
  const biometricPasswordSheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    async function checkBiometricStatus() {
      const creds = await getBiometricCredentials();
      setBiometricEnabled(!!creds);
    }
    checkBiometricStatus();
  }, []);

  const openExternal = (url: string) => {
    Linking.openURL(url).catch(() =>
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Unable to open link",
      })
    );
  };

  const handleLogout = async () => {
    logoutSheetRef.current?.close();
    await logout();
  };

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      biometricPasswordSheetRef.current?.present();
    } else {
      await clearBiometricCredentials();
      setBiometricEnabled(false);
      Toast.show({
        type: "success",
        text1: "Biometrics Disabled",
        text2: "Face ID / Touch ID setup has been cleared.",
      });
    }
  };

  const handleConfirmBiometricPassword = async (password: string) => {
    if (!user?.email) return;
    try {
      const response = await api.post<any>(
        "/api/auth/login",
        { email: user.email, password },
        { skipAuth: true }
      );
      if (response && response.success) {
        await saveBiometricCredentials(user.email, password);
        setBiometricEnabled(true);
        biometricPasswordSheetRef.current?.close();
        Toast.show({
          type: "success",
          text1: "Biometrics Enabled",
          text2: "Face ID / Touch ID setup successfully completed.",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Verification Failed",
          text2: response?.message || "Incorrect password. Please try again.",
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error?.message || "Failed to verify password. Please try again.",
      });
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    try {
      setNotificationsEnabled(value);
      if (value) {
        const { registerForPushNotificationsAsync } = await import('@/lib/notifications');
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await apiClient.registerPushToken(token);
        }
      } else {
        if (user?.expoPushTokens && user.expoPushTokens.length > 0) {
          for (const token of user.expoPushTokens) {
            await apiClient.unregisterPushToken(token);
          }
        }
      }
      await updateUserMutation.mutateAsync({ pushNotificationsEnabled: value });
      updateUser({ ...user!, pushNotificationsEnabled: value });
    } catch (error) {
      console.error("Failed to toggle notifications:", error);
      setNotificationsEnabled(!value);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update notification settings",
      });
    }
  };

  const handleToggleEmailAlerts = async (value: boolean) => {
    try {
      setEmailAlertsEnabled(value);
      await updateUserMutation.mutateAsync({ emailAlertsEnabled: value });
      updateUser({ ...user!, emailAlertsEnabled: value });
    } catch (error) {
      console.error("Failed to toggle email alerts:", error);
      setEmailAlertsEnabled(!value);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update email settings",
      });
    }
  };

  const handleReplayProductTour = () => {
    startTour();
  };

  const handleDeleteAccountRequest = () => {
    Alert.alert(
      "Delete Account Request",
      "Are you sure you want to request account deletion? This action is permanent and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccountMutation.mutateAsync();
              Toast.show({
                type: "success",
                text1: "Account Deleted",
                text2: "Your account has been permanently removed.",
              });
              await logout();
            } catch (err: any) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: err?.message || "Failed to delete account",
              });
            }
          },
        },
      ]
    );
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.15}
      />
    ),
    [],
  );

  return (
    <View style={[styles.container, { paddingTop: 20 }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        
        <Text style={styles.headerTitle}>Settings & Support</Text>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            
            <TouchableOpacity style={styles.userRow} onPress={() => editProfileSheetRef.current?.present()}>
              <View style={styles.avatarContainer}>
                {user?.profilePicture ? (
                  <Image source={{ uri: user.profilePicture }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{user?.firstName?.charAt(0) || 'U'}</Text>
                  </View>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
                <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
              </View>
              <ChevronRight size={20} color="#0f172a" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Bell size={20} color="#475569" strokeWidth={2} />
                <Text style={styles.settingLabel}>Push Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#e2e8f0', true: '#181818' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Mail size={20} color="#475569" strokeWidth={2} />
                <Text style={styles.settingLabel}>Email Alerts</Text>
              </View>
              <Switch
                value={emailAlertsEnabled}
                onValueChange={handleToggleEmailAlerts}
                trackColor={{ false: '#e2e8f0', true: '#181818' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Lock size={20} color="#475569" strokeWidth={2} />
                <Text style={styles.settingLabel}>Enable biometric login</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                trackColor={{ false: '#e2e8f0', true: '#181818' }}
                thumbColor="#FFFFFF"
              />
            </View>

          </View>
        </View>

        {/* Support and Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support and Legal</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow} onPress={() => openExternal("https://herutility.co.uk/terms-and-conditions/")}>
              <View style={styles.settingLeft}>
                <Handshake size={20} color="#475569" strokeWidth={2} />
                <Text style={styles.settingLabel}>Terms and conditions</Text>
              </View>
              <ChevronRight size={20} color="#0f172a" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} onPress={() => openExternal("https://herutility.co.uk/privacy-policy/")}>
              <View style={styles.settingLeft}>
                <Shield size={20} color="#475569" strokeWidth={2} />
                <Text style={styles.settingLabel}>Privacy Policy</Text>
              </View>
              <ChevronRight size={20} color="#0f172a" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} onPress={handleReplayProductTour}>
              <View style={styles.settingLeft}>
                <Play size={20} color="#475569" strokeWidth={2} />
                <Text style={styles.settingLabel}>Replay product tour</Text>
              </View>
              <ChevronRight size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact us Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact us</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow} onPress={() => Linking.openURL("mailto:hello@herutility.co.uk")}>
              <View style={styles.settingLeft}>
                <Headphones size={20} color="#475569" strokeWidth={2} />
                <Text style={styles.settingLabel}>Help & Support</Text>
              </View>
              <ChevronRight size={20} color="#0f172a" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} onPress={() => Linking.openURL("tel:08003688038")}>
              <View style={styles.settingLeft}>
                <HelpCircle size={20} color="#475569" strokeWidth={2} />
                <Text style={styles.settingLabel}>About & FAQs</Text>
              </View>
              <ChevronRight size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Danger zone</Text>
          <View style={[styles.card, { marginBottom: 16 }]}>
            <TouchableOpacity style={styles.deleteAccountRow} onPress={handleDeleteAccountRequest}>
              <View style={styles.deleteAccountTextContainer}>
                <Text style={styles.deleteAccountTitle}>Delete Account Request</Text>
                <Text style={styles.deleteAccountSubtitle}>
                  Permanently remove your account. We may retain some records where required.
                </Text>
              </View>
              <ChevronRight size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={() => logoutSheetRef.current?.present()}>
            <Text style={styles.logoutButtonText}>Log out</Text>
            <LogOut size={20} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        bottomSheetRef={editProfileSheetRef}
        user={{
          firstName: user?.firstName ?? "",
          lastName: user?.lastName ?? "",
          email: user?.email ?? "",
        }}
        onSave={async (newData: {
          firstName: string;
          lastName: string;
          email: string;
        }) => {
          try {
            await updateUserMutation.mutateAsync({
              firstName: newData.firstName,
              lastName: newData.lastName,
              email: newData.email,
            });
            updateUser({
              ...user!,
              firstName: newData.firstName,
              lastName: newData.lastName,
              fullname: `${newData.firstName} ${newData.lastName}`,
              email: newData.email,
            });
            editProfileSheetRef.current?.close();
          } catch (err: any) {
            Toast.show({
              type: "error",
              text1: "Error",
              text2: err?.message || "Failed to update profile",
            });
          }
        }}
        renderBackdrop={renderBackdrop}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        bottomSheetRef={logoutSheetRef}
        onConfirm={handleLogout}
        renderBackdrop={renderBackdrop}
      />

      {/* Biometric Password Confirmation Modal */}
      <BiometricPasswordConfirmModal
        bottomSheetRef={biometricPasswordSheetRef}
        onConfirm={handleConfirmBiometricPassword}
        renderBackdrop={renderBackdrop}
      />
    </View>
  );
}

const EditProfileModal = ({
  bottomSheetRef,
  user,
  onSave,
  renderBackdrop,
}: any) => {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetIndicator}
      maxDynamicContentSize={500}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetView>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Edit Profile</Text>
          <TouchableOpacity
            style={styles.sheetClose}
            onPress={() => bottomSheetRef.current?.close()}
          >
            <Ionicons name="close" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={styles.sheetBody}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>First Name</Text>
              <BottomSheetTextInput
              style={styles.textInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
              placeholderTextColor="#94a3b8"
              autoComplete="name-given"
              textContentType="givenName"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <BottomSheetTextInput
              style={styles.textInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter your last name"
              placeholderTextColor="#94a3b8"
              autoComplete="name-family"
              textContentType="familyName"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <BottomSheetTextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => onSave({ firstName, lastName, email })}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const LogoutConfirmModal = ({
  bottomSheetRef,
  onConfirm,
  renderBackdrop,
}: any) => (
  <BottomSheetModal
    ref={bottomSheetRef}
    enableDynamicSizing
    enablePanDownToClose
    backdropComponent={renderBackdrop}
    backgroundStyle={styles.sheetBackground}
    handleIndicatorStyle={styles.sheetIndicator}
    maxDynamicContentSize={400}
  >
    <BottomSheetView>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Log Out</Text>
        <TouchableOpacity
          style={styles.sheetClose}
          onPress={() => bottomSheetRef.current?.close()}
        >
          <Ionicons name="close" size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.logoutBody}>
        <View style={styles.logoutIcon}>
          <Ionicons name="log-out-outline" size={28} color="#f43f5e" />
        </View>
        <Text style={styles.logoutTitle}>Are you sure you want to leave?</Text>
        <Text style={styles.logoutMessage}>
          You will need to sign in again to access your portfolio.
        </Text>

        <View style={styles.logoutButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => bottomSheetRef.current?.close()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
            <Text style={styles.confirmButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetView>
  </BottomSheetModal>
);

const BiometricPasswordConfirmModal = ({
  bottomSheetRef,
  onConfirm,
  renderBackdrop,
}: any) => {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetIndicator}
      maxDynamicContentSize={400}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onDismiss={() => setPassword("")}
    >
      <BottomSheetView>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Enable Biometrics</Text>
          <TouchableOpacity
            style={styles.sheetClose}
            onPress={() => bottomSheetRef.current?.close()}
          >
            <Ionicons name="close" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={styles.sheetBody}>
          <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 }}>
            Please confirm your password to securely enable Face ID / Touch ID login.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <BottomSheetTextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSubmitting && { opacity: 0.7 }]}
            onPress={async () => {
              if (!password) return;
              setIsSubmitting(true);
              try {
                await onConfirm(password);
                setPassword("");
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Confirm Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#181818',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    marginRight: 16,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#475569',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181818',
    borderRadius: 30,
    paddingVertical: 18,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 12,
  },
  sheetBackground: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  sheetIndicator: {
    backgroundColor: "#cbd5e1",
    width: 40,
    height: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    textAlign: "center",
  },
  sheetClose: {
    width: 32,
    height: 32,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetBody: {
    padding: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
  },
  textInput: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  saveButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  logoutBody: {
    padding: 24,
    alignItems: "center",
  },
  logoutIcon: {
    width: 64,
    height: 64,
    backgroundColor: "#fee2e2",
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoutTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  logoutMessage: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
  },
  logoutButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "700",
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#f43f5e",
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#f43f5e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  deleteAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  deleteAccountTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  deleteAccountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 4,
  },
  deleteAccountSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
});
