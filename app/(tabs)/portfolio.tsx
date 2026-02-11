import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { PieChart, TrendingUp, DollarSign } from 'lucide-react-native';

export default function PortfolioScreen() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Portfolio Analytics</Text>
          <Text style={styles.headerSubtitle}>Track your utility spending</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <PieChart size={64} color="#6366f1" strokeWidth={2} />
          </View>
          <Text style={styles.title}>Coming Soon</Text>
          <Text style={styles.description}>
            View detailed analytics and insights about your utility contracts and spending patterns.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <TrendingUp size={24} color="#10b981" strokeWidth={2} />
              <Text style={styles.featureText}>Spending trends</Text>
            </View>
            <View style={styles.featureItem}>
              <DollarSign size={24} color="#f59e0b" strokeWidth={2} />
              <Text style={styles.featureText}>Cost breakdowns</Text>
            </View>
            <View style={styles.featureItem}>
              <PieChart size={24} color="#8b5cf6" strokeWidth={2} />
              <Text style={styles.featureText}>Usage analytics</Text>
            </View>
          </View>
        </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  featureList: {
    width: '100%',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  featureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
});
