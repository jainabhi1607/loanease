/**
 * Opportunity Detail Screen
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
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { get } from '../../lib/api';
import { Card, StatusBadge, OutcomeBadge } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { Opportunity, EntityTypeLabels, LoanTypeLabels, AssetTypeLabels } from '../../types';

type Tab = 'overview' | 'history';

export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch opportunity
  const fetchOpportunity = useCallback(async () => {
    if (!id) return;
    try {
      const data = await get<Opportunity>(`/referrer/opportunities/${id}`);
      setOpportunity(data);
    } catch (error) {
      console.error('Failed to fetch opportunity:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOpportunity();
  }, [fetchOpportunity]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOpportunity();
  }, [fetchOpportunity]);

  // Format currency
  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return `${value.toFixed(2)}%`;
  };

  // Detail row component
  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '-'}</Text>
    </View>
  );

  if (isLoading || !opportunity) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.dealId}>{opportunity.opportunity_id}</Text>
          <StatusBadge status={opportunity.status} />
        </View>
        <Text style={styles.entityName}>
          {opportunity.client?.entity_name || 'Unknown Client'}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' && (
        <>
          {/* Unqualified Banner */}
          {opportunity.details?.is_unqualified === 1 && (
            <View style={styles.unqualifiedBanner}>
              <Ionicons name="warning-outline" size={20} color={Colors.warning} />
              <View style={styles.unqualifiedContent}>
                <Text style={styles.unqualifiedTitle}>Unqualified Opportunity</Text>
                <Text style={styles.unqualifiedReason}>
                  {opportunity.details.unqualified_reason || 'No reason provided'}
                </Text>
              </View>
            </View>
          )}

          {/* Client Details */}
          <Card title="Client Details">
            <DetailRow
              label="Entity Type"
              value={opportunity.client?.entity_type ? EntityTypeLabels[opportunity.client.entity_type] : '-'}
            />
            <DetailRow
              label="Industry"
              value={opportunity.client?.industry || '-'}
            />
            <DetailRow label="ABN" value={opportunity.client?.abn || '-'} />
            <DetailRow
              label="Contact"
              value={[opportunity.client?.contact_first_name, opportunity.client?.contact_last_name].filter(Boolean).join(' ') || '-'}
            />
            <DetailRow label="Email" value={opportunity.client?.contact_email || '-'} />
            <DetailRow label="Phone" value={opportunity.client?.contact_phone || '-'} />
          </Card>

          {/* Loan Details */}
          <Card title="Loan Details">
            <DetailRow label="Loan Amount" value={formatCurrency(opportunity.loan_amount)} />
            <DetailRow
              label="Property Value"
              value={formatCurrency(opportunity.estimated_property_value)}
            />
            <DetailRow
              label="Loan Type"
              value={opportunity.loan_type ? LoanTypeLabels[opportunity.loan_type] : '-'}
            />
            <DetailRow label="Loan Purpose" value={opportunity.loan_purpose || '-'} />
            <DetailRow
              label="Asset Type"
              value={opportunity.asset_type ? AssetTypeLabels[opportunity.asset_type] : '-'}
            />
            <DetailRow label="Asset Address" value={opportunity.asset_address || '-'} />
          </Card>

          {/* Financial Details */}
          <Card title="Financial Details">
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>ICR</Text>
                <Text style={styles.metricValue}>{formatPercent(opportunity.icr)}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>LVR</Text>
                <Text style={styles.metricValue}>{formatPercent(opportunity.lvr)}</Text>
              </View>
              {opportunity.outcome_level && (
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Outcome</Text>
                  <OutcomeBadge level={opportunity.outcome_level} />
                </View>
              )}
            </View>
          </Card>

          {/* Notes Section */}
          <Card title="Notes" rightAction={
            <TouchableOpacity>
              <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
          }>
            <Text style={styles.emptyNotes}>No notes yet</Text>
          </Card>
        </>
      )}

      {activeTab === 'history' && (
        <Card title="Activity History">
          <Text style={styles.emptyHistory}>No history available</Text>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dealId: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[500],
  },
  entityName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.teal,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.gray[100],
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.white,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[500],
  },
  tabTextActive: {
    color: Colors.teal,
  },
  unqualifiedBanner: {
    flexDirection: 'row',
    backgroundColor: `${Colors.warning}15`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  unqualifiedContent: {
    flex: 1,
  },
  unqualifiedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
  },
  unqualifiedReason: {
    fontSize: 13,
    color: Colors.gray[600],
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[900],
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.teal,
  },
  emptyNotes: {
    fontSize: 14,
    color: Colors.gray[400],
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  emptyHistory: {
    fontSize: 14,
    color: Colors.gray[400],
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
