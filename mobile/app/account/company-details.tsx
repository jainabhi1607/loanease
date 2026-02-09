/**
 * Company Details Screen
 * View organization info, directors, and commission split (Referrer Admin only)
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';
import { get } from '../../lib/api';
import { Colors } from '../../constants/colors';
import { EntityTypeLabels, IndustryOptions, EntityType } from '../../types';

interface OrgData {
  organization: {
    id: string;
    entity_name: string;
    trading_name: string;
    abn: string;
    address: string;
    industry_type: string;
    entity_type: number;
    is_active: boolean;
  };
  directors: Array<{
    _id: string;
    first_name: string;
    surname: string;
    email: string | null;
    phone: string | null;
  }>;
}

interface CommissionData {
  commission_split: string;
  is_custom: boolean;
}

export default function CompanyDetailsScreen() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [commission, setCommission] = useState<CommissionData | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = useCallback(async () => {
    try {
      const [accountData, commissionData] = await Promise.all([
        get<OrgData>('/referrer/account'),
        get<CommissionData>('/referrer/account/commission-split'),
      ]);
      setOrgData(accountData);
      setCommission(commissionData);
    } catch (err) {
      setToast({ message: 'Failed to load company details', type: 'error' });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getEntityTypeLabel = (type: number): string => {
    return EntityTypeLabels[type as EntityType] || '-';
  };

  const getIndustryLabel = (value: string): string => {
    return IndustryOptions.find(opt => opt.value === value)?.label || value || '-';
  };

  const formatAbn = (abn: string): string => {
    if (!abn || abn === '00000000000') return '-';
    return abn;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (user?.role !== 'referrer_admin') {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="lock-closed-outline" size={48} color={Colors.gray[400]} />
        <Text style={styles.noAccessText}>Only account owners can view company details.</Text>
      </View>
    );
  }

  const org = orgData?.organization;
  const directors = orgData?.directors || [];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Company Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="business-outline" size={20} color={Colors.teal} />
            <Text style={styles.cardTitle}>Company Information</Text>
          </View>
          <View style={styles.cardBody}>
            <InfoRow label="Entity Name" value={org?.entity_name || '-'} />
            <InfoRow label="Trading Name" value={org?.trading_name || '-'} />
            <InfoRow label="ABN" value={formatAbn(org?.abn || '')} />
            <InfoRow label="Address" value={org?.address || '-'} />
            <InfoRow label="Industry Type" value={getIndustryLabel(org?.industry_type || '')} />
            <InfoRow label="Entity Type" value={getEntityTypeLabel(org?.entity_type || 0)} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={[styles.statusBadge, org?.is_active ? styles.statusActive : styles.statusInactive]}>
                <Text style={[styles.statusText, org?.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
                  {org?.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Directors Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="people-outline" size={20} color={Colors.teal} />
            <Text style={styles.cardTitle}>Directors</Text>
          </View>
          <View style={styles.cardBody}>
            {directors.length === 0 ? (
              <Text style={styles.emptyText}>No directors listed</Text>
            ) : (
              directors.map((director, index) => (
                <View key={director._id || index} style={[styles.directorItem, index < directors.length - 1 && styles.directorBorder]}>
                  <View style={styles.directorAvatar}>
                    <Text style={styles.directorInitials}>
                      {(director.first_name?.[0] || '') + (director.surname?.[0] || '')}
                    </Text>
                  </View>
                  <View style={styles.directorInfo}>
                    <Text style={styles.directorName}>{director.first_name} {director.surname}</Text>
                    {director.email && <Text style={styles.directorDetail}>{director.email}</Text>}
                    {director.phone && <Text style={styles.directorDetail}>{director.phone}</Text>}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Commission Split Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cash-outline" size={20} color={Colors.teal} />
            <Text style={styles.cardTitle}>Commission Split</Text>
            {commission?.is_custom && (
              <View style={styles.customBadge}>
                <Text style={styles.customBadgeText}>Custom</Text>
              </View>
            )}
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.commissionText}>
              {commission?.commission_split || 'No commission structure set'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Toast */}
      {toast && (
        <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          <Ionicons
            name={toast.type === 'error' ? 'close-circle' : 'checkmark-circle'}
            size={20}
            color="#fff"
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    gap: 12,
  },
  noAccessText: {
    fontSize: 15,
    color: Colors.gray[500],
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.teal,
    flex: 1,
  },
  cardBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.gray[500],
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[800],
    flex: 1.5,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: `${Colors.success}15`,
  },
  statusInactive: {
    backgroundColor: `${Colors.error}15`,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: Colors.success,
  },
  statusTextInactive: {
    color: Colors.error,
  },
  directorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  directorBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  directorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  directorInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  directorInfo: {
    flex: 1,
  },
  directorName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray[800],
  },
  directorDetail: {
    fontSize: 13,
    color: Colors.gray[500],
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray[400],
    textAlign: 'center',
    paddingVertical: 16,
  },
  customBadge: {
    backgroundColor: `${Colors.info}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  customBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.info,
  },
  commissionText: {
    fontSize: 14,
    color: Colors.gray[700],
    lineHeight: 22,
  },
  toast: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  toastSuccess: {
    backgroundColor: Colors.success,
  },
  toastError: {
    backgroundColor: Colors.error,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
