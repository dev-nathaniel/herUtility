/*
// --- OLD CODE (COMMENTED OUT) ---
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, Image } from 'react-native';
import { Mail, Phone, MapPin, Edit, Award, Calendar } from 'lucide-react-native';

export default function ProfileScreen() {
  const stats = [
    { label: 'Active Contracts', value: '8', icon: Award },
    { label: 'Member Since', value: '2024', icon: Calendar },
  ];

  const infoItems = [
    { icon: Mail, label: 'Email', value: 'user@example.com' },
    { icon: Phone, label: 'Phone', value: '+44 123 456 7890' },
    { icon: MapPin, label: 'Location', value: 'London, UK' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.editButton}>
              <Edit size={16} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>John Doe</Text>
          <Text style={styles.userEmail}>Business Owner</Text>
        </View>

        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={styles.statIcon}>
                <stat.icon size={24} color="#6366f1" strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          {infoItems.map((item, index) => (
            <View key={index} style={styles.infoItem}>
              <View style={styles.infoLeft}>
                <View style={styles.infoIcon}>
                  <item.icon size={18} color="#6366f1" strokeWidth={2} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.editProfileButton}>
          <Edit size={20} color="#6366f1" strokeWidth={2} />
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}
*/

// --- NEW SETTINGS SCREEN ---
import { useUpdateUser } from "@/hooks/api/use-user";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Toast from "react-native-toast-message";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.pushNotificationsEnabled ?? true);
  const updateUserMutation = useUpdateUser(user?.id ?? '');

  const editProfileSheetRef = useRef<BottomSheetModal>(null);
  const logoutSheetRef = useRef<BottomSheetModal>(null);

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

  const handleToggleNotifications = async (value: boolean) => {
    try {
      setNotificationsEnabled(value);
      
      if (value) {
        // We'll need access to the push token. 
        // For simplicity in this toggle, we might just re-trigger the registration logic
        // Or assume the token is available in local storage/context if we want to be more granular.
        // But the backend expects /api/auth/push-token which requires the token in body.
        // We might need to call registerForPushNotificationsAsync again.
        const { registerForPushNotificationsAsync } = await import('@/lib/notifications');
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await apiClient.registerPushToken(token);
        }
      } else {
        // For unregistering, the backend needs the token to remove it from the list.
        // We'll try to find any existing token.
        if (user?.expoPushTokens && user.expoPushTokens.length > 0) {
          // Unregister all known tokens for this device/user
          for (const token of user.expoPushTokens) {
            await apiClient.unregisterPushToken(token);
          }
        }
      }

      // Persist the preference to user settings as well
      await updateUserMutation.mutateAsync({ pushNotificationsEnabled: value });
      updateUser({ ...user!, pushNotificationsEnabled: value });
    } catch (error) {
      console.error("Failed to toggle notifications:", error);
      setNotificationsEnabled(!value); // Revert UI
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update notification settings",
      });
    }
  };

  const SettingItem = ({
    iconName,
    label,
    color = "#64748b",
    bgColor = "#f1f5f9",
    onPress,
    isToggle = false,
    toggleValue,
    value,
  }: any) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: bgColor }]}>
          <Ionicons name={iconName} size={20} color={color} />
        </View>
        <View>
          <Text style={styles.settingLabel}>{label}</Text>
          {value && <Text style={styles.settingValue}>{value}</Text>}
        </View>
      </View>
      {isToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onPress}
          trackColor={{ false: "#cbd5e1", true: "#6366f1" }}
          thumbColor="#fff"
        />
      ) : (
        <View style={styles.settingArrow}>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={value ? "transparent" : "#cbd5e1"}
          />
        </View>
      )}
    </TouchableOpacity>
  );

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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Account & Profile */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.profileHeader}
            onPress={() => editProfileSheetRef.current?.present()}
            activeOpacity={0.7}
          >
            <View style={styles.profileAvatarContainer}>
              <Image
                source={{
                  uri: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
                }}
                style={styles.profileAvatar}
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
            </View>
            <View style={styles.profileArrow}>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </View>
          </TouchableOpacity>

          {/* <SettingItem
            iconName="person-outline"
            label="Personal Information"
            bgColor="#dbeafe"
            color="#2563eb"
            onPress={() => editProfileSheetRef.current?.present()}
          /> */}
          <SettingItem
            iconName="notifications-outline"
            label="Push Notifications"
            isToggle={true}
            toggleValue={notificationsEnabled}
            onPress={handleToggleNotifications}
          />
        </View>

        {/* Legal & Support */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          <SettingItem
            iconName="document-text-outline"
            label="Terms & Conditions"
            onPress={() => openExternal("https://herutility.co.uk/terms-and-conditions/")}
          />
          <SettingItem
            iconName="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => openExternal("https://herutility.co.uk/privacy-policy/")}
          />
          <SettingItem
            iconName="help-circle-outline"
            label="FAQs"
            onPress={() => openExternal("https://herutility.co.uk/complaint/")}
          />
        </View>

        {/* Contact Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <SettingItem
            iconName="mail-outline"
            label="Email Support"
            value="hello@herutility.co.uk"
            bgColor="#d1fae5"
            color="#059669"
            onPress={() => Linking.openURL("mailto:hello@herutility.co.uk")}
          />
          <SettingItem
            iconName="call-outline"
            label="Call Support"
            value="0800 368 8038"
            bgColor="#d1fae5"
            color="#059669"
            onPress={() => Linking.openURL("tel:08003688038")}
          />
        </View>

        {/* Logout */}
        <View style={styles.sectionCard}>
          <SettingItem
            iconName="log-out-outline"
            label="Log Out"
            color="#f43f5e"
            bgColor="#fee2e2"
            onPress={() => logoutSheetRef.current?.present()}
          />
        </View>

        <View style={{ height: 120 }} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
    marginBottom: 8,
  },
  profileAvatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "#cbd5e1",
  },
  profileAvatar: {
    width: "100%",
    height: "100%",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "500",
  },
  profileArrow: {
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 4,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  settingValue: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 2,
  },
  settingArrow: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
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
});
