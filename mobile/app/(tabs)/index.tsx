/**
 * Dashboard Screen
 * Main landing page with KPIs and recent activity
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';
import { get } from '../../lib/api';
import { StatCard, Card, ListCard, StatusBadge } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { DashboardResponse, Opportunity } from '../../types';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    openOpportunities: 0,
    opportunityValue: 0,
    openApplications: 0,
    settledValue: 0,
    conversionRatio: '0%',
  });
  const [recentOpportunities, setRecentOpportunities] = useState<Opportunity[]>([]);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const data = await get<DashboardResponse>('/referrer/dashboard');
      setStats(data.statistics);
      setRecentOpportunities(data.recentOpportunities || []);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  // Quick actions
  const quickActions = [
    {
      icon: 'calculator-outline' as const,
      label: 'Pre-Qualify',
      onPress: () => {}, // Would open pre-assessment modal
    },
    {
      icon: 'add-circle-outline' as const,
      label: 'New Referral',
      onPress: () => router.push('/opportunity/add'),
    },
    {
      icon: 'person-add-outline' as const,
      label: 'Add Client',
      onPress: () => {}, // Would open add client modal
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome */}
      <View style={styles.welcome}>
        <Text style={styles.welcomeText}>
          Welcome back, {user?.first_name || 'User'}!
        </Text>
        <Text style={styles.welcomeSubtext}>
          Here's your business overview
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Open Opportunities"
          value={stats.openOpportunities}
          icon="briefcase-outline"
          iconColor={Colors.info}
          style={styles.statCard}
        />
        <StatCard
          title="Loan Value"
          value={formatCurrency(stats.opportunityValue)}
          icon="cash-outline"
          iconColor={Colors.primary}
          style={styles.statCard}
        />
        <StatCard
          title="Applications"
          value={stats.openApplications}
          icon="document-text-outline"
          iconColor={Colors.warning}
          style={styles.statCard}
        />
        <StatCard
          title="Settled Value"
          value={formatCurrency(stats.settledValue)}
          icon="checkmark-circle-outline"
          iconColor={Colors.success}
          style={styles.statCard}
        />
      </View>

      {/* Conversion Ratio */}
      <Card style={styles.conversionCard}>
        <View style={styles.conversionContent}>
          <View>
            <Text style={styles.conversionLabel}>Conversion Ratio</Text>
            <Text style={styles.conversionValue}>{stats.conversionRatio}</Text>
          </View>
          <View style={styles.conversionIcon}>
            <Ionicons name="trending-up" size={32} color={Colors.primary} />
          </View>
        </View>
      </Card>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickAction}
            onPress={action.onPress}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name={action.icon} size={24} color={Colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Opportunities */}
      <View style={styles.recentHeader}>
        <Text style={styles.sectionTitle}>Recent Referrals</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/opportunities')}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      {recentOpportunities.length > 0 ? (
        recentOpportunities.map((opp) => (
          <ListCard
            key={opp._id}
            title={opp.client?.entity_name || 'Unknown Client'}
            subtitle={`${opp.opportunity_id} • ${formatCurrency(opp.loan_amount || 0)}`}
            rightContent={<StatusBadge status={opp.status} size="sm" />}
            onPress={() => router.push(`/opportunity/${opp._id}`)}
          />
        ))
      ) : (
        <Card>
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color={Colors.gray[300]} />
            <Text style={styles.emptyText}>No recent opportunities</Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => router.push('/opportunity/add')}
            >
              <Text style={styles.emptyActionText}>Create your first referral</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  welcome: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.teal,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
  },
  conversionCard: {
    marginBottom: 24,
  },
  conversionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversionLabel: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  conversionValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.teal,
  },
  conversionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.teal,
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray[700],
    textAlign: 'center',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAll: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 12,
  },
  emptyAction: {
    marginTop: 16,
  },
  emptyActionText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});
