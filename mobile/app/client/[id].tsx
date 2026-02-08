/**
 * Client Detail Screen
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { get } from '../../lib/api';
import { Card, ListCard, StatusBadge, Badge } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { Client, Opportunity, EntityTypeLabels } from '../../types';

interface ClientDetailResponse {
  client: {
    id: string;
    entity: number | string;
    entity_name: string;
    borrower_contact: string;
    mobile: string;
    email: string;
    industry: string;
    company_address: string;
  };
  total_finance_amount: number;
  upcoming_settlements: number;
  opportunities: {
    id: string;
    opportunity_id: string;
    date_created: string;
    borrowing_entity: string;
    referrer_name: string;
    loan_amount: number;
    status: string;
  }[];
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch client
  const fetchClient = useCallback(async () => {
    if (!id) return;
    try {
      const data = await get<ClientDetailResponse>(`/referrer/clients/${id}`);
      const c = data.client;
      // Map API fields to Client type
      const contactParts = (c.borrower_contact || '').split(' ');
      const mapped: Client = {
        _id: c.id,
        organisation_id: '',
        entity_name: c.entity_name || '-',
        entity_type: (typeof c.entity === 'number' && c.entity >= 1 && c.entity <= 6 ? c.entity : undefined) as any,
        contact_first_name: contactParts[0] || '',
        contact_last_name: contactParts.slice(1).join(' ') || '',
        contact_phone: c.mobile !== '-' ? c.mobile : '',
        contact_email: c.email !== '-' ? c.email : '',
        address: c.company_address !== '-' ? c.company_address : '',
        industry: c.industry !== '-' ? c.industry : '',
        created_at: '',
      };
      setClient(mapped);

      // Map opportunities
      const opps: Opportunity[] = (data.opportunities || []).map((o) => ({
        _id: o.id,
        organization_id: '',
        client_id: c.id,
        created_by: '',
        opportunity_id: o.opportunity_id,
        status: o.status as any,
        loan_amount: o.loan_amount,
        created_at: o.date_created,
        borrowing_entity: o.borrowing_entity,
      }));
      setOpportunities(opps);
    } catch (error) {
      console.error('Failed to fetch client:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClient();
  }, [fetchClient]);

  // Get contact name
  const getContactName = () => {
    const parts = [client?.contact_first_name, client?.contact_last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '-';
  };

  // Get initials
  const getInitials = () => {
    const first = client?.contact_first_name?.[0] || client?.entity_name?.[0] || 'U';
    const last = client?.contact_last_name?.[0] || '';
    return (first + last).toUpperCase();
  };

  // Handle phone call
  const handleCall = () => {
    if (client?.contact_phone) {
      Linking.openURL(`tel:${client.contact_phone}`);
    }
  };

  // Handle email
  const handleEmail = () => {
    if (client?.contact_email) {
      Linking.openURL(`mailto:${client.contact_email}`);
    }
  };

  // Detail row component
  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '-'}</Text>
    </View>
  );

  if (isLoading || !client) {
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
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
        <Text style={styles.entityName}>{client.entity_name || 'Unknown'}</Text>
        {client.entity_type && (
          <Badge
            label={EntityTypeLabels[client.entity_type]}
            variant="info"
            style={styles.typeBadge}
          />
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCall}
          disabled={!client.contact_phone}
        >
          <Ionicons name="call-outline" size={24} color={Colors.primary} />
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleEmail}
          disabled={!client.contact_email}
        >
          <Ionicons name="mail-outline" size={24} color={Colors.primary} />
          <Text style={styles.actionText}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/opportunity/add')}
        >
          <Ionicons name="add-outline" size={24} color={Colors.primary} />
          <Text style={styles.actionText}>New Referral</Text>
        </TouchableOpacity>
      </View>

      {/* Contact Information */}
      <Card title="Contact Information">
        <DetailRow label="Contact Name" value={getContactName()} />
        <DetailRow label="Email" value={client.contact_email || '-'} />
        <DetailRow label="Phone" value={client.contact_phone || '-'} />
        <DetailRow label="Address" value={client.address || '-'} />
      </Card>

      {/* Business Information */}
      <Card title="Business Information">
        <DetailRow
          label="Entity Type"
          value={client.entity_type ? EntityTypeLabels[client.entity_type] : '-'}
        />
        <DetailRow label="ABN" value={client.abn || '-'} />
        <DetailRow label="Industry" value={client.industry || '-'} />
        <DetailRow label="Time in Business" value={client.time_in_business || '-'} />
      </Card>

      {/* Related Opportunities */}
      <Card title="Opportunities" rightAction={
        client.opportunities_count ? (
          <Badge label={`${client.opportunities_count}`} variant="info" size="sm" />
        ) : undefined
      }>
        {opportunities.length > 0 ? (
          opportunities.map((opp) => (
            <ListCard
              key={opp._id}
              title={opp.opportunity_id}
              subtitle={`$${opp.loan_amount?.toLocaleString() || 0}`}
              rightContent={<StatusBadge status={opp.status} size="sm" />}
              onPress={() => router.push(`/opportunity/${opp._id}`)}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>No opportunities yet</Text>
        )}
      </Card>
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
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
  },
  entityName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.teal,
    textAlign: 'center',
  },
  typeBadge: {
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
  },
  actionText: {
    fontSize: 12,
    color: Colors.primary,
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
  emptyText: {
    fontSize: 14,
    color: Colors.gray[400],
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
