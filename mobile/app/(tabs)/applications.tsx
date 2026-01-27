/**
 * Applications Screen
 * Track opportunities in application stage
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { get } from '../../lib/api';
import { StatCard, ListCard, StatusBadge } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { Opportunity } from '../../types';

export default function ApplicationsScreen() {
  const [applications, setApplications] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    underReview: 0,
    approved: 0,
    declined: 0,
  });

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    try {
      const data = await get<Opportunity[]>('/referrer/opportunities?status=applications');
      setApplications(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const underReview = data?.filter(
        (a) => ['application_created', 'application_submitted'].includes(a.status)
      ).length || 0;
      const approved = data?.filter(
        (a) => ['conditionally_approved', 'approved', 'settled'].includes(a.status)
      ).length || 0;
      const declined = data?.filter((a) => a.status === 'declined').length || 0;

      setStats({ total, underReview, approved, declined });
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApplications();
  }, [fetchApplications]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Render header with stats
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.statsRow}>
        <StatCard
          title="Total"
          value={stats.total}
          icon="document-text-outline"
          iconColor={Colors.info}
          style={styles.statCard}
        />
        <StatCard
          title="Under Review"
          value={stats.underReview}
          icon="time-outline"
          iconColor={Colors.warning}
          style={styles.statCard}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          title="Approved"
          value={stats.approved}
          icon="checkmark-circle-outline"
          iconColor={Colors.success}
          style={styles.statCard}
        />
        <StatCard
          title="Declined"
          value={stats.declined}
          icon="close-circle-outline"
          iconColor={Colors.error}
          style={styles.statCard}
        />
      </View>
    </View>
  );

  // Render application item
  const renderItem = ({ item }: { item: Opportunity }) => (
    <ListCard
      title={item.client?.entity_name || 'Unknown Client'}
      subtitle={`${item.opportunity_id} • ${formatCurrency(item.loan_amount || 0)}`}
      rightContent={<StatusBadge status={item.status} size="sm" />}
      onPress={() => router.push(`/opportunity/${item._id}`)}
    />
  );

  // Empty state
  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color={Colors.gray[300]} />
      <Text style={styles.emptyTitle}>No applications yet</Text>
      <Text style={styles.emptyText}>
        When your opportunities move to the application stage, they will appear here
      </Text>
    </View>
  );

  return (
    <FlatList
      data={applications}
      renderItem={renderItem}
      keyExtractor={(item) => item._id}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={!isLoading ? renderEmpty : null}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
  },
  listContent: {
    backgroundColor: Colors.backgroundSecondary,
    paddingBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[700],
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 8,
    textAlign: 'center',
  },
});
