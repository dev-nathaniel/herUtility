import { StyleSheet, ScrollView, View, Text, TouchableOpacity, Switch } from 'react-native';
import { useState } from 'react';
import { Bell, Moon, Globe, Shield, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const settingsItems = [
    { icon: Bell, label: 'Notifications', hasSwitch: true, value: notifications, onToggle: setNotifications },
    { icon: Moon, label: 'Dark Mode', hasSwitch: true, value: darkMode, onToggle: setDarkMode },
    { icon: Globe, label: 'Language', hasSwitch: false },
    { icon: Shield, label: 'Privacy & Security', hasSwitch: false },
    { icon: HelpCircle, label: 'Help & Support', hasSwitch: false },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your preferences</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          {settingsItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <item.icon size={20} color="#6366f1" strokeWidth={2} />
                </View>
                <Text style={styles.settingLabel}>{item.label}</Text>
              </View>
              {item.hasSwitch ? (
                <Switch
                  value={item.value}
                  onValueChange={item.onToggle}
                  trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                  thumbColor={item.value ? '#6366f1' : '#f1f5f9'}
                />
              ) : (
                <ChevronRight size={20} color="#cbd5e1" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
                <LogOut size={20} color="#f43f5e" strokeWidth={2} />
              </View>
              <Text style={[styles.settingLabel, { color: '#f43f5e' }]}>Log Out</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 24,
    marginBottom: 120,
  },
});
